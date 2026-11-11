package com.fairshare.team;

import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.common.exception.GlobalExceptionHandler;
import com.fairshare.common.security.TeamSecurityService;
import com.fairshare.contribution.dto.ContributionDto;
import com.fairshare.contribution.dto.EvidenceItemDto;
import com.fairshare.contribution.service.ContributionService;
import com.fairshare.sprint.service.SprintService;
import com.fairshare.team.controller.TeamController;
import com.fairshare.team.service.MemberService;
import com.fairshare.team.service.TeamService;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test cho TeamController - Dashboard & Evidence Endpoints (DEF-22)")
class TeamControllerTest {

    private MockMvc mockMvc;

    @Mock
    private TeamService teamService;
    @Mock
    private MemberService memberService;
    @Mock
    private SprintService sprintService;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ContributionService contributionService;
    @Mock
    private TeamSecurityService teamSecurityService;
    @Mock
    private Authentication authentication;

    private TeamController teamController;

    @BeforeEach
    void setUp() {
        teamController = new TeamController(
                teamService,
                memberService,
                sprintService,
                userRepository,
                contributionService,
                teamSecurityService
        );
        mockMvc = MockMvcBuilders.standaloneSetup(teamController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/teams/{teamId}/contributions?sprintId={id} - Thành công trả về 200 OK")
    void getTeamContributions_shouldReturn200() throws Exception {
        Long teamId = 1L;
        Long sprintId = 4L;

        ContributionDto dto = ContributionDto.builder()
                .userId(1L)
                .userName("Ngô Trọng Phúc")
                .percentage(new BigDecimal("25.00"))
                .build();

        when(contributionService.getSprintScores(sprintId)).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/teams/{teamId}/contributions", teamId)
                        .param("sprintId", sprintId.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.teamId", is(1)))
                .andExpect(jsonPath("$.data.sprintId", is(4)))
                .andExpect(jsonPath("$.data.scores[0].userId", is(1)));

        verify(contributionService).getSprintScores(sprintId);
    }

    @Test
    @DisplayName("GET /api/teams/{teamId}/contributions/{userId}/evidence?sprintId={id} - Thành công trả về 200 OK")
    void getMemberEvidence_shouldReturn200() throws Exception {
        Long teamId = 1L;
        Long userId = 2L;
        Long sprintId = 4L;

        EvidenceItemDto.Impl item = EvidenceItemDto.Impl.builder()
                .sourceType("BOARD")
                .sourceId(101L)
                .taskName("Viết API Dashboard")
                .storyPoints(new BigDecimal("5.00"))
                .earnedScore(new BigDecimal("12.50"))
                .eventTime(LocalDateTime.now())
                .status("DONE")
                .build();

        when(contributionService.getEvidenceTraceability(teamId, sprintId, userId)).thenReturn(List.of(item));

        mockMvc.perform(get("/api/teams/{teamId}/contributions/{userId}/evidence", teamId, userId)
                        .param("sprintId", sprintId.toString())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].sourceType", is("BOARD")))
                .andExpect(jsonPath("$.data[0].taskName", is("Viết API Dashboard")))
                .andExpect(jsonPath("$.data[0].status", is("DONE")));

        verify(contributionService).getEvidenceTraceability(teamId, sprintId, userId);
    }

    @Test
    @DisplayName("GET /api/teams/{teamId}/contributions - Khi người ngoài nhóm truy cập trả về 403 Forbidden")
    void getTeamContributions_whenForbidden_shouldReturn403() throws Exception {
        Long teamId = 99L;

        doThrow(new ForbiddenException("Bạn không phải thành viên của nhóm này"))
                .when(teamSecurityService).assertTeamMember(eq(teamId), any(Authentication.class));

        mockMvc.perform(get("/api/teams/{teamId}/contributions", teamId)
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Bạn không phải thành viên của nhóm này")));
    }
}
