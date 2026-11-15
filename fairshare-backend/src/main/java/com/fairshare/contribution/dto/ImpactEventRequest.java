package com.fairshare.contribution.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImpactEventRequest {

    @NotNull(message = "teamId không được để trống")
    private Long teamId;

    private Long sprintId;

    @NotNull(message = "userId không được để trống")
    private Long userId;

    @NotBlank(message = "Tiêu đề tác động không được để trống")
    private String title;

    private String description;

    /**
     * Phân loại tác động:
     * IMPEDIMENT: Rào cản kỹ thuật / blocker
     * HEALTH_AVAILABILITY: Sức khỏe / Nghỉ ốm / Thi cử / Khả dụng
     * REWORK_REASON: Yêu cầu đổi spec / bug phát sinh
     * EXTERNAL_BLOCKER: Chờ đối tác / thành viên khác
     * COLLAB_SUPPORT: Hỗ trợ khẩn cấp cho đồng đội
     */
    @NotBlank(message = "Loại tác động không được để trống")
    private String category;

    /**
     * Mức độ nghiêm trọng: LOW, MEDIUM, HIGH, CRITICAL
     */
    @Builder.Default
    private String severity = "MEDIUM";

    private Double delayDays;

    private Integer difficultyLevel;

    private Double storyPoints;

    private Double updatedAvailabilityFactor;

    private LocalDateTime occurredAt;
}
