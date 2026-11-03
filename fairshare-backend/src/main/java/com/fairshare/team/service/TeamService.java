package com.fairshare.team.service;

import com.fairshare.common.exception.BusinessException;
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
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public Team createTeam(String name, String description, Long ownerId) {
        if (name == null || name.isBlank()) {
            throw new BusinessException("Team name is required");
        }
        if (name.trim().length() > 255) {
            throw new BusinessException("Team name must be at most 255 characters");
        }
        if (ownerId == null) {
            throw new BusinessException("Team owner is required");
        }

        Team team = new Team();
        team.setName(name.trim());
        team.setDescription(description == null ? null : description.trim());
        User ownerUser = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + ownerId));
        Team savedTeam = teamRepository.save(team);

        TeamMember owner = new TeamMember();
        owner.setTeam(savedTeam);
        owner.setUser(ownerUser);
        owner.setRole(MemberRole.LEADER);
        teamMemberRepository.save(owner);
        return savedTeam;
    }

    @Transactional(readOnly = true)
    public Team getById(Long id) {
        if (id == null) {
            throw new BusinessException("Team id is required");
        }
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<Team> getTeamsForUser(Long userId) {
        if (userId == null) {
            throw new BusinessException("User id is required");
        }
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found: " + userId);
        }
        return teamMemberRepository.findByUserId(userId).stream()
                .map(member -> member.getTeam())
                .toList();
    }
}
