package com.fairshare.board.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateCardRequest {
    private String title;
    private String description;
    private Long assigneeId;
    private Double storyPoints;
    private Integer difficultyLevel;
    private LocalDateTime dueDate;
    private Integer position;
}
