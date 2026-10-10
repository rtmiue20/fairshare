package com.fairshare.peerreview.dto;

import com.fairshare.peerreview.entity.ReviewCriterion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewSubmissionDto {
    private Long id;
    private Long reviewRoundId;
    private Long reviewerId;
    private Long revieweeId;
    private ReviewCriterion criterion;
    private int score;
    private String feedback;
}
