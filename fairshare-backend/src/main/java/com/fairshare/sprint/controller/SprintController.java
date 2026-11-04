package com.fairshare.sprint.controller;

import com.fairshare.common.dto.ApiResponse;
import com.fairshare.sprint.dto.SprintDto;
import com.fairshare.sprint.service.SprintService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sprints")
@RequiredArgsConstructor
public class SprintController {

    private final SprintService sprintService;

    @GetMapping("/{sprintId}")
    public ResponseEntity<ApiResponse<SprintDto>> getSprintById(@PathVariable Long sprintId) {
        SprintDto sprint = sprintService.getSprintById(sprintId);
        return ResponseEntity.ok(ApiResponse.ok("Sprint retrieved successfully", sprint));
    }

    @PutMapping("/{sprintId}/close")
    public ResponseEntity<ApiResponse<SprintDto>> closeSprint(@PathVariable Long sprintId) {
        SprintDto closed = sprintService.closeSprint(sprintId);
        return ResponseEntity.ok(ApiResponse.ok("Sprint closed successfully", closed));
    }
}
