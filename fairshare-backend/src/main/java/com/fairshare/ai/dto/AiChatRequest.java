package com.fairshare.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatRequest {
    private Long teamId;
    private Long sprintId;
    private Long focusedUserId;

    @NotBlank(message = "Câu hỏi không được để trống")
    private String question;

    private String previousInteractionId;
    private List<AiChatMessageDto> history;
}
