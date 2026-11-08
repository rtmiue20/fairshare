package com.fairshare.board.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompleteChecklistItemRequest {
    @NotBlank(message = "Tiêu đề việc cần làm không được để trống")
    private String itemTitle;
}

