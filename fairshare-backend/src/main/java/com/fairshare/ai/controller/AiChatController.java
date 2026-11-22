package com.fairshare.ai.controller;

import com.fairshare.ai.dto.AiChatRequest;
import com.fairshare.ai.dto.AiChatResponse;
import com.fairshare.ai.service.AiChatService;
import com.fairshare.common.dto.ApiResponse;
import com.fairshare.common.security.TeamSecurityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;
    private final TeamSecurityService teamSecurityService;

    /**
     * Endpoint AI Chatbox tích hợp khung Prompt TCREI & Gemini API.
     */
    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<AiChatResponse>> chat(
            @Valid @RequestBody AiChatRequest request,
            Authentication authentication) {
        if (teamSecurityService != null && authentication != null && request.getTeamId() != null) {
            teamSecurityService.assertTeamMember(request.getTeamId(), authentication);
        }
        String authenticatedEmail = authentication != null ? authentication.getName() : null;
        AiChatResponse response = aiChatService.chat(request, authenticatedEmail);
        return ResponseEntity.ok(ApiResponse.ok("Trả lời AI Chatbox (TCREI)", response));
    }
}
