package com.fairshare.sprint.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateSprintRequest {
    @NotBlank(message = "Sprint name cannot be blank")
    private String name;

    private LocalDate startDate;

    private LocalDate endDate;
}
