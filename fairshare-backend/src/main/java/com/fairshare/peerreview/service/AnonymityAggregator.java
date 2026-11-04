package com.fairshare.peerreview.service;

import com.fairshare.peerreview.entity.ReviewSubmission;
import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.util.*;

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

        int count = submissions.size();
        boolean safe = count >= threshold;

        double sum = 0.0;
        List<String> comments = new ArrayList<>();

        for (ReviewSubmission s : submissions) {
            sum += s.getScore();
            if (safe && s.getFeedback() != null && !s.getFeedback().isBlank()) {
                comments.add(s.getFeedback());
            }
        }

        double avg = count > 0 ? sum / count : 0.0;

        return AggregatedResult.builder()
                .revieweeId(revieweeId)
                .averageScore(Math.round(avg * 100.0) / 100.0)
                .submissionCount(count)
                .isAnonymousSafe(safe)
                .feedbackComments(safe ? comments : Collections.emptyList())
                .build();
    }
}
