package com.fairshare.contribution.controller;

import com.fairshare.common.dto.ApiResponse;
import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.common.security.TeamSecurityService;
import com.fairshare.contribution.dto.ManualContributionRequest;
import com.fairshare.contribution.dto.ManualContributionResponse;
import com.fairshare.contribution.service.ManualContributionService;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller quản lý API Khai báo đóng góp thủ công và xác nhận (Card 8 - M3 Sprint 5).
 * DEF-31: Xác thực người dùng qua JWT Token (Authentication) và kiểm tra tư cách thành viên nhóm.
 */
@RestController
@RequestMapping("/api/contributions/manual")
@RequiredArgsConstructor
public class ManualContributionController {

    private final ManualContributionService manualContributionService;
    private final TeamSecurityService teamSecurityService;
    private final UserRepository userRepository;

    /**
     * POST /api/contributions/manual?teamId={teamId}&sprintId={sprintId}&userId={userId}
     * Tạo mới khai báo đóng góp thủ công (lưu vào bảng manual_contributions ở trạng thái PENDING).
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ManualContributionResponse>> createContribution(
            @RequestParam("teamId") Long teamId,
            @RequestParam(value = "sprintId", required = false) Long sprintId,
            @RequestParam(value = "userId", required = false) Long userId,
            @Valid @RequestBody ManualContributionRequest request,
            Authentication authentication) {

        Long effectiveUserId = resolveUserId(authentication, userId);
        if (effectiveUserId == null) {
            throw new ForbiddenException("Yêu cầu xác thực tài khoản để khai báo đóng góp");
        }
        teamSecurityService.assertTeamMember(teamId, effectiveUserId);

        ManualContributionResponse response = manualContributionService.createContribution(
                teamId, sprintId, effectiveUserId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo khai báo đóng góp thủ công thành công", response));
    }

    /**
     * PUT /api/contributions/manual/{id}/review?reviewerId={reviewerId}&action={action}
     * Phê duyệt (APPROVE) hoặc từ chối (REJECT) khai báo đóng góp thủ công.
     * Chặn người tạo tự xác nhận bài của chính mình (Anti-Fraud Rule).
     */
    @PutMapping("/{id}/review")
    public ResponseEntity<ApiResponse<ManualContributionResponse>> reviewContribution(
            @PathVariable("id") Long id,
            @RequestParam(value = "reviewerId", required = false) Long reviewerId,
            @RequestParam("action") String action,
            Authentication authentication) {

        Long effectiveReviewerId = resolveUserId(authentication, reviewerId);
        if (effectiveReviewerId == null) {
            throw new ForbiddenException("Yêu cầu xác thực tài khoản để đánh giá đóng góp");
        }

        ManualContributionResponse contribution = manualContributionService.getContributionById(id);
        if (contribution != null && contribution.getTeamId() != null) {
            teamSecurityService.assertTeamMember(contribution.getTeamId(), effectiveReviewerId);
        }

        ManualContributionResponse response = manualContributionService.reviewContribution(id, effectiveReviewerId, action);
        return ResponseEntity.ok(ApiResponse.ok("Đánh giá đóng góp thủ công thành công", response));
    }

    /**
     * GET /api/contributions/manual?teamId={teamId}&sprintId={sprintId}&status={status}
     * Lấy toàn bộ danh sách đóng góp của nhóm (hỗ trợ lọc theo sprint và trạng thái).
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ManualContributionResponse>>> getAllContributions(
            @RequestParam("teamId") Long teamId,
            @RequestParam(value = "sprintId", required = false) Long sprintId,
            @RequestParam(value = "status", required = false) String status,
            Authentication authentication) {

        if (authentication != null && authentication.getName() != null) {
            teamSecurityService.assertTeamMember(teamId, authentication);
        }

        List<ManualContributionResponse> list = manualContributionService.getAllContributions(teamId, sprintId, status);
        return ResponseEntity.ok(ApiResponse.ok("Danh sách toàn bộ đóng góp", list));
    }

    /**
     * GET /api/contributions/manual/pending?teamId={teamId}&sprintId={sprintId}
     * Lấy danh sách đóng góp thủ công đang chờ duyệt (PENDING) của nhóm.
     */
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<ManualContributionResponse>>> getPendingContributions(
            @RequestParam("teamId") Long teamId,
            @RequestParam(value = "sprintId", required = false) Long sprintId,
            Authentication authentication) {

        if (authentication != null && authentication.getName() != null) {
            teamSecurityService.assertTeamMember(teamId, authentication);
        }

        List<ManualContributionResponse> pendingList = manualContributionService.getPendingContributions(teamId, sprintId);
        return ResponseEntity.ok(ApiResponse.ok("Danh sách đóng góp thủ công chờ duyệt", pendingList));
    }

    /**
     * GET /api/contributions/manual/{id}
     * Lấy chi tiết một đóng góp thủ công theo ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ManualContributionResponse>> getContributionById(
            @PathVariable("id") Long id,
            Authentication authentication) {

        ManualContributionResponse response = manualContributionService.getContributionById(id);
        if (response != null && response.getTeamId() != null && authentication != null) {
            teamSecurityService.assertTeamMember(response.getTeamId(), authentication);
        }
        return ResponseEntity.ok(ApiResponse.ok("Chi tiết đóng góp thủ công", response));
    }

    /**
     * DELETE /api/contributions/manual/{id}?userId={userId}
     * Xóa một đóng góp thủ công.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteContribution(
            @PathVariable("id") Long id,
            @RequestParam(value = "userId", required = false) Long userId,
            Authentication authentication) {

        Long effectiveUserId = resolveUserId(authentication, userId);
        if (effectiveUserId == null) {
            throw new ForbiddenException("Yêu cầu xác thực tài khoản để xóa đóng góp");
        }
        manualContributionService.deleteContribution(id, effectiveUserId);
        return ResponseEntity.ok(ApiResponse.ok("Xóa đóng góp thành công", null));
    }

    private Long resolveUserId(Authentication authentication, Long fallbackUserId) {
        if (authentication != null && authentication.getName() != null) {
            return userRepository.findByEmail(authentication.getName())
                    .map(User::getId)
                    .orElse(fallbackUserId);
        }
        return fallbackUserId;
    }
}

