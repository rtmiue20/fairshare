package com.fairshare.common.security;

import com.fairshare.common.exception.ForbiddenException;
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
}

