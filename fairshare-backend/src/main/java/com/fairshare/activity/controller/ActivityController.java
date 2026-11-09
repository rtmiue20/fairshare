package com.fairshare.activity.controller;

import com.fairshare.activity.dto.ActivityEventDto;
import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.service.ActivityService;
import com.fairshare.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller truy vấn lịch sử sự kiện hoạt động (Append-only / Read-only API).
 * Tuyệt đối không mở các endpoint PUT, PATCH, DELETE để đảm bảo tính bất biến của dữ liệu gốc.
 */
@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping("/team/{teamId}")
    public ResponseEntity<ApiResponse<List<ActivityEventDto>>> getByTeam(@PathVariable Long teamId) {
        List<ActivityEventDto> dtos = activityService.getEventsByTeam(teamId).stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Team activities retrieved", dtos));
    }

    @GetMapping("/sprint/{sprintId}")
    public ResponseEntity<ApiResponse<List<ActivityEventDto>>> getBySprint(@PathVariable Long sprintId) {
        List<ActivityEventDto> dtos = activityService.getEventsBySprint(sprintId).stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Sprint activities retrieved", dtos));
    }

    private ActivityEventDto toDto(ActivityEvent e) {
        return ActivityEventDto.builder()
                .id(e.getId())
                .teamId(e.getTeam() != null ? e.getTeam().getId() : null)
                .userId(e.getUser() != null ? e.getUser().getId() : null)
                .sprintId(e.getSprint() != null ? e.getSprint().getId() : null)
                .source(e.getSource())
                .eventType(e.getEventType())
                .details(e.getDetails())
                .storyPoints(e.getStoryPoints())
                .difficultyLevel(e.getDifficultyLevel())
                .isOnTime(e.getIsOnTime())
                .delayDays(e.getDelayDays())
                .completionStatus(e.getCompletionStatus())
                .occurredAt(e.getOccurredAt())
                .build();
    }
}
