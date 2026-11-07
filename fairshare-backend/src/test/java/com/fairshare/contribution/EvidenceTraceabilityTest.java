package com.fairshare.contribution;

import com.fairshare.contribution.dto.EvidenceItemDto;
import com.fairshare.contribution.repository.ContributionScoreRepository;
import com.fairshare.contribution.service.ContributionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test cho Evidence Traceability Routine & Service (M3 - Sprint 4 / Thẻ 3)")
class EvidenceTraceabilityTest {

    @Mock
    private ContributionScoreRepository contributionScoreRepository;

    @InjectMocks
    private ContributionService contributionService;

    @Test
    @DisplayName("Test Case 1: Truy xuất bằng chứng thành công - Trả về danh sách sự kiện gốc từ Trello và Manual")
    void getEvidenceTraceability_shouldReturnCombinedEventsList() {
        // Given
        Long teamId = 1L;
        Long sprintId = 1L;
        Long userId = 101L;

        EvidenceItemDto event1 = EvidenceItemDto.Impl.builder()
                .sourceType("TRELLO")
                .sourceId(1001L)
                .taskName("Task M3 Routine Flyway")
                .storyPoints(new BigDecimal("8.00"))
                .earnedScore(new BigDecimal("8.00"))
                .eventTime(LocalDateTime.of(2026, 11, 6, 8, 0, 0))
                .status("DONE")
                .build();

        EvidenceItemDto event2 = EvidenceItemDto.Impl.builder()
                .sourceType("TRELLO")
                .sourceId(1002L)
                .taskName("PR #37 Fix CI/CD")
                .storyPoints(new BigDecimal("2.00"))
                .earnedScore(new BigDecimal("2.00"))
                .eventTime(LocalDateTime.of(2026, 11, 6, 8, 30, 0))
                .status("DONE")
                .build();

        EvidenceItemDto event3 = EvidenceItemDto.Impl.builder()
                .sourceType("MANUAL")
                .sourceId(2001L)
                .taskName("Hỗ trợ debug CI/CD Testcontainers")
                .storyPoints(new BigDecimal("2.00"))
                .earnedScore(new BigDecimal("2.00"))
                .eventTime(LocalDateTime.of(2026, 11, 6, 9, 0, 0))
                .status("APPROVED")
                .build();

        when(contributionScoreRepository.getEvidenceTraceability(teamId, sprintId, userId))
                .thenReturn(List.of(event1, event2, event3));

        // When
        List<EvidenceItemDto> result = contributionService.getEvidenceTraceability(teamId, sprintId, userId);

        // Then
        assertThat(result).isNotNull().hasSize(3);

        // Kiểm tra phần tử 1 (Trello)
        EvidenceItemDto e1 = result.get(0);
        assertThat(e1.getSourceType()).isEqualTo("TRELLO");
        assertThat(e1.getSourceId()).isEqualTo(1001L);
        assertThat(e1.getTaskName()).isEqualTo("Task M3 Routine Flyway");
        assertThat(e1.getStoryPoints()).isEqualByComparingTo("8.00");
        assertThat(e1.getEarnedScore()).isEqualByComparingTo("8.00");
        assertThat(e1.getStatus()).isEqualTo("DONE");

        // Kiểm tra phần tử 2 (Trello)
        EvidenceItemDto e2 = result.get(1);
        assertThat(e2.getSourceType()).isEqualTo("TRELLO");
        assertThat(e2.getSourceId()).isEqualTo(1002L);
        assertThat(e2.getTaskName()).isEqualTo("PR #37 Fix CI/CD");

        // Kiểm tra phần tử 3 (Manual Approved)
        EvidenceItemDto e3 = result.get(2);
        assertThat(e3.getSourceType()).isEqualTo("MANUAL");
        assertThat(e3.getSourceId()).isEqualTo(2001L);
        assertThat(e3.getTaskName()).isEqualTo("Hỗ trợ debug CI/CD Testcontainers");
        assertThat(e3.getStatus()).isEqualTo("APPROVED");

        // Verify repository method được gọi đúng 1 lần
        verify(contributionScoreRepository, times(1)).getEvidenceTraceability(teamId, sprintId, userId);
        verifyNoMoreInteractions(contributionScoreRepository);
    }

    @Test
    @DisplayName("Test Case 2: Trả về danh sách rỗng nếu thành viên không có sự kiện nào trong sprint")
    void getEvidenceTraceability_shouldReturnEmptyListWhenNoEventsFound() {
        // Given
        Long teamId = 1L;
        Long sprintId = 1L;
        Long userId = 999L;

        when(contributionScoreRepository.getEvidenceTraceability(teamId, sprintId, userId))
                .thenReturn(Collections.emptyList());

        // When
        List<EvidenceItemDto> result = contributionService.getEvidenceTraceability(teamId, sprintId, userId);

        // Then
        assertThat(result).isNotNull().isEmpty();

        verify(contributionScoreRepository, times(1)).getEvidenceTraceability(teamId, sprintId, userId);
        verifyNoMoreInteractions(contributionScoreRepository);
    }
}
