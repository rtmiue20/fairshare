package com.fairshare.contribution.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.contribution.dto.ContributionDto;
import com.fairshare.contribution.dto.ContributionSummaryResponse;
import com.fairshare.contribution.dto.EvidenceItemDto;
import com.fairshare.contribution.entity.ContributionScore;
import com.fairshare.contribution.repository.ContributionScoreRepository;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ContributionService {

    private final ScoringEngine scoringEngine;
    private final ContributionScoreRepository contributionScoreRepository;
    private final ActivityEventRepository activityEventRepository;
    private final SprintRepository sprintRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    /**
     * Tổng hợp điểm đóng góp thành viên bằng Stored Procedure và trả về DTO tóm tắt.
     * Flow:
     * 1. Gọi stored procedure sp_calculate_contribution_scores(teamId, sprintId).
     * 2. Lấy danh sách ContributionScore đã được tính toán/upsert từ DB.
     * 3. Chuyển đổi sang List<ContributionSummaryResponse>.
     *
     * @param teamId   ID nhóm
     * @param sprintId ID sprint
     * @return danh sách điểm tổng hợp của các thành viên
     */
    @Transactional
    public List<ContributionSummaryResponse> getContributionSummary(Long teamId, Long sprintId) {
        // 1. Gọi stored procedure để tính toán và upsert điểm vào DB
        contributionScoreRepository.calculateContributionScores(teamId, sprintId);

        // 2. Lấy kết quả mới nhất sau khi tính toán
        List<ContributionScore> scores = contributionScoreRepository.findByTeamIdAndSprintId(teamId, sprintId);

        // 3. Map sang DTO và trả về
        return scores.stream()
                .map(ContributionSummaryResponse::fromEntity)
                .toList();
    }

    /**
     * Truy xuất danh sách bằng chứng đóng góp (sự kiện gốc) của thành viên theo sprint và team.
     * Kích hoạt Stored Procedure {@code sp_get_evidence_traceability}.
     *
     * @param teamId   ID nhóm
     * @param sprintId ID sprint
     * @param userId   ID thành viên
     * @return danh sách các sự kiện gốc (activity_events & manual_contributions)
     */
    @Transactional(readOnly = true)
    public List<EvidenceItemDto> getEvidenceTraceability(Long teamId, Long sprintId, Long userId) {
        return contributionScoreRepository.getEvidenceTraceability(teamId, sprintId, userId);
    }

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

        List<ScoringEngine.MemberContributionResult> calculated = scoringEngine.calculateScores(users, events);

        List<ContributionDto> dtos = new ArrayList<>();

        for (ScoringEngine.MemberContributionResult res : calculated) {
            User user = res.getUser();

            ContributionScore scoreEntity = contributionScoreRepository
                    .findBySprintIdAndUserId(sprintId, user.getId())
                    .orElseGet(() -> {
                        ContributionScore cs = new ContributionScore();
                        cs.setSprint(sprint);
                        cs.setTeam(team);
                        cs.setUser(user);
                        return cs;
                    });

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

            dtos.add(ContributionDto.builder()
                    .id(saved.getId())
                    .teamId(team.getId())
                    .sprintId(sprint.getId())
                    .userId(user.getId())
                    .userName(user.getFullName())
                    .userEmail(user.getEmail())
                    .score(saved.getScore())
                    .percentage(saved.getPercentage())
                    .cardsCompleted(res.getCardsCompleted())
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

    @Transactional(readOnly = true)
    public List<ContributionDto> getSprintScores(Long sprintId) {
        List<ContributionScore> existing = contributionScoreRepository.findBySprintId(sprintId);
        if (existing.isEmpty()) {
            return calculateAndSaveSprintScores(sprintId);
        }

        return existing.stream()
                .map(cs -> ContributionDto.builder()
                        .id(cs.getId())
                        .teamId(cs.getTeam() != null ? cs.getTeam().getId() : null)
                        .sprintId(cs.getSprint() != null ? cs.getSprint().getId() : null)
                        .userId(cs.getUser() != null ? cs.getUser().getId() : null)
                        .userName(cs.getUser() != null ? cs.getUser().getFullName() : null)
                        .userEmail(cs.getUser() != null ? cs.getUser().getEmail() : null)
                        .score(cs.getScore())
                        .percentage(cs.getPercentage())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ContributionDto> getTeamScores(Long teamId) {
        return contributionScoreRepository.findByTeamId(teamId).stream()
                .map(cs -> ContributionDto.builder()
                        .id(cs.getId())
                        .teamId(cs.getTeam().getId())
                        .sprintId(cs.getSprint() != null ? cs.getSprint().getId() : null)
                        .userId(cs.getUser().getId())
                        .userName(cs.getUser().getFullName())
                        .userEmail(cs.getUser().getEmail())
                        .score(cs.getScore())
                        .percentage(cs.getPercentage())
                        .build())
                .toList();
    }
}
