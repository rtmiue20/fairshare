package com.fairshare.contribution;

import com.fairshare.contribution.dto.ContributionSummaryResponse;
import com.fairshare.contribution.entity.ContributionScore;
import com.fairshare.contribution.repository.ContributionScoreRepository;
import com.fairshare.contribution.service.ContributionService;
import com.fairshare.user.entity.User;
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
@DisplayName("Unit Test cho ContributionService (M3 - Sprint 4)")
class ContributionServiceTest {

    @Mock
    private ContributionScoreRepository contributionScoreRepository;

    @InjectMocks
    private ContributionService contributionService;

    @Test
    @DisplayName("Test Case 1: Gọi stored procedure thành công, lấy danh sách ContributionScore và map chính xác sang DTO")
    void getContributionSummary_shouldCallProcedureAndReturnMappedDtos() {
        // Given
        Long teamId = 1L;
        Long sprintId = 2L;

        User user1 = new User();
        user1.setId(101L);
        user1.setFullName("Ngô Trọng Phúc");
        user1.setEmail("phucngo@ueh.edu.vn");

        ContributionScore score1 = ContributionScore.builder()
                .id(1L)
                .user(user1)
                .trelloScore(new BigDecimal("18.00"))
                .manualScore(new BigDecimal("2.00"))
                .activityPct(new BigDecimal("66.67"))
                .peerPct(new BigDecimal("0.00"))
                .finalPct(new BigDecimal("66.67"))
                .calculatedAt(LocalDateTime.now())
                .build();

        User user2 = new User();
        user2.setId(102L);
        user2.setFullName("Nguyễn Minh Triều");
        user2.setEmail("trieu@ueh.edu.vn");

        ContributionScore score2 = ContributionScore.builder()
                .id(2L)
                .user(user2)
                .trelloScore(new BigDecimal("10.00"))
                .manualScore(new BigDecimal("0.00"))
                .activityPct(new BigDecimal("33.33"))
                .peerPct(new BigDecimal("0.00"))
                .finalPct(new BigDecimal("33.33"))
                .calculatedAt(LocalDateTime.now())
                .build();

        doNothing().when(contributionScoreRepository).calculateContributionScores(teamId, sprintId);
        when(contributionScoreRepository.findByTeamIdAndSprintId(teamId, sprintId))
                .thenReturn(List.of(score1, score2));

        // When
        List<ContributionSummaryResponse> result = contributionService.getContributionSummary(teamId, sprintId);

        // Then
        assertThat(result).isNotNull().hasSize(2);

        // Verify user 1 mapping
        ContributionSummaryResponse res1 = result.get(0);
        assertThat(res1.getUserId()).isEqualTo(101L);
        assertThat(res1.getUserName()).isEqualTo("Ngô Trọng Phúc");
        assertThat(res1.getTrelloScore()).isEqualByComparingTo("18.00");
        assertThat(res1.getManualScore()).isEqualByComparingTo("2.00");
        assertThat(res1.getActivityPct()).isEqualByComparingTo("66.67");
        assertThat(res1.getPeerPct()).isEqualByComparingTo("0.00");
        assertThat(res1.getFinalPct()).isEqualByComparingTo("66.67");

        // Verify user 2 mapping
        ContributionSummaryResponse res2 = result.get(1);
        assertThat(res2.getUserId()).isEqualTo(102L);
        assertThat(res2.getUserName()).isEqualTo("Nguyễn Minh Triều");
        assertThat(res2.getTrelloScore()).isEqualByComparingTo("10.00");
        assertThat(res2.getManualScore()).isEqualByComparingTo("0.00");
        assertThat(res2.getActivityPct()).isEqualByComparingTo("33.33");
        assertThat(res2.getPeerPct()).isEqualByComparingTo("0.00");
        assertThat(res2.getFinalPct()).isEqualByComparingTo("33.33");

        // Verify repository procedure and fetch methods are called exactly once
        verify(contributionScoreRepository, times(1)).calculateContributionScores(teamId, sprintId);
        verify(contributionScoreRepository, times(1)).findByTeamIdAndSprintId(teamId, sprintId);
        verifyNoMoreInteractions(contributionScoreRepository);
    }

    @Test
    @DisplayName("Test Case 2: Trả về danh sách rỗng nếu không có dữ liệu sau khi gọi stored procedure")
    void getContributionSummary_shouldReturnEmptyListWhenNoScoresFound() {
        // Given
        Long teamId = 1L;
        Long sprintId = 99L;

        doNothing().when(contributionScoreRepository).calculateContributionScores(teamId, sprintId);
        when(contributionScoreRepository.findByTeamIdAndSprintId(teamId, sprintId))
                .thenReturn(Collections.emptyList());

        // When
        List<ContributionSummaryResponse> result = contributionService.getContributionSummary(teamId, sprintId);

        // Then
        assertThat(result).isNotNull().isEmpty();

        // Verify repository procedure and fetch methods are called exactly once
        verify(contributionScoreRepository, times(1)).calculateContributionScores(teamId, sprintId);
        verify(contributionScoreRepository, times(1)).findByTeamIdAndSprintId(teamId, sprintId);
        verifyNoMoreInteractions(contributionScoreRepository);
    }
}
