package com.fairshare.contribution.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResolveSuspicionRequest {

    @NotNull(message = "sprintId không được để trống")
    private Long sprintId;

    @NotNull(message = "userId không được để trống")
    private Long userId;

    private boolean isSuspicious;

    private String note;
}
