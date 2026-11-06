package com.fairshare.team;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.team.service.MemberService;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit tests for MemberService (M2 - Quản lý thành viên & Đổi vai trò)")
class MemberServiceTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private MemberService memberService;

    private Team team;
    private User leaderUser;
    private User memberUser;
    private TeamMember leaderMember;
    private TeamMember regularMember;

    @BeforeEach
    void setUp() {
        team = new Team();
        team.setId(1L);
        team.setName("Dự án FairShare Nhóm 7");

        leaderUser = new User();
        leaderUser.setId(10L);
        leaderUser.setFullName("Nguyễn Văn Minh Triều");
        leaderUser.setEmail("trieu@ueh.edu.vn");

        memberUser = new User();
        memberUser.setId(20L);
        memberUser.setFullName("Hà Ngọc Thiện");
        memberUser.setEmail("thien@ueh.edu.vn");

        leaderMember = new TeamMember();
        leaderMember.setId(101L);
        leaderMember.setTeam(team);
        leaderMember.setUser(leaderUser);
        leaderMember.setRole(MemberRole.LEADER);

        regularMember = new TeamMember();
        regularMember.setId(102L);
        regularMember.setTeam(team);
        regularMember.setUser(memberUser);
        regularMember.setRole(MemberRole.MEMBER);
    }

    @Test
    @DisplayName("removeMember: Leader xóa thành viên thông thường thành công")
    void removeMember_success_whenCallerIsLeader() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 10L)).thenReturn(Optional.of(leaderMember));
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.of(regularMember));

        assertDoesNotThrow(() -> memberService.removeMember(1L, 20L, 10L));
        verify(teamMemberRepository).delete(regularMember);
    }

    @Test
    @DisplayName("removeMember: Thành viên tự rời nhóm thành công")
    void removeMember_success_whenMemberLeavesThemselves() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.of(regularMember));

        assertDoesNotThrow(() -> memberService.removeMember(1L, 20L, 20L));
        verify(teamMemberRepository).delete(regularMember);
    }

    @Test
    @DisplayName("removeMember: Người không phải Leader cố xóa thành viên khác thì ném BusinessException")
    void removeMember_throwsException_whenCallerIsNotLeader() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.of(regularMember));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> memberService.removeMember(1L, 10L, 20L));
        assertTrue(ex.getMessage().contains("Chỉ Leader mới có quyền"));
        verify(teamMemberRepository, never()).delete(any());
    }

    @Test
    @DisplayName("removeMember: Không thể xóa Leader duy nhất của nhóm")
    void removeMember_throwsException_whenRemovingSoleLeader() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 10L)).thenReturn(Optional.of(leaderMember));
        when(teamMemberRepository.countByTeamIdAndRole(1L, MemberRole.LEADER)).thenReturn(1L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> memberService.removeMember(1L, 10L, 10L));
        assertTrue(ex.getMessage().contains("Leader duy nhất"));
        verify(teamMemberRepository, never()).delete(any());
    }

    @Test
    @DisplayName("removeMember: Ném ResourceNotFoundException nếu không tìm thấy thành viên cần xóa")
    void removeMember_throwsNotFound_whenTargetNotInTeam() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 10L)).thenReturn(Optional.of(leaderMember));
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> memberService.removeMember(1L, 99L, 10L));
        verify(teamMemberRepository, never()).delete(any());
    }

    @Test
    @DisplayName("updateMemberRole: Leader thăng chức thành viên lên LEADER thành công")
    void updateMemberRole_success_whenCallerIsLeader() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 10L)).thenReturn(Optional.of(leaderMember));
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.of(regularMember));
        when(teamMemberRepository.save(any(TeamMember.class))).thenAnswer(i -> i.getArgument(0));

        TeamMember result = memberService.updateMemberRole(1L, 20L, MemberRole.LEADER, 10L);
        assertNotNull(result);
        assertEquals(MemberRole.LEADER, result.getRole());
        verify(teamMemberRepository).save(regularMember);
    }

    @Test
    @DisplayName("updateMemberRole: Người không phải Leader cố đổi vai trò thì ném BusinessException")
    void updateMemberRole_throwsException_whenCallerIsNotLeader() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.of(regularMember));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> memberService.updateMemberRole(1L, 10L, MemberRole.MEMBER, 20L));
        assertTrue(ex.getMessage().contains("Chỉ Leader mới có quyền"));
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateMemberRole: Không thể giáng chức Leader duy nhất về MEMBER")
    void updateMemberRole_throwsException_whenDemotingSoleLeader() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 10L)).thenReturn(Optional.of(leaderMember));
        when(teamMemberRepository.countByTeamIdAndRole(1L, MemberRole.LEADER)).thenReturn(1L);

        BusinessException ex = assertThrows(BusinessException.class,
                () -> memberService.updateMemberRole(1L, 10L, MemberRole.MEMBER, 10L));
        assertTrue(ex.getMessage().contains("Leader duy nhất"));
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    @DisplayName("getMembers: Trả về danh sách thành viên của nhóm thành công")
    void getMembers_success() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(teamMemberRepository.findByTeamId(1L)).thenReturn(List.of(leaderMember, regularMember));

        List<TeamMember> members = memberService.getMembers(1L);
        assertEquals(2, members.size());
        assertEquals("Nguyễn Văn Minh Triều", members.get(0).getUser().getFullName());
        assertEquals("Hà Ngọc Thiện", members.get(1).getUser().getFullName());
    }
}
