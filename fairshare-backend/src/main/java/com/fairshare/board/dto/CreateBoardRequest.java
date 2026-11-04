package com.fairshare.board.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBoardRequest {
    @NotNull(message = "teamId is required")
    private Long teamId;

    @NotBlank(message = "Board name cannot be blank")
    private String name;

    private String description;
}
