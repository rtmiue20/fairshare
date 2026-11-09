package com.fairshare.contribution;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fairshare.common.exception.GlobalExceptionHandler;
import com.fairshare.contribution.controller.ManualContributionController;
import com.fairshare.contribution.dto.ManualContributionRequest;
import com.fairshare.contribution.dto.ManualContributionResponse;
import com.fairshare.contribution.service.ManualContributionService;
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
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test cho ManualContributionController (Card 8 - M3 Sprint 5)")
class ManualContributionControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private ManualContributionService manualContributionService;

    @InjectMocks
    private ManualContributionController manualContributionController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(manualContributionController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("POST /api/contributions/manual - Thành công trả về 201 CREATED với trạng thái PENDING")
    void createContribution_shouldReturn201Created() throws Exception {
        Long teamId = 1L;
        Long sprintId = 4L;
        Long userId = 101L;

        ManualContributionRequest request = ManualContributionRequest.builder()
                .taskName("Soạn thảo tài liệu đặc tả chức năng SRS")
                .evidenceLink("https://docs.google.com/document/d/srs-spec")
                .storyPoints(new BigDecimal("3.0"))
                .build();

        ManualContributionResponse response = ManualContributionResponse.builder()
                .id(1L)
                .teamId(teamId)
                .sprintId(sprintId)
                .userId(userId)
                .taskName("Soạn thảo tài liệu đặc tả chức năng SRS")
                .evidenceLink("https://docs.google.com/document/d/srs-spec")
                .storyPoints(new BigDecimal("3.0"))
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        when(manualContributionService.createContribution(eq(teamId), eq(sprintId), eq(userId), any(ManualContributionRequest.class)))
                .thenReturn(response);

        mockMvc.perform(post("/api/contributions/manual")
                        .param("teamId", teamId.toString())
                        .param("sprintId", sprintId.toString())
                        .param("userId", userId.toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(1)))
                .andExpect(jsonPath("$.data.status", is("PENDING")))
                .andExpect(jsonPath("$.data.taskName", is("Soạn thảo tài liệu đặc tả chức năng SRS")))
                .andExpect(jsonPath("$.data.storyPoints", is(3.0)));
    }

    @Test
    @DisplayName("POST /api/contributions/manual - Thất bại khi taskName bị rỗng trả về 400 Bad Request")
    void createContribution_shouldReturn400WhenTaskNameIsBlank() throws Exception {
        ManualContributionRequest invalidRequest = ManualContributionRequest.builder()
                .taskName("") // Trống
                .storyPoints(new BigDecimal("2.0"))
                .build();

        mockMvc.perform(post("/api/contributions/manual")
                        .param("teamId", "1")
                        .param("sprintId", "4")
                        .param("userId", "101")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.data.taskName").exists());
    }

    @Test
    @DisplayName("PUT /api/contributions/manual/{id}/review - Phê duyệt thành công trả về 200 OK với status APPROVED")
    void reviewContribution_shouldReturn200AndApprovedStatus() throws Exception {
        Long contributionId = 5L;
        Long reviewerId = 102L;
        String action = "APPROVE";

        ManualContributionResponse response = ManualContributionResponse.builder()
                .id(contributionId)
                .teamId(1L)
                .sprintId(4L)
                .userId(101L)
                .taskName("Thiết kế Figma component")
                .storyPoints(new BigDecimal("5.0"))
                .status("APPROVED")
                .reviewerId(reviewerId)
                .createdAt(LocalDateTime.now())
                .build();

        when(manualContributionService.reviewContribution(eq(contributionId), eq(reviewerId), eq(action)))
                .thenReturn(response);

        mockMvc.perform(put("/api/contributions/manual/{id}/review", contributionId)
                        .param("reviewerId", reviewerId.toString())
                        .param("action", action))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(5)))
                .andExpect(jsonPath("$.data.status", is("APPROVED")))
                .andExpect(jsonPath("$.data.reviewerId", is(102)));
    }

    @Test
    @DisplayName("PUT /api/contributions/manual/{id}/review - Bị chặn tự duyệt (Anti-fraud) trả về 400 Bad Request")
    void reviewContribution_shouldReturn400WhenSelfReviewing() throws Exception {
        Long contributionId = 5L;
        Long sameUserId = 101L;

        when(manualContributionService.reviewContribution(eq(contributionId), eq(sameUserId), eq("APPROVE")))
                .thenThrow(new IllegalArgumentException("Người dùng không thể tự phê duyệt hoặc từ chối đóng góp của chính mình (Anti-Fraud Rule)"));

        mockMvc.perform(put("/api/contributions/manual/{id}/review", contributionId)
                        .param("reviewerId", sameUserId.toString())
                        .param("action", "APPROVE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Invalid request: Người dùng không thể tự phê duyệt hoặc từ chối đóng góp của chính mình (Anti-Fraud Rule)")));
    }

    @Test
    @DisplayName("GET /api/contributions/manual/pending - Trả về 200 OK với danh sách đóng góp PENDING")
    void getPendingContributions_shouldReturn200AndList() throws Exception {
        Long teamId = 1L;
        Long sprintId = 4L;

        ManualContributionResponse item1 = ManualContributionResponse.builder()
                .id(1L)
                .teamId(teamId)
                .sprintId(sprintId)
                .userId(101L)
                .taskName("Khai báo bài 1")
                .storyPoints(new BigDecimal("2.0"))
                .status("PENDING")
                .build();

        ManualContributionResponse item2 = ManualContributionResponse.builder()
                .id(2L)
                .teamId(teamId)
                .sprintId(sprintId)
                .userId(102L)
                .taskName("Khai báo bài 2")
                .storyPoints(new BigDecimal("4.0"))
                .status("PENDING")
                .build();

        when(manualContributionService.getPendingContributions(eq(teamId), eq(sprintId)))
                .thenReturn(List.of(item1, item2));

        mockMvc.perform(get("/api/contributions/manual/pending")
                        .param("teamId", teamId.toString())
                        .param("sprintId", sprintId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].id", is(1)))
                .andExpect(jsonPath("$.data[1].id", is(2)))
                .andExpect(jsonPath("$.data[0].status", is("PENDING")))
                .andExpect(jsonPath("$.data[1].status", is("PENDING")));
    }
}

