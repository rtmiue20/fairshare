package com.fairshare.activity.controller;

import com.fairshare.activity.dto.ActivityEventDto;
import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.service.ActivityService;
import com.fairshare.common.dto.ApiResponse;
import com.fairshare.common.security.TeamSecurityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller truy vấn lịch sử sự kiện hoạt động (Append-only / Read-only API).
 * Tuyệt đối không mở các endpoint PUT, PATCH, DELETE để đảm bảo tính bất biến của dữ liệu gốc.
 */
@RestController
@RequestMapping("/api/activities")
public class ActivityController {

    private final ActivityService activityService;
    private final TeamSecurityService teamSecurityService;

    public ActivityController(ActivityService activityService) {
        this.activityService = activityService;
        this.teamSecurityService = null;
    }

    @Autowired
    public ActivityController(ActivityService activityService, @Autowired(required = false) TeamSecurityService teamSecurityService) {
        this.activityService = activityService;
        this.teamSecurityService = teamSecurityService;
    }

    @GetMapping("/team/{teamId}")
    public ResponseEntity<ApiResponse<List<ActivityEventDto>>> getByTeam(
            @PathVariable Long teamId,
            Authentication authentication) {
        if (teamSecurityService != null && authentication != null) {
            teamSecurityService.assertTeamMember(teamId, authentication);
        }
        List<ActivityEventDto> dtos = activityService.getEventsByTeam(teamId).stream()
                .map(this::toDto)
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Team activities retrieved", dtos));
    }

    public ResponseEntity<ApiResponse<List<ActivityEventDto>>> getByTeam(Long teamId) {
        return getByTeam(teamId, null);
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
