package com.fairshare.contribution.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO yêu cầu gửi khai báo đóng góp thủ công (Card 8).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualContributionRequest {

    @NotBlank(message = "Tên công việc không được để trống")
    private String taskName;

    private String evidenceLink;

    @NotNull(message = "Story points không được để trống")
    @DecimalMin(value = "0.1", message = "Story points phải lớn hơn hoặc bằng 0.1")
    private BigDecimal storyPoints;
}

