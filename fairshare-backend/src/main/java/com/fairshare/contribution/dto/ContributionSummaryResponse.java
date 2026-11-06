package com.fairshare.contribution.dto;

import com.fairshare.contribution.entity.ContributionScore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

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

    public static ContributionSummaryResponse fromEntity(ContributionScore score) {
        if (score == null) {
            return null;
        }
        return ContributionSummaryResponse.builder()
                .userId(score.getUser() != null ? score.getUser().getId() : null)
                .userName(score.getUser() != null ? score.getUser().getFullName() : null)
                .trelloScore(score.getTrelloScore() != null ? score.getTrelloScore() : BigDecimal.ZERO)
                .manualScore(score.getManualScore() != null ? score.getManualScore() : BigDecimal.ZERO)
                .activityPct(score.getActivityPct() != null ? score.getActivityPct() : BigDecimal.ZERO)
                .peerPct(score.getPeerPct() != null ? score.getPeerPct() : BigDecimal.ZERO)
                .finalPct(score.getFinalPct() != null ? score.getFinalPct() : BigDecimal.ZERO)
                .build();
    }
}
