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
    private BigDecimal score;
    private BigDecimal percentage;
}
