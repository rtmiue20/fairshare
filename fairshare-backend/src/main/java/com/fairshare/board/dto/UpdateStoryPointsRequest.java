package com.fairshare.board.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStoryPointsRequest {

    @NotNull(message = "Story point không được để trống")
    @Positive(message = "Story point phải là số nguyên dương")
    private Double storyPoints;
}

