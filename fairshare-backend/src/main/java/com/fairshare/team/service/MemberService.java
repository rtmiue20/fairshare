package com.fairshare.team.service;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.DuplicateResourceException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RequiredArgsConstructor
@Service
public class MemberService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public TeamMember addMember(Long teamId, Long userId, MemberRole role) {
        if (teamId == null || userId == null || role == null) {
            throw new BusinessException("Team, user, and member role are required");
        }
        if (teamMemberRepository.existsByTeamIdAndUserId(teamId, userId)) {
            throw new DuplicateResourceException("User is already a member of this team");
        }

        TeamMember member = new TeamMember();
        member.setTeam(teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId)));
        member.setUser(userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId)));
        member.setRole(role);
        return teamMemberRepository.save(member);
    }

    @Transactional
    public TeamMember inviteByEmail(Long teamId, String email, MemberRole role) {
        if (email == null || email.isBlank()) {
            throw new BusinessException("Email is required");
        }
        User user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));

        return addMember(teamId, user.getId(), role != null ? role : MemberRole.MEMBER);
    }

    @Transactional(readOnly = true)
    public List<TeamMember> getMembers(Long teamId) {
        if (teamId == null) {
            throw new BusinessException("Team id is required");
        }
        if (!teamRepository.existsById(teamId)) {
            throw new ResourceNotFoundException("Team not found: " + teamId);
        }
        List<TeamMember> members = teamMemberRepository.findByTeamIdWithUser(teamId);
        if (members == null || members.isEmpty()) {
            members = teamMemberRepository.findByTeamId(teamId);
        }
        return members;
    }

    @Transactional
    public void removeMember(Long teamId, Long targetUserId, Long currentUserId) {
        if (teamId == null || targetUserId == null) {
            throw new BusinessException("Team id và user id không được để trống");
        }
        if (!teamRepository.existsById(teamId)) {
            throw new ResourceNotFoundException("Team not found: " + teamId);
        }

        if (currentUserId != null && !currentUserId.equals(targetUserId)) {
            TeamMember caller = teamMemberRepository.findByTeamIdAndUserId(teamId, currentUserId)
                    .orElseThrow(() -> new BusinessException("Bạn không phải thành viên của nhóm này"));
            if (caller.getRole() != MemberRole.LEADER) {
                throw new BusinessException("Chỉ Leader mới có quyền xóa thành viên khỏi nhóm");
            }
        }

        TeamMember target = teamMemberRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên trong nhóm"));

        if (target.getRole() == MemberRole.LEADER) {
            long leaderCount = teamMemberRepository.countByTeamIdAndRole(teamId, MemberRole.LEADER);
            if (leaderCount <= 1) {
                throw new BusinessException("Không thể xóa Leader duy nhất của nhóm. Hãy bổ nhiệm Leader khác trước.");
            }
        }

        teamMemberRepository.delete(target);
    }

    @Transactional
    public TeamMember updateMemberRole(Long teamId, Long targetUserId, MemberRole newRole, Long currentUserId) {
        if (teamId == null || targetUserId == null || newRole == null) {
            throw new BusinessException("Team id, user id và vai trò mới không được để trống");
        }
        if (!teamRepository.existsById(teamId)) {
            throw new ResourceNotFoundException("Team not found: " + teamId);
        }

        if (currentUserId != null) {
            TeamMember caller = teamMemberRepository.findByTeamIdAndUserId(teamId, currentUserId)
                    .orElseThrow(() -> new BusinessException("Bạn không phải thành viên của nhóm này"));
            if (caller.getRole() != MemberRole.LEADER) {
                throw new BusinessException("Chỉ Leader mới có quyền thay đổi vai trò thành viên");
            }
        }

        TeamMember target = teamMemberRepository.findByTeamIdAndUserId(teamId, targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên trong nhóm"));

        if (target.getRole() == MemberRole.LEADER && newRole != MemberRole.LEADER) {
            long leaderCount = teamMemberRepository.countByTeamIdAndRole(teamId, MemberRole.LEADER);
            if (leaderCount <= 1) {
                throw new BusinessException("Không thể giáng chức Leader duy nhất của nhóm. Hãy bổ nhiệm Leader khác trước.");
            }
        }

        target.setRole(newRole);
        return teamMemberRepository.save(target);
    }
}
