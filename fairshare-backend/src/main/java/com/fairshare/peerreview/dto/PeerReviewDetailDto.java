package com.fairshare.peerreview.dto;

import com.fairshare.peerreview.entity.ReviewCriterion;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PeerReviewDetailDto {

    private Long id;
    private Long reviewRoundId;
    private Long reviewerId;
    private String reviewerName;
    private String reviewerEmail;
    private Long revieweeId;
    private String revieweeName;
    private Double averageScore;
    private Integer qualityScore;
    private Integer punctualityScore;
    private Integer cooperationScore;
    private List<CriterionScoreDto> scores;
    private String feedback;
    private LocalDateTime submittedAt;
    private Integer likesCount;
    private Long cardId;
    private String cardTitle;

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
