package com.fairshare.report.controller;

import com.fairshare.common.dto.ApiResponse;
import com.fairshare.report.dto.ReportDto;
import com.fairshare.report.service.PdfReportService;
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
    private final UserRepository userRepository;

    /**
     * Xuat va tai file PDF bao cao dong gop cua Sprint (Chi Leader moi co quyen).
     *
     * @param teamId   ID nhom
     * @param sprintId ID sprint
     * @return File PDF dang byte stream
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
     *
     * @param teamId   ID nhom
     * @param sprintId ID sprint
     * @return DTO chua URL tai bao cao
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

    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }
}
