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
public class CardDto {
    private Long id;
    private Long boardId;
    private Long columnId;
    private String title;
    private String description;
    private Long assigneeId;
    private String assigneeName;
    private String assigneeEmail;
    private Double storyPoints;
    private LocalDateTime dueDate;
    private int position;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
