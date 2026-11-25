package com.fairshare.contribution.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.board.entity.Card;
import com.fairshare.board.repository.CardRepository;
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
import com.fairshare.team.entity.MemberRole;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
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
    private final CardRepository cardRepository;

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
     * Tự động dự phòng truy vấn JPA nếu Stored Procedure chưa sẵn sàng hoặc gặp sự cố ánh xạ.
     */
    @Transactional(readOnly = true)
    public List<EvidenceItemDto> getEvidenceTraceability(Long teamId, Long sprintId, Long userId) {
        try {
            List<EvidenceItemDto> results = contributionScoreRepository.getEvidenceTraceability(teamId, sprintId, userId);
            if (results != null) {
                return results;
            }
        } catch (Exception ex) {
            org.slf4j.LoggerFactory.getLogger(ContributionService.class).warn(
                    "Stored Procedure sp_get_evidence_traceability failed or unavailable for teamId={}, sprintId={}, userId={}. Falling back to JPA query: {}",
                    teamId, sprintId, userId, ex.getMessage());
        }

        // Robust JPA Fallback to prevent HTTP 500 under any circumstances
        List<EvidenceItemDto> fallbackList = new ArrayList<>();
        try {
            List<ActivityEvent> events = sprintId != null
                    ? activityEventRepository.findBySprintIdAndUserId(sprintId, userId)
                    : activityEventRepository.findByTeamIdAndUserId(teamId, userId);
            for (ActivityEvent ae : events) {
                String status = "DONE";
                if (ae.getEventType() != null) {
                    String et = ae.getEventType().toUpperCase();
                    if (et.contains("COMPLETED")) status = "DONE";
                    else if (et.contains("MOVED")) status = "IN_PROGRESS";
                    else if (et.contains("CREATED")) status = "TODO";
                    else status = ae.getEventType();
                }
                fallbackList.add(EvidenceItemDto.Impl.builder()
                        .sourceType(ae.getSource() != null ? ae.getSource().name() : "BOARD")
                        .sourceId(ae.getId())
                        .taskName(ae.getDetails() != null ? ae.getDetails() : (ae.getEventType() != null ? ae.getEventType() : "Hoạt động Board/Card"))
                        .storyPoints(ae.getStoryPoints() != null ? BigDecimal.valueOf(ae.getStoryPoints()) : BigDecimal.valueOf(1.0))
                        .earnedScore(ae.getStoryPoints() != null ? BigDecimal.valueOf(ae.getStoryPoints()) : BigDecimal.valueOf(1.0))
                        .eventTime(ae.getOccurredAt() != null ? ae.getOccurredAt() : (ae.getCreatedAt() != null ? ae.getCreatedAt() : LocalDateTime.now()))
                        .status(status)
                        .build());
            }

            if (teamId != null && sprintId != null && userId != null) {
                List<ManualContribution> manuals = manualContributionRepository
                        .findByTeamIdAndSprintIdAndUserId(teamId, sprintId, userId);
                for (ManualContribution mc : manuals) {
                    if ("APPROVED".equalsIgnoreCase(mc.getStatus())) {
                        fallbackList.add(EvidenceItemDto.Impl.builder()
                                .sourceType("MANUAL")
                                .sourceId(mc.getId())
                                .taskName(mc.getTaskName() != null ? mc.getTaskName() : (mc.getTitle() != null ? mc.getTitle() : "Đóng góp thủ công"))
                                .storyPoints(mc.getStoryPoints() != null ? mc.getStoryPoints() : BigDecimal.ZERO)
                                .earnedScore(mc.getStoryPoints() != null ? mc.getStoryPoints() : BigDecimal.ZERO)
                                .eventTime(mc.getCreatedAt() != null ? mc.getCreatedAt() : LocalDateTime.now())
                                .status(mc.getStatus())
                                .build());
                    }
                }
            }
            fallbackList.sort((a, b) -> {
                if (a.getEventTime() == null) return 1;
                if (b.getEventTime() == null) return -1;
                return b.getEventTime().compareTo(a.getEventTime());
            });
        } catch (Exception e) {
            org.slf4j.LoggerFactory.getLogger(ContributionService.class).error(
                    "JPA fallback for getEvidenceTraceability failed: {}", e.getMessage());
        }
        return fallbackList;
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
                    : (saved.getTrelloScore() != null && saved.getTrelloScore().compareTo(BigDecimal.ZERO) > 0
                            ? saved.getTrelloScore().divide(new BigDecimal("5.0"), 0, RoundingMode.HALF_UP).intValue()
                            : 0);
            int docsCount = tasksCount > 0 ? Math.max(0, tasksCount * 2) : 0;

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

        List<Sprint> sprints = new ArrayList<>(sprintRepository.findByTeamId(teamId));
        if (sprints.isEmpty()) {
            Sprint defaultSprint = new Sprint();
            defaultSprint.setTeam(team);
            defaultSprint.setName("Sprint 1");
            defaultSprint.setStatus("ACTIVE");
            defaultSprint = sprintRepository.save(defaultSprint);
            sprints = List.of(defaultSprint);
        } else {
            sprints.sort(Comparator
                    .comparing(Sprint::getStartDate, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(Sprint::getId, Comparator.nullsLast(Comparator.naturalOrder())));
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

        String focusedUserRole = teamMembers.stream()
                .filter(tm -> tm.getUser() != null && user.getId().equals(tm.getUser().getId()))
                .map(tm -> tm.getRole() == MemberRole.LEADER ? "Trưởng nhóm" : "Thành viên")
                .findFirst()
                .orElse("Thành viên");

        LocalDate sprintStart = targetSprint.getStartDate() != null
                ? targetSprint.getStartDate()
                : LocalDate.now().minusDays(13);
        LocalDate sprintEnd = targetSprint.getEndDate() != null
                ? targetSprint.getEndDate()
                : sprintStart.plusDays(13);
        int sprintTotalDays = (int) Math.max(1L, ChronoUnit.DAYS.between(sprintStart, sprintEnd) + 1L);

        // Truy xuất các ActivityEvent của thành viên trong sprint (không trộn lẫn sprint khác)
        List<ActivityEvent> memberEvents = new ArrayList<>(
                activityEventRepository.findBySprintIdAndUserId(targetSprint.getId(), user.getId())
        );
        if (memberEvents.isEmpty()) {
            memberEvents = activityEventRepository.findByTeamIdAndUserId(teamId, user.getId()).stream()
                    .filter(ev -> ev.getSprint() == null || targetSprint.getId().equals(ev.getSprint().getId()))
                    .collect(Collectors.toCollection(ArrayList::new));
        }
        memberEvents.sort(Comparator.comparing(ActivityEvent::getOccurredAt, Comparator.nullsLast(Comparator.naturalOrder())));

        // Truy xuất các đóng góp thủ công thực tế của thành viên
        List<ManualContribution> memberManuals = manualContributionRepository
                .findByTeamIdAndSprintIdAndUserId(teamId, targetSprint.getId(), user.getId());

        // Truy xuất các thẻ Kanban thực tế được gán cho thành viên trong dự án
        List<Card> memberCards = cardRepository != null
                ? cardRepository.findByBoardTeamId(teamId).stream()
                        .filter(c -> c.getAssignee() != null && user.getId().equals(c.getAssignee().getId()))
                        .toList()
                : Collections.emptyList();

        // Truy xuất đánh giá chéo ẩn danh nhận được (Peer Review)
        List<ReviewRound> sprintRounds = reviewRoundRepository.findBySprintId(targetSprint.getId());
        if (sprintRounds.isEmpty()) {
            sprintRounds = reviewRoundRepository.findByTeamId(teamId).stream()
                    .filter(r -> r.getSprint() == null || targetSprint.getId().equals(r.getSprint().getId()))
                    .toList();
        }
        List<ReviewSubmission> peerSubmissions = new ArrayList<>();
        for (ReviewRound round : sprintRounds) {
            peerSubmissions.addAll(reviewSubmissionRepository.findByReviewRoundIdAndRevieweeId(round.getId(), user.getId()));
        }

        // Tạo cấu trúc đồ thị mạng lưới
        List<MultidimensionalNetworkDto.NetworkNodeDto> nodes = new ArrayList<>();
        List<MultidimensionalNetworkDto.NetworkLinkDto> links = new ArrayList<>();

        Map<String, Object> rootMeta = new LinkedHashMap<>();
        rootMeta.put("email", user.getEmail() != null ? user.getEmail() : "");
        rootMeta.put("teamName", team.getName() != null ? team.getName() : "");
        rootMeta.put("role", focusedUserRole);
        rootMeta.put("sprintStartDate", sprintStart.toString());
        rootMeta.put("sprintEndDate", sprintEnd.toString());
        rootMeta.put("sprintDays", sprintTotalDays);
        rootMeta.put("availability", userScore.getAvailabilityFactor() != null ? userScore.getAvailabilityFactor() : 1.0);
        rootMeta.put("distanceToCenter", userScore.getDistanceToCenter() != null ? userScore.getDistanceToCenter() : 0.0);

        String rootId = "root-" + user.getId();
        nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                .id(rootId)
                .label(user.getFullName())
                .type("ROOT")
                .category("MEMBER")
                .weight(userScore.getScore() != null ? userScore.getScore().doubleValue() : 0.0)
                .badge(String.format("%.1f%%", userScore.getPercentage() != null ? userScore.getPercentage().doubleValue() * 100 : 0.0))
                .status(Boolean.TRUE.equals(userScore.getIsSuspicious()) ? "SUSPICIOUS" : "NORMAL")
                .color("#6366f1")
                .description("Điểm tổng hợp: " + String.format("%.1f", userScore.getCompositeScore() != null ? userScore.getCompositeScore() : 0.0) + "/100")
                .metadata(rootMeta)
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

        // Trích xuất các lá sự kiện từ memberEvents thực tế trong DB
        int eventLimit = 0;
        List<String> doneCardDetailsNormalized = new ArrayList<>();
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");

        for (ActivityEvent ev : memberEvents) {
            eventLimit++;
            if (eventLimit > 40) break;

            String type = ev.getEventType() != null ? ev.getEventType().toUpperCase() : "EVENT";
            String nodeId = "ev-" + ev.getId();
            Map<String, Object> evMeta = buildEventMetadata(ev, sprintStart, sprintTotalDays, dateFmt, timeFmt);

            if (type.contains("COMPLETED") || type.contains("DONE")) {
                if (ev.getDetails() != null) {
                    doneCardDetailsNormalized.add(ev.getDetails().toLowerCase());
                }
                double sp = ev.getStoryPoints() != null ? ev.getStoryPoints() : 1.0;
                nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                        .id(nodeId)
                        .label(ev.getDetails() != null ? truncate(ev.getDetails(), 42) : "Thẻ hoàn thành")
                        .type("EVENT")
                        .category("D1")
                        .weight(sp)
                        .badge(String.format("%.1f SP", sp))
                        .status("DONE")
                        .color("#10b981")
                        .description(ev.getDetails())
                        .metadata(evMeta)
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
                    String delayNodeId = "delay-" + ev.getId();
                    double delayVal = ev.getDelayDays() != null ? ev.getDelayDays() : 1.0;
                    nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                            .id(delayNodeId)
                            .label("Trễ " + String.format("%.1f", delayVal) + " ngày: " + truncate(ev.getDetails(), 28))
                            .type("IMPEDIMENT")
                            .category("D2")
                            .weight(delayVal)
                            .badge("Trễ hạn")
                            .status("WARN")
                            .color("#ef4444")
                            .description("Độ trễ làm giảm chỉ số độ tin cậy D2")
                            .metadata(evMeta)
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
                } else {
                    String onTimeNodeId = "ontime-" + ev.getId();
                    nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                            .id(onTimeNodeId)
                            .label("Đúng hạn: " + truncate(ev.getDetails(), 32))
                            .type("EVENT")
                            .category("D2")
                            .weight(1.0)
                            .badge("Đúng hạn")
                            .status("DONE")
                            .color("#06b6d4")
                            .description(ev.getDetails())
                            .metadata(evMeta)
                            .build());
                    links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                            .source(d2Id)
                            .target(onTimeNodeId)
                            .weight(0.8)
                            .type("DETAIL")
                            .color("#06b6d4")
                            .build());
                }
            } else if (type.contains("REWORK") || type.contains("REOPEN") || type.contains("BACK")) {
                nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                        .id(nodeId)
                        .label("Rework: " + (ev.getDetails() != null ? truncate(ev.getDetails(), 32) : "Thẻ mở lại"))
                        .type("IMPEDIMENT")
                        .category("D2")
                        .weight(1.5)
                        .badge("Làm lại")
                        .status("WARN")
                        .color("#f97316")
                        .description(ev.getDetails())
                        .metadata(evMeta)
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
            } else if (type.contains("COMMENT") || type.contains("REVIEW") || type.contains("SUPPORT") || type.contains("HELPFUL")) {
                nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                        .id(nodeId)
                        .label(ev.getDetails() != null ? truncate(ev.getDetails(), 36) : "Hỗ trợ đồng đội")
                        .type("EVENT")
                        .category("D3")
                        .weight(1.0)
                        .badge("Phối hợp")
                        .status("NORMAL")
                        .color("#a855f7")
                        .description(ev.getDetails())
                        .metadata(evMeta)
                        .build());
                links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                        .source(d3Id)
                        .target(nodeId)
                        .weight(0.8)
                        .type("DETAIL")
                        .color("#a855f7")
                        .build());
            } else if (type.contains("IMPEDIMENT") || type.contains("AVAILABILITY") || type.contains("BLOCKER")) {
                nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                        .id(nodeId)
                        .label(ev.getDetails() != null ? truncate(ev.getDetails(), 36) : "Rào cản ngoại cảnh")
                        .type("IMPEDIMENT")
                        .category("IMPEDIMENT")
                        .weight(ev.getDelayDays() != null ? ev.getDelayDays() : 1.0)
                        .badge("Khả dụng / Rào cản")
                        .status("WARN")
                        .color("#f59e0b")
                        .description(ev.getDetails())
                        .metadata(evMeta)
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

        // Bổ sung các thẻ Kanban đã hoàn thành nếu chưa có trong ActivityEvent
        List<Card> missingDoneCards = new ArrayList<>();
        for (Card card : memberCards) {
            String colName = card.getColumn() != null && card.getColumn().getName() != null
                    ? card.getColumn().getName().toLowerCase()
                    : "";
            boolean isDoneCol = colName.contains("done") || colName.contains("hoàn thành") || colName.contains("completed");
            if (!isDoneCol) continue;

            String titleLower = card.getTitle() != null ? card.getTitle().toLowerCase() : "";
            boolean alreadyInEvents = !titleLower.isEmpty() && doneCardDetailsNormalized.stream().anyMatch(d -> d.contains(titleLower));
            if (!alreadyInEvents) {
                missingDoneCards.add(card);
                double sp = card.getStoryPoints() != null ? card.getStoryPoints() : 1.0;
                String cardNodeId = "card-" + card.getId();
                LocalDateTime cardTime = card.getUpdatedAt() != null ? card.getUpdatedAt() : card.getCreatedAt();
                Map<String, Object> cMeta = new LinkedHashMap<>();
                cMeta.put("source", "Bảng Kanban");
                cMeta.put("sp", sp);
                cMeta.put("difficulty", card.getDifficultyLevel() != null ? card.getDifficultyLevel() : 2);
                cMeta.put("dayIndex", computeSprintDayIndex(cardTime, sprintStart, sprintTotalDays));
                cMeta.put("occurredDate", cardTime != null ? cardTime.format(dateFmt) : sprintStart.format(dateFmt));
                cMeta.put("time", cardTime != null ? cardTime.format(timeFmt) : "--:--");

                nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                        .id(cardNodeId)
                        .label(truncate(card.getTitle(), 42))
                        .type("EVENT")
                        .category("D1")
                        .weight(sp)
                        .badge(String.format("%.1f SP", sp))
                        .status("DONE")
                        .color("#10b981")
                        .description("Thẻ Kanban hoàn thành · Độ khó Level " + (card.getDifficultyLevel() != null ? card.getDifficultyLevel() : 2))
                        .metadata(cMeta)
                        .build());
                links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                        .source(d1Id)
                        .target(cardNodeId)
                        .weight(0.8)
                        .type("DETAIL")
                        .color("#10b981")
                        .build());
            }
        }

        // Bổ sung các leaf node về đóng góp thủ công thực tế
        for (ManualContribution mc : memberManuals) {
            String mNodeId = "manual-" + mc.getId();
            double mSp = mc.getStoryPoints() != null ? mc.getStoryPoints().doubleValue() : 1.0;
            LocalDateTime mcTime = mc.getCreatedAt();
            Map<String, Object> mcMeta = new LinkedHashMap<>();
            mcMeta.put("source", "Khai báo");
            mcMeta.put("sp", mSp);
            mcMeta.put("dayIndex", computeSprintDayIndex(mcTime, sprintStart, sprintTotalDays));
            mcMeta.put("occurredDate", mcTime != null ? mcTime.format(dateFmt) : sprintStart.format(dateFmt));
            mcMeta.put("time", mcTime != null ? mcTime.format(timeFmt) : "--:--");

            nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                    .id(mNodeId)
                    .label("Ngoài hệ thống: " + truncate(mc.getTaskName() != null ? mc.getTaskName() : mc.getTitle(), 32))
                    .type("EVENT")
                    .category("D1")
                    .weight(mSp)
                    .badge(String.format("%.1f SP (Khai báo)", mSp))
                    .status("APPROVED".equalsIgnoreCase(mc.getStatus()) ? "DONE" : "PENDING")
                    .color("#34d399")
                    .description("Minh chứng: " + (mc.getEvidenceLink() != null ? mc.getEvidenceLink() : "Nội bộ"))
                    .metadata(mcMeta)
                    .build());
            links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                    .source(d1Id)
                    .target(mNodeId)
                    .weight(0.7)
                    .type("DETAIL")
                    .color("#34d399")
                    .build());
        }

        // Bổ sung các lượt chấm chéo ẩn danh thực tế (D4 - bảo vệ ẩn danh 100%, không trả danh tính người chấm)
        if (!peerSubmissions.isEmpty()) {
            Map<Long, List<ReviewSubmission>> groupedByReviewer = peerSubmissions.stream()
                    .filter(s -> s.getReviewer() != null)
                    .collect(Collectors.groupingBy(s -> s.getReviewer().getId(), LinkedHashMap::new, Collectors.toList()));
            int anonIdx = 0;
            for (List<ReviewSubmission> reviewerSubs : groupedByReviewer.values()) {
                anonIdx++;
                double avgSubScore = reviewerSubs.stream().mapToInt(ReviewSubmission::getScore).average().orElse(0.0);
                LocalDateTime rTime = reviewerSubs.get(0).getCreatedAt();
                String criteriaSummary = reviewerSubs.stream()
                        .map(s -> (s.getCriterion() != null ? s.getCriterion().name() : "CRITERIA") + ": " + s.getScore() + "/5")
                        .collect(Collectors.joining(" · "));

                Map<String, Object> rMeta = new LinkedHashMap<>();
                rMeta.put("source", "Chấm chéo");
                rMeta.put("score", avgSubScore);
                rMeta.put("dayIndex", computeSprintDayIndex(rTime, sprintStart, sprintTotalDays));
                rMeta.put("occurredDate", rTime != null ? rTime.format(dateFmt) : sprintEnd.format(dateFmt));
                rMeta.put("time", rTime != null ? rTime.format(timeFmt) : "--:--");

                String prNodeId = "peer-anon-" + anonIdx;
                nodes.add(MultidimensionalNetworkDto.NetworkNodeDto.builder()
                        .id(prNodeId)
                        .label("Đánh giá ẩn danh #" + anonIdx + " · " + String.format("%.1f", avgSubScore) + "/5")
                        .type("EVENT")
                        .category("D4")
                        .weight(avgSubScore)
                        .badge(String.format("%.1f/5 ★", avgSubScore))
                        .status("NORMAL")
                        .color("#ec4899")
                        .description("Chấm chéo ẩn danh · " + criteriaSummary)
                        .metadata(rMeta)
                        .build());
                links.add(MultidimensionalNetworkDto.NetworkLinkDto.builder()
                        .source(d4Id)
                        .target(prNodeId)
                        .weight(0.9)
                        .type("DETAIL")
                        .color("#ec4899")
                        .build());
            }
        }

        // Tạo breakdown 4 tầng công thức chi tiết từ dữ liệu thực tế
        MultidimensionalNetworkDto.TierBreakdownDto breakdown = buildTierBreakdown(
                userScore, memberEvents, missingDoneCards, memberManuals, peerSubmissions);

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
                .teamName(team.getName())
                .sprintId(targetSprint.getId())
                .sprintName(targetSprint.getName())
                .focusedUserId(user.getId())
                .focusedUserName(user.getFullName())
                .focusedUserRole(focusedUserRole)
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
                .totalEventsCount(memberEvents.size() + missingDoneCards.size() + memberManuals.size() + peerSubmissions.size())
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

    private Map<String, Object> buildEventMetadata(
            ActivityEvent ev,
            LocalDate sprintStart,
            int sprintTotalDays,
            DateTimeFormatter dateFmt,
            DateTimeFormatter timeFmt) {
        Map<String, Object> meta = new LinkedHashMap<>();
        String sourceLabel = switch (ev.getSource() != null ? ev.getSource() : ActivitySource.BOARD) {
            case BOARD -> "Bảng Kanban";
            case MANUAL -> "Khai báo";
            case DOCS -> "Tài liệu";
            default -> ev.getSource().name();
        };
        meta.put("source", sourceLabel);
        meta.put("dayIndex", computeSprintDayIndex(ev.getOccurredAt(), sprintStart, sprintTotalDays));
        meta.put("occurredDate", ev.getOccurredAt() != null ? ev.getOccurredAt().format(dateFmt) : sprintStart.format(dateFmt));
        meta.put("time", ev.getOccurredAt() != null ? ev.getOccurredAt().format(timeFmt) : "--:--");
        if (ev.getStoryPoints() != null) meta.put("sp", ev.getStoryPoints());
        if (ev.getDifficultyLevel() != null) meta.put("difficulty", ev.getDifficultyLevel());
        if (ev.getDelayDays() != null) meta.put("delayDays", ev.getDelayDays());
        if (ev.getIsOnTime() != null) meta.put("isOnTime", ev.getIsOnTime());
        return meta;
    }

    private int computeSprintDayIndex(LocalDateTime occurredAt, LocalDate sprintStart, int sprintTotalDays) {
        if (occurredAt == null || sprintStart == null) return 1;
        long diff = ChronoUnit.DAYS.between(sprintStart, occurredAt.toLocalDate()) + 1L;
        return (int) Math.max(1L, Math.min(sprintTotalDays, diff));
    }

    private MultidimensionalNetworkDto.TierBreakdownDto buildTierBreakdown(
            ContributionDto cs,
            List<ActivityEvent> events,
            List<Card> missingDoneCards,
            List<ManualContribution> manuals,
            List<ReviewSubmission> peerSubs) {

        int doneEventCount = 0;
        int onTimeEventCount = 0;
        double doneSp = 0.0;
        double totalDifficulty = 0.0;
        int difficultyCount = 0;
        double totalDelayDays = 0.0;
        int reworkCount = 0;
        int commentCount = 0;
        int reviewForOthersCount = 0;
        int supportMentionCount = 0;

        for (ActivityEvent ev : events) {
            String type = ev.getEventType() != null ? ev.getEventType().toUpperCase() : "";
            if (type.contains("COMPLETED") || type.contains("DONE")) {
                doneEventCount++;
                doneSp += ev.getStoryPoints() != null ? ev.getStoryPoints() : 1.0;
                if (ev.getDifficultyLevel() != null && ev.getDifficultyLevel() > 0) {
                    totalDifficulty += ev.getDifficultyLevel();
                    difficultyCount++;
                }
                if (Boolean.TRUE.equals(ev.getIsOnTime())) {
                    onTimeEventCount++;
                }
                if (ev.getDelayDays() != null && ev.getDelayDays() > 0) {
                    totalDelayDays += ev.getDelayDays();
                }
            }
            if (type.contains("REWORK") || type.contains("REOPEN") || type.contains("BACK")) {
                reworkCount++;
            }
            if (Boolean.TRUE.equals(ev.getIsHelpfulComment()) || type.contains("COMMENT")) {
                commentCount++;
            }
            if (Boolean.TRUE.equals(ev.getIsReviewForOthers()) || type.contains("REVIEW")) {
                reviewForOthersCount++;
            }
            if (Boolean.TRUE.equals(ev.getIsSupportMention()) || type.contains("SUPPORT")) {
                supportMentionCount++;
            }
        }

        for (Card c : missingDoneCards) {
            doneSp += c.getStoryPoints() != null ? c.getStoryPoints() : 1.0;
            if (c.getDifficultyLevel() != null && c.getDifficultyLevel() > 0) {
                totalDifficulty += c.getDifficultyLevel();
                difficultyCount++;
            }
            onTimeEventCount++;
        }

        int cardsDone = doneEventCount + missingDoneCards.size();
        double sp = Math.round(doneSp * 10.0) / 10.0;
        double onTime = cardsDone > 0
                ? Math.round(((double) onTimeEventCount / cardsDone) * 100.0) / 100.0
                : (cs.getOnTimeRate() != null ? Math.round(cs.getOnTimeRate() * 100.0) / 100.0 : 1.0);
        double avgDiff = difficultyCount > 0 ? Math.round((totalDifficulty / difficultyCount) * 10.0) / 10.0 : 0.0;
        double avgDelay = cardsDone > 0 ? Math.round((totalDelayDays / cardsDone) * 10.0) / 10.0 : 0.0;

        double manualSp = Math.round(manuals.stream()
                .filter(m -> "APPROVED".equalsIgnoreCase(m.getStatus()))
                .mapToDouble(m -> m.getStoryPoints() != null ? m.getStoryPoints().doubleValue() : 0.0)
                .sum() * 10.0) / 10.0;

        int peerReviewCount = peerSubs.size();
        int peerUniqueReviewers = (int) peerSubs.stream()
                .filter(s -> s.getReviewer() != null)
                .map(s -> s.getReviewer().getId())
                .distinct()
                .count();
        double peerAvgScore = peerSubs.isEmpty()
                ? 0.0
                : Math.round(peerSubs.stream().mapToInt(ReviewSubmission::getScore).average().orElse(0.0) * 10.0) / 10.0;

        double d1 = cs.getD1Output() != null ? cs.getD1Output() : 0.0;
        double d2 = cs.getD2Reliability() != null ? cs.getD2Reliability() : 0.0;
        double d3 = cs.getD3Collaboration() != null ? cs.getD3Collaboration() : 0.0;
        double d4 = cs.getD4Peer() != null ? cs.getD4Peer() : 0.0;
        double comp = cs.getCompositeScore() != null ? cs.getCompositeScore() : 0.0;

        Map<String, Object> raw = new LinkedHashMap<>();
        raw.put("cardsCompleted", cardsDone);
        raw.put("totalStoryPoints", sp);
        raw.put("onTimeRate", onTime);
        raw.put("avgDifficulty", avgDiff);
        raw.put("avgDelayDays", avgDelay);
        raw.put("reworkCount", reworkCount);
        raw.put("commentCount", commentCount);
        raw.put("reviewForOthersCount", reviewForOthersCount);
        raw.put("supportMentionCount", supportMentionCount);
        raw.put("manualPoints", manualSp);
        raw.put("peerReviewCount", peerReviewCount);
        raw.put("peerUniqueReviewers", peerUniqueReviewers);
        raw.put("peerAvgScore", peerAvgScore);
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
