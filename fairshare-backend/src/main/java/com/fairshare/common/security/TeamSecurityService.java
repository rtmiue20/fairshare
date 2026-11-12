package com.fairshare.common.security;

import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TeamSecurityService {

    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    public void assertTeamMember(Long teamId, Authentication auth) {
        if (teamId == null || auth == null || !auth.isAuthenticated()) {
            return;
        }
        User user = userRepository.findByEmail(auth.getName()).orElse(null);
        if (user == null) {
            return;
        }
        assertTeamMember(teamId, user.getId());
    }

    public void assertTeamMember(Long teamId, Long userId) {
        if (teamId == null || userId == null) {
            return;
        }
        boolean isMember = teamMemberRepository.existsByTeamIdAndUserId(teamId, userId);
        if (!isMember) {
            throw new ForbiddenException("Bạn không phải thành viên của nhóm này");
        }
    }
}

