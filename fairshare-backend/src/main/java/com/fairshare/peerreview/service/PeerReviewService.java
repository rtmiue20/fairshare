package com.fairshare.peerreview.service;

import com.fairshare.board.dto.CardDto;
import com.fairshare.board.entity.Card;
import com.fairshare.board.repository.CardRepository;
import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.peerreview.dto.PeerReviewDetailDto;
import com.fairshare.peerreview.dto.ReviewSubmissionDto;
import com.fairshare.peerreview.dto.ReviewerSubmissionDto;
import com.fairshare.peerreview.entity.ReviewCriterion;
import com.fairshare.peerreview.entity.ReviewRound;
import com.fairshare.peerreview.entity.ReviewRoundStatus;
import com.fairshare.peerreview.entity.ReviewSubmission;
import com.fairshare.peerreview.repository.ReviewRoundRepository;
import com.fairshare.peerreview.repository.ReviewSubmissionRepository;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PeerReviewService {

    private final ReviewRoundRepository reviewRoundRepository;
    private final ReviewSubmissionRepository reviewSubmissionRepository;
    private final SprintRepository sprintRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final AnonymityAggregator anonymityAggregator;
    private final CardRepository cardRepository;

    @Transactional
    public ReviewRound createRound(Long sprintId, Long requesterId, String name,
                                   LocalDateTime startDate, LocalDateTime endDate) {
        if (sprintId == null || requesterId == null || name == null || name.isBlank()) {
            throw new BusinessException("Sprint, requester, and review round name are required");
        }
        if (name.trim().length() > 255) {
            throw new BusinessException("Review round name must be at most 255 characters");
        }
        if (startDate != null && endDate != null && !endDate.isAfter(startDate)) {
            throw new BusinessException("Review round end date must be after its start date");
        }

        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found: " + sprintId));
        requireLeader(sprint.getTeam().getId(), requesterId);

        ReviewRound round = new ReviewRound();
        round.setSprint(sprint);
        round.setTeam(sprint.getTeam());
        round.setName(name.trim());
        round.setStartDate(startDate);
        round.setEndDate(endDate);
        round.setMinSubmissionsRequired(3);
        round.setStatus(ReviewRoundStatus.DRAFT);

        return reviewRoundRepository.save(round);
    }

    @Transactional(readOnly = true)
    public List<ReviewRound> getRoundsByTeam(Long teamId, Long requesterId) {
        assertTeamMember(teamId, requesterId);
        return reviewRoundRepository.findByTeamId(teamId);
    }

    @Transactional(readOnly = true)
    public List<ReviewRound> getRoundsBySprint(Long sprintId, Long requesterId) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found: " + sprintId));
        assertTeamMember(sprint.getTeam().getId(), requesterId);
        return reviewRoundRepository.findBySprintId(sprintId);
    }

    @Transactional
    public ReviewRound openRound(Long roundId, Long requesterId) {
        ReviewRound round = getRound(roundId);
        requireLeader(round.getTeam().getId(), requesterId);
        if (round.getStatus() != ReviewRoundStatus.DRAFT) {
            throw new BusinessException("Only a draft review round can be opened");
        }
        round.setStatus(ReviewRoundStatus.OPEN);
        return reviewRoundRepository.save(round);
    }

    @Transactional
    public ReviewRound closeRound(Long roundId, Long requesterId) {
        ReviewRound round = getRound(roundId);
        requireLeader(round.getTeam().getId(), requesterId);
        if (round.getStatus() != ReviewRoundStatus.OPEN) {
            throw new BusinessException("Only an open review round can be closed");
        }
        round.setStatus(ReviewRoundStatus.CLOSED);
        return reviewRoundRepository.save(round);
    }

    @Transactional
    public List<ReviewSubmission> submitReview(Long roundId, Long reviewerId, ReviewSubmissionDto dto) {
        List<ReviewSubmissionDto.CriterionScore> effectiveScores = dto != null ? dto.getEffectiveScores() : null;
        if (reviewerId == null || dto == null || dto.getRevieweeId() == null
                || effectiveScores == null || effectiveScores.isEmpty()) {
            throw new BusinessException("Reviewer, reviewee, and criterion scores are required");
        }

        ReviewRound round = getRound(roundId);
        if (round.getStatus() == ReviewRoundStatus.DRAFT
                && round.getStartDate() != null
                && round.getEndDate() != null
                && !LocalDateTime.now().isBefore(round.getStartDate())
                && !LocalDateTime.now().isAfter(round.getEndDate())) {
            round.setStatus(ReviewRoundStatus.OPEN);
        }
        if (round.getStatus() != ReviewRoundStatus.OPEN) {
            throw new BusinessException("Reviews can only be submitted to an open review round");
        }
        if (reviewerId.equals(dto.getRevieweeId())) {
            throw new BusinessException("Cannot review yourself");
        }

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found: " + reviewerId));
        User reviewee = userRepository.findById(dto.getRevieweeId())
                .orElseThrow(() -> new ResourceNotFoundException("Reviewee not found: " + dto.getRevieweeId()));

        Long teamId = round.getTeam().getId();
        if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, reviewerId)
                || !teamMemberRepository.existsByTeamIdAndUserId(teamId, reviewee.getId())) {
            throw new ForbiddenException("Reviewer and reviewee must belong to the review round team");
        }

        // Load card if provided
        Card linkedCard = null;
        if (dto.getCardId() != null) {
            linkedCard = cardRepository.findById(dto.getCardId()).orElse(null);
        }

        Set<ReviewCriterion> criteria = new HashSet<>();
        List<ReviewSubmission> submissions = new ArrayList<>();
        for (ReviewSubmissionDto.CriterionScore score : effectiveScores) {
            if (score == null || score.getCriterion() == null || score.getScore() == null
                    || score.getScore() < 1 || score.getScore() > 5) {
                throw new BusinessException("Each criterion must have a score from 1 to 5");
            }
            if (!criteria.add(score.getCriterion())) {
                throw new BusinessException("A criterion can only be submitted once per review");
            }
            if (reviewSubmissionRepository.existsByReviewRoundIdAndReviewerIdAndRevieweeIdAndCriterion(
                    roundId, reviewerId, reviewee.getId(), score.getCriterion())) {
                throw new BusinessException("You have already submitted this criterion for the selected member");
            }

            ReviewSubmission submission = new ReviewSubmission();
            submission.setReviewRound(round);
            submission.setReviewer(reviewer);
            submission.setReviewee(reviewee);
            submission.setCriterion(score.getCriterion());
            submission.setScore(score.getScore());
            submission.setFeedback(dto.getFeedback() == null || dto.getFeedback().isBlank()
                    ? null : dto.getFeedback().trim());
            if (linkedCard != null) {
                submission.setCard(linkedCard);
            }
            submissions.add(submission);
        }

        return reviewSubmissionRepository.saveAll(submissions);
    }

    @Transactional(readOnly = true)
    public AnonymityAggregator.AggregatedResult getAggregatedResults(Long roundId, Long revieweeId, Long requesterId) {
        ReviewRound round = getRound(roundId);
        assertTeamMember(round.getTeam().getId(), requesterId);
        if (!teamMemberRepository.existsByTeamIdAndUserId(round.getTeam().getId(), revieweeId)) {
            throw new ForbiddenException("Thành viên cần xem kết quả không thuộc nhóm của đợt chấm chéo này");
        }
        List<ReviewSubmission> submissions = reviewSubmissionRepository.findByReviewRoundIdAndRevieweeId(roundId, revieweeId);
        return anonymityAggregator.aggregateForReviewee(revieweeId, submissions, round.getMinSubmissionsRequired());
    }

    @Transactional(readOnly = true)
    public List<ReviewerSubmissionDto> getSubmissionsByReviewer(Long roundId, Long reviewerId, Long requesterId) {
        ReviewRound round = getRound(roundId);
        if (requesterId == null || !requesterId.equals(reviewerId)) {
            throw new ForbiddenException("Bạn chỉ có thể xem các đánh giá do chính mình gửi");
        }
        assertTeamMember(round.getTeam().getId(), requesterId);
        List<ReviewSubmission> submissions = reviewSubmissionRepository.findByReviewRoundIdAndReviewerId(roundId, reviewerId);
        Map<Long, List<ReviewSubmission>> byReviewee = submissions.stream()
                .filter(s -> s.getReviewee() != null)
                .collect(Collectors.groupingBy(s -> s.getReviewee().getId()));

        List<ReviewerSubmissionDto> result = new ArrayList<>();
        for (Map.Entry<Long, List<ReviewSubmission>> entry : byReviewee.entrySet()) {
            Long revieweeId = entry.getKey();
            List<ReviewSubmission> subList = entry.getValue();
            if (subList.isEmpty()) continue;

            String revieweeName = subList.get(0).getReviewee().getFullName();
            String feedback = subList.stream()
                    .map(ReviewSubmission::getFeedback)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse(null);
            LocalDateTime submittedAt = subList.stream()
                    .map(ReviewSubmission::getCreatedAt)
                    .filter(Objects::nonNull)
                    .max(LocalDateTime::compareTo)
                    .orElse(null);

            double avg = subList.stream()
                    .mapToInt(ReviewSubmission::getScore)
                    .average()
                    .orElse(0.0);

            List<ReviewerSubmissionDto.CriterionScoreDto> scores = subList.stream()
                    .map(s -> new ReviewerSubmissionDto.CriterionScoreDto(s.getCriterion(), s.getScore()))
                    .toList();

            result.add(ReviewerSubmissionDto.builder()
                    .revieweeId(revieweeId)
                    .revieweeName(revieweeName)
                    .averageScore(Math.round(avg * 100.0) / 100.0)
                    .scores(scores)
                    .feedback(feedback)
                    .submittedAt(submittedAt)
                    .build());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<PeerReviewDetailDto> getRoundReviewDetails(Long roundId, Long revieweeId, Long requesterId) {
        ReviewRound round = getRound(roundId);
        assertTeamMember(round.getTeam().getId(), requesterId);
        if (revieweeId != null && !teamMemberRepository.existsByTeamIdAndUserId(round.getTeam().getId(), revieweeId)) {
            throw new ForbiddenException("Thành viên cần xem kết quả không thuộc nhóm của đợt chấm chéo này");
        }
        List<ReviewSubmission> submissions = revieweeId == null || revieweeId <= 0
                ? reviewSubmissionRepository.findByReviewRoundId(roundId)
                : reviewSubmissionRepository.findByReviewRoundIdAndRevieweeId(roundId, revieweeId);
        Map<Long, List<ReviewSubmission>> grouped = submissions.stream()
                .filter(s -> s.getReviewee() != null && s.getReviewee().getId() != null)
                .collect(Collectors.groupingBy(
                        s -> s.getReviewee().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        List<PeerReviewDetailDto> results = new ArrayList<>();
        for (Map.Entry<Long, List<ReviewSubmission>> entry : grouped.entrySet()) {
            Long currentRevieweeId = entry.getKey();
            List<ReviewSubmission> revieweeSubmissions = entry.getValue();
            ReviewSubmission first = revieweeSubmissions.get(0);
            AnonymityAggregator.AggregatedResult aggregate = anonymityAggregator.aggregateForReviewee(
                    currentRevieweeId, revieweeSubmissions, round.getMinSubmissionsRequired());
            boolean safe = aggregate.isAnonymousSafe();
            results.add(PeerReviewDetailDto.builder()
                    .id(currentRevieweeId)
                    .reviewRoundId(roundId)
                    .revieweeId(currentRevieweeId)
                    .revieweeName(first.getReviewee().getFullName() != null
                            && !first.getReviewee().getFullName().isBlank()
                            ? first.getReviewee().getFullName()
                            : first.getReviewee().getEmail())
                    .averageScore(safe ? aggregate.getAverageScore() : null)
                    .qualityScore(safe ? averageScoreForCriterion(revieweeSubmissions, ReviewCriterion.QUALITY) : null)
                    .punctualityScore(safe ? averageScoreForCriterion(revieweeSubmissions, ReviewCriterion.PUNCTUALITY) : null)
                    .cooperationScore(safe ? averageScoreForCriterion(revieweeSubmissions, ReviewCriterion.COOPERATION) : null)
                    .submissionCount(aggregate.getSubmissionCount())
                    .anonymousSafe(safe)
                    .feedbackComments(safe ? aggregate.getFeedbackComments() : List.of())
                    .submittedAt(revieweeSubmissions.stream()
                            .map(ReviewSubmission::getCreatedAt)
                            .filter(Objects::nonNull)
                            .max(LocalDateTime::compareTo)
                            .orElse(null))
                    .build());
        }
        return results;
    }

    private Double averageScoreForCriterion(List<ReviewSubmission> submissions, ReviewCriterion criterion) {
        Map<Long, Integer> reviewerScores = new LinkedHashMap<>();
        for (ReviewSubmission submission : submissions) {
            if (submission.getReviewer() != null && submission.getReviewer().getId() != null
                    && submission.getCriterion() == criterion) {
                reviewerScores.putIfAbsent(submission.getReviewer().getId(), submission.getScore());
            }
        }
        return reviewerScores.isEmpty()
                ? null
                : reviewerScores.values().stream().mapToInt(Integer::intValue).average().orElse(0.0);
    }

    @Transactional
    public int toggleLike(Long submissionId, Long userId) {
        ReviewSubmission submission = reviewSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Review submission not found: " + submissionId));
        assertTeamMember(submission.getReviewRound().getTeam().getId(), userId);
        submission.setLikesCount(submission.getLikesCount() + 1);
        reviewSubmissionRepository.save(submission);
        return submission.getLikesCount();
    }

    @Transactional(readOnly = true)
    public List<CardDto> getDoneCardsForTeam(Long teamId, Long requesterId) {
        assertTeamMember(teamId, requesterId);
        List<Card> allCards = cardRepository.findByBoardTeamId(teamId);
        return allCards.stream()
                .filter(c -> c.getColumn() != null && "Done".equalsIgnoreCase(c.getColumn().getName()))
                .map(CardDto::from)
                .toList();
    }

    private ReviewRound getRound(Long roundId) {
        if (roundId == null) {
            throw new BusinessException("Review round id is required");
        }
        return reviewRoundRepository.findById(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Review round not found: " + roundId));
    }

    private void requireLeader(Long teamId, Long userId) {
        if (userId == null) {
            throw new ForbiddenException("Authenticated user is required");
        }
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new ForbiddenException("Only a team leader can manage review rounds"));
        if (member.getRole() != MemberRole.LEADER) {
            throw new ForbiddenException("Only a team leader can manage review rounds");
        }
    }

    private void assertTeamMember(Long teamId, Long userId) {
        if (teamId == null || userId == null || !teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new ForbiddenException("Bạn không thuộc nhóm của đợt chấm chéo này");
        }
    }
}
