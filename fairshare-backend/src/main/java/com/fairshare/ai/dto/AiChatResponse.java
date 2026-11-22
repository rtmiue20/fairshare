package com.fairshare.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatResponse {
    private String answer;
    private String interactionId;
    private String modelUsed;
    private boolean liveGeminiUsed;
    private TcreiPromptBreakdownDto tcrei;
    private List<String> suggestedFollowUps;
}
