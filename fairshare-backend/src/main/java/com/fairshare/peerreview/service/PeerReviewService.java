package com.fairshare.peerreview.service;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.peerreview.dto.ReviewSubmissionDto;
import com.fairshare.peerreview.entity.ReviewRound;
import com.fairshare.peerreview.entity.ReviewSubmission;
import com.fairshare.peerreview.repository.ReviewRoundRepository;
import com.fairshare.peerreview.repository.ReviewSubmissionRepository;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.Team;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PeerReviewService {

    private final ReviewRoundRepository reviewRoundRepository;
    private final ReviewSubmissionRepository reviewSubmissionRepository;
    private final SprintRepository sprintRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final AnonymityAggregator anonymityAggregator;

    @Transactional
    public ReviewRound createRound(Long sprintId, String name, LocalDateTime startDate, LocalDateTime endDate) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found: " + sprintId));

        ReviewRound round = new ReviewRound();
        round.setSprint(sprint);
        round.setTeam(sprint.getTeam());
        round.setName(name);
        round.setStartDate(startDate);
        round.setEndDate(endDate);
        round.setMinSubmissionsRequired(3);

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
    public ReviewSubmission submitReview(Long roundId, Long reviewerId, ReviewSubmissionDto dto) {
        if (reviewerId.equals(dto.getRevieweeId())) {
            throw new BusinessException("Cannot review yourself");
        }

        ReviewRound round = reviewRoundRepository.findById(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Review round not found: " + roundId));

        User reviewer = userRepository.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Reviewer not found: " + reviewerId));

        User reviewee = userRepository.findById(dto.getRevieweeId())
                .orElseThrow(() -> new ResourceNotFoundException("Reviewee not found: " + dto.getRevieweeId()));

        ReviewSubmission submission = new ReviewSubmission();
        submission.setReviewRound(round);
        submission.setReviewer(reviewer);
        submission.setReviewee(reviewee);
        submission.setCriterion(dto.getCriterion());
        submission.setScore(dto.getScore());
        submission.setFeedback(dto.getFeedback());

        return reviewSubmissionRepository.save(submission);
    }

    @Transactional(readOnly = true)
    public AnonymityAggregator.AggregatedResult getAggregatedResults(Long roundId, Long revieweeId) {
        ReviewRound round = reviewRoundRepository.findById(roundId)
                .orElseThrow(() -> new ResourceNotFoundException("Review round not found: " + roundId));

        List<ReviewSubmission> submissions = reviewSubmissionRepository.findByReviewRoundIdAndRevieweeId(roundId, revieweeId);
        return anonymityAggregator.aggregateForReviewee(revieweeId, submissions, round.getMinSubmissionsRequired());
    }
}
