package com.fairshare.sprint;

import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.sprint.dto.CreateSprintRequest;
import com.fairshare.sprint.dto.SprintDto;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.sprint.service.SprintService;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit tests for Sprint Permission (Leader vs Member): Mở/Đóng đợt")
class SprintServicePermissionTest {

    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;

    @InjectMocks
    private SprintService sprintService;

    private Team team;
    private TeamMember leaderMember;
    private TeamMember normalMember;
    private Sprint activeSprint;

    @BeforeEach
    void setUp() {
        team = new Team();
        team.setId(10L);
        team.setName("Test Team");

        User leader = new User();
        leader.setId(1L);

        User member = new User();
        member.setId(2L);

        leaderMember = new TeamMember();
        leaderMember.setId(101L);
        leaderMember.setTeam(team);
        leaderMember.setUser(leader);
        leaderMember.setRole(MemberRole.LEADER);

        normalMember = new TeamMember();
        normalMember.setId(102L);
        normalMember.setTeam(team);
        normalMember.setUser(member);
        normalMember.setRole(MemberRole.MEMBER);

        activeSprint = new Sprint();
        activeSprint.setId(50L);
        activeSprint.setTeam(team);
        activeSprint.setName("Sprint 5");
        activeSprint.setStatus("ACTIVE");
    }

    @Test
    @DisplayName("Leader mở đợt (tạo sprint) thành công")
    void testLeaderCanCreateSprint() {
        CreateSprintRequest req = new CreateSprintRequest();
        req.setName("Sprint 5");
        req.setStartDate(LocalDate.now());
        req.setEndDate(LocalDate.now().plusDays(14));

        when(teamRepository.findById(10L)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamIdAndUserId(10L, 1L)).thenReturn(Optional.of(leaderMember));
        when(sprintRepository.save(any(Sprint.class))).thenReturn(activeSprint);

        SprintDto dto = sprintService.createSprint(10L, req, 1L);
        assertNotNull(dto);
        assertEquals("Sprint 5", dto.getName());
    }

    @Test
    @DisplayName("Thành viên mở đợt -> Bị chặn với ForbiddenException")
    void testMemberCannotCreateSprint() {
        CreateSprintRequest req = new CreateSprintRequest();
        req.setName("Sprint 5");

        when(teamRepository.findById(10L)).thenReturn(Optional.of(team));
        when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember));

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> sprintService.createSprint(10L, req, 2L));
        assertTrue(ex.getMessage().contains("Chỉ nhóm trưởng (Leader) mới có quyền tạo và mở đợt"));
    }

    @Test
    @DisplayName("Leader đóng đợt (close sprint) thành công")
    void testLeaderCanCloseSprint() {
        when(sprintRepository.findById(50L)).thenReturn(Optional.of(activeSprint));
        when(teamMemberRepository.findByTeamIdAndUserId(10L, 1L)).thenReturn(Optional.of(leaderMember));
        when(sprintRepository.save(any(Sprint.class))).thenReturn(activeSprint);

        SprintDto dto = sprintService.closeSprint(50L, 1L);
        assertNotNull(dto);
    }

    @Test
    @DisplayName("Thành viên đóng đợt -> Bị chặn với ForbiddenException")
    void testMemberCannotCloseSprint() {
        when(sprintRepository.findById(50L)).thenReturn(Optional.of(activeSprint));
        when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember));

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> sprintService.closeSprint(50L, 2L));
        assertTrue(ex.getMessage().contains("Chỉ nhóm trưởng (Leader) mới có quyền đóng đợt"));
    }
}

