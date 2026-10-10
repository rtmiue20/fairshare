package com.fairshare.sprint.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SprintDto {
    private Long id;
    private Long teamId;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
}
