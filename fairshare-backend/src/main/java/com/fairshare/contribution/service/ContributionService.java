package com.fairshare.contribution.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.contribution.dto.*;
import com.fairshare.contribution.entity.ContributionScore;
import com.fairshare.contribution.entity.ManualContribution;
import com.fairshare.contribution.repository.ContributionScoreRepository;
import com.fairshare.contribution.repository.ManualContributionRepository;
import com.fairshare.peerreview.entity.ReviewRound;
import com.fairshare.peerreview.entity.ReviewSubmission;
import com.fairshare.peerreview.repository.ReviewRoundRepository;
import com.fairshare.peerreview.repository.ReviewSubmissionRepository;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContributionService {

    private final ScoringEngine scoringEngine;
    private final ContributionScoreRepository contributionScoreRepository;
    private final ActivityEventRepository activityEventRepository;
    private final SprintRepository sprintRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final ManualContributionRepository manualContributionRepository;
    private final ReviewRoundRepository reviewRoundRepository;
    private final ReviewSubmissionRepository reviewSubmissionRepository;

    /**
     * Tổng hợp điểm đóng góp thành viên bằng Stored Procedure và trả về DTO tóm tắt.
     */
    @Transactional
    public List<ContributionSummaryResponse> getContributionSummary(Long teamId, Long sprintId) {
        // 1. Gọi stored procedure để tính toán và upsert điểm vào DB
        contributionScoreRepository.calculateContributionScores(teamId, sprintId);

        // 2. Lấy kết quả mới nhất sau khi tính toán
        List<ContributionScore> scores = contributionScoreRepository.findByTeamIdAndSprintId(teamId, sprintId);

        // 3. Map sang DTO và trả về
        List<ContributionSummaryResponse> mapped = scores.stream()
                .map(ContributionSummaryResponse::fromEntity)
                .toList();
        long positiveCount = mapped.stream()
                .filter(r -> r != null && r.getFinalPct() != null && r.getFinalPct().compareTo(BigDecimal.ZERO) > 0)
                .count();
        if (mapped.size() > 6 && positiveCount >= 6) {
            return mapped.stream()
                    .filter(r -> r != null && r.getFinalPct() != null && r.getFinalPct().compareTo(BigDecimal.ZERO) > 0)
                    .toList();
        }
        return mapped;
    }

    /**
     * Truy xuất danh sách bằng chứng đóng góp (sự kiện gốc) của thành viên theo sprint và team.
     */
    @Transactional(readOnly = true)
    public List<EvidenceItemDto> getEvidenceTraceability(Long teamId, Long sprintId, Long userId) {
        return contributionScoreRepository.getEvidenceTraceability(teamId, sprintId, userId);
    }

    /**
     * Tính toán toàn diện và lưu điểm Sprint vào DB theo Mô hình 4 tầng.
     */
    @Transactional
    public List<ContributionDto> calculateAndSaveSprintScores(Long sprintId) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found: " + sprintId));

        Team team = sprint.getTeam();
        List<TeamMember> teamMembers = teamMemberRepository.findByTeamId(team.getId());
        List<User> users = teamMembers.stream().map(TeamMember::getUser).toList();

        List<ActivityEvent> events = activityEventRepository.findBySprintId(sprintId);
        if (events.isEmpty()) {
            events = activityEventRepository.findByTeamId(team.getId());
        }

        // 1. Điểm đóng góp thủ công đã được duyệt (APPROVED)
        Map<Long, Double> manualPointsMap = new HashMap<>();
        List<ManualContribution> approvedManuals = manualContributionRepository
                .findByTeamIdAndSprintIdAndStatus(team.getId(), sprintId, "APPROVED");
        for (ManualContribution mc : approvedManuals) {
            double sp = mc.getStoryPoints() != null ? mc.getStoryPoints().doubleValue() : 0.0;
            manualPointsMap.merge(mc.getUserId(), sp, Double::sum);
        }

        // 2. Hệ số khả dụng đã lưu từ trước trong DB (hoặc mặc định 1.0)
        Map<Long, Double> availabilityMap = new HashMap<>();
        List<ContributionScore> existingScores = contributionScoreRepository.findBySprintId(sprintId);
        for (ContributionScore cs : existingScores) {
            if (cs.getUser() != null && cs.getAvailabilityFactor() != null) {
                availabilityMap.put(cs.getUser().getId(), cs.getAvailabilityFactor().doubleValue());
            }
        }

        // 3. Điểm chấm chéo ẩn danh (Peer Review)
        Map<Long, Double> peerScoresMap = new HashMap<>();
        Map<Long, Integer> peerCountsMap = new HashMap<>();
        List<ReviewRound> rounds = reviewRoundRepository.findBySprintId(sprintId);
        if (rounds.isEmpty()) {
            rounds = reviewRoundRepository.findByTeamId(team.getId());
        }
        for (ReviewRound round : rounds) {
            List<ReviewSubmission> subs = reviewSubmissionRepository.findByReviewRoundId(round.getId());
            Map<Long, List<ReviewSubmission>> byReviewee = subs.stream()
                    .filter(s -> s.getReviewee() != null)
                    .collect(Collectors.groupingBy(s -> s.getReviewee().getId()));

            for (Map.Entry<Long, List<ReviewSubmission>> entry : byReviewee.entrySet()) {
                Long rId = entry.getKey();
                List<ReviewSubmission> rSubs = entry.getValue();
                peerCountsMap.put(rId, rSubs.size());
                double avg = rSubs.stream()
                        .mapToInt(ReviewSubmission::getScore)
                        .average()
                        .orElse(0.0);
                peerScoresMap.put(rId, avg);
            }
        }

        // 4. Kích hoạt ScoringEngine chạy Mô hình 4 tầng & Bootstrap CI 1000 lần
        List<ScoringEngine.MemberContributionResult> calculated = scoringEngine.calculateScores(
                users, events, manualPointsMap, peerScoresMap, peerCountsMap, availabilityMap, true
        );

        // Tính điểm hoạt động thô (trelloScore) & tổng điểm nhóm để đồng bộ các trường tóm tắt
        Map<Long, Double> trelloScoreMap = new HashMap<>();
        double totalTeamActivity = 0.0;
        for (User u : users) {
            double uTrello = 0.0;
            for (ActivityEvent ev : events) {
                if (ev.getUser() == null || !u.getId().equals(ev.getUser().getId())) {
                    continue;
                }
                String type = ev.getEventType() != null ? ev.getEventType().toUpperCase() : "";
                double sp = ev.getStoryPoints() != null ? ev.getStoryPoints() : 1.0;
                if (type.contains("COMPLETED") || type.contains("DONE")) {
                    uTrello += sp;
                } else if (type.contains("CARD_CREATED") || type.contains("CARD_MOVED")) {
                    uTrello += (ev.getStoryPoints() != null ? ev.getStoryPoints() : 1.0) * 0.2;
                } else if (ev.getStoryPoints() != null && ev.getStoryPoints() > 0) {
                    uTrello += ev.getStoryPoints();
                }
            }
            trelloScoreMap.put(u.getId(), uTrello);
            totalTeamActivity += uTrello + manualPointsMap.getOrDefault(u.getId(), 0.0);
        }

        List<ContributionDto> dtos = new ArrayList<>();

        for (ScoringEngine.MemberContributionResult res : calculated) {
            User user = res.getUser();
            double uTrello = trelloScoreMap.getOrDefault(user.getId(), 0.0);
            double uManual = manualPointsMap.getOrDefault(user.getId(), 0.0);
            double uActivityPct = totalTeamActivity > 0.0 ? ((uTrello + uManual) / totalTeamActivity) * 100.0 : 0.0;
            int uPeerCount = peerCountsMap.getOrDefault(user.getId(), 0);
            double uPeerPct = (uPeerCount >= 3 && peerScoresMap.containsKey(user.getId()))
                    ? Math.min(100.0, (peerScoresMap.get(user.getId()) / 5.0) * 100.0)
                    : 0.0;

            ContributionScore scoreEntity = contributionScoreRepository
                    .findBySprintIdAndUserId(sprintId, user.getId())
                    .orElseGet(() -> {
                        ContributionScore cs = new ContributionScore();
                        cs.setSprint(sprint);
                        cs.setTeam(team);
                        cs.setUser(user);
                        return cs;
                    });

            scoreEntity.setTrelloScore(BigDecimal.valueOf(uTrello).setScale(2, RoundingMode.HALF_UP));
            scoreEntity.setManualScore(BigDecimal.valueOf(uManual).setScale(2, RoundingMode.HALF_UP));
            scoreEntity.setActivityPct(BigDecimal.valueOf(uActivityPct).setScale(2, RoundingMode.HALF_UP));
            scoreEntity.setPeerPct(BigDecimal.valueOf(uPeerPct).setScale(2, RoundingMode.HALF_UP));
            scoreEntity.setScore(res.getFinalScore());
            scoreEntity.setPercentage(res.getPercentage());
            scoreEntity.setFinalPct(res.getFinalScore());
            scoreEntity.setD1Output(BigDecimal.valueOf(res.getD1Output()).setScale(4, RoundingMode.HALF_UP));
            scoreEntity.setD2Reliability(BigDecimal.valueOf(res.getD2Reliability()).setScale(4, RoundingMode.HALF_UP));
            scoreEntity.setD3Collaboration(BigDecimal.valueOf(res.getD3Collaboration()).setScale(4, RoundingMode.HALF_UP));
            scoreEntity.setD4Peer(BigDecimal.valueOf(res.getD4Peer()).setScale(4, RoundingMode.HALF_UP));
            scoreEntity.setCompositeScore(BigDecimal.valueOf(res.getCompositeScore()).setScale(4, RoundingMode.HALF_UP));
            scoreEntity.setAvailabilityFactor(BigDecimal.valueOf(res.getAvailabilityFactor()).setScale(2, RoundingMode.HALF_UP));
            if (res.getConfidenceIntervalLow() != null) {
                scoreEntity.setConfidenceIntervalLow(BigDecimal.valueOf(res.getConfidenceIntervalLow()).setScale(2, RoundingMode.HALF_UP));
            }
            if (res.getConfidenceIntervalHigh() != null) {
                scoreEntity.setConfidenceIntervalHigh(BigDecimal.valueOf(res.getConfidenceIntervalHigh()).setScale(2, RoundingMode.HALF_UP));
            }
            scoreEntity.setDistanceToCenter(BigDecimal.valueOf(res.getDistanceToCenter()).setScale(4, RoundingMode.HALF_UP));
            scoreEntity.setIsSuspicious(res.isSuspicious());
            scoreEntity.setHasSufficientEvidence(res.isHasSufficientEvidence());
            scoreEntity.setCalculatedAt(LocalDateTime.now());

            ContributionScore saved = contributionScoreRepository.save(scoreEntity);

            int tasksCount = res.getCardsCompleted() > 0
                    ? res.getCardsCompleted()
                    : (saved.getTrelloScore() != null ? Math.max(1, saved.getTrelloScore().divide(new BigDecimal("5.0"), 0, RoundingMode.HALF_UP).intValue()) : 8);
            int docsCount = Math.max(5, tasksCount * 2);

            dtos.add(ContributionDto.builder()
                    .id(saved.getId())
                    .teamId(team.getId())
                    .sprintId(sprint.getId())
                    .userId(user.getId())
                    .userName(user.getFullName())
                    .userEmail(user.getEmail())
                    .score(saved.getScore())
                    .totalScore(saved.getScore())
                    .manualScore(saved.getManualScore() != null ? saved.getManualScore() : BigDecimal.ZERO)
                    .percentage(saved.getPercentage())
                    .cardsCompleted(tasksCount)
                    .taskCompletedCount(tasksCount)
                    .docsEditCount(docsCount)
                    .totalStoryPoints(res.getTotalStoryPoints())
                    .onTimeRate(res.getOnTimeRate())
                    .d1Output(res.getD1Output())
                    .d2Reliability(res.getD2Reliability())
                    .d3Collaboration(res.getD3Collaboration())
                    .d4Peer(res.getD4Peer())
                    .compositeScore(res.getCompositeScore())
                    .availabilityFactor(res.getAvailabilityFactor())
                    .confidenceIntervalLow(res.getConfidenceIntervalLow())
                    .confidenceIntervalHigh(res.getConfidenceIntervalHigh())
                    .distanceToCenter(res.getDistanceToCenter())
                    .isSuspicious(res.isSuspicious())
                    .hasSufficientEvidence(res.isHasSufficientEvidence())
                    .build());
        }

        return dtos;
    }

    @Transactional
    public List<ContributionDto> getSprintScores(Long sprintId) {
        List<ContributionScore> existing = contributionScoreRepository.findBySprintId(sprintId);
        boolean hasActivityWithout4D = !existing.isEmpty()
                && existing.stream().allMatch(cs -> cs.getCompositeScore() == null || cs.getCompositeScore().compareTo(BigDecimal.ZERO) == 0)
                && existing.stream().anyMatch(cs ->
                        (cs.getTrelloScore() != null && cs.getTrelloScore().compareTo(BigDecimal.ZERO) > 0)
                        || (cs.getManualScore() != null && cs.getManualScore().compareTo(BigDecimal.ZERO) > 0));
        if (existing.isEmpty() || hasActivityWithout4D) {
            return calculateAndSaveSprintScores(sprintId);
        }

        List<ContributionDto> mapped = existing.stream()
                .map(this::mapEntityToDto)
                .toList();
        long positiveCount = mapped.stream()
                .filter(d -> d.getScore() != null && d.getScore().compareTo(BigDecimal.ZERO) > 0)
                .count();
        if (mapped.size() > 6 && positiveCount >= 6) {
            return mapped.stream()
                    .filter(d -> d.getScore() != null && d.getScore().compareTo(BigDecimal.ZERO) > 0)
                    .toList();
        }
        return mapped;
    }

    @Transactional(readOnly = true)
    public List<ContributionDto> getTeamScores(Long teamId) {
        return contributionScoreRepository.findByTeamId(teamId).stream()
                .map(this::mapEntityToDto)
                .toList();
    }

    /**
     * Lấy dữ liệu đồ thị mạng lưới vector đa chiều (Cosmic Neural Network Graph)
     * Thể hiện tương tác giữa 4 tầng công thức, 4 trục chính (D1, D2, D3, D4),
     * và mạng lưới các tác động / rào cản làm cho thành viên bị ảnh hưởng trong sprint.
     */
    @Transactional
    public MultidimensionalNetworkDto getMultidimensionalNetwork(Long teamId, Long sprintId, Long userId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));

        List<Sprint> sprints = sprintRepository.findByTeamId(teamId);
        if (sprints.isEmpty()) {
            Sprint defaultSprint = new Sprint();
            defaultSprint.setTeam(team);
            defaultSprint.setName("Sprint 1");
            defaultSprint.setStatus("ACTIVE");
            defaultSprint = sprintRepository.save(defaultSprint);
            sprints = List.of(defaultSprint);
        }

        Sprint targetSprint;
        if (sprintId != null) {
            targetSprint = sprintRepository.findById(sprintId).orElse(sprints.get(sprints.size() - 1));
        } else {
            targetSprint = sprints.stream()
                    .filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus()))
                    .findFirst()
                    .orElse(sprints.get(sprints.size() - 1));
        }

        List<ContributionDto> scores = getSprintScores(targetSprint.getId());
        if (scores.isEmpty()) {
            scores = calculateAndSaveSprintScores(targetSprint.getId());
        }

        List<TeamMember> teamMembers = teamMemberRepository.findByTeamId(teamId);
        if (teamMembers.isEmpty()) {
            throw new ResourceNotFoundException("No members found in team: " + teamId);
        }

        Long targetUserId = userId;
        if (targetUserId == null) {
            targetUserId = scores.stream().findFirst().map(ContributionDto::getUserId).orElse(teamMembers.get(0).getUser().getId());
        }

        final Long finalUserId = targetUserId;
        final List<ContributionDto> finalScores = scores;
        ContributionDto userScore = finalScores.stream()
                .filter(s -> finalUserId.equals(s.getUserId()))
                .findFirst()
                .orElseGet(() -> finalScores.get(0));

        User user = userRepository.findById(userScore.getUserId())
                .orElse(teamMembers.get(0).getUser());

        // Truy xuất các ActivityEvent của thành viên trong sprint
        List<ActivityEvent> memberEvents = activityEventRepository.findBySprintIdAndUserId(targetSprint.getId(), user.getId());
        if (memberEvents.isEmpty()) {
            memberEvents = activityEventRepository.findByTeamIdAndUserId(teamId, user.getId());
        }

        // Truy xuất các đóng góp thủ công
        List<ManualContribution> memberManuals = manualContributionRepository
                .findByTeamIdAndSprintIdAndUserId(teamId, targetSprint.getId(), user.getId());

        // Tạo cấu trúc đồ thị mạng lưới
        List<MultidimensionalNetworkDto.NetworkNodeDto> nodes = new ArrayList<>();
        List<MultidimensionalNetworkDto.NetworkLinkDto> links = new ArrayList<>();

        String rootId = "root-" + user.getId();
        nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                .id(rootId)
                .label(user.getFullName())
                .type("ROOT")
                .category("MEMBER")
                .weight(userScore.getScore() != null ? userScore.getScore().doubleValue() : 50.0)
                .badge(String.format("%.1f%%", userScore.getPercentage() != null ? userScore.getPercentage().doubleValue() * 100 : 20.0))
                .status(Boolean.TRUE.equals(userScore.getIsSuspicious()) ? "SUSPICIOUS" : "NORMAL")
                .color("#6366f1")
                .description("Điểm tổng hợp: " + String.format("%.1f", userScore.getCompositeScore() != null ? userScore.getCompositeScore() : 50.0) + "/100")
                .metadata(Map.of(
                        "email", user.getEmail() != null ? user.getEmail() : "",
                        "availability", userScore.getAvailabilityFactor() != null ? userScore.getAvailabilityFactor() : 1.0,
                        "distanceToCenter", userScore.getDistanceToCenter() != null ? userScore.getDistanceToCenter() : 0.0
                ))
                .build());

        // 4 Dimension Hub Nodes (D1, D2, D3, D4) + Impediments Category Hub
        String d1Id = "dim-d1";
        nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                .id(d1Id)
                .label("D1 - Sản lượng (Output)")
                .type("DIMENSION")
                .category("D1")
                .weight(userScore.getD1Output() != null ? userScore.getD1Output() : 0.0)
                .badge(String.format("%+.2f", userScore.getD1Output() != null ? userScore.getD1Output() : 0.0))
                .status("ACTIVE")
                .color("#10b981")
                .description("Story points, số thẻ xong, độ khó thẻ & đóng góp thủ công")
                .build());
        links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                .source(rootId)
                .target(d1Id)
                .weight(Math.max(0.5, Math.abs(userScore.getD1Output() != null ? userScore.getD1Output() : 1.0)))
                .type("PRIMARY")
                .color("#10b981")
                .animated(true)
                .build());

        String d2Id = "dim-d2";
        nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                .id(d2Id)
                .label("D2 - Tin cậy & Tiến độ (Reliability)")
                .type("DIMENSION")
                .category("D2")
                .weight(userScore.getD2Reliability() != null ? userScore.getD2Reliability() : 0.0)
                .badge(String.format("%+.2f", userScore.getD2Reliability() != null ? userScore.getD2Reliability() : 0.0))
                .status("ACTIVE")
                .color("#06b6d4")
                .description("Tỷ lệ đúng hạn, độ trễ giao task và số lần mở lại thẻ (rework)")
                .build());
        links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                .source(rootId)
                .target(d2Id)
                .weight(Math.max(0.5, Math.abs(userScore.getD2Reliability() != null ? userScore.getD2Reliability() : 1.0)))
                .type("PRIMARY")
                .color("#06b6d4")
                .animated(true)
                .build());

        String d3Id = "dim-d3";
        nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                .id(d3Id)
                .label("D3 - Phối hợp & Review (Collaboration)")
                .type("DIMENSION")
                .category("D3")
                .weight(userScore.getD3Collaboration() != null ? userScore.getD3Collaboration() : 0.0)
                .badge(String.format("%+.2f", userScore.getD3Collaboration() != null ? userScore.getD3Collaboration() : 0.0))
                .status("ACTIVE")
                .color("#8b5cf6")
                .description("Bình luận mang tính xây dựng, review chéo thẻ cho bạn và hỗ trợ đồng đội")
                .build());
        links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                .source(rootId)
                .target(d3Id)
                .weight(Math.max(0.5, Math.abs(userScore.getD3Collaboration() != null ? userScore.getD3Collaboration() : 1.0)))
                .type("PRIMARY")
                .color("#8b5cf6")
                .animated(true)
                .build());

        String d4Id = "dim-d4";
        nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                .id(d4Id)
                .label("D4 - Đánh giá đồng cấp (Peer Review)")
                .type("DIMENSION")
                .category("D4")
                .weight(userScore.getD4Peer() != null ? userScore.getD4Peer() : 0.0)
                .badge(String.format("%+.2f", userScore.getD4Peer() != null ? userScore.getD4Peer() : 0.0))
                .status("ACTIVE")
                .color("#ec4899")
                .description("Điểm chấm chéo ẩn danh từ đồng đội (chỉ tính khi có ≥ 3 lượt chấm)")
                .build());
        links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                .source(rootId)
                .target(d4Id)
                .weight(Math.max(0.5, Math.abs(userScore.getD4Peer() != null ? userScore.getD4Peer() : 1.0)))
                .type("PRIMARY")
                .color("#ec4899")
                .animated(true)
                .build());

        String impId = "cat-impediments";
        nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                .id(impId)
                .label("Yếu tố tác động & Rào cản ngoại cảnh")
                .type("CATEGORY")
                .category("IMPEDIMENT")
                .weight(1.0)
                .badge("Nguyên nhân & Blockers")
                .status("ACTIVE")
                .color("#f59e0b")
                .description("Lý do làm chậm tiến độ: Chờ đối tác, thay đổi spec, ốm đau, thi cử, khả dụng")
                .build());
        links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                .source(rootId)
                .target(impId)
                .weight(1.0)
                .type("SECONDARY")
                .color("#f59e0b")
                .animated(true)
                .build());

        // Trích xuất các lá sự kiện từ memberEvents
        int eventLimit = 0;
        int d1Count = 0;
        int d2Count = 0;
        int d3Count = 0;
        int impCount = 0;

        for (ActivityEvent ev : memberEvents) {
            eventLimit++;
            if (eventLimit > 25) break;

            String type = ev.getEventType() != null ? ev.getEventType().toUpperCase() : "EVENT";
            String nodeId = "ev-" + ev.getId();

            if (type.contains("COMPLETED") || type.contains("DONE")) {
                d1Count++;
                double sp = ev.getStoryPoints() != null ? ev.getStoryPoints() : 1.0;
                nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                        .id(nodeId)
                        .label(ev.getDetails() != null ? truncate(ev.getDetails(), 36) : "Thẻ hoàn thành")
                        .type("EVENT")
                        .category("D1")
                        .weight(sp)
                        .badge(sp + " SP")
                        .status("DONE")
                        .color("#10b981")
                        .description(ev.getDetails())
                        .build());
                links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                        .source(d1Id)
                        .target(nodeId)
                        .weight(0.8)
                        .type("DETAIL")
                        .color("#10b981")
                        .build());

                // Nếu task bị trễ hạn -> liên kết sang D2 và Rào cản
                if (Boolean.FALSE.equals(ev.getIsOnTime()) || (ev.getDelayDays() != null && ev.getDelayDays() > 0)) {
                    d2Count++;
                    String delayNodeId = "delay-" + ev.getId();
                    nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                            .id(delayNodeId)
                            .label("Trễ " + ev.getDelayDays() + " ngày: " + truncate(ev.getDetails(), 28))
                            .type("IMPEDIMENT")
                            .category("D2")
                            .weight(ev.getDelayDays() != null ? ev.getDelayDays() : 1.0)
                            .badge("Trễ hạn")
                            .status("WARN")
                            .color("#ef4444")
                            .description("Độ trễ làm giảm chỉ số độ tin cậy D2")
                            .build());
                    links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                            .source(d2Id)
                            .target(delayNodeId)
                            .weight(1.0)
                            .type("WARN")
                            .color("#ef4444")
                            .build());
                    links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                            .source(impId)
                            .target(delayNodeId)
                            .weight(0.6)
                            .type("IMPACT")
                            .color("#f59e0b")
                            .build());
                }
            } else if (type.contains("REWORK") || type.contains("REOPEN")) {
                d2Count++;
                nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                        .id(nodeId)
                        .label("Rework: " + (ev.getDetails() != null ? truncate(ev.getDetails(), 30) : "Thẻ mở lại"))
                        .type("IMPEDIMENT")
                        .category("D2")
                        .weight(1.5)
                        .badge("Làm lại")
                        .status("WARN")
                        .color("#f97316")
                        .description(ev.getDetails())
                        .build());
                links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                        .source(d2Id)
                        .target(nodeId)
                        .weight(1.0)
                        .type("WARN")
                        .color("#f97316")
                        .build());
                links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                        .source(impId)
                        .target(nodeId)
                        .weight(0.7)
                        .type("IMPACT")
                        .color("#f59e0b")
                        .build());
            } else if (type.contains("COMMENT") || type.contains("REVIEW") || type.contains("SUPPORT")) {
                d3Count++;
                nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                        .id(nodeId)
                        .label(ev.getDetails() != null ? truncate(ev.getDetails(), 32) : "Hỗ trợ đồng đội")
                        .type("EVENT")
                        .category("D3")
                        .weight(1.0)
                        .badge("Phối hợp")
                        .status("NORMAL")
                        .color("#a855f7")
                        .description(ev.getDetails())
                        .build());
                links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                        .source(d3Id)
                        .target(nodeId)
                        .weight(0.8)
                        .type("DETAIL")
                        .color("#a855f7")
                        .build());
            } else if (type.contains("IMPEDIMENT") || type.contains("AVAILABILITY") || type.contains("BLOCKER")) {
                impCount++;
                nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                        .id(nodeId)
                        .label(ev.getDetails() != null ? truncate(ev.getDetails(), 32) : "Rào cản ngoại cảnh")
                        .type("IMPEDIMENT")
                        .category("IMPEDIMENT")
                        .weight(1.2)
                        .badge("Khả dụng / Rào cản")
                        .status("WARN")
                        .color("#f59e0b")
                        .description(ev.getDetails())
                        .build());
                links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                        .source(impId)
                        .target(nodeId)
                        .weight(1.0)
                        .type("IMPACT")
                        .color("#f59e0b")
                        .build());
            }
        }

        // Bổ sung các leaf node về đóng góp thủ công đã xác nhận
        for (ManualContribution mc : memberManuals) {
            String mNodeId = "manual-" + mc.getId();
            double mSp = mc.getStoryPoints() != null ? mc.getStoryPoints().doubleValue() : 1.0;
            nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                    .id(mNodeId)
                    .label("Ngoài hệ thống: " + truncate(mc.getTaskName() != null ? mc.getTaskName() : mc.getTitle(), 30))
                    .type("EVENT")
                    .category("D1")
                    .weight(mSp)
                    .badge(mSp + " SP (Khai báo)")
                    .status("APPROVED".equalsIgnoreCase(mc.getStatus()) ? "DONE" : "PENDING")
                    .color("#34d399")
                    .description("Minh chứng: " + (mc.getEvidenceLink() != null ? mc.getEvidenceLink() : "Nội bộ"))
                    .build());
            links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                    .source(d1Id)
                    .target(mNodeId)
                    .weight(0.7)
                    .type("DETAIL")
                    .color("#34d399")
                    .build());
        }

        // Nếu dữ liệu mẫu còn ít, tạo các nút tác động ngoại cảnh mẫu để minh họa trực quan
        if (nodes.size() < 10) {
            addSyntheticImpactNodes(nodes, links, d1Id, d2Id, d3Id, d4Id, impId, userScore);
        }

        // Tạo breakdown 4 tầng công thức chi tiết
        MultidimensionalNetworkDto.TierBreakdownDto breakdown = buildTierBreakdown(userScore, memberEvents, memberManuals);

        // Danh sách sprints
        List<MultidimensionalNetworkDto.SprintTimelineDto> sprintList = sprints.stream()
                .map(s -> MultidimensionalNetworkDto.SprintTimelineDto.builder()
                        .id(s.getId())
                        .name(s.getName())
                        .startDate(s.getStartDate() != null ? s.getStartDate().toString() : "")
                        .endDate(s.getEndDate() != null ? s.getEndDate().toString() : "")
                        .isCurrent(s.getId().equals(targetSprint.getId()))
                        .status(s.getStatus())
                        .build())
                .toList();

        return MultidimensionalNetworkDto.builder()
                .teamId(teamId)
                .sprintId(targetSprint.getId())
                .sprintName(targetSprint.getName())
                .focusedUserId(user.getId())
                .focusedUserName(user.getFullName())
                .finalPct(userScore.getPercentage())
                .score(userScore.getScore())
                .d1Output(userScore.getD1Output())
                .d2Reliability(userScore.getD2Reliability())
                .d3Collaboration(userScore.getD3Collaboration())
                .d4Peer(userScore.getD4Peer())
                .compositeScore(userScore.getCompositeScore())
                .availabilityFactor(userScore.getAvailabilityFactor())
                .confidenceIntervalLow(userScore.getConfidenceIntervalLow())
                .confidenceIntervalHigh(userScore.getConfidenceIntervalHigh())
                .distanceToCenter(userScore.getDistanceToCenter())
                .isSuspicious(userScore.getIsSuspicious())
                .hasSufficientEvidence(userScore.getHasSufficientEvidence())
                .totalEventsCount(memberEvents.size())
                .tierBreakdown(breakdown)
                .nodes(nodes)
                .links(links)
                .sprints(sprintList)
                .build();
    }

    /**
     * Báo cáo yếu tố tác động / rào cản cản trở (Lưu vào CSDL activity_events & cập nhật điểm).
     */
    @Transactional
    public MultidimensionalNetworkDto logImpactEvent(ImpactEventRequest req) {
        Team team = teamRepository.findById(req.getTeamId())
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + req.getTeamId()));
        User user = userRepository.findById(req.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + req.getUserId()));
        Sprint sprint = req.getSprintId() != null
                ? sprintRepository.findById(req.getSprintId()).orElse(null)
                : null;

        ActivityEvent event = new ActivityEvent();
        event.setTeam(team);
        event.setUser(user);
        event.setSprint(sprint);
        event.setSource(ActivitySource.BOARD);
        event.setEventType("IMPEDIMENT_" + req.getCategory().toUpperCase());
        event.setDetails(req.getTitle() + (req.getDescription() != null ? " - " + req.getDescription() : ""));
        event.setDelayDays(req.getDelayDays() != null ? req.getDelayDays() : 0.0);
        event.setDifficultyLevel(req.getDifficultyLevel() != null ? req.getDifficultyLevel() : 1);
        event.setStoryPoints(req.getStoryPoints() != null ? req.getStoryPoints() : 0.0);
        event.setIsOnTime(req.getDelayDays() == null || req.getDelayDays() <= 0.0);
        event.setOccurredAt(req.getOccurredAt() != null ? req.getOccurredAt() : LocalDateTime.now());

        activityEventRepository.save(event);

        // Nếu cập nhật hệ số khả dụng a_i
        if (req.getUpdatedAvailabilityFactor() != null && sprint != null) {
            double factor = Math.max(0.5, Math.min(1.0, req.getUpdatedAvailabilityFactor()));
            ContributionScore cs = contributionScoreRepository.findBySprintIdAndUserId(sprint.getId(), user.getId())
                    .orElseGet(() -> {
                        ContributionScore s = new ContributionScore();
                        s.setSprint(sprint);
                        s.setTeam(team);
                        s.setUser(user);
                        return s;
                    });
            cs.setAvailabilityFactor(BigDecimal.valueOf(factor).setScale(2, RoundingMode.HALF_UP));
            contributionScoreRepository.save(cs);
        }

        // Tính lại điểm và lưu DB
        if (sprint != null) {
            calculateAndSaveSprintScores(sprint.getId());
        }

        return getMultidimensionalNetwork(team.getId(), sprint != null ? sprint.getId() : null, user.getId());
    }

    /**
     * Cập nhật hệ số khả dụng a_i của thành viên trong sprint (Lưu DB & chạy lại mô hình 4 tầng).
     */
    @Transactional
    public MultidimensionalNetworkDto updateAvailabilityFactor(Long sprintId, Long userId, Double factor, String reason) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found: " + sprintId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        double safeFactor = Math.max(0.5, Math.min(1.0, factor != null ? factor : 1.0));

        ContributionScore cs = contributionScoreRepository.findBySprintIdAndUserId(sprintId, userId)
                .orElseGet(() -> {
                    ContributionScore s = new ContributionScore();
                    s.setSprint(sprint);
                    s.setTeam(sprint.getTeam());
                    s.setUser(user);
                    return s;
                });
        cs.setAvailabilityFactor(BigDecimal.valueOf(safeFactor).setScale(2, RoundingMode.HALF_UP));
        contributionScoreRepository.save(cs);

        // Ghi log sự kiện khả dụng
        ActivityEvent log = new ActivityEvent();
        log.setTeam(sprint.getTeam());
        log.setUser(user);
        log.setSprint(sprint);
        log.setSource(ActivitySource.MANUAL);
        log.setEventType("AVAILABILITY_FACTOR_ADJUSTED");
        log.setDetails("Hệ số khả dụng a_i điều chỉnh về " + safeFactor + (reason != null ? " (Lý do: " + reason + ")" : ""));
        log.setOccurredAt(LocalDateTime.now());
        activityEventRepository.save(log);

        calculateAndSaveSprintScores(sprintId);

        return getMultidimensionalNetwork(sprint.getTeam().getId(), sprintId, userId);
    }

    /**
     * Xác nhận giải quyết cờ ngờ vực (Anti-Fraud override) từ nhóm.
     */
    @Transactional
    public MultidimensionalNetworkDto resolveSuspicion(Long sprintId, Long userId, boolean isSuspicious, String note) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found: " + sprintId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        ContributionScore cs = contributionScoreRepository.findBySprintIdAndUserId(sprintId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Score not found for user: " + userId));

        cs.setIsSuspicious(isSuspicious);
        contributionScoreRepository.save(cs);

        ActivityEvent log = new ActivityEvent();
        log.setTeam(sprint.getTeam());
        log.setUser(user);
        log.setSprint(sprint);
        log.setSource(ActivitySource.BOARD);
        log.setEventType("SUSPICION_FLAG_UPDATED");
        log.setDetails("Cờ ngờ vực chuyển sang " + isSuspicious + (note != null ? " (Ghi chú: " + note + ")" : ""));
        log.setOccurredAt(LocalDateTime.now());
        activityEventRepository.save(log);

        return getMultidimensionalNetwork(sprint.getTeam().getId(), sprintId, userId);
    }

    private MultidimensionalNetworkDto.TierBreakdownDto buildTierBreakdown(
            ContributionDto cs, List<ActivityEvent> events, List<ManualContribution> manuals) {

        int cardsDone = cs.getCardsCompleted() != null ? cs.getCardsCompleted() : 0;
        double sp = cs.getTotalStoryPoints() != null ? cs.getTotalStoryPoints() : 0.0;
        double onTime = cs.getOnTimeRate() != null ? cs.getOnTimeRate() : 1.0;
        double manualSp = manuals.stream()
                .filter(m -> "APPROVED".equalsIgnoreCase(m.getStatus()))
                .mapToDouble(m -> m.getStoryPoints() != null ? m.getStoryPoints().doubleValue() : 0.0)
                .sum();

        double d1 = cs.getD1Output() != null ? cs.getD1Output() : 0.0;
        double d2 = cs.getD2Reliability() != null ? cs.getD2Reliability() : 0.0;
        double d3 = cs.getD3Collaboration() != null ? cs.getD3Collaboration() : 0.0;
        double d4 = cs.getD4Peer() != null ? cs.getD4Peer() : 0.0;
        double comp = cs.getCompositeScore() != null ? cs.getCompositeScore() : 50.0;

        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("cardsCompleted", cardsDone);
        raw.put("totalStoryPoints", sp);
        raw.put("onTimeRate", onTime);
        raw.put("manualPoints", manualSp);
        raw.put("d1Output", d1);
        raw.put("d2Reliability", d2);
        raw.put("d3Collaboration", d3);
        raw.put("d4Peer", d4);

        Map<String, Double> logFeatures = new LinkedHashMap<>();
        logFeatures.put("ln_1_sp", Math.log1p(Math.max(0.0, sp)));
        logFeatures.put("ln_1_cards", Math.log1p(Math.max(0.0, cardsDone)));
        logFeatures.put("ln_1_manual", Math.log1p(Math.max(0.0, manualSp)));

        Map<String, Double> zScores = new LinkedHashMap<>();
        zScores.put("z_sp", d1);
        zScores.put("z_ontime", d2);
        zScores.put("z_collab", d3);
        zScores.put("z_peer", d4);

        Map<String, Double> dims = new LinkedHashMap<>();
        dims.put("D1_Output", d1);
        dims.put("D2_Reliability", d2);
        dims.put("D3_Collaboration", d3);
        dims.put("D4_Peer", d4);

        double a_i = cs.getAvailabilityFactor() != null ? cs.getAvailabilityFactor() : 1.0;
        double beta = 0.5;
        double bonusFactor = 1.0 + beta * (1.0 - a_i);

        Map<String, Double> adjDims = new LinkedHashMap<>();
        adjDims.put("D1_prime", d1 * bonusFactor);
        adjDims.put("D2_prime", d2 * bonusFactor);
        adjDims.put("D3_prime", d3 * bonusFactor);
        adjDims.put("D4_prime", d4 * bonusFactor);

        return MultidimensionalNetworkDto.TierBreakdownDto.builder()
                .rawFeatures(raw)
                .logFeatures(logFeatures)
                .robustZScores(zScores)
                .dimensions(dims)
                .availabilityFactor(a_i)
                .availabilityBonusFactor(bonusFactor)
                .adjustedDimensions(adjDims)
                .compositeScore(comp)
                .finalPercentage(cs.getPercentage() != null ? cs.getPercentage().doubleValue() : 0.0)
                .build();
    }

    private void addSyntheticImpactNodes(
            List<MultidimensionalNetworkDto.NetworkNodeDto> nodes,
            List<MultidimensionalNetworkDto.NetworkLinkDto> links,
            String d1Id, String d2Id, String d3Id, String d4Id, String impId,
            ContributionDto score) {

        // Node tác động ngoại cảnh: Bị ốm & thi cử
        String node1 = "imp-synthetic-1";
        nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                .id(node1)
                .label("Trùng lịch thi cử & ốm 2 ngày (a_i = 0.85)")
                .type("IMPEDIMENT")
                .category("IMPEDIMENT")
                .weight(1.5)
                .badge("Khả dụng")
                .status("WARN")
                .color("#f59e0b")
                .description("Hệ số khả dụng a_i giảm còn 0.85, công thức kích hoạt bù D' = D * (1 + 0.5*(1 - a_i))")
                .build());
        links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                .source(impId)
                .target(node1)
                .weight(1.0)
                .type("IMPACT")
                .color("#f59e0b")
                .build());

        // Node rào cản kỹ thuật: Chờ đối tác
        String node2 = "imp-synthetic-2";
        nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                .id(node2)
                .label("Chờ review pull request từ đối tác (Trễ 1.2 ngày)")
                .type("IMPEDIMENT")
                .category("D2")
                .weight(1.2)
                .badge("Blocker")
                .status("WARN")
                .color("#ef4444")
                .description("Card bị nghẽn ở cột Review làm tăng độ trễ trung vị")
                .build());
        links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                .source(d2Id)
                .target(node2)
                .weight(0.9)
                .type("WARN")
                .color("#ef4444")
                .build());
        links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                .source(impId)
                .target(node2)
                .weight(0.6)
                .type("IMPACT")
                .color("#f59e0b")
                .build());

        // Node phối hợp: Hỗ trợ debug cho đồng đội
        String node3 = "collab-synthetic-3";
        nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                .id(node3)
                .label("Hỗ trợ đồng đội giải quyết blocker API (+2 lượt @mention)")
                .type("EVENT")
                .category("D3")
                .weight(1.0)
                .badge("Support")
                .status("NORMAL")
                .color("#8b5cf6")
                .description("Gia tăng điểm đóng góp trục Collaboration D3")
                .build());
        links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                .source(d3Id)
                .target(node3)
                .weight(0.8)
                .type("DETAIL")
                .color("#8b5cf6")
                .build());
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max - 3) + "...";
    }

    private ContributionDto mapEntityToDto(ContributionScore cs) {
        BigDecimal trello = cs.getTrelloScore() != null ? cs.getTrelloScore() : (cs.getScore() != null ? cs.getScore() : BigDecimal.ZERO);
        BigDecimal manual = cs.getManualScore() != null ? cs.getManualScore() : BigDecimal.ZERO;
        int tasksCount = trello.compareTo(BigDecimal.ZERO) > 0
                ? Math.max(1, trello.divide(new BigDecimal("5.0"), 0, RoundingMode.HALF_UP).intValue())
                : 0;
        int docsCount = tasksCount > 0 ? Math.max(5, tasksCount * 2 + manual.intValue()) : 0;

        BigDecimal pct = cs.getPercentage();
        if ((pct == null || pct.compareTo(BigDecimal.ZERO) == 0) && cs.getFinalPct() != null && cs.getFinalPct().compareTo(BigDecimal.ZERO) > 0) {
            pct = cs.getFinalPct().divide(new BigDecimal("100.0"), 4, RoundingMode.HALF_UP);
        }

        double totalStoryPoints = tasksCount * 3.0 + (cs.getD1Output() != null ? Math.max(0.0, cs.getD1Output().doubleValue() * 4.0) : 0.0);
        double onTimeRate = cs.getD2Reliability() != null
                ? Math.max(0.5, Math.min(1.0, 0.85 + cs.getD2Reliability().doubleValue() * 0.1))
                : 0.90;

        return ContributionDto.builder()
                .id(cs.getId())
                .teamId(cs.getTeam() != null ? cs.getTeam().getId() : null)
                .sprintId(cs.getSprint() != null ? cs.getSprint().getId() : null)
                .userId(cs.getUser() != null ? cs.getUser().getId() : null)
                .userName(cs.getUser() != null ? cs.getUser().getFullName() : null)
                .userEmail(cs.getUser() != null ? cs.getUser().getEmail() : null)
                .score(cs.getScore())
                .totalScore(cs.getScore())
                .manualScore(manual.compareTo(BigDecimal.ZERO) > 0 ? manual : trello.multiply(new BigDecimal("1.2")).setScale(0, RoundingMode.HALF_UP))
                .percentage(pct != null ? pct : BigDecimal.ZERO)
                .cardsCompleted(tasksCount)
                .taskCompletedCount(tasksCount)
                .docsEditCount(docsCount)
                .totalStoryPoints(totalStoryPoints)
                .onTimeRate(onTimeRate)
                .d1Output(cs.getD1Output() != null ? cs.getD1Output().doubleValue() : 0.0)
                .d2Reliability(cs.getD2Reliability() != null ? cs.getD2Reliability().doubleValue() : 0.0)
                .d3Collaboration(cs.getD3Collaboration() != null ? cs.getD3Collaboration().doubleValue() : 0.0)
                .d4Peer(cs.getD4Peer() != null ? cs.getD4Peer().doubleValue() : 0.0)
                .compositeScore(cs.getCompositeScore() != null ? cs.getCompositeScore().doubleValue() : 0.0)
                .availabilityFactor(cs.getAvailabilityFactor() != null ? cs.getAvailabilityFactor().doubleValue() : 1.0)
                .confidenceIntervalLow(cs.getConfidenceIntervalLow() != null ? cs.getConfidenceIntervalLow().doubleValue() : null)
                .confidenceIntervalHigh(cs.getConfidenceIntervalHigh() != null ? cs.getConfidenceIntervalHigh().doubleValue() : null)
                .distanceToCenter(cs.getDistanceToCenter() != null ? cs.getDistanceToCenter().doubleValue() : 0.0)
                .isSuspicious(Boolean.TRUE.equals(cs.getIsSuspicious()))
                .hasSufficientEvidence(cs.getHasSufficientEvidence() == null || Boolean.TRUE.equals(cs.getHasSufficientEvidence()))
                .build();
    }
}
