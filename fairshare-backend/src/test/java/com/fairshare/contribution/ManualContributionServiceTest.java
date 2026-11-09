package com.fairshare.contribution;

import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.contribution.dto.ManualContributionRequest;
import com.fairshare.contribution.dto.ManualContributionResponse;
import com.fairshare.contribution.entity.ManualContribution;
import com.fairshare.contribution.repository.ManualContributionRepository;
import com.fairshare.contribution.service.ManualContributionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test cho ManualContributionService (Card 8 - M3 Sprint 5)")
class ManualContributionServiceTest {

    @Mock
    private ManualContributionRepository manualContributionRepository;

    @InjectMocks
    private ManualContributionService manualContributionService;

    @Test
    @DisplayName("Test Case 1: Tạo mới khai báo đóng góp thủ công thành công với trạng thái PENDING")
    void createContribution_shouldSavePendingContributionSuccessfully() {
        // Given
        Long teamId = 1L;
        Long sprintId = 4L;
        Long userId = 101L;

        ManualContributionRequest request = ManualContributionRequest.builder()
                .taskName("Soạn thảo tài liệu kiến trúc SRS trên Google Docs")
                .evidenceLink("https://docs.google.com/document/d/fairshare-srs")
                .storyPoints(new BigDecimal("3.5"))
                .build();

        ManualContribution savedEntity = ManualContribution.builder()
                .id(1L)
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

        when(manualContributionRepository.save(any(ManualContribution.class))).thenReturn(savedEntity);

        // When
        ManualContributionResponse response = manualContributionService.createContribution(teamId, sprintId, userId, request);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getTeamId()).isEqualTo(teamId);
        assertThat(response.getSprintId()).isEqualTo(sprintId);
        assertThat(response.getUserId()).isEqualTo(userId);
        assertThat(response.getTaskName()).isEqualTo("Soạn thảo tài liệu kiến trúc SRS trên Google Docs");
        assertThat(response.getEvidenceLink()).isEqualTo("https://docs.google.com/document/d/fairshare-srs");
        assertThat(response.getStoryPoints()).isEqualByComparingTo("3.5");
        assertThat(response.getStatus()).isEqualTo("PENDING");

