package com.fairshare.contribution.controller;

import com.fairshare.common.dto.ApiResponse;
import com.fairshare.contribution.dto.ContributionDto;
import com.fairshare.contribution.dto.ContributionSummaryResponse;
import com.fairshare.contribution.dto.EvidenceItemDto;
import com.fairshare.contribution.service.ContributionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contributions")
@RequiredArgsConstructor
public class ContributionController {

    private final ContributionService contributionService;

    /**
     * API tổng hợp điểm đóng góp thành viên theo team và sprint.
     * Kích hoạt Stored Procedure và trả về kết quả mới nhất.
     *
     * @param teamId   ID của nhóm
     * @param sprintId ID của sprint
     * @return danh sách tóm tắt điểm đóng góp của các thành viên (200 OK)
     */
    @GetMapping("/summary")
    public ResponseEntity<List<ContributionSummaryResponse>> getContributionSummary(
            @RequestParam("teamId") Long teamId,
            @RequestParam("sprintId") Long sprintId) {
        List<ContributionSummaryResponse> summary = contributionService.getContributionSummary(teamId, sprintId);
        return ResponseEntity.ok(summary);
    }

    /**
     * API truy xuất bằng chứng đóng góp (danh sách sự kiện gốc) của thành viên theo team và sprint.
     * Hỗ trợ cả 2 endpoint aliases: /api/contributions/evidence và /api/contributions/trace.
     * Kích hoạt Stored Procedure sp_get_evidence_traceability.
     *
     * @param teamId   ID nhóm
     * @param sprintId ID sprint
     * @param userId   ID thành viên
     * @return danh sách sự kiện gốc (200 OK)
     */
    @GetMapping({"/evidence", "/trace"})
    public ResponseEntity<List<EvidenceItemDto>> getEvidenceTraceability(
            @RequestParam("teamId") Long teamId,
            @RequestParam("sprintId") Long sprintId,
            @RequestParam("userId") Long userId) {
        List<EvidenceItemDto> evidence = contributionService.getEvidenceTraceability(teamId, sprintId, userId);
        return ResponseEntity.ok(evidence);
    }

    @PostMapping("/sprints/{sprintId}/calculate")
    public ResponseEntity<ApiResponse<List<ContributionDto>>> calculateScores(@PathVariable Long sprintId) {
        List<ContributionDto> scores = contributionService.calculateAndSaveSprintScores(sprintId);
        return ResponseEntity.ok(ApiResponse.ok("Tính điểm đóng góp sprint thành công", scores));
    }

    @GetMapping("/sprints/{sprintId}")
    public ResponseEntity<ApiResponse<List<ContributionDto>>> getSprintScores(@PathVariable Long sprintId) {
        List<ContributionDto> scores = contributionService.getSprintScores(sprintId);
        return ResponseEntity.ok(ApiResponse.ok("Điểm đóng góp sprint", scores));
    }

    @GetMapping("/teams/{teamId}")
    public ResponseEntity<ApiResponse<List<ContributionDto>>> getTeamScores(@PathVariable Long teamId) {
        List<ContributionDto> scores = contributionService.getTeamScores(teamId);
        return ResponseEntity.ok(ApiResponse.ok("Điểm đóng góp nhóm", scores));
    }
}
