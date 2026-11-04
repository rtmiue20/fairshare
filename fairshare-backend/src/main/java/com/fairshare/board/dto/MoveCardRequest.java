package com.fairshare.board.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MoveCardRequest {
    @NotNull(message = "targetColumnId is required")
    private Long targetColumnId;

    private Integer position;
}
