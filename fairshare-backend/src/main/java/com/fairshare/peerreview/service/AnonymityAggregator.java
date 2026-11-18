package com.fairshare.peerreview.service;

import com.fairshare.peerreview.entity.ReviewSubmission;
import com.fairshare.user.entity.User;
import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class AnonymityAggregator {

    private static final int MIN_ANONYMITY_THRESHOLD = 3;

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

        Map<Long, List<Integer>> scoresByReviewer = new LinkedHashMap<>();
        for (ReviewSubmission submission : submissions) {
            User reviewer = submission.getReviewer();
            if (reviewer != null && reviewer.getId() != null) {
                scoresByReviewer.computeIfAbsent(reviewer.getId(), ignored -> new ArrayList<>())
                        .add(submission.getScore());
            }
        }

        int count = scoresByReviewer.size();
        boolean safe = count >= Math.max(MIN_ANONYMITY_THRESHOLD, threshold);

        double reviewerAverages = 0.0;
        Map<Long, String> commentsByReviewer = new LinkedHashMap<>();

        for (Map.Entry<Long, List<Integer>> entry : scoresByReviewer.entrySet()) {
            reviewerAverages += entry.getValue().stream().mapToInt(Integer::intValue).average().orElse(0.0);
        }

        for (ReviewSubmission submission : submissions) {
            User reviewer = submission.getReviewer();
            Long reviewerId = reviewer == null ? null : reviewer.getId();
            if (reviewerId != null && submission.getFeedback() != null
                    && !submission.getFeedback().isBlank()) {
                commentsByReviewer.putIfAbsent(reviewerId, submission.getFeedback());
            }
        }

        double avg = safe && count > 0 ? reviewerAverages / count : 0.0;
        List<String> comments = safe && commentsByReviewer.size() >= Math.max(MIN_ANONYMITY_THRESHOLD, threshold)
                ? new ArrayList<>(commentsByReviewer.values())
                : Collections.emptyList();

        return AggregatedResult.builder()
                .revieweeId(revieweeId)
                .averageScore(Math.round(avg * 100.0) / 100.0)
                .submissionCount(count)
                .isAnonymousSafe(safe)
                .feedbackComments(comments)
                .build();
    }
}
