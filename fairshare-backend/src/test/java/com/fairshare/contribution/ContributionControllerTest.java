package com.fairshare.contribution;

import com.fairshare.common.exception.GlobalExceptionHandler;
import com.fairshare.contribution.controller.ContributionController;
import com.fairshare.contribution.dto.ContributionSummaryResponse;
import com.fairshare.contribution.dto.EvidenceItemDto;
import com.fairshare.contribution.service.ContributionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test cho ContributionController (M3 - Sprint 4)")
class ContributionControllerTest {

    private MockMvc mockMvc;

    @Mock
    private ContributionService contributionService;

    @InjectMocks
    private ContributionController contributionController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(contributionController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/contributions/summary - Thành công trả về 200 OK với danh sách summary DTO")
    void getContributionSummary_shouldReturn200AndJsonList() throws Exception {
        Long teamId = 1L;
        Long sprintId = 1L;

        ContributionSummaryResponse member1 = ContributionSummaryResponse.builder()
                .userId(101L)
                .userName("Ngô Trọng Phúc")
                .trelloScore(new BigDecimal("18.00"))
                .manualScore(new BigDecimal("2.00"))
                .activityPct(new BigDecimal("66.67"))
                .peerPct(new BigDecimal("0.00"))
                .finalPct(new BigDecimal("66.67"))
                .build();

        ContributionSummaryResponse member2 = ContributionSummaryResponse.builder()
                .userId(102L)
                .userName("Nguyễn Minh Triều")
                .trelloScore(new BigDecimal("10.00"))
                .manualScore(new BigDecimal("0.00"))
                .activityPct(new BigDecimal("33.33"))
                .peerPct(new BigDecimal("0.00"))
                .finalPct(new BigDecimal("33.33"))
                .build();

        when(contributionService.getContributionSummary(teamId, sprintId))
                .thenReturn(List.of(member1, member2));

        mockMvc.perform(get("/api/contributions/summary")
                        .param("teamId", "1")
                        .param("sprintId", "1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].userId", is(101)))
                .andExpect(jsonPath("$[0].userName", is("Ngô Trọng Phúc")))
                .andExpect(jsonPath("$[0].trelloScore", is(18.00)))
                .andExpect(jsonPath("$[0].manualScore", is(2.00)))
                .andExpect(jsonPath("$[0].activityPct", is(66.67)))
                .andExpect(jsonPath("$[0].peerPct", is(0.00)))
                .andExpect(jsonPath("$[0].finalPct", is(66.67)))
                .andExpect(jsonPath("$[1].userId", is(102)))
                .andExpect(jsonPath("$[1].userName", is("Nguyễn Minh Triều")))
                .andExpect(jsonPath("$[1].trelloScore", is(10.00)))
                .andExpect(jsonPath("$[1].manualScore", is(0.00)))
                .andExpect(jsonPath("$[1].activityPct", is(33.33)));

        verify(contributionService, times(1)).getContributionSummary(teamId, sprintId);
    }

    @Test
    @DisplayName("GET /api/contributions/summary - Trả về mảng rỗng [] khi không có dữ liệu")
    void getContributionSummary_shouldReturnEmptyArray() throws Exception {
        Long teamId = 1L;
        Long sprintId = 99L;

        when(contributionService.getContributionSummary(teamId, sprintId))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/contributions/summary")
                        .param("teamId", "1")
                        .param("sprintId", "99")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(contributionService, times(1)).getContributionSummary(teamId, sprintId);
    }

    @Test
    @DisplayName("GET /api/contributions/summary - Thiếu tham số request param trả về 400 Bad Request")
    void getContributionSummary_missingParams_shouldReturn400() throws Exception {
        mockMvc.perform(get("/api/contributions/summary")
                        .param("teamId", "1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/contributions/trace - Thành công trả về danh sách sự kiện gốc (200 OK)")
    void getEvidenceTraceability_shouldReturn200AndEvidenceList() throws Exception {
        Long teamId = 1L;
        Long sprintId = 1L;
        Long userId = 101L;

        EvidenceItemDto item1 = EvidenceItemDto.Impl.builder()
                .sourceType("TRELLO")
                .sourceId(1001L)
                .taskName("Task M3 Routine Flyway")
                .storyPoints(new BigDecimal("8.00"))
                .earnedScore(new BigDecimal("8.00"))
                .eventTime(null)
                .status("DONE")
                .build();

        EvidenceItemDto item2 = EvidenceItemDto.Impl.builder()
                .sourceType("MANUAL")
                .sourceId(2001L)
                .taskName("Hỗ trợ debug CI/CD Testcontainers")
                .storyPoints(new BigDecimal("2.00"))
                .earnedScore(new BigDecimal("2.00"))
                .eventTime(null)
                .status("APPROVED")
                .build();

        when(contributionService.getEvidenceTraceability(teamId, sprintId, userId))
                .thenReturn(List.of(item1, item2));

        mockMvc.perform(get("/api/contributions/trace")
                        .param("teamId", "1")
                        .param("sprintId", "1")
                        .param("userId", "101")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].sourceType", is("TRELLO")))
                .andExpect(jsonPath("$[0].sourceId", is(1001)))
                .andExpect(jsonPath("$[0].taskName", is("Task M3 Routine Flyway")))
                .andExpect(jsonPath("$[0].storyPoints", is(8.00)))
                .andExpect(jsonPath("$[0].earnedScore", is(8.00)))
                .andExpect(jsonPath("$[0].status", is("DONE")))
                .andExpect(jsonPath("$[1].sourceType", is("MANUAL")))
                .andExpect(jsonPath("$[1].status", is("APPROVED")));

        verify(contributionService, times(1)).getEvidenceTraceability(teamId, sprintId, userId);
    }

    @Test
    @DisplayName("GET /api/contributions/trace - Thiếu userId trả về 400 Bad Request")
    void getEvidenceTraceability_missingUserId_shouldReturn400() throws Exception {
        mockMvc.perform(get("/api/contributions/trace")
                        .param("teamId", "1")
                        .param("sprintId", "1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }
}
