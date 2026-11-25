package com.fairshare.team;

import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.common.exception.GlobalExceptionHandler;
import com.fairshare.common.security.TeamSecurityService;
import com.fairshare.contribution.dto.ContributionDto;
import com.fairshare.contribution.dto.EvidenceItemDto;
import com.fairshare.contribution.service.ContributionService;
import com.fairshare.sprint.dto.SprintDto;
import com.fairshare.sprint.service.SprintService;
import com.fairshare.team.controller.TeamController;
import com.fairshare.team.dto.CreateTeamRequest;
import com.fairshare.team.dto.TeamDto;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.service.MemberService;
import com.fairshare.team.service.TeamService;
import com.fairshare.user.entity.User;
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
import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

    @Test
    @DisplayName("POST /api/teams/{teamId}/members (DEF-33) - Leader mời hợp lệ và bỏ qua role=LEADER từ client")
    void inviteMember_whenLeader_shouldForceMemberRoleAndReturn200() throws Exception {
        User leader = new User();
        leader.setId(10L);
        leader.setEmail("leader@ueh.edu.vn");

        when(authentication.getName()).thenReturn("leader@ueh.edu.vn");
        when(userRepository.findByEmail("leader@ueh.edu.vn")).thenReturn(Optional.of(leader));

        mockMvc.perform(post("/api/teams/{teamId}/members", 1L)
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"member@ueh.edu.vn\",\"role\":\"LEADER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        verify(memberService).inviteByEmail(1L, "member@ueh.edu.vn", MemberRole.MEMBER, 10L);
    }

    @Test
    @DisplayName("POST /api/teams/{teamId}/members (DEF-33) - Không phải Leader hoặc người ngoài trả về 403 Forbidden")
    void inviteMember_whenNotLeader_shouldReturn403() throws Exception {
        User outsider = new User();
        outsider.setId(99L);
        outsider.setEmail("outsider@ueh.edu.vn");

        when(authentication.getName()).thenReturn("outsider@ueh.edu.vn");
        when(userRepository.findByEmail("outsider@ueh.edu.vn")).thenReturn(Optional.of(outsider));
        doThrow(new ForbiddenException("Bạn không phải thành viên của nhóm này"))
                .when(memberService).inviteByEmail(1L, "outsider@ueh.edu.vn", MemberRole.MEMBER, 99L);

        mockMvc.perform(post("/api/teams/{teamId}/members", 1L)
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"outsider@ueh.edu.vn\",\"role\":\"LEADER\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("POST /api/teams/{teamId}/members (DEF-33) - Chưa xác thực trả về 403 Forbidden")
    void inviteMember_whenUnauthenticated_shouldReturn403() throws Exception {
        mockMvc.perform(post("/api/teams/{teamId}/members", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"x@ueh.edu.vn\",\"role\":\"LEADER\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(memberService);
    }

    @Test
    @DisplayName("GET /api/teams/{teamId}/sprints (DEF-35) - Người ngoài nhóm trả về 403 Forbidden")
    void getSprints_whenOutsider_shouldReturn403() throws Exception {
        doThrow(new ForbiddenException("Bạn không phải là thành viên của nhóm này"))
                .when(teamSecurityService).assertTeamMember(eq(1L), any(Authentication.class));

        mockMvc.perform(get("/api/teams/{teamId}/sprints", 1L)
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)));
    }

    @Test
    @DisplayName("GET /api/teams/{teamId}/sprints (DEF-35) - Thành viên nhóm truy vấn thành công 200 OK")
    void getSprints_whenMember_shouldReturn200() throws Exception {
        User member = new User();
        member.setId(20L);
        member.setEmail("member@ueh.edu.vn");

        when(authentication.getName()).thenReturn("member@ueh.edu.vn");
        when(userRepository.findByEmail("member@ueh.edu.vn")).thenReturn(Optional.of(member));
        when(sprintService.getSprintsByTeam(1L, 20L)).thenReturn(List.of(
                SprintDto.builder().id(5L).teamId(1L).name("Sprint 1").status("ACTIVE").build()
        ));

        mockMvc.perform(get("/api/teams/{teamId}/sprints", 1L)
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data[0].name", is("Sprint 1")));
    }

    @Test
    @DisplayName("PUT /api/teams/{teamId} (DEF-59) - Leader cập nhật thông tin nhóm thành công 200 OK")
    void updateTeam_whenLeader_shouldReturn200() throws Exception {
        User leader = new User();
        leader.setId(10L);
        leader.setEmail("leader@ueh.edu.vn");

        TeamDto updatedDto = TeamDto.builder()
                .id(1L)
                .name("Nhóm mới")
                .currentRole("LEADER")
                .build();

        when(authentication.getName()).thenReturn("leader@ueh.edu.vn");
        when(userRepository.findByEmail("leader@ueh.edu.vn")).thenReturn(Optional.of(leader));
        when(teamService.updateTeam(eq(1L), any(CreateTeamRequest.class), eq(10L))).thenReturn(updatedDto);

        mockMvc.perform(put("/api/teams/{teamId}", 1L)
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Nhóm mới\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.name", is("Nhóm mới")));

        verify(teamSecurityService).assertTeamLeader(eq(1L), any(Authentication.class));
        verify(teamService).updateTeam(eq(1L), any(CreateTeamRequest.class), eq(10L));
    }

    @Test
    @DisplayName("PUT /api/teams/{teamId} (DEF-59) - MEMBER thường hoặc người ngoài bị từ chối 403 Forbidden")
    void updateTeam_whenNotLeader_shouldReturn403() throws Exception {
        doThrow(new ForbiddenException("Chỉ nhóm trưởng (LEADER) mới có quyền chỉnh sửa thông tin nhóm"))
                .when(teamSecurityService).assertTeamLeader(eq(1L), any(Authentication.class));

        mockMvc.perform(put("/api/teams/{teamId}", 1L)
                        .principal(authentication)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Đổi tên bởi member\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.message", is("Chỉ nhóm trưởng (LEADER) mới có quyền chỉnh sửa thông tin nhóm")));

        verifyNoInteractions(teamService);
    }

    @Test
    @DisplayName("PUT /api/teams/{teamId} (DEF-59) - Chưa xác thực trả về 403 Forbidden")
    void updateTeam_whenUnauthenticated_shouldReturn403() throws Exception {
        doThrow(new ForbiddenException("Chỉ nhóm trưởng (LEADER) mới có quyền chỉnh sửa thông tin nhóm"))
                .when(teamSecurityService).assertTeamLeader(eq(1L), (Authentication) isNull());

        mockMvc.perform(put("/api/teams/{teamId}", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hacker\"}"))
                .andExpect(status().isForbidden());

        verifyNoInteractions(teamService);
    }
}
