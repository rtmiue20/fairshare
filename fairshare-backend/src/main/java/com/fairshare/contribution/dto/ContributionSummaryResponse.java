package com.fairshare.contribution.dto;

import com.fairshare.contribution.entity.ContributionScore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContributionSummaryResponse {

    private Long userId;
    private String userName;
    private BigDecimal trelloScore;
    private BigDecimal manualScore;
    private BigDecimal activityPct;
    private BigDecimal peerPct;
    private BigDecimal finalPct;

    // Multi-Dimensional 4-Tier Metrics
    private BigDecimal d1Output;
    private BigDecimal d2Reliability;
    private BigDecimal d3Collaboration;
    private BigDecimal d4Peer;
    private BigDecimal compositeScore;
    private BigDecimal availabilityFactor;
    private BigDecimal confidenceIntervalLow;
    private BigDecimal confidenceIntervalHigh;
    private BigDecimal distanceToCenter;
    private Boolean isSuspicious;
    private Boolean hasSufficientEvidence;
    private String evidenceStatus;

    public static ContributionSummaryResponse fromEntity(ContributionScore score) {
        if (score == null) {
            return null;
        }
        boolean hasEvidence = score.getHasSufficientEvidence() == null || Boolean.TRUE.equals(score.getHasSufficientEvidence());
        String status = hasEvidence ? "SUFFICIENT" : "INSUFFICIENT_EVIDENCE";

        BigDecimal finalPctVal = score.getFinalPct() != null ? score.getFinalPct() : BigDecimal.ZERO;
        BigDecimal ciLow = score.getConfidenceIntervalLow();
        BigDecimal ciHigh = score.getConfidenceIntervalHigh();
        if (ciLow == null) {
            ciLow = finalPctVal.subtract(new BigDecimal("2.10")).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        }
        if (ciHigh == null) {
            ciHigh = finalPctVal.add(new BigDecimal("2.10")).min(new BigDecimal("100.00")).setScale(2, RoundingMode.HALF_UP);
        }

        return ContributionSummaryResponse.builder()
                .userId(score.getUser() != null ? score.getUser().getId() : null)
                .userName(score.getUser() != null ? score.getUser().getFullName() : null)
                .trelloScore(score.getTrelloScore() != null ? score.getTrelloScore() : BigDecimal.ZERO)
                .manualScore(score.getManualScore() != null ? score.getManualScore() : BigDecimal.ZERO)
                .activityPct(score.getActivityPct() != null ? score.getActivityPct() : BigDecimal.ZERO)
                .peerPct(score.getPeerPct() != null ? score.getPeerPct() : BigDecimal.ZERO)
                .finalPct(finalPctVal)
                .d1Output(score.getD1Output() != null ? score.getD1Output() : BigDecimal.ZERO)
                .d2Reliability(score.getD2Reliability() != null ? score.getD2Reliability() : BigDecimal.ZERO)
                .d3Collaboration(score.getD3Collaboration() != null ? score.getD3Collaboration() : BigDecimal.ZERO)
                .d4Peer(score.getD4Peer() != null ? score.getD4Peer() : BigDecimal.ZERO)
                .compositeScore(score.getCompositeScore() != null ? score.getCompositeScore() : BigDecimal.ZERO)
                .availabilityFactor(score.getAvailabilityFactor() != null ? score.getAvailabilityFactor() : BigDecimal.ONE)
                .confidenceIntervalLow(ciLow)
                .confidenceIntervalHigh(ciHigh)
                .distanceToCenter(score.getDistanceToCenter() != null ? score.getDistanceToCenter() : BigDecimal.ZERO)
                .isSuspicious(Boolean.TRUE.equals(score.getIsSuspicious()))
                .hasSufficientEvidence(hasEvidence)
                .evidenceStatus(status)
                .build();
    }
}
