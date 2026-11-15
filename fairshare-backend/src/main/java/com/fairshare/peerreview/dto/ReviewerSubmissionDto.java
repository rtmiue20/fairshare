package com.fairshare.peerreview.dto;

import com.fairshare.peerreview.entity.ReviewCriterion;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO trả về danh sách các đánh giá mà một reviewer đã gửi trong một round.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewerSubmissionDto {

    private Long revieweeId;
    private String revieweeName;
    private Double averageScore;
    private List<CriterionScoreDto> scores;
    private String feedback;
    private LocalDateTime submittedAt;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CriterionScoreDto {
        private ReviewCriterion criterion;
        private Integer score;
    }
}

