package com.fairshare.sprint.controller;

import com.fairshare.common.dto.ApiResponse;
import com.fairshare.sprint.dto.SprintDto;
import com.fairshare.sprint.service.SprintService;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sprints")
@RequiredArgsConstructor
public class SprintController {

    private final SprintService sprintService;
    private final UserRepository userRepository;

    @GetMapping("/{sprintId}")
    public ResponseEntity<ApiResponse<SprintDto>> getSprintById(@PathVariable Long sprintId) {
        SprintDto sprint = sprintService.getSprintById(sprintId);
        return ResponseEntity.ok(ApiResponse.ok("Sprint retrieved successfully", sprint));
    }

    @PutMapping("/{sprintId}/close")
    public ResponseEntity<ApiResponse<SprintDto>> closeSprint(
            @PathVariable Long sprintId,
            Authentication authentication) {
        Long actorId = getUserId(authentication);
        SprintDto closed = sprintService.closeSprint(sprintId, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Sprint closed successfully", closed));
    }

    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }
}
