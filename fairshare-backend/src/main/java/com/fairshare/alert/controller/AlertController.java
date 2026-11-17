package com.fairshare.alert.controller;

import com.fairshare.alert.dto.AlertDto;
import com.fairshare.alert.dto.CreateAlertRequest;
import com.fairshare.alert.dto.MemberInactivityDto;
import com.fairshare.alert.service.InactivityAlertService;
import com.fairshare.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final InactivityAlertService alertService;

    @GetMapping("/team/{teamId}")
    public ResponseEntity<ApiResponse<List<AlertDto>>> getTeamAlerts(
            @PathVariable Long teamId,
            @RequestParam(defaultValue = "false") boolean includeResolved,
            @RequestParam(defaultValue = "5") int thresholdDays
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Danh sách cảnh báo của nhóm",
                alertService.getAlertsByTeam(teamId, includeResolved, thresholdDays)
        ));
    }

    @GetMapping("/team/{teamId}/inactivity")
    public ResponseEntity<ApiResponse<List<MemberInactivityDto>>> getMemberInactivity(
            @PathVariable Long teamId,
            @RequestParam(defaultValue = "5") int thresholdDays
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Thống kê số ngày im lặng của thành viên",
                alertService.getMemberInactivity(teamId, thresholdDays)
        ));
    }

    @PostMapping("/team/{teamId}")
    public ResponseEntity<ApiResponse<AlertDto>> createAlert(
            @PathVariable Long teamId,
            @RequestBody CreateAlertRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã gửi cảnh báo thành công",
                alertService.createManualAlert(teamId, request)
        ));
    }

    @PutMapping("/{alertId}/resolve")
    public ResponseEntity<ApiResponse<AlertDto>> resolveAlert(@PathVariable Long alertId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã đánh dấu giải quyết cảnh báo",
                alertService.resolveAlert(alertId)
        ));
    }

    @PostMapping("/{alertId}/remind")
    public ResponseEntity<ApiResponse<String>> remindMember(@PathVariable Long alertId) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Đã gửi nhắc nhở thành công",
                alertService.remindMember(alertId)
        ));
    }
}

