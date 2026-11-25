package com.fairshare.report.controller;

import com.fairshare.common.dto.ApiResponse;
import com.fairshare.common.security.TeamSecurityService;
import com.fairshare.report.dto.IndividualReportDto;
import com.fairshare.report.dto.OverviewReportDto;
import com.fairshare.report.dto.ReportDto;
import com.fairshare.report.dto.SendReportRequest;
import com.fairshare.report.service.PdfReportService;
import com.fairshare.report.service.ReportService;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final PdfReportService pdfReportService;
    private final ReportService reportService;
    private final UserRepository userRepository;
    private final TeamSecurityService teamSecurityService;

    /**
     * Xuat va tai file PDF bao cao dong gop cua Sprint (Chi Leader moi co quyen).
     */
    @GetMapping("/teams/{teamId}/sprints/{sprintId}/pdf")
    public ResponseEntity<byte[]> downloadSprintReportPdf(
            @PathVariable Long teamId,
            @PathVariable Long sprintId,
            Authentication authentication) {
        Long requesterId = getUserId(authentication);
        if (requesterId == null) {
            throw new com.fairshare.common.exception.ForbiddenException("Bạn không có quyền truy cập báo cáo này");
        }
        byte[] pdfBytes = pdfReportService.generateSprintReportPdf(teamId, sprintId, requesterId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "FairShare_Report_Team_" + teamId + "_Sprint_" + sprintId + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    /**
     * Lay thong tin metadata cua bao cao Sprint.
     */
    @GetMapping("/teams/{teamId}/sprints/{sprintId}")
    public ApiResponse<ReportDto> getReportInfo(
            @PathVariable Long teamId,
            @PathVariable Long sprintId) {
        String url = "/api/reports/teams/" + teamId + "/sprints/" + sprintId + "/pdf";
        ReportDto dto = ReportDto.builder()
                .teamId(teamId)
                .sprintId(sprintId)
                .reportUrl(url)
                .build();
        return ApiResponse.ok(dto);
    }

    /**
     * GET /api/reports/overview?teamId={}&sprintId={}
     * Lấy báo cáo tổng quan của sprint cho cả nhóm.
     */
    @GetMapping("/overview")
    public ApiResponse<OverviewReportDto> getOverviewReport(
            @RequestParam Long teamId,
            @RequestParam Long sprintId) {
        OverviewReportDto report = reportService.getOverviewReport(teamId, sprintId);
        return ApiResponse.ok(report);
    }

    /**
     * GET /api/reports/individual?teamId={}&sprintId={}&userId={}
     * Lấy báo cáo đóng góp cá nhân của một thành viên.
     */
    @GetMapping("/individual")
    public ApiResponse<IndividualReportDto> getIndividualReport(
            @RequestParam Long teamId,
            @RequestParam Long sprintId,
            @RequestParam Long userId) {
        IndividualReportDto report = reportService.getIndividualReport(teamId, sprintId, userId);
        return ApiResponse.ok(report);
    }

    /**
     * POST /api/reports/send-email
     * Gửi email báo cáo cá nhân cho một thành viên cụ thể (userIds[0]).
     */
    @PostMapping("/send-email")
    public ApiResponse<String> sendEmail(
            @RequestBody SendReportRequest request,
            Authentication authentication) {
        try {
            if (request.getTeamId() != null && authentication != null) {
                teamSecurityService.assertTeamMember(request.getTeamId(), authentication);
            }
            if (request.getUserIds() == null || request.getUserIds().isEmpty()) {
                return ApiResponse.error("Cần cung cấp ít nhất một userId");
            }
            Long userId = request.getUserIds().get(0);
            reportService.sendIndividualEmail(request.getTeamId(), request.getSprintId(), userId);
            return ApiResponse.ok("Email đã được gửi thành công cho userId: " + userId);
        } catch (Exception e) {
            return ApiResponse.error("Không thể gửi email: " + e.getMessage());
        }
    }

    /**
     * POST /api/reports/send-all-emails
     * Gửi email báo cáo cá nhân cho tất cả thành viên trong nhóm.
     */
    @PostMapping("/send-all-emails")
    public ApiResponse<String> sendAllEmails(
            @RequestBody SendReportRequest request,
            Authentication authentication) {
        try {
            if (request.getTeamId() != null && authentication != null) {
                teamSecurityService.assertTeamMember(request.getTeamId(), authentication);
            }
            reportService.sendAllEmails(request.getTeamId(), request.getSprintId());
            return ApiResponse.ok("Email đã được gửi đến tất cả thành viên trong nhóm");
        } catch (Exception e) {
            return ApiResponse.error("Lỗi khi gửi email hàng loạt: " + e.getMessage());
        }
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
