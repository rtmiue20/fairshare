package com.fairshare.contribution.dto;

import com.fairshare.contribution.entity.ManualContribution;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO phản hồi thông tin đóng góp thủ công (Card 8).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualContributionResponse {

    private Long id;
    private Long teamId;
    private Long sprintId;
    private Long userId;
    private String taskName;
    private String evidenceLink;
    private BigDecimal storyPoints;
    private String status;
    private Long reviewerId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ManualContributionResponse fromEntity(ManualContribution entity) {
        if (entity == null) {
            return null;
        }
        return ManualContributionResponse.builder()
                .id(entity.getId())
                .teamId(entity.getTeamId())
                .sprintId(entity.getSprintId())
                .userId(entity.getUserId())
                .taskName(entity.getTaskName() != null ? entity.getTaskName() : entity.getTitle())
                .evidenceLink(entity.getEvidenceLink())
                .storyPoints(entity.getStoryPoints())
                .status(entity.getStatus())
                .reviewerId(entity.getReviewerId() != null ? entity.getReviewerId() : entity.getConfirmedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
