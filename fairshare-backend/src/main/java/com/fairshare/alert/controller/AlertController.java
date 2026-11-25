package com.fairshare.alert.controller;

import com.fairshare.alert.dto.AlertDto;
import com.fairshare.alert.dto.CreateAlertRequest;
import com.fairshare.alert.dto.MemberInactivityDto;
import com.fairshare.alert.service.InactivityAlertService;
import com.fairshare.common.dto.ApiResponse;
import com.fairshare.common.security.TeamSecurityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final InactivityAlertService alertService;
    private final TeamSecurityService teamSecurityService;

    public AlertController(InactivityAlertService alertService) {
        this(alertService, null);
    }

    @Autowired
    public AlertController(
            InactivityAlertService alertService,
            @Autowired(required = false) TeamSecurityService teamSecurityService) {
        this.alertService = alertService;
        this.teamSecurityService = teamSecurityService;
    }

    @GetMapping("/team/{teamId}")
    public ResponseEntity<ApiResponse<List<AlertDto>>> getTeamAlerts(
            @PathVariable Long teamId,
            @RequestParam(defaultValue = "false") boolean includeResolved,
            @RequestParam(defaultValue = "5") int thresholdDays,
            Authentication authentication
    ) {
        assertTeamMemberIfPresent(teamId, authentication);
        return ResponseEntity.ok(ApiResponse.ok(
                "Danh sách cảnh báo của nhóm",
                alertService.getAlertsByTeam(teamId, includeResolved, thresholdDays)
        ));
    }

    @GetMapping("/team/{teamId}/inactivity")
    public ResponseEntity<ApiResponse<List<MemberInactivityDto>>> getMemberInactivity(
            @PathVariable Long teamId,
            @RequestParam(defaultValue = "5") int thresholdDays,
            Authentication authentication
    ) {
        assertTeamMemberIfPresent(teamId, authentication);
        return ResponseEntity.ok(ApiResponse.ok(
                "Thống kê số ngày im lặng của thành viên",
                alertService.getMemberInactivity(teamId, thresholdDays)
        ));
    }

    @PostMapping("/team/{teamId}")
    public ResponseEntity<ApiResponse<AlertDto>> createAlert(
            @PathVariable Long teamId,
            @RequestBody CreateAlertRequest request,
            Authentication authentication
    ) {
        assertTeamMemberIfPresent(teamId, authentication);
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã gửi cảnh báo thành công",
                alertService.createManualAlert(teamId, request)
        ));
    }

    private void assertTeamMemberIfPresent(Long teamId, Authentication authentication) {
        if (teamSecurityService != null && authentication != null) {
            teamSecurityService.assertTeamMember(teamId, authentication);
        }
    }

    @PutMapping("/{alertId}/resolve")
    public ResponseEntity<ApiResponse<AlertDto>> resolveAlert(@PathVariable Long alertId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã đánh dấu giải quyết cảnh báo",
                alertService.resolveAlert(alertId)
        ));
    }

    @PostMapping("/{alertId}/remind")
    public ResponseEntity<ApiResponse<String>> remindMember(
            @PathVariable Long alertId,
            Authentication authentication
    ) {
        String senderEmail = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã gửi nhắc nhở thành công",
                alertService.remindMember(alertId, senderEmail)
        ));
    }
}

