package com.fairshare.board.dto;

import com.fairshare.board.entity.Card;
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
    private Integer difficultyLevel;
    private LocalDateTime dueDate;
    private int position;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CardDto from(Card card) {
        if (card == null) return null;
        return CardDto.builder()
                .id(card.getId())
                .boardId(card.getBoard() != null ? card.getBoard().getId() : null)
                .columnId(card.getColumn() != null ? card.getColumn().getId() : null)
                .title(card.getTitle())
                .description(card.getDescription())
                .assigneeId(card.getAssignee() != null ? card.getAssignee().getId() : null)
                .assigneeName(card.getAssignee() != null ? card.getAssignee().getFullName() : null)
                .assigneeEmail(card.getAssignee() != null ? card.getAssignee().getEmail() : null)
                .storyPoints(card.getStoryPoints())
                .difficultyLevel(card.getDifficultyLevel())
                .dueDate(card.getDueDate())
                .position(card.getPosition())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt())
                .build();
    }
}
