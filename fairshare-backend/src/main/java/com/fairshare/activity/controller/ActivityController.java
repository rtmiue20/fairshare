package com.fairshare.activity.controller;

import com.fairshare.activity.dto.ActivityEventDto;
import com.fairshare.activity.service.ActivityService;
import com.fairshare.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping("/team/{teamId}")
    public ResponseEntity<ApiResponse<List<ActivityEventDto>>> getByTeam(@PathVariable Long teamId) {
        List<ActivityEventDto> dtos = activityService.getEventsByTeam(teamId).stream()
                .map(e -> ActivityEventDto.builder()
                        .id(e.getId())
                        .teamId(e.getTeam() != null ? e.getTeam().getId() : null)
                        .userId(e.getUser() != null ? e.getUser().getId() : null)
                        .source(e.getSource())
                        .eventType(e.getEventType())
                        .details(e.getDetails())
                        .occurredAt(e.getOccurredAt())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Team activities retrieved", dtos));
    }

    @GetMapping("/sprint/{sprintId}")
    public ResponseEntity<ApiResponse<List<ActivityEventDto>>> getBySprint(@PathVariable Long sprintId) {
        List<ActivityEventDto> dtos = activityService.getEventsBySprint(sprintId).stream()
                .map(e -> ActivityEventDto.builder()
                        .id(e.getId())
                        .teamId(e.getTeam() != null ? e.getTeam().getId() : null)
                        .userId(e.getUser() != null ? e.getUser().getId() : null)
                        .source(e.getSource())
                        .eventType(e.getEventType())
                        .details(e.getDetails())
                        .occurredAt(e.getOccurredAt())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Sprint activities retrieved", dtos));
    }
}
