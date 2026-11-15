package com.fairshare.contribution.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateAvailabilityRequest {

    @NotNull(message = "sprintId không được để trống")
    private Long sprintId;

    @NotNull(message = "userId không được để trống")
    private Long userId;

    @NotNull(message = "availabilityFactor không được để trống")
    @DecimalMin(value = "0.50", message = "Hệ số khả dụng tối thiểu là 0.50")
    @DecimalMax(value = "1.00", message = "Hệ số khả dụng tối đa là 1.00")
    private Double availabilityFactor;

    private String reason;
}
