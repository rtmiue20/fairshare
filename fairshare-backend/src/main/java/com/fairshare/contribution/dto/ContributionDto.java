package com.fairshare.contribution.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContributionDto {
    private Long id;
    private Long teamId;
    private Long sprintId;
    private Long userId;
    private String userName;
    private String userEmail;
    private BigDecimal score;
    private BigDecimal percentage;
    private Integer cardsCompleted;
    private Integer taskCompletedCount;
    private Integer docsEditCount;
    private BigDecimal manualScore;
    private BigDecimal totalScore;
    private Double totalStoryPoints;
    private Double onTimeRate;

    // Multi-dimensional 4-tier metrics (Sprint 4 - CR-03)
    private Double d1Output;
    private Double d2Reliability;
    private Double d3Collaboration;
    private Double d4Peer;
    private Double compositeScore;
    private Double availabilityFactor;
    private Double confidenceIntervalLow;
    private Double confidenceIntervalHigh;
    private Double distanceToCenter;
    private Boolean isSuspicious;
    private Boolean hasSufficientEvidence;
}
