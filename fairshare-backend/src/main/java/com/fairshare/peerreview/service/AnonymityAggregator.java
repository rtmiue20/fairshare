package com.fairshare.peerreview.service;

import com.fairshare.peerreview.entity.ReviewSubmission;
import com.fairshare.user.entity.User;
import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Component
public class AnonymityAggregator {

    @Data
    @Builder
    public static class AggregatedResult {
        private Long revieweeId;
        private double averageScore;
        private int submissionCount;
        private boolean isAnonymousSafe; // true if submissionCount >= threshold
        private List<String> feedbackComments;
    }

    public AggregatedResult aggregateForReviewee(Long revieweeId, List<ReviewSubmission> submissions, int threshold) {
        if (submissions == null || submissions.isEmpty()) {
            return AggregatedResult.builder()
                    .revieweeId(revieweeId)
                    .averageScore(0.0)
                    .submissionCount(0)
                    .isAnonymousSafe(false)
                    .feedbackComments(Collections.emptyList())
                    .build();
        }

        Set<Long> reviewerIds = new LinkedHashSet<>();
        for (ReviewSubmission submission : submissions) {
            User reviewer = submission.getReviewer();
            if (reviewer != null && reviewer.getId() != null) {
                reviewerIds.add(reviewer.getId());
            }
        }

        int count = reviewerIds.size();
        boolean safe = count >= threshold;

        double sum = 0.0;
        List<String> comments = new ArrayList<>();
        Set<Long> commenters = new LinkedHashSet<>();

        for (ReviewSubmission s : submissions) {
            sum += s.getScore();
            User reviewer = s.getReviewer();
            Long reviewerId = reviewer == null ? null : reviewer.getId();
            if (safe && reviewerId != null && s.getFeedback() != null
                    && !s.getFeedback().isBlank() && commenters.add(reviewerId)) {
                comments.add(s.getFeedback());
            }
        }

        double avg = safe ? sum / submissions.size() : 0.0;

        return AggregatedResult.builder()
                .revieweeId(revieweeId)
                .averageScore(Math.round(avg * 100.0) / 100.0)
                .submissionCount(count)
                .isAnonymousSafe(safe)
                .feedbackComments(safe ? comments : Collections.emptyList())
                .build();
    }
}
