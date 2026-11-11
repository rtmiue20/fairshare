package com.fairshare.peerreview.service;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.peerreview.dto.ReviewSubmissionDto;
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
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PeerReviewService {

    private final ReviewRoundRepository reviewRoundRepository;
    private final ReviewSubmissionRepository reviewSubmissionRepository;
    private final SprintRepository sprintRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final AnonymityAggregator anonymityAggregator;

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
    public List<ReviewRound> getRoundsByTeam(Long teamId) {
        return reviewRoundRepository.findByTeamId(teamId);
    }

    @Transactional(readOnly = true)
    public List<ReviewRound> getRoundsBySprint(Long sprintId) {
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
            submissions.add(submission);
        }

        return reviewSubmissionRepository.saveAll(submissions);
    }

    @Transactional(readOnly = true)
    public AnonymityAggregator.AggregatedResult getAggregatedResults(Long roundId, Long revieweeId) {
        ReviewRound round = reviewRoundRepository.findById(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Review round not found: " + roundId));

        List<ReviewSubmission> submissions = reviewSubmissionRepository.findByReviewRoundIdAndRevieweeId(roundId, revieweeId);
        return anonymityAggregator.aggregateForReviewee(revieweeId, submissions, round.getMinSubmissionsRequired());
    }

    @Transactional(readOnly = true)
    public AnonymityAggregator.AggregatedResult getAggregatedResults(Long roundId, Long revieweeId, Long requesterId) {
        ReviewRound round = reviewRoundRepository.findById(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Review round not found: " + roundId));
        if (requesterId != null && round.getTeam() != null && round.getTeam().getId() != null) {
            if (!teamMemberRepository.existsByTeamIdAndUserId(round.getTeam().getId(), requesterId)) {
                throw new ForbiddenException("Bạn không thuộc nhóm của đợt chấm chéo này");
            }
        }
        List<ReviewSubmission> submissions = reviewSubmissionRepository.findByReviewRoundIdAndRevieweeId(roundId, revieweeId);
        return anonymityAggregator.aggregateForReviewee(revieweeId, submissions, round.getMinSubmissionsRequired());
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
            throw new BusinessException("Authenticated user is required");
        }
        TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new BusinessException("Only a team leader can manage review rounds"));
        if (member.getRole() != MemberRole.LEADER) {
            throw new BusinessException("Only a team leader can manage review rounds");
        }
    }
}
