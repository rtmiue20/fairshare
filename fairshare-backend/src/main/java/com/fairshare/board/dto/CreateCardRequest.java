package com.fairshare.board.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateCardRequest {
    @NotBlank(message = "Card title cannot be blank")
    private String title;

    private String description;

    private Long assigneeId;

    private Double storyPoints;

    private LocalDateTime dueDate;

    private Integer position;
}
