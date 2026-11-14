package com.fairshare.contribution.service;

import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.contribution.dto.ManualContributionRequest;
import com.fairshare.contribution.dto.ManualContributionResponse;
import com.fairshare.contribution.entity.ManualContribution;
import com.fairshare.contribution.repository.ManualContributionRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service quản lý luồng khai báo đóng góp thủ công và phê duyệt bởi thành viên khác (Card 8).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ManualContributionService {

    private final ManualContributionRepository manualContributionRepository;
    private final UserRepository userRepository;

    private ManualContributionResponse toResponse(ManualContribution entity) {
        if (entity == null) return null;
        ManualContributionResponse res = ManualContributionResponse.fromEntity(entity);
        if (entity.getUserId() != null) {
            userRepository.findById(entity.getUserId()).ifPresent(u -> {
                res.setUserName(u.getFullName());
                res.setUserEmail(u.getEmail());
            });
        }
        if (entity.getReviewerId() != null) {
            userRepository.findById(entity.getReviewerId()).ifPresent(u -> {
                res.setReviewerName(u.getFullName());
            });
        }
        return res;
    }

    /**
     * Tạo mới đóng góp thủ công với trạng thái PENDING.
     *
     * @param teamId   ID nhóm
     * @param sprintId ID sprint
     * @param userId   ID người khai báo
     * @param request  Thông tin công việc, minh chứng, story points
     * @return Thông tin đóng góp vừa được tạo
     */
    @Transactional
    public ManualContributionResponse createContribution(
            Long teamId,
            Long sprintId,
            Long userId,
            ManualContributionRequest request) {

        if (teamId == null || userId == null) {
            throw new IllegalArgumentException("Team ID và User ID không được để trống");
        }
        if (request == null) {
            throw new IllegalArgumentException("Yêu cầu khai báo đóng góp không được để trống");
        }

        ManualContribution contribution = ManualContribution.builder()
                .teamId(teamId)
                .sprintId(sprintId)
                .userId(userId)
                .taskName(request.getTaskName())
                .evidenceLink(request.getEvidenceLink())
                .storyPoints(request.getStoryPoints())
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        ManualContribution saved = manualContributionRepository.save(contribution);
        log.info("Created manual contribution ID: {} for user: {} in team: {}, sprint: {}",
                saved.getId(), userId, teamId, sprintId);
        return toResponse(saved);
    }

    /**
     * Phê duyệt hoặc từ chối đóng góp thủ công.
     * Áp dụng Anti-Fraud Rule: Người tạo không được phép tự duyệt bài của mình.
     *
     * @param contributionId ID bản ghi đóng góp
     * @param reviewerId     ID người thực hiện duyệt/từ chối
     * @param action         Hành động: APPROVE hoặc REJECT
     * @return Thông tin đóng góp sau khi cập nhật
     */
    @Transactional
    public ManualContributionResponse reviewContribution(
            Long contributionId,
            Long reviewerId,
            String action) {

        if (contributionId == null || reviewerId == null || action == null) {
            throw new IllegalArgumentException("Contribution ID, Reviewer ID và Action không được để trống");
        }

        ManualContribution contribution = manualContributionRepository.findById(contributionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đóng góp thủ công với ID: " + contributionId));

        // Anti-Fraud Rule: Chặn người tạo tự xác nhận/từ chối bài của chính mình
        if (reviewerId.equals(contribution.getUserId())) {
            throw new IllegalArgumentException("Người dùng không thể tự phê duyệt hoặc từ chối đóng góp của chính mình (Anti-Fraud Rule)");
        }

        String normalizedAction = action.trim().toUpperCase();
        if ("APPROVE".equals(normalizedAction) || "APPROVED".equals(normalizedAction)) {
            contribution.setStatus("APPROVED");
        } else if ("REJECT".equals(normalizedAction) || "REJECTED".equals(normalizedAction)) {
            contribution.setStatus("REJECTED");
        } else {
            throw new IllegalArgumentException("Hành động đánh giá không hợp lệ: '" + action + "'. Chỉ chấp nhận APPROVE hoặc REJECT");
        }

        contribution.setReviewerId(reviewerId);
        contribution.setUpdatedAt(LocalDateTime.now());

        ManualContribution updated = manualContributionRepository.save(contribution);
        log.info("Reviewed manual contribution ID: {} by reviewer: {} with new status: {}",
                contributionId, reviewerId, contribution.getStatus());
        return toResponse(updated);
    }

    /**
     * Lấy danh sách đóng góp thủ công đang chờ duyệt (PENDING) cho team và sprint.
     *
     * @param teamId   ID nhóm
     * @param sprintId ID sprint (tùy chọn)
     * @return Danh sách đóng góp chờ duyệt
     */
    @Transactional(readOnly = true)
    public List<ManualContributionResponse> getPendingContributions(Long teamId, Long sprintId) {
        if (teamId == null) {
            throw new IllegalArgumentException("Team ID không được để trống");
        }

        List<ManualContribution> pendingList;
        if (sprintId != null) {
            pendingList = manualContributionRepository.findByTeamIdAndSprintIdAndStatusOrderByCreatedAtDesc(
                    teamId, sprintId, "PENDING");
        } else {
            pendingList = manualContributionRepository.findByTeamIdAndStatusOrderByCreatedAtDesc(
                    teamId, "PENDING");
        }

        return pendingList.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Lấy tất cả đóng góp thủ công cho team (hỗ trợ lọc theo sprintId và status).
     *
     * @param teamId   ID nhóm
     * @param sprintId ID sprint (tùy chọn)
     * @param status   Trạng thái: PENDING, APPROVED, REJECTED (tùy chọn)
     * @return Danh sách đóng góp
     */
    @Transactional(readOnly = true)
    public List<ManualContributionResponse> getAllContributions(Long teamId, Long sprintId, String status) {
        if (teamId == null) {
            throw new IllegalArgumentException("Team ID không được để trống");
        }

        List<ManualContribution> list;
        if (sprintId != null && status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            list = manualContributionRepository.findByTeamIdAndSprintIdAndStatusOrderByCreatedAtDesc(
                    teamId, sprintId, status.toUpperCase());
        } else if (sprintId != null) {
            list = manualContributionRepository.findByTeamIdAndSprintIdOrderByCreatedAtDesc(teamId, sprintId);
        } else if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            list = manualContributionRepository.findByTeamIdAndStatusOrderByCreatedAtDesc(teamId, status.toUpperCase());
        } else {
            list = manualContributionRepository.findByTeamIdOrderByCreatedAtDesc(teamId);
        }

        return list.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Xóa một đóng góp thủ công khỏi hệ thống.
     *
     * @param id     ID đóng góp
     * @param userId ID người yêu cầu xóa
     */
    @Transactional
    public void deleteContribution(Long id, Long userId) {
        ManualContribution contribution = manualContributionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đóng góp với ID: " + id));

        // Người tạo có quyền xóa khi bài đang chờ duyệt
        if (!contribution.getUserId().equals(userId)) {
            log.warn("User {} attempted to delete contribution {} created by {}", userId, id, contribution.getUserId());
        }

        manualContributionRepository.delete(contribution);
        log.info("Deleted manual contribution ID: {} by user: {}", id, userId);
    }

    /**
     * Lấy chi tiết đóng góp thủ công theo ID.
     */
    @Transactional(readOnly = true)
    public ManualContributionResponse getContributionById(Long id) {
        ManualContribution contribution = manualContributionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đóng góp thủ công với ID: " + id));
        return toResponse(contribution);
    }
}

