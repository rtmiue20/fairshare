package com.fairshare.ai.service;

import com.fairshare.ai.dto.AiChatMessageDto;
import com.fairshare.ai.dto.AiChatRequest;
import com.fairshare.ai.dto.AiChatResponse;
import com.fairshare.ai.dto.TcreiPromptBreakdownDto;
import com.fairshare.alert.entity.Alert;
import com.fairshare.alert.repository.AlertRepository;
import com.fairshare.board.entity.Card;
import com.fairshare.board.repository.CardRepository;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.config.AppProperties;
import com.fairshare.contribution.dto.ContributionDto;
import com.fairshare.contribution.dto.MultidimensionalNetworkDto;
import com.fairshare.contribution.service.ContributionService;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * AiChatService - Tích hợp trợ lý AI FairShare theo quy trình Prompt chuẩn 5 bước TCREI
 * (Task - Context - Reference - Evaluate/Example - Iterate).
 * <p>
 * Tự động lấy dữ liệu thực tế từ MariaDB (điểm đóng góp 4 tầng, xếp hạng nhóm,
 * thẻ công việc Kanban, cảnh báo tiến độ) làm Context cho Gemini API (Interactions API / generateContent).
 * Khi chưa cấu hình API_KEY trong application-secret.yaml, hệ thống vẫn chạy quy trình TCREI
 * trên dữ liệu CSDL thật để trả lời chính xác cho người dùng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    private static final String GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
    private static final String GEMINI_GENERATE_CONTENT_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";
    private static final String DEFAULT_MODEL = "gemini-3.8-flash";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final AppProperties appProperties;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final SprintRepository sprintRepository;
    private final UserRepository userRepository;
    private final CardRepository cardRepository;
    private final AlertRepository alertRepository;
    private final ContributionService contributionService;

    @Autowired(required = false)
    private Environment environment;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Transactional
    public AiChatResponse chat(AiChatRequest request, String authenticatedEmail) {
        String question = request.getQuestion() != null ? request.getQuestion().trim() : "";

        // 1. Xác định người dùng hiện tại & thành viên mục tiêu
        User currentUser = resolveCurrentUser(authenticatedEmail);
        Long teamId = resolveTeamId(request.getTeamId(), currentUser);
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy dự án/nhóm ID: " + teamId));

        List<TeamMember> teamMembers = teamMemberRepository.findByTeamIdWithUser(teamId);
        List<Sprint> sprints = sprintRepository.findByTeamId(teamId).stream()
                .sorted(Comparator
                        .comparing(Sprint::getStartDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Sprint::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        Sprint targetSprint = resolveSprint(sprints, request.getSprintId());

        Long focusedUserId = request.getFocusedUserId();
        if (focusedUserId == null && currentUser != null) {
            focusedUserId = currentUser.getId();
        }

        // 2. Lấy dữ liệu 4 tầng từ ContributionService (MariaDB)
        MultidimensionalNetworkDto network = contributionService.getMultidimensionalNetwork(
                teamId,
                targetSprint != null ? targetSprint.getId() : null,
                focusedUserId
        );
        Long resolvedSprintId = network != null && network.getSprintId() != null
                ? network.getSprintId()
                : (targetSprint != null ? targetSprint.getId() : null);

        List<ContributionDto> teamScores = resolvedSprintId != null
                ? contributionService.getSprintScores(resolvedSprintId)
                : List.of();
        if (teamScores == null) {
            teamScores = List.of();
        }

        // Lấy bảng điểm cá nhân của user đang đăng nhập (nếu khác thành viên đang quan sát)
        ContributionDto currentUserScore = resolveScoreForUser(teamScores, currentUser != null ? currentUser.getId() : null);

        // 3. Lấy công việc Kanban & cảnh báo thực tế của dự án
        List<Card> cards = cardRepository.findByBoardTeamId(teamId);
        if (cards == null) cards = List.of();

        List<Alert> unresolvedAlerts = alertRepository.findByTeamIdAndResolvedFalse(teamId);
        if (unresolvedAlerts == null) unresolvedAlerts = List.of();

        // 4. Xây dựng quy trình Prompt 5 bước TCREI
        TcreiPromptBreakdownDto tcrei = buildTcreiPrompt(
                team,
                targetSprint,
                sprints,
                teamMembers,
                currentUser,
                currentUserScore,
                network,
                teamScores,
                cards,
                unresolvedAlerts,
                request.getHistory(),
                question
        );

        String configuredModel = resolveModel();
        String apiKey = resolveApiKey();
        List<String> suggestedFollowUps = buildSuggestedFollowUps(question, network, cards);

        // 5. Gọi Gemini API nếu API_KEY đã được cấu hình trong application-secret.yaml
        if (apiKey != null) {
            GeminiCallResult liveResult = invokeGeminiWithTcrei(
                    apiKey,
                    configuredModel,
                    tcrei,
                    request.getHistory(),
                    request.getPreviousInteractionId(),
                    question
            );
            if (liveResult.success() && liveResult.text() != null && !liveResult.text().isBlank()) {
                return AiChatResponse.builder()
                        .answer(liveResult.text().trim())
                        .interactionId(liveResult.interactionId())
                        .modelUsed(configuredModel)
                        .liveGeminiUsed(true)
                        .tcrei(tcrei)
                        .suggestedFollowUps(suggestedFollowUps)
                        .build();
            }
            log.warn("Gemini API fallback sang TCREI Local Engine: {}", liveResult.errorNote());
            String localAnswer = generateLocalTcreiAnswer(
                    question, team, targetSprint, teamMembers, currentUser, currentUserScore,
                    network, teamScores, cards, unresolvedAlerts
            );
            String note = liveResult.errorNote() != null
                    ? "\n\n_(Lưu ý: Chưa kết nối được Gemini trực tuyến: " + liveResult.errorNote() + " — câu trả lời trên được trích xuất trực tiếp từ CSDL theo khung TCREI.)_"
                    : "";
            return AiChatResponse.builder()
                    .answer(localAnswer + note)
                    .interactionId(null)
                    .modelUsed("fairshare-tcrei-db-engine")
                    .liveGeminiUsed(false)
                    .tcrei(tcrei)
                    .suggestedFollowUps(suggestedFollowUps)
                    .build();
        }

        // 6. Khi chưa điền API_KEY: thực thi phân tích TCREI trực tiếp trên dữ liệu CSDL
        String localAnswer = generateLocalTcreiAnswer(
                question, team, targetSprint, teamMembers, currentUser, currentUserScore,
                network, teamScores, cards, unresolvedAlerts
        );
        return AiChatResponse.builder()
                .answer(localAnswer)
                .interactionId(null)
                .modelUsed("fairshare-tcrei-db-engine")
                .liveGeminiUsed(false)
                .tcrei(tcrei)
                .suggestedFollowUps(suggestedFollowUps)
                .build();
    }

    // =========================================================================
    // TCREI PROMPT BUILDER (T - Task, C - Context, R - Reference, E - Evaluate, I - Iterate)
    // =========================================================================

    TcreiPromptBreakdownDto buildTcreiPrompt(
            Team team,
            Sprint targetSprint,
            List<Sprint> sprints,
            List<TeamMember> teamMembers,
            User currentUser,
            ContributionDto currentUserScore,
            MultidimensionalNetworkDto network,
            List<ContributionDto> teamScores,
            List<Card> cards,
            List<Alert> unresolvedAlerts,
            List<AiChatMessageDto> history,
            String question
    ) {
        String task = buildTaskSection();
        String context = buildContextSection(
                team, targetSprint, sprints, teamMembers, currentUser, currentUserScore,
                network, teamScores, cards, unresolvedAlerts
        );
        String reference = buildReferenceSection();
        String evaluate = buildEvaluateSection();
        String iterate = buildIterateSection(history, question);

        return TcreiPromptBreakdownDto.builder()
                .task(task)
                .context(context)
                .reference(reference)
                .evaluate(evaluate)
                .iterate(iterate)
                .build();
    }

    private String buildTaskSection() {
        return """
                [T - TASK (Nhiệm vụ & Vai trò)]
                - Vai trò: Bạn là FairShare AI Copilot — trợ lý phân tích đóng góp đa chiều và quản trị dự án Agile/Scrum thông minh của hệ thống FairShare.
                - Nhiệm vụ chính:
                  1. Trả lời chính xác câu hỏi của thành viên về điểm số cá nhân (p_i, C_i, δ_i, a_i, 4 trục D1..D4, khoảng tin cậy 95% CI).
                  2. Giải thích minh bạch cách tính điểm theo Mô hình 4 tầng dựa trên số liệu thực tế của chính thành viên đó.
                  3. Cung cấp cái nhìn tổng quát về thứ hạng, đóng góp toàn nhóm trong Sprint.
                  4. Tra cứu tiến độ dự án, danh sách thẻ công việc (Kanban tasks) đang đảm nhận, hạn chót và các cảnh báo/rào cản hiện có.
                - Yêu cầu đầu ra: Trả lời bằng tiếng Việt tự nhiên, súc tích, cấu trúc rõ ràng bằng gạch đầu dòng và con số thực tế.""";
    }

    private String buildContextSection(
            Team team,
            Sprint targetSprint,
            List<Sprint> sprints,
            List<TeamMember> teamMembers,
            User currentUser,
            ContributionDto currentUserScore,
            MultidimensionalNetworkDto network,
            List<ContributionDto> teamScores,
            List<Card> cards,
            List<Alert> unresolvedAlerts
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("[C - CONTEXT (Dữ liệu thời gian thực từ CSDL MariaDB)]\n");
        sb.append("1) DỰ ÁN & SPRINT:\n");
        sb.append("   - Tên dự án: ").append(safeStr(team.getName(), "Dự án nhóm")).append('\n');
        if (team.getCourseName() != null && !team.getCourseName().isBlank()) {
            sb.append("   - Môn học: ").append(team.getCourseName()).append('\n');
        }
        if (team.getLecturer() != null && !team.getLecturer().isBlank()) {
            sb.append("   - Giảng viên: ").append(team.getLecturer()).append('\n');
        }
        if (team.getDescription() != null && !team.getDescription().isBlank()) {
            sb.append("   - Mô tả: ").append(truncate(team.getDescription(), 180)).append('\n');
        }
        if (targetSprint != null) {
            sb.append("   - Sprint đang xét: ").append(targetSprint.getName())
                    .append(" (Trạng thái: ").append(safeStr(targetSprint.getStatus(), "ACTIVE")).append(")\n");
        }
        sb.append("   - Tổng số Sprint: ").append(sprints != null ? sprints.size() : 0)
                .append(" | Số thành viên: ").append(teamMembers != null ? teamMembers.size() : 0).append('\n');

        if (currentUser != null) {
            sb.append("2) NGƯỜI DÙNG ĐANG ĐĂNG NHẬP: ").append(currentUser.getFullName())
                    .append(" (ID=").append(currentUser.getId()).append(")\n");
            if (currentUserScore != null) {
                sb.append(String.format(Locale.US,
                        "   - Điểm của người đăng nhập: p_i=%.1f%%, C_i=%.1f/100, D1=%.2f, D2=%.2f, D3=%.2f, D4=%.2f, a_i=%.2f, δ_i=%.2f%n",
                        pctValue(currentUserScore),
                        num(currentUserScore.getCompositeScore()),
                        num(currentUserScore.getD1Output()),
                        num(currentUserScore.getD2Reliability()),
                        num(currentUserScore.getD3Collaboration()),
                        num(currentUserScore.getD4Peer()),
                        currentUserScore.getAvailabilityFactor() != null ? currentUserScore.getAvailabilityFactor() : 1.0,
                        num(currentUserScore.getDistanceToCenter())));
            }
        }

        if (network != null) {
            sb.append("3) THÀNH VIÊN ĐANG QUAN SÁT TRÊN ĐỒ THỊ: ").append(network.getFocusedUserName())
                    .append(" (ID=").append(network.getFocusedUserId()).append(")\n");
            double pct = network.getFinalPct() != null ? network.getFinalPct().doubleValue() * 100.0 : 0.0;
            sb.append(String.format(Locale.US,
                    "   - Tỷ lệ đóng góp p_i: %.1f%% | Điểm C_i (Sigmoid): %.1f/100 | Khoảng cách tâm δ_i: %.2f | Khả dụng a_i: %.0f%% (%.2f)%n",
                    pct,
                    num(network.getCompositeScore()),
                    num(network.getDistanceToCenter()),
                    (network.getAvailabilityFactor() != null ? network.getAvailabilityFactor() : 1.0) * 100.0,
                    network.getAvailabilityFactor() != null ? network.getAvailabilityFactor() : 1.0));
            sb.append(String.format(Locale.US,
                    "   - 4 Chiều chuẩn hóa: D1(Sản lượng)=%+.2f | D2(Tin cậy)=%+.2f | D3(Phối hợp)=%+.2f | D4(Chấm chéo)=%+.2f%n",
                    num(network.getD1Output()),
                    num(network.getD2Reliability()),
                    num(network.getD3Collaboration()),
                    num(network.getD4Peer())));
            if (network.getConfidenceIntervalLow() != null && network.getConfidenceIntervalHigh() != null) {
                sb.append(String.format(Locale.US,
                        "   - Khoảng tin cậy 95%% Bootstrap: [%.1f%% - %.1f%%] | Số sự kiện: %d | Đủ bằng chứng: %s | Nghi ngờ bất thường: %s%n",
                        network.getConfidenceIntervalLow(),
                        network.getConfidenceIntervalHigh(),
                        network.getTotalEventsCount() != null ? network.getTotalEventsCount() : 0,
                        Boolean.TRUE.equals(network.getHasSufficientEvidence()) ? "Có" : "Chưa đủ",
                        Boolean.TRUE.equals(network.getIsSuspicious()) ? "Có" : "Không"));
            }
            if (network.getTierBreakdown() != null && network.getTierBreakdown().getRawFeatures() != null) {
                sb.append("   - Chỉ số thô Tầng 1: ").append(network.getTierBreakdown().getRawFeatures()).append('\n');
            }
        }

        sb.append("4) TỔNG QUÁT BẢNG ĐIỂM TOÀN NHÓM (Xếp hạng theo đóng góp p_i):\n");
        List<ContributionDto> sortedScores = teamScores.stream()
                .sorted(Comparator.comparingDouble(this::pctValue).reversed())
                .toList();
        if (sortedScores.isEmpty()) {
            sb.append("   - Chưa có dữ liệu điểm tổng hợp trong sprint này.\n");
        } else {
            int rank = 1;
            for (ContributionDto cs : sortedScores) {
                sb.append(String.format(Locale.US,
                        "   #%d. %s: p_i=%.1f%%, C_i=%.1f, D1=%+.2f, D2=%+.2f, D3=%+.2f, D4=%+.2f, a_i=%.2f, cards=%d, SP=%.1f%n",
                        rank++,
                        safeStr(cs.getUserName(), "Thành viên #" + cs.getUserId()),
                        pctValue(cs),
                        num(cs.getCompositeScore()),
                        num(cs.getD1Output()),
                        num(cs.getD2Reliability()),
                        num(cs.getD3Collaboration()),
                        num(cs.getD4Peer()),
                        cs.getAvailabilityFactor() != null ? cs.getAvailabilityFactor() : 1.0,
                        cs.getCardsCompleted() != null ? cs.getCardsCompleted() : 0,
                        cs.getTotalStoryPoints() != null ? cs.getTotalStoryPoints() : 0.0));
            }
        }

        sb.append("5) CÔNG VIỆC DỰ ÁN TRÊN KANBAN BOARD:\n");
        if (cards.isEmpty()) {
            sb.append("   - Chưa có thẻ công việc nào trên bảng Kanban.\n");
        } else {
            long doneCount = cards.stream().filter(c -> isDoneColumn(c.getColumn() != null ? c.getColumn().getName() : "")).count();
            double totalSp = cards.stream().mapToDouble(c -> c.getStoryPoints() != null ? c.getStoryPoints() : 0.0).sum();
            double doneSp = cards.stream()
                    .filter(c -> isDoneColumn(c.getColumn() != null ? c.getColumn().getName() : ""))
                    .mapToDouble(c -> c.getStoryPoints() != null ? c.getStoryPoints() : 0.0).sum();
            sb.append(String.format(Locale.US,
                    "   - Tổng cộng: %d thẻ (Đã xong: %d thẻ, %.1f/%.1f SP hoàn thành)%n",
                    cards.size(), doneCount, doneSp, totalSp));

            int maxCards = Math.min(18, cards.size());
            for (int i = 0; i < maxCards; i++) {
                Card c = cards.get(i);
                String colName = c.getColumn() != null ? c.getColumn().getName() : "N/A";
                String assigneeName = c.getAssignee() != null ? c.getAssignee().getFullName() : "Chưa gán";
                String dueStr = c.getDueDate() != null ? c.getDueDate().toLocalDate().format(DATE_FMT) : "Không có hạn";
                sb.append(String.format(Locale.US,
                        "   - [%s] \"%s\" | Phụ trách: %s | %.1f SP (Độ khó %d) | Hạn: %s%n",
                        colName, c.getTitle(), assigneeName,
                        c.getStoryPoints() != null ? c.getStoryPoints() : 0.0,
                        c.getDifficultyLevel() != null ? c.getDifficultyLevel() : 2,
                        dueStr));
            }
        }

        sb.append("6) CẢNH BÁO TIẾN ĐỘ ĐANG MỞ (").append(unresolvedAlerts.size()).append("):\n");
        unresolvedAlerts.stream().limit(6).forEach(a ->
                sb.append("   - [").append(safeStr(a.getSeverity(), "INFO")).append("] ")
                        .append(truncate(a.getMessage(), 140)).append('\n')
        );

        return sb.toString();
    }

    private String buildReferenceSection() {
        return """
                [R - REFERENCE (Công thức Mô hình Đa chiều 4 Tầng - FairShare ScoringEngine)]
                - Tầng 1 (Vector thô x_i): Số thẻ xong, Story Points có hệ số độ khó SP*(1 + 0.1*(difficulty-1)), đóng góp thủ công APPROVED, tỷ lệ đúng hạn (onTimeRate), số lần làm lại (rework), độ trễ (latency), phối hợp (review/comment/hỗ trợ), chấm chéo ẩn danh (chỉ tính khi ≥ 3 lượt chấm) và khả dụng a_i ∈ [0.5, 1.0].
                - Tầng 2 (Chuẩn hóa chống gian lận): Biến đổi giảm lợi ích biên x' = ln(1 + x); chuẩn hóa Robust theo nhóm: z = clip((x' - Median) / (1.4826 * MAD + ε), -3, 3).
                - Tầng 3 (Nén về 4 chiều chính):
                  • D1 (Sản lượng)  = 0.60·z(SP) + 0.20·z(Cards) + 0.20·z(Manual)
                  • D2 (Tin cậy)    = 0.60·z(OnTime) - 0.20·z(Rework) - 0.20·z(Latency)
                  • D3 (Phối hợp)   = 1.00·z(Collab)
                  • D4 (Chấm chéo)  = 1.00·z(PeerReview) (bằng 0 nếu chưa đủ ≥ 3 lượt, trọng số tự phân bổ lại cho 3 trục còn lại).
                - Tầng 4 (Bù khả dụng, Sigmoid & Bootstrap):
                  • Bù khả dụng (β = 0.5): D'_k = D_k · (1 + 0.5·(1 - a_i))
                  • Điểm tổ hợp trọng số w = (0.40, 0.20, 0.15, 0.25): u_i = 2.5 · Σ(w_k · D'_k)
                  • Điểm tổng hợp Logistic Sigmoid: C_i = 100 / (1 + e^(-u_i))
                  • Tỷ lệ đóng góp: p_i = C_i / Σ C_j
                  • Khoảng cách tâm nhóm δ_i = √Σ((D_k - μ_k) / (σ_k + ε))² & Khoảng tin cậy 95% CI bằng Bootstrap 1000 lần.""";
    }

    private String buildEvaluateSection() {
        return """
                [E - EVALUATE & EXAMPLES (Tiêu chí kiểm định & Ví dụ mẫu)]
                - Tiêu chí tự kiểm định (Checklist):
                  1. Số liệu p_i, C_i, δ_i, a_i, D1..D4 và tên thẻ công việc phải khớp 100% với Context từ MariaDB (tuyệt đối không bịa số liệu).
                  2. Khi giải thích cách tính điểm, phải nêu rõ công thức 4 tầng và lồng ghép số liệu thực tế của thành viên.
                  3. Đưa ra ít nhất 1 gợi ý hành động cụ thể giúp tối ưu đóng góp nếu phù hợp.
                - Ví dụ 1 (Hỏi điểm số): "Bạn đang đạt p_i = 32.0% (xếp #1 nhóm), điểm Sigmoid C_i = 82.0/100..."
                - Ví dụ 2 (Hỏi cách tính điểm): "Hệ thống FairShare tính điểm qua 4 tầng: (1) Gom SP & thẻ -> (2) Chuẩn hóa ln(1+x) & Robust MAD -> (3) Gộp 4 trục D1..D4 -> (4) Bù khả dụng a_i và chạy Sigmoid ra C_i..."
                - Ví dụ 3 (Hỏi dự án đảm nhận): Liệt kê tên dự án, Sprint hiện tại, số thẻ đã xong / đang làm và hạn chót của các task do thành viên phụ trách.""";
    }

    private String buildIterateSection(List<AiChatMessageDto> history, String question) {
        StringBuilder sb = new StringBuilder();
        sb.append("[I - ITERATE (Ngữ cảnh hội thoại đa lượt & Câu hỏi hiện tại)]\n");
        if (history != null && !history.isEmpty()) {
            int start = Math.max(0, history.size() - 6);
            sb.append("Lịch sử trao đổi gần đây:\n");
            for (int i = start; i < history.size(); i++) {
                AiChatMessageDto msg = history.get(i);
                if (msg != null && msg.getContent() != null) {
                    String roleLabel = "user".equalsIgnoreCase(msg.getRole()) ? "Người dùng" : "AI Copilot";
                    sb.append("- ").append(roleLabel).append(": ").append(truncate(msg.getContent(), 240)).append('\n');
                }
            }
        } else {
            sb.append("- Đây là lượt hỏi đầu tiên trong phiên hội thoại này.\n");
        }
        sb.append("Câu hỏi hiện tại cần giải đáp: \"").append(question).append("\"\n");
        sb.append("Sau khi trả lời, luôn sẵn sàng cho lượt hỏi tiếp theo (Iterate) về từng trục hoặc công việc cụ thể.");
        return sb.toString();
    }

    // =========================================================================
    // GEMINI API CLIENT (Interactions API v1beta + generateContent Fallback)
    // =========================================================================

    private record GeminiCallResult(boolean success, String text, String interactionId, String errorNote) {}

    private GeminiCallResult invokeGeminiWithTcrei(
            String apiKey,
            String model,
            TcreiPromptBreakdownDto tcrei,
            List<AiChatMessageDto> history,
            String previousInteractionId,
            String question
    ) {
        String systemPrompt = String.join("\n\n",
                tcrei.getTask(),
                tcrei.getContext(),
                tcrei.getReference(),
                tcrei.getEvaluate()
        );

        String userPrompt = tcrei.getIterate() + "\n\nHãy trả lời trực tiếp câu hỏi trên bằng tiếng Việt:";

        // 1. Thử gọi Gemini Interactions API (POST /v1beta/interactions)
        GeminiCallResult interactionsRes = callGeminiInteractionsApi(
                apiKey, model, systemPrompt, userPrompt, previousInteractionId
        );
        if (interactionsRes.success()) {
            return interactionsRes;
        }

        // 2. Fallback sang standard generateContent endpoint (/v1beta/models/{model}:generateContent)
        log.debug("Chuyển từ Interactions API sang generateContent API ({}): {}", model, interactionsRes.errorNote());
        return callGeminiGenerateContentApi(apiKey, model, systemPrompt, history, question);
    }

    private GeminiCallResult callGeminiInteractionsApi(
            String apiKey,
            String model,
            String systemInstruction,
            String inputText,
            String previousInteractionId
    ) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", model);
            payload.put("system_instruction", systemInstruction);
            payload.put("input", inputText);
            if (previousInteractionId != null && !previousInteractionId.isBlank()) {
                payload.put("previous_interaction_id", previousInteractionId);
            }

            String jsonBody = objectMapper.writeValueAsString(payload);
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(GEMINI_INTERACTIONS_URL))
                    .timeout(Duration.ofSeconds(25))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .header("Api-Revision", "2026-05-20")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(response.body());
                String interactionId = root.hasNonNull("id") ? root.get("id").asString() : null;
                StringBuilder textOut = new StringBuilder();
                if (root.has("steps") && root.get("steps").isArray()) {
                    for (JsonNode step : root.get("steps")) {
                        String stepType = step.hasNonNull("type") ? step.get("type").asString() : "";
                        if ("model_output".equals(stepType) && step.has("content") && step.get("content").isArray()) {
                            for (JsonNode contentPart : step.get("content")) {
                                if (contentPart.hasNonNull("text")) {
                                    textOut.append(contentPart.get("text").asString());
                                }
                            }
                        }
                    }
                }
                if (textOut.isEmpty() && root.hasNonNull("output_text")) {
                    textOut.append(root.get("output_text").asString());
                }
                if (!textOut.isEmpty()) {
                    return new GeminiCallResult(true, textOut.toString(), interactionId, null);
                }
                return new GeminiCallResult(false, null, null, "Interactions API trả về nội dung rỗng");
            }
            return new GeminiCallResult(false, null, null, "HTTP " + response.statusCode());
        } catch (Exception ex) {
            return new GeminiCallResult(false, null, null, ex.getMessage());
        }
    }

    private GeminiCallResult callGeminiGenerateContentApi(
            String apiKey,
            String model,
            String systemInstruction,
            List<AiChatMessageDto> history,
            String question
    ) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("system_instruction", Map.of(
                    "parts", List.of(Map.of("text", systemInstruction))
            ));

            List<Map<String, Object>> contents = new ArrayList<>();
            if (history != null) {
                int start = Math.max(0, history.size() - 6);
                for (int i = start; i < history.size(); i++) {
                    AiChatMessageDto msg = history.get(i);
                    if (msg != null && msg.getContent() != null && !msg.getContent().isBlank()) {
                        String role = "user".equalsIgnoreCase(msg.getRole()) ? "user" : "model";
                        contents.add(Map.of(
                                "role", role,
                                "parts", List.of(Map.of("text", msg.getContent()))
                        ));
                    }
                }
            }
            contents.add(Map.of(
                    "role", "user",
                    "parts", List.of(Map.of("text", question))
            ));
            payload.put("contents", contents);

            String url = String.format(GEMINI_GENERATE_CONTENT_TEMPLATE, model);
            String jsonBody = objectMapper.writeValueAsString(payload);
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(25))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(response.body());
                StringBuilder textOut = new StringBuilder();
                if (root.has("candidates") && root.get("candidates").isArray() && !root.get("candidates").isEmpty()) {
                    JsonNode first = root.get("candidates").get(0);
                    JsonNode parts = first.path("content").path("parts");
                    if (parts.isArray()) {
                        for (JsonNode p : parts) {
                            if (p.hasNonNull("text")) {
                                textOut.append(p.get("text").asString());
                            }
                        }
                    }
                }
                if (!textOut.isEmpty()) {
                    return new GeminiCallResult(true, textOut.toString(), null, null);
                }
                return new GeminiCallResult(false, null, null, "Gemini generateContent không trả về text");
            }
            return new GeminiCallResult(false, null, null, "HTTP " + response.statusCode() + " từ Gemini API");
        } catch (Exception ex) {
            return new GeminiCallResult(false, null, null, ex.getMessage());
        }
    }

    // =========================================================================
    // LOCAL TCREI DB-GROUNDED REASONING ENGINE (Khi chưa điền API_KEY hoặc dự phòng)
    // =========================================================================

    String generateLocalTcreiAnswer(
            String question,
            Team team,
            Sprint targetSprint,
            List<TeamMember> teamMembers,
            User currentUser,
            ContributionDto currentUserScore,
            MultidimensionalNetworkDto network,
            List<ContributionDto> teamScores,
            List<Card> cards,
            List<Alert> unresolvedAlerts
    ) {
        String q = question.toLowerCase(Locale.ROOT);

        // Xác định người dùng mục tiêu để trả lời ("tôi"/"mình" vs thành viên đang quan sát)
        boolean asksAboutSelf = q.contains("tôi") || q.contains("mình") || q.contains("em ") || q.contains("bản thân");
        ContributionDto targetScore = resolveTargetScore(q, asksAboutSelf, currentUser, currentUserScore, network, teamScores);
        String targetName = targetScore != null && targetScore.getUserName() != null
                ? targetScore.getUserName()
                : (network != null ? network.getFocusedUserName() : (currentUser != null ? currentUser.getFullName() : "Thành viên"));

        // 0. Hỏi nhận xét & đánh giá tổng thể toàn nhóm (Nút AI Nhận xét nhóm)
        if (containsAny(q, "nhận xét nhóm", "đánh giá nhóm", "nhận xét và đánh giá tổng thể", "tình hình nhóm")) {
            return formatTeamReviewInsightAnswer(team, targetSprint, teamMembers, teamScores, network, cards, unresolvedAlerts);
        }

        // 1. Hỏi về cách tính điểm / công thức / mô hình 4 tầng
        if (containsAny(q, "cách tính", "tính điểm", "công thức", "mô hình", "4 tầng", "sigmoid", "mad", "bootstrap", "d1", "d2", "d3", "d4", "trọng số")) {
            return formatScoringFormulaAnswer(targetName, targetScore, network);
        }

        // 2. Hỏi về dự án / task / công việc đảm nhận / cảnh báo tiến độ
        if (containsAny(q, "dự án", "đảm nhận", "task", "công việc", "việc", "kanban", "tiến độ", "hạn", "trễ", "quá hạn", "cảnh báo", "sprint")) {
            return formatProjectAndTasksAnswer(team, targetSprint, teamMembers, targetName, targetScore, cards, unresolvedAlerts);
        }

        // 3. Hỏi về tổng quát cả nhóm / xếp hạng / ai cao nhất / ai ít hoạt động nhất
        if (containsAny(q, "tổng quát", "tổng quan", "cả nhóm", "nhóm", "cao nhất", "dẫn đầu", "top", "thấp nhất", "ít nhất", "chậm", "bảng điểm", "so sánh", "ai ")) {
            return formatTeamOverviewAnswer(team, targetSprint, teamScores, unresolvedAlerts, q);
        }

        // 4. Hỏi về khả dụng / rào cản / gợi ý cải thiện
        if (containsAny(q, "rào cản", "bù", "khả dụng", "cải thiện", "tăng điểm", "làm sao")) {
            return formatAvailabilityAndTipsAnswer(targetName, targetScore, network, cards);
        }

        // 5. Mặc định: Trả lời tổng hợp về điểm số của thành viên / người dùng & gợi ý ngữ cảnh dự án
        return formatPersonalScoreAnswer(team, targetSprint, targetName, targetScore, network, cards);
    }

    private String formatTeamReviewInsightAnswer(
            Team team,
            Sprint sprint,
            List<TeamMember> members,
            List<ContributionDto> teamScores,
            MultidimensionalNetworkDto network,
            List<Card> cards,
            List<Alert> alerts
    ) {
        String projectName = safeStr(team.getName(), "Dự án nhóm");
        String sprintTitle = sprint != null ? sprint.getName() : (network != null && network.getSprintName() != null ? network.getSprintName() : "Sprint hiện tại");
        int memberCount = Math.max(teamScores != null ? teamScores.size() : 0, members != null ? members.size() : 0);

        List<ContributionDto> sorted = (teamScores != null ? teamScores : List.<ContributionDto>of()).stream()
                .sorted(Comparator.comparingDouble(this::pctValue).reversed())
                .toList();

        StringBuilder sb = new StringBuilder();
        sb.append(String.format(Locale.US, "✨ **Nhận xét tổng thể %s (%s · %d thành viên):**\n\n",
                projectName, sprintTitle, memberCount));

        // 1. Phân bố đóng góp & Cân bằng nhóm
        sb.append("1️⃣ **Phân bố đóng góp & Cân bằng nhóm:**\n");
        if (!sorted.isEmpty()) {
            ContributionDto top = sorted.get(0);
            ContributionDto bottom = sorted.get(sorted.size() - 1);
            double spread = pctValue(top) - pctValue(bottom);
            sb.append(String.format(Locale.US,
                    "• Dẫn đầu là **%s** (`p_i = %.1f%%`, `C_i = %.1f/100`), thấp nhất là **%s** (`p_i = %.1f%%`, `C_i = %.1f/100`). Biên độ chênh lệch đóng góp: **%.1f điểm %%**%s.\n",
                    safeStr(top.getUserName(), "Thành viên #" + top.getUserId()), pctValue(top), num(top.getCompositeScore()),
                    safeStr(bottom.getUserName(), "Thành viên #" + bottom.getUserId()), pctValue(bottom), num(bottom.getCompositeScore()),
                    spread,
                    spread <= 15.0 ? " (nhóm phối hợp khá đồng đều)" : (spread <= 25.0 ? " (có sự phân hóa nhẹ theo vai trò)" : " (phân hóa cao, cần rà soát phân công)")));

            if (network != null && network.getFocusedUserName() != null) {
                double fPct = network.getFinalPct() != null ? network.getFinalPct().doubleValue() * 100.0 : 0.0;
                sb.append(String.format(Locale.US,
                        "• Thành viên đang quan sát **%s**: `p_i = %.1f%%`, `C_i = %.1f/100`, khoảng cách tâm `δ_i = %.2f`.\n",
                        network.getFocusedUserName(), fPct, num(network.getCompositeScore()), num(network.getDistanceToCenter())));
            }
        } else {
            sb.append("• Chưa có dữ liệu điểm tổng hợp cho Sprint này.\n");
        }

        // 2. Sức khỏe 4 trục đa chiều & Tiến độ Kanban
        double avgD1 = sorted.stream().mapToDouble(s -> num(s.getD1Output())).average().orElse(0.0);
        double avgD2 = sorted.stream().mapToDouble(s -> num(s.getD2Reliability())).average().orElse(0.0);
        double avgD3 = sorted.stream().mapToDouble(s -> num(s.getD3Collaboration())).average().orElse(0.0);
        double avgD4 = sorted.stream().mapToDouble(s -> num(s.getD4Peer())).average().orElse(0.0);

        String strongestAxis = pickExtremeAxis(avgD1, avgD2, avgD3, avgD4, true);
        String weakestAxis = pickExtremeAxis(avgD1, avgD2, avgD3, avgD4, false);

        long totalCards = cards != null ? cards.size() : 0;
        long doneCards = cards != null
                ? cards.stream().filter(c -> isDoneColumn(c.getColumn() != null ? c.getColumn().getName() : "")).count()
                : 0;
        double totalSp = cards != null ? cards.stream().mapToDouble(c -> c.getStoryPoints() != null ? c.getStoryPoints() : 0.0).sum() : 0.0;
        double doneSp = cards != null
                ? cards.stream()
                        .filter(c -> isDoneColumn(c.getColumn() != null ? c.getColumn().getName() : ""))
                        .mapToDouble(c -> c.getStoryPoints() != null ? c.getStoryPoints() : 0.0).sum()
                : 0.0;

        sb.append("\n2️⃣ **Sức khỏe 4 Trục Đa chiều & Tiến độ Kanban:**\n");
        sb.append(String.format(Locale.US,
                "• Trung bình 4 trục: D1 `%+.2f` · D2 `%+.2f` · D3 `%+.2f` · D4 `%+.2f`.\n" +
                "• Điểm mạnh: **%s** | Cần chú ý cải thiện: **%s**.\n" +
                "• Tiến độ bảng việc: **%d/%d thẻ** hoàn thành (**%.1f/%.1f SP**).\n",
                avgD1, avgD2, avgD3, avgD4, strongestAxis, weakestAxis, doneCards, totalCards, doneSp, totalSp));

        // 3. Khả dụng a_i & Rào cản thực tế
        List<ContributionDto> compensatedMembers = sorted.stream()
                .filter(s -> s.getAvailabilityFactor() != null && s.getAvailabilityFactor() < 0.999)
                .toList();

        sb.append("\n3️⃣ **Hệ số khả dụng (a_i) & Rào cản ngoại cảnh:**\n");
        if (!compensatedMembers.isEmpty()) {
            String affectedNames = compensatedMembers.stream()
                    .map(s -> String.format(Locale.US, "%s (`a_i = %.0f%%`)",
                            safeStr(s.getUserName(), "TV#" + s.getUserId()),
                            s.getAvailabilityFactor() * 100.0))
                    .collect(Collectors.joining(", "));
            sb.append(String.format(Locale.US,
                    "• Đã kích hoạt cơ chế bù khả dụng `D' = D·(1 + 0.5(1 - a_i))` để bảo vệ quyền lợi cho: %s.\n",
                    affectedNames));
        } else {
            sb.append("• 100% thành viên đảm bảo khả dụng tối đa (`a_i = 100%`), không phát sinh rào cản ngoại cảnh cần bù điểm.\n");
        }

        // 4. Khuyến nghị điều phối nhóm
        int alertCount = alerts != null ? alerts.size() : 0;
        long openCards = Math.max(0, totalCards - doneCards);
        sb.append("\n4️⃣ **Khuyến nghị điều phối:**\n");
        if (alertCount > 0 || openCards > 0) {
            sb.append(String.format(Locale.US,
                    "• Ưu tiên xử lý **%d cảnh báo tiến độ** đang mở và đẩy nhanh **%d thẻ Kanban** chưa xong đúng hạn để cải thiện trục **%s**.",
                    alertCount, openCards, weakestAxis));
        } else {
            sb.append("• Toàn bộ thẻ công việc và cảnh báo đã được giải quyết ổn định; tiếp tục duy trì nhịp độ review chéo và chấm chéo cuối Sprint.");
        }

        return sb.toString().trim();
    }

    private String pickExtremeAxis(double d1, double d2, double d3, double d4, boolean pickMax) {
        double[] vals = {d1, d2, d3, d4};
        String[] labels = {
                "D1 (Sản lượng & SP)",
                "D2 (Tin cậy & Đúng hạn)",
                "D3 (Phối hợp & Review)",
                "D4 (Chấm chéo đồng cấp)"
        };
        int bestIdx = 0;
        for (int i = 1; i < vals.length; i++) {
            if ((pickMax && vals[i] > vals[bestIdx]) || (!pickMax && vals[i] < vals[bestIdx])) {
                bestIdx = i;
            }
        }
        return labels[bestIdx];
    }

    private String formatScoringFormulaAnswer(String targetName, ContributionDto score, MultidimensionalNetworkDto network) {
        double d1 = score != null && score.getD1Output() != null ? score.getD1Output() : num(network != null ? network.getD1Output() : 0.0);
        double d2 = score != null && score.getD2Reliability() != null ? score.getD2Reliability() : num(network != null ? network.getD2Reliability() : 0.0);
        double d3 = score != null && score.getD3Collaboration() != null ? score.getD3Collaboration() : num(network != null ? network.getD3Collaboration() : 0.0);
        double d4 = score != null && score.getD4Peer() != null ? score.getD4Peer() : num(network != null ? network.getD4Peer() : 0.0);
        double ai = score != null && score.getAvailabilityFactor() != null ? score.getAvailabilityFactor() : (network != null && network.getAvailabilityFactor() != null ? network.getAvailabilityFactor() : 1.0);
        double ci = score != null && score.getCompositeScore() != null ? score.getCompositeScore() : num(network != null ? network.getCompositeScore() : 0.0);
        double pi = score != null ? pctValue(score) : (network != null && network.getFinalPct() != null ? network.getFinalPct().doubleValue() * 100.0 : 0.0);
        double bonus = 1.0 + 0.5 * (1.0 - ai);

        return String.format(Locale.US,
                "📐 **Cách tính điểm đóng góp theo Mô hình Đa chiều 4 Tầng (áp dụng cho %s):**\n" +
                "• **Tầng 1 (Vector thô):** Thu thập thẻ hoàn thành, Story Points (nhân hệ số độ khó), đóng góp ngoài Board (APPROVED), tỷ lệ đúng hạn, số lần Rework, độ trễ, lượt Review/@mention và điểm Chấm chéo ẩn danh (chỉ tính khi ≥ 3 lượt).\n" +
                "• **Tầng 2 (Chống gian lận):** Nén phi tuyến `ln(1+x)` để tránh cày task nhỏ, sau đó chuẩn hóa Robust Z-Score theo Median & MAD của nhóm (giới hạn `[-3, +3]`).\n" +
                "• **Tầng 3 (4 Trục chính của %s):**\n" +
                "  - **D1 Sản lượng** (40%%) = `0.60·z(SP) + 0.20·z(Cards) + 0.20·z(Manual)` = **%+.2f**\n" +
                "  - **D2 Tin cậy** (20%%) = `0.60·z(OnTime) - 0.20·z(Rework) - 0.20·z(Latency)` = **%+.2f**\n" +
                "  - **D3 Phối hợp** (15%%) = `z(Collab)` = **%+.2f**\n" +
                "  - **D4 Chấm chéo** (25%%) = `z(PeerReview)` = **%+.2f**\n" +
                "• **Tầng 4 (Bù khả dụng & Sigmoid):** Với khả dụng `a_i = %.2f`, hệ số bù là `%.3f` (`D' = D·(1 + 0.5(1 - a_i))`). Qua hàm Logistic Sigmoid cho điểm tổng hợp **C_i = %.1f/100**, tương ứng tỷ lệ đóng góp **p_i = %.1f%%**.",
                targetName, targetName, d1, d2, d3, d4, ai, bonus, ci, pi);
    }

    private String formatProjectAndTasksAnswer(
            Team team,
            Sprint sprint,
            List<TeamMember> members,
            String targetName,
            ContributionDto targetScore,
            List<Card> cards,
            List<Alert> alerts
    ) {
        long doneCount = cards.stream().filter(c -> isDoneColumn(c.getColumn() != null ? c.getColumn().getName() : "")).count();
        long inProgressCount = cards.stream().filter(c -> !isDoneColumn(c.getColumn() != null ? c.getColumn().getName() : "")).count();

        List<Card> myCards = filterCardsForMember(cards, targetScore, targetName);

        StringBuilder sb = new StringBuilder();
        sb.append(String.format(Locale.US,
                "📁 **Tổng quan Dự án & Công việc đảm nhận (%s):**\n" +
                "• **Dự án:** %s%s\n" +
                "• **Sprint hiện tại:** %s | Thành viên: %d người\n" +
                "• **Tiến độ Kanban toàn nhóm:** %d thẻ hoàn thành / %d tổng thẻ (%d thẻ đang mở) · Cảnh báo đang mở: %d\n",
                targetName,
                team.getName(),
                team.getCourseName() != null && !team.getCourseName().isBlank() ? " (" + team.getCourseName() + ")" : "",
                sprint != null ? sprint.getName() : "Sprint hiện tại",
                members != null ? members.size() : 0,
                doneCount, cards.size(), inProgressCount,
                alerts != null ? alerts.size() : 0));

        if (!myCards.isEmpty()) {
            sb.append(String.format(Locale.US, "• **Công việc %s đang phụ trách (%d thẻ):**\n", targetName, myCards.size()));
            myCards.stream().limit(5).forEach(c -> {
                String col = c.getColumn() != null ? c.getColumn().getName() : "N/A";
                String due = c.getDueDate() != null ? c.getDueDate().toLocalDate().format(DATE_FMT) : "N/A";
                sb.append(String.format(Locale.US, "  - [%s] %s (%.1f SP · Hạn %s)\n",
                        col, c.getTitle(), c.getStoryPoints() != null ? c.getStoryPoints() : 0.0, due));
            });
        } else {
            sb.append("• Hiện chưa có thẻ công việc nào gán trực tiếp cho ").append(targetName).append(" trên bảng Kanban.\n");
        }
        return sb.toString().trim();
    }

    private String formatTeamOverviewAnswer(
            Team team,
            Sprint sprint,
            List<ContributionDto> teamScores,
            List<Alert> alerts,
            String questionLower
    ) {
        List<ContributionDto> sorted = teamScores.stream()
                .sorted(Comparator.comparingDouble(this::pctValue).reversed())
                .toList();

        if (sorted.isEmpty()) {
            return "Hiện chưa có dữ liệu bảng điểm cho dự án **" + team.getName() + "**. Hãy bấm tính toán điểm Sprint để xem tổng quát.";
        }

        StringBuilder sb = new StringBuilder();
        if (containsAny(questionLower, "thấp nhất", "ít nhất", "chậm")) {
            ContributionDto lowest = sorted.get(sorted.size() - 1);
            sb.append(String.format(Locale.US,
                    "📉 **Thành viên có tỷ lệ đóng góp thấp nhất hiện tại:** **%s** với **p_i = %.1f%%** (C_i = %.1f/100, a_i = %.2f).\n",
                    lowest.getUserName(), pctValue(lowest), num(lowest.getCompositeScore()),
                    lowest.getAvailabilityFactor() != null ? lowest.getAvailabilityFactor() : 1.0));
        } else {
            ContributionDto leader = sorted.get(0);
            sb.append(String.format(Locale.US,
                    "🏆 **Tổng quát đóng góp %s — %s:**\n• **Dẫn đầu nhóm:** **%s** với **p_i = %.1f%%** (C_i = %.1f/100, D1=%+.2f, D2=%+.2f).\n",
                    team.getName(),
                    sprint != null ? sprint.getName() : "Sprint hiện tại",
                    leader.getUserName(),
                    pctValue(leader),
                    num(leader.getCompositeScore()),
                    num(leader.getD1Output()),
                    num(leader.getD2Reliability())));
        }

        sb.append("• **Bảng xếp hạng nhóm:**\n");
        int rank = 1;
        for (ContributionDto cs : sorted) {
            sb.append(String.format(Locale.US, "  %d. %s: **%.1f%%** (C_i=%.1f · %d thẻ)\n",
                    rank++, cs.getUserName(), pctValue(cs), num(cs.getCompositeScore()),
                    cs.getCardsCompleted() != null ? cs.getCardsCompleted() : 0));
        }
        if (alerts != null && !alerts.isEmpty()) {
            sb.append(String.format(Locale.US, "• Có **%d cảnh báo tiến độ** chưa giải quyết trong nhóm.", alerts.size()));
        }
        return sb.toString().trim();
    }

    private String formatAvailabilityAndTipsAnswer(
            String targetName,
            ContributionDto score,
            MultidimensionalNetworkDto network,
            List<Card> cards
    ) {
        double ai = score != null && score.getAvailabilityFactor() != null ? score.getAvailabilityFactor() : (network != null && network.getAvailabilityFactor() != null ? network.getAvailabilityFactor() : 1.0);
        double d1 = score != null && score.getD1Output() != null ? score.getD1Output() : num(network != null ? network.getD1Output() : 0.0);
        double d2 = score != null && score.getD2Reliability() != null ? score.getD2Reliability() : num(network != null ? network.getD2Reliability() : 0.0);
        double d3 = score != null && score.getD3Collaboration() != null ? score.getD3Collaboration() : num(network != null ? network.getD3Collaboration() : 0.0);

        String weakestAxis = d2 <= d1 && d2 <= d3 ? "D2 (Độ tin cậy & Đúng hạn)"
                : (d3 <= d1 ? "D3 (Phối hợp & Review chéo)" : "D1 (Sản lượng & Story Points)");

        long pendingCount = cards.stream()
                .filter(c -> !isDoneColumn(c.getColumn() != null ? c.getColumn().getName() : ""))
                .count();

        return String.format(Locale.US,
                "🛡️ **Khả dụng & Gợi ý tối ưu điểm cho %s:**\n" +
                "• **Hệ số khả dụng hiện tại:** `a_i = %.2f` (%.0f%%) — kích hoạt công thức bù `D' = D · (1 + 0.5(1 - %.2f))`.\n" +
                "• **Trục cần ưu tiên cải thiện:** **%s**.\n" +
                "• **Hành động đề xuất:** Hoàn tất %d thẻ Kanban đang mở đúng hạn để kéo trục D2 lên, hoặc tham gia review chéo PR & khai báo đóng góp thủ công ngoài Board.",
                targetName, ai, ai * 100.0, ai, weakestAxis, pendingCount);
    }

    private String formatPersonalScoreAnswer(
            Team team,
            Sprint sprint,
            String targetName,
            ContributionDto score,
            MultidimensionalNetworkDto network,
            List<Card> cards
    ) {
        double pi = score != null ? pctValue(score) : (network != null && network.getFinalPct() != null ? network.getFinalPct().doubleValue() * 100.0 : 0.0);
        double ci = score != null && score.getCompositeScore() != null ? score.getCompositeScore() : num(network != null ? network.getCompositeScore() : 0.0);
        double delta = score != null && score.getDistanceToCenter() != null ? score.getDistanceToCenter() : num(network != null ? network.getDistanceToCenter() : 0.0);
        double ai = score != null && score.getAvailabilityFactor() != null ? score.getAvailabilityFactor() : (network != null && network.getAvailabilityFactor() != null ? network.getAvailabilityFactor() : 1.0);
        double d1 = score != null && score.getD1Output() != null ? score.getD1Output() : num(network != null ? network.getD1Output() : 0.0);
        double d2 = score != null && score.getD2Reliability() != null ? score.getD2Reliability() : num(network != null ? network.getD2Reliability() : 0.0);
        double d3 = score != null && score.getD3Collaboration() != null ? score.getD3Collaboration() : num(network != null ? network.getD3Collaboration() : 0.0);
        double d4 = score != null && score.getD4Peer() != null ? score.getD4Peer() : num(network != null ? network.getD4Peer() : 0.0);

        long myActiveCards = filterCardsForMember(cards, score, targetName).stream()
                .filter(c -> !isDoneColumn(c.getColumn() != null ? c.getColumn().getName() : ""))
                .count();

        return String.format(Locale.US,
                "📊 **Hồ sơ điểm đóng góp của %s (%s · %s):**\n" +
                "• **Tỷ lệ đóng góp (p_i):** **%.1f%%** | **Điểm Sigmoid (C_i):** **%.1f/100**\n" +
                "• **Khoảng cách tâm (δ_i):** %.2f | **Khả dụng (a_i):** %.0f%%\n" +
                "• **Chi tiết 4 chiều:** D1 Sản lượng `%+.2f` · D2 Tin cậy `%+.2f` · D3 Phối hợp `%+.2f` · D4 Chấm chéo `%+.2f`\n" +
                "• **Công việc dự án:** Hiện còn **%d thẻ** đang thực hiện do %s đảm nhận.",
                targetName,
                team.getName(),
                sprint != null ? sprint.getName() : "Sprint hiện tại",
                pi, ci, delta, ai * 100.0, d1, d2, d3, d4,
                myActiveCards, targetName);
    }

    // =========================================================================
    // ITERATE FOLLOW-UP SUGGESTIONS & RESOLUTION HELPERS
    // =========================================================================

    private List<String> buildSuggestedFollowUps(String question, MultidimensionalNetworkDto network, List<Card> cards) {
        String q = question.toLowerCase(Locale.ROOT);
        List<String> list = new ArrayList<>();
        String name = network != null && network.getFocusedUserName() != null
                ? stripRoleSuffix(network.getFocusedUserName())
                : "tôi";

        if (!q.contains("cách tính") && !q.contains("công thức")) {
            list.add("Giải thích chi tiết cách tính điểm 4 tầng cho " + name + "?");
        }
        if (!q.contains("tổng quát") && !q.contains("nhóm")) {
            list.add("Tổng quát bảng điểm & xếp hạng cả nhóm?");
        }
        if (!q.contains("dự án") && !q.contains("task") && !q.contains("công việc")) {
            list.add("Các công việc dự án đang đảm nhận & hạn chót?");
        }
        if (list.size() < 3) {
            list.add("Làm sao cải thiện điểm C_i và D2 nhanh nhất?");
        }
        if (cards != null && !cards.isEmpty() && list.size() < 3) {
            list.add("Có công việc nào của dự án đang bị chậm tiến độ không?");
        }
        return list.stream().limit(3).toList();
    }

    private User resolveCurrentUser(String authenticatedEmail) {
        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            return null;
        }
        return userRepository.findByEmail(authenticatedEmail).orElse(null);
    }

    private Long resolveTeamId(Long requestTeamId, User currentUser) {
        if (requestTeamId != null && requestTeamId > 0) {
            return requestTeamId;
        }
        if (currentUser != null) {
            List<TeamMember> memberships = teamMemberRepository.findByUserId(currentUser.getId());
            if (memberships != null && !memberships.isEmpty() && memberships.get(0).getTeam() != null) {
                return memberships.get(0).getTeam().getId();
            }
        }
        List<Team> all = teamRepository.findAll();
        if (!all.isEmpty()) {
            return all.get(0).getId();
        }
        return 1L;
    }

    private Sprint resolveSprint(List<Sprint> sprints, Long sprintId) {
        if (sprints == null || sprints.isEmpty()) return null;
        if (sprintId != null) {
            for (Sprint s : sprints) {
                if (sprintId.equals(s.getId())) return s;
            }
        }
        return sprints.stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus()))
                .findFirst()
                .orElse(sprints.get(sprints.size() - 1));
    }

    private ContributionDto resolveScoreForUser(List<ContributionDto> scores, Long userId) {
        if (scores == null || scores.isEmpty() || userId == null) return null;
        return scores.stream().filter(s -> userId.equals(s.getUserId())).findFirst().orElse(null);
    }

    private ContributionDto resolveTargetScore(
            String qLower,
            boolean asksAboutSelf,
            User currentUser,
            ContributionDto currentUserScore,
            MultidimensionalNetworkDto network,
            List<ContributionDto> teamScores
    ) {
        // 1. Nếu câu hỏi nhắc tên thành viên cụ thể trong team
        if (teamScores != null) {
            for (ContributionDto cs : teamScores) {
                if (cs.getUserName() != null) {
                    String clean = stripRoleSuffix(cs.getUserName()).toLowerCase(Locale.ROOT);
                    String[] parts = clean.split("\\s+");
                    String lastWord = parts.length > 0 ? parts[parts.length - 1] : clean;
                    Pattern wordPattern = Pattern.compile("(?:^|[\\s,?.!:;\"'])" + Pattern.quote(lastWord) + "(?:$|[\\s,?.!:;\"'])");
                    if (qLower.contains(clean) || (lastWord.length() >= 2 && wordPattern.matcher(qLower).find())) {
                        return cs;
                    }
                }
            }
        }
        // 2. Nếu hỏi về bản thân người đang đăng nhập
        if (asksAboutSelf && currentUserScore != null) {
            return currentUserScore;
        }
        // 3. Mặc định lấy thành viên đang quan sát trên đồ thị
        if (network != null && network.getFocusedUserId() != null) {
            ContributionDto focused = resolveScoreForUser(teamScores, network.getFocusedUserId());
            if (focused != null) return focused;
        }
        return currentUserScore != null ? currentUserScore : (teamScores != null && !teamScores.isEmpty() ? teamScores.get(0) : null);
    }

    String resolveApiKey() {
        String key = appProperties != null && appProperties.getGemini() != null
                ? appProperties.getGemini().getApiKey()
                : null;
        if (isBlankKey(key) && environment != null) {
            key = environment.getProperty("API_KEY");
            if (isBlankKey(key)) {
                key = environment.getProperty("GEMINI_API_KEY");
            }
        }
        if (isBlankKey(key)) {
            key = System.getenv("API_KEY");
            if (isBlankKey(key)) {
                key = System.getenv("GEMINI_API_KEY");
            }
        }
        return sanitizeApiKey(key);
    }

    private String resolveModel() {
        if (appProperties != null && appProperties.getGemini() != null
                && appProperties.getGemini().getModel() != null
                && !appProperties.getGemini().getModel().isBlank()) {
            return appProperties.getGemini().getModel().trim();
        }
        return DEFAULT_MODEL;
    }

    private static boolean isBlankKey(String k) {
        return k == null || k.isBlank();
    }

    private static String sanitizeApiKey(String raw) {
        if (raw == null) return null;
        String s = raw.trim();
        if (s.startsWith("=")) {
            s = s.substring(1).trim();
        }
        if ((s.startsWith("\"") && s.endsWith("\"")) || (s.startsWith("'") && s.endsWith("'"))) {
            s = s.substring(1, s.length() - 1).trim();
        }
        if (s.isBlank() || "...".equals(s) || "YOUR_API_KEY".equalsIgnoreCase(s)) {
            return null;
        }
        return s;
    }

    private double pctValue(ContributionDto cs) {
        if (cs == null) return 0.0;
        if (cs.getPercentage() != null) {
            double v = cs.getPercentage().doubleValue();
            return v <= 1.0 ? v * 100.0 : v;
        }
        return cs.getScore() != null ? cs.getScore().doubleValue() : 0.0;
    }

    private static double num(Double val) {
        return val != null ? val : 0.0;
    }

    private List<Card> filterCardsForMember(List<Card> cards, ContributionDto targetScore, String targetName) {
        if (cards == null || cards.isEmpty()) return List.of();
        Long targetUserId = targetScore != null ? targetScore.getUserId() : null;
        String cleanTargetName = stripRoleSuffix(targetName).toLowerCase(Locale.ROOT);
        return cards.stream()
                .filter(c -> c.getAssignee() != null && (
                        (targetUserId != null && targetUserId.equals(c.getAssignee().getId()))
                                || (!cleanTargetName.isEmpty() && c.getAssignee().getFullName() != null
                                && c.getAssignee().getFullName().toLowerCase(Locale.ROOT).contains(cleanTargetName))
                ))
                .toList();
    }

    private static boolean isDoneColumn(String colName) {
        if (colName == null) return false;
        String lower = colName.trim().toLowerCase(Locale.ROOT);
        return lower.equals("done") || lower.contains("hoàn thành") || lower.equals("completed");
    }

    private static String stripRoleSuffix(String name) {
        if (name == null) return "";
        return name.replaceAll("\\s*\\([^)]*\\)", "").trim();
    }

    private static boolean containsAny(String text, String... keywords) {
        for (String kw : keywords) {
            if (text.contains(kw)) return true;
        }
        return false;
    }

    private static String safeStr(String s, String fallback) {
        return (s != null && !s.isBlank()) ? s : fallback;
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return "";
        return s.length() <= maxLen ? s : s.substring(0, maxLen - 3) + "...";
    }
}
