package com.fairshare.common.security;

import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test cho TeamSecurityService (DEF-12 - Phân quyền theo nhóm)")
class TeamSecurityServiceTest {

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private TeamSecurityService teamSecurityService;

    @Test
    @DisplayName("Thành viên trong nhóm xác thực thành công -> Không ném exception")
    void testAssertTeamMember_Success() {
        Long teamId = 1L;
        Long userId = 101L;

        when(teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)).thenReturn(true);

        assertDoesNotThrow(() -> teamSecurityService.assertTeamMember(teamId, userId));
    }

    @Test
    @DisplayName("Người ngoài nhóm cố truy cập -> Ném ForbiddenException (HTTP 403)")
    void testAssertTeamMember_ThrowsForbidden() {
        Long teamId = 1L;
        Long outsiderUserId = 999L;

        when(teamMemberRepository.existsByTeamIdAndUserId(teamId, outsiderUserId)).thenReturn(false);

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> teamSecurityService.assertTeamMember(teamId, outsiderUserId));
        assertEquals("Bạn không phải thành viên của nhóm này", ex.getMessage());
    }

    @Test
    @DisplayName("Kiểm tra qua Authentication object với người ngoài nhóm -> Ném ForbiddenException")
    void testAssertTeamMember_WithAuthentication_ThrowsForbidden() {
        Long teamId = 1L;
        String email = "outsider@fairshare.com";

        User outsider = new User();
        outsider.setId(505L);
        outsider.setEmail(email);

        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(email);
        when(userRepository.findByEmail(email)).thenReturn(Optional.of(outsider));
        when(teamMemberRepository.existsByTeamIdAndUserId(teamId, 505L)).thenReturn(false);

        assertThrows(ForbiddenException.class,
                () -> teamSecurityService.assertTeamMember(teamId, authentication));
    }

    @Test
    @DisplayName("assertTeamLeader (userId): LEADER vượt qua kiểm tra quyền")
    void testAssertTeamLeader_ByUserId_Success() {
        TeamMember leader = new TeamMember();
        leader.setRole(MemberRole.LEADER);

        when(teamMemberRepository.findByTeamIdAndUserId(1L, 10L)).thenReturn(Optional.of(leader));

        assertDoesNotThrow(() -> teamSecurityService.assertTeamLeader(1L, 10L));
    }

    @Test
    @DisplayName("assertTeamLeader (userId): MEMBER thường bị chặn -> Ném ForbiddenException (DEF-59)")
    void testAssertTeamLeader_ByUserId_MemberThrowsForbidden() {
        TeamMember member = new TeamMember();
        member.setRole(MemberRole.MEMBER);

        when(teamMemberRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.of(member));

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> teamSecurityService.assertTeamLeader(1L, 20L));
        assertEquals("Chỉ nhóm trưởng (LEADER) mới có quyền chỉnh sửa thông tin nhóm", ex.getMessage());
    }

    @Test
    @DisplayName("assertTeamLeader (userId): Người ngoài nhóm bị chặn -> Ném ForbiddenException (DEF-59)")
    void testAssertTeamLeader_ByUserId_OutsiderThrowsForbidden() {
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 99L)).thenReturn(Optional.empty());

        ForbiddenException ex = assertThrows(ForbiddenException.class,
                () -> teamSecurityService.assertTeamLeader(1L, 99L));
        assertEquals("Bạn không phải thành viên của nhóm này", ex.getMessage());
    }

    @Test
    @DisplayName("assertTeamLeader (Authentication): LEADER xác thực thành công")
    void testAssertTeamLeader_WithAuth_LeaderSuccess() {
        User leaderUser = new User();
        leaderUser.setId(10L);
        leaderUser.setEmail("leader@ueh.edu.vn");

        TeamMember leader = new TeamMember();
        leader.setRole(MemberRole.LEADER);

        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("leader@ueh.edu.vn");
        when(userRepository.findByEmail("leader@ueh.edu.vn")).thenReturn(Optional.of(leaderUser));
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 10L)).thenReturn(Optional.of(leader));

        assertDoesNotThrow(() -> teamSecurityService.assertTeamLeader(1L, authentication));
    }

    @Test
    @DisplayName("assertTeamLeader (Authentication): MEMBER bị chặn -> Ném ForbiddenException (DEF-59)")
    void testAssertTeamLeader_WithAuth_MemberThrowsForbidden() {
        User memberUser = new User();
        memberUser.setId(20L);
        memberUser.setEmail("member@ueh.edu.vn");

        TeamMember member = new TeamMember();
        member.setRole(MemberRole.MEMBER);

        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("member@ueh.edu.vn");
        when(userRepository.findByEmail("member@ueh.edu.vn")).thenReturn(Optional.of(memberUser));
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.of(member));

        assertThrows(ForbiddenException.class,
                () -> teamSecurityService.assertTeamLeader(1L, authentication));
    }

    @Test
    @DisplayName("assertTeamLeader (Authentication): Chưa đăng nhập / null -> Ném ForbiddenException (DEF-59)")
    void testAssertTeamLeader_WithAuth_NullOrUnauthenticatedThrowsForbidden() {
        assertThrows(ForbiddenException.class,
                () -> teamSecurityService.assertTeamLeader(1L, (Authentication) null));

        when(authentication.isAuthenticated()).thenReturn(false);
        assertThrows(ForbiddenException.class,
                () -> teamSecurityService.assertTeamLeader(1L, authentication));
    }
}