        ArgumentCaptor<ManualContribution> captor = ArgumentCaptor.forClass(ManualContribution.class);
        verify(manualContributionRepository, times(1)).save(captor.capture());
        ManualContribution captured = captor.getValue();
        assertThat(captured.getStatus()).isEqualTo("PENDING");
        assertThat(captured.getUserId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("Test Case 2: Phê duyệt (APPROVE) đóng góp thành công khi người duyệt khác người tạo")
    void reviewContribution_shouldApproveWhenReviewerIsDifferentFromCreator() {
        // Given
        Long contributionId = 10L;
        Long creatorId = 101L;
        Long reviewerId = 102L; // Khác người tạo

        ManualContribution existing = ManualContribution.builder()
                .id(contributionId)
                .teamId(1L)
                .sprintId(4L)
                .userId(creatorId)
                .taskName("Thiết kế giao diện Figma cho phân hệ Dashboard")
                .evidenceLink("https://figma.com/file/fairshare-ui")
                .storyPoints(new BigDecimal("5.0"))
                .status("PENDING")
                .createdAt(LocalDateTime.now().minusDays(1))
                .build();

        when(manualContributionRepository.findById(contributionId)).thenReturn(Optional.of(existing));
        when(manualContributionRepository.save(any(ManualContribution.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        ManualContributionResponse response = manualContributionService.reviewContribution(contributionId, reviewerId, "APPROVE");

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("APPROVED");
        assertThat(response.getReviewerId()).isEqualTo(reviewerId);

        verify(manualContributionRepository, times(1)).save(existing);
        assertThat(existing.getStatus()).isEqualTo("APPROVED");
        assertThat(existing.getReviewerId()).isEqualTo(reviewerId);
    }

    @Test
    @DisplayName("Test Case 3: Ném ngoại lệ Anti-Fraud khi người tạo tự duyệt/từ chối đóng góp của chính mình (reviewerId == userId)")
    void reviewContribution_shouldThrowExceptionWhenReviewerIsSameAsCreator() {
        // Given
        Long contributionId = 10L;
        Long creatorId = 101L;
        Long reviewerId = 101L; // Trùng với người tạo!

        ManualContribution existing = ManualContribution.builder()
                .id(contributionId)
                .teamId(1L)
                .sprintId(4L)
                .userId(creatorId)
                .taskName("Nghiên cứu tài liệu đối chiếu Rate Limit Trello API")
                .storyPoints(new BigDecimal("2.0"))
                .status("PENDING")
                .build();

        when(manualContributionRepository.findById(contributionId)).thenReturn(Optional.of(existing));

        // When & Then
        assertThatThrownBy(() -> manualContributionService.reviewContribution(contributionId, reviewerId, "APPROVE"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Người dùng không thể tự phê duyệt hoặc từ chối đóng góp của chính mình");

        verify(manualContributionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Test Case 4: Từ chối (REJECT) đóng góp thành công khi người duyệt hợp lệ")
    void reviewContribution_shouldRejectWhenActionIsReject() {
        // Given
        Long contributionId = 15L;
        Long creatorId = 101L;
        Long reviewerId = 103L;

        ManualContribution existing = ManualContribution.builder()
                .id(contributionId)
                .teamId(1L)
                .sprintId(4L)
                .userId(creatorId)
                .taskName("Tham gia họp ngoài giờ không có biên bản")
                .storyPoints(new BigDecimal("1.0"))
                .status("PENDING")
                .build();

        when(manualContributionRepository.findById(contributionId)).thenReturn(Optional.of(existing));
        when(manualContributionRepository.save(any(ManualContribution.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        ManualContributionResponse response = manualContributionService.reviewContribution(contributionId, reviewerId, "REJECT");

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("REJECTED");
        assertThat(response.getReviewerId()).isEqualTo(reviewerId);
        assertThat(existing.getStatus()).isEqualTo("REJECTED");
    }

    @Test
    @DisplayName("Test Case 5: Ném ngoại lệ khi hành động duyệt không hợp lệ (không phải APPROVE hay REJECT)")
    void reviewContribution_shouldThrowExceptionWhenActionIsInvalid() {
        // Given
        Long contributionId = 20L;
        ManualContribution existing = ManualContribution.builder()
                .id(contributionId)
                .userId(101L)
                .status("PENDING")
                .build();

        when(manualContributionRepository.findById(contributionId)).thenReturn(Optional.of(existing));

        // When & Then
        assertThatThrownBy(() -> manualContributionService.reviewContribution(contributionId, 102L, "UNKNOWN_ACTION"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Hành động đánh giá không hợp lệ");
    }

    @Test
    @DisplayName("Test Case 6: Ném ngoại lệ ResourceNotFoundException khi không tìm thấy đóng góp")
    void reviewContribution_shouldThrowNotFoundWhenIdDoesNotExist() {
        // Given
        Long contributionId = 999L;
        when(manualContributionRepository.findById(contributionId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> manualContributionService.reviewContribution(contributionId, 102L, "APPROVE"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy đóng góp thủ công");
    }

    @Test
    @DisplayName("Test Case 7: Lấy danh sách đóng góp thủ công đang chờ duyệt (PENDING)")
    void getPendingContributions_shouldReturnListMapped() {
        // Given
        Long teamId = 1L;
        Long sprintId = 4L;

        ManualContribution item1 = ManualContribution.builder()
                .id(1L)
                .teamId(teamId)
                .sprintId(sprintId)
                .userId(101L)
                .taskName("Khai báo 1")
                .storyPoints(new BigDecimal("2.0"))
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        ManualContribution item2 = ManualContribution.builder()
                .id(2L)
                .teamId(teamId)
                .sprintId(sprintId)
                .userId(102L)
                .taskName("Khai báo 2")
                .storyPoints(new BigDecimal("3.0"))
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        when(manualContributionRepository.findByTeamIdAndSprintIdAndStatusOrderByCreatedAtDesc(teamId, sprintId, "PENDING"))
                .thenReturn(List.of(item1, item2));

        // When
        List<ManualContributionResponse> results = manualContributionService.getPendingContributions(teamId, sprintId);

        // Then
        assertThat(results).hasSize(2);
        assertThat(results.get(0).getId()).isEqualTo(1L);
        assertThat(results.get(1).getId()).isEqualTo(2L);
        assertThat(results).allMatch(r -> "PENDING".equals(r.getStatus()));
    }
}

