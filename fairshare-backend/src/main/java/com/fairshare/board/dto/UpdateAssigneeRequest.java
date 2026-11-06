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
public class UpdateAssigneeRequest {

    @NotNull(message = "Người phụ trách không được để trống")
    private Long assigneeId;
}
