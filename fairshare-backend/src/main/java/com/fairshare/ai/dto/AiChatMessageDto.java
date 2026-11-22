package com.fairshare.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatMessageDto {
    /**
     * "user" hoặc "assistant"
     */
    private String role;
    private String content;
}
