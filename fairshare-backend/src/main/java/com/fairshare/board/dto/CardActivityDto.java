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
public class CardActivityDto {
    private Long id;
    private Long cardId;
    private Long userId;
    private String userName;
    private String userEmail;
    private String eventType;
    private String fromColumn;
    private String toColumn;
    private String displayMessage;
    private String commentText;
    private LocalDateTime occurredAt;
}

