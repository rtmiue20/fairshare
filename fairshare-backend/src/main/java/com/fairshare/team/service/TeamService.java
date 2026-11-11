package com.fairshare.team.service;

import com.fairshare.board.entity.Board;
import com.fairshare.board.entity.BoardColumn;
import com.fairshare.board.repository.BoardColumnRepository;
import com.fairshare.board.repository.BoardRepository;
import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.DuplicateResourceException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.dto.*;
import com.fairshare.team.entity.Consent;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.ConsentRepository;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final ConsentRepository consentRepository;

    @Autowired(required = false)
    private SprintRepository sprintRepository;
    @Autowired(required = false)
    private BoardRepository boardRepository;
    @Autowired(required = false)
    private BoardColumnRepository boardColumnRepository;

    @Transactional
    public TeamDto createTeam(CreateTeamRequest request, Long ownerId) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new BusinessException("Team name is required");
        }
        if (ownerId == null) {
            throw new BusinessException("Team owner is required");
        }

        User ownerUser = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + ownerId));

        Team team = new Team();
        team.setName(request.getName().trim());
        team.setCourseName(request.getCourseName());
        team.setDescription(request.getDescription());
        team.setInviteCode(generateUniqueInviteCode());

        Team savedTeam = teamRepository.save(team);

        TeamMember owner = new TeamMember();
        owner.setTeam(savedTeam);
        owner.setUser(ownerUser);
        owner.setRole(MemberRole.LEADER);
        teamMemberRepository.save(owner);

        // Leader automatically consents
        Consent consent = new Consent();
        consent.setTeam(savedTeam);
        consent.setUser(ownerUser);
        consent.setAgreed(true);
        consent.setAgreedAt(LocalDateTime.now());
        consentRepository.save(consent);

        // Auto-initialize Sprint 1 for the new project
        if (sprintRepository != null) {
            Sprint sprint = new Sprint();
            sprint.setTeam(savedTeam);
            sprint.setName("Sprint 1");
            sprint.setStartDate(LocalDate.now());
            sprint.setEndDate(LocalDate.now().plusDays(14));
            sprint.setStatus("ACTIVE");
            sprintRepository.save(sprint);
        }

        // Auto-initialize Kanban Board with standard 4 columns
        if (boardRepository != null && boardColumnRepository != null) {
            Board board = new Board();
            board.setTeam(savedTeam);
            board.setName("Kanban Board - " + savedTeam.getName());
            board.setDescription("Bảng theo dõi tiến độ công việc và hoạt động của " + savedTeam.getName());
            Board savedBoard = boardRepository.save(board);

            String[] defaultColumns = { "To Do", "In Progress", "Review", "Done" };
            for (int i = 0; i < defaultColumns.length; i++) {
                BoardColumn col = new BoardColumn();
                col.setBoard(savedBoard);
                col.setName(defaultColumns[i]);
                col.setPosition(i);
                boardColumnRepository.save(col);
            }
        }

        return mapToDto(savedTeam, MemberRole.LEADER.name());
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
    public TeamDto getTeamDetail(Long teamId, Long currentUserId) {
        Team team = getById(teamId);
        List<TeamMember> members = teamMemberRepository.findByTeamId(teamId);

        String currentRole = members.stream()
                .filter(m -> m.getUser().getId().equals(currentUserId))
                .findFirst()
                .map(m -> m.getRole().name())
                .orElse(null);

        Map<Long, Boolean> consentMap = members.stream()
                .collect(Collectors.toMap(
                        m -> m.getUser().getId(),
                        m -> consentRepository.findByTeamIdAndUserId(teamId, m.getUser().getId())
                                .map(Consent::isAgreed)
                                .orElse(false)
                ));

        List<TeamMemberDto> memberDtos = members.stream()
                .map(m -> TeamMemberDto.builder()
                        .id(m.getId())
                        .userId(m.getUser().getId())
                        .email(m.getUser().getEmail())
                        .fullName(m.getUser().getFullName())
                        .role(m.getRole())
                        .hasConsented(consentMap.getOrDefault(m.getUser().getId(), false))
                        .joinedAt(m.getCreatedAt())
                        .build())
                .toList();

        TeamDto dto = mapToDto(team, currentRole);
        dto.setMembers(memberDtos);
        return dto;
    }

    @Transactional(readOnly = true)
    public List<TeamDto> getTeamsForUser(Long userId) {
        if (userId == null) {
            throw new BusinessException("User id is required");
        }
        List<TeamMember> memberships = teamMemberRepository.findByUserId(userId);
        return memberships.stream()
                .map(m -> {
                    TeamDto dto = mapToDto(m.getTeam(), m.getRole().name());
                    return dto;
                })
                .toList();
    }

    @Transactional
    public TeamDto joinTeamByInviteCode(String inviteCode, Long userId) {
        if (inviteCode == null || inviteCode.isBlank()) {
            throw new BusinessException("Invite code is required");
        }
        Team team = teamRepository.findByInviteCode(inviteCode.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid invite code: " + inviteCode));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        if (teamMemberRepository.existsByTeamIdAndUserId(team.getId(), userId)) {
            throw new DuplicateResourceException("You are already a member of this team");
        }

        TeamMember member = new TeamMember();
        member.setTeam(team);
        member.setUser(user);
        member.setRole(MemberRole.MEMBER);
        teamMemberRepository.save(member);

        Consent consent = new Consent();
        consent.setTeam(team);
        consent.setUser(user);
        consent.setAgreed(true);
        consent.setAgreedAt(LocalDateTime.now());
        consentRepository.save(consent);

        return mapToDto(team, MemberRole.MEMBER.name());
    }

    @Transactional(readOnly = true)
    public boolean getConsentStatus(Long teamId, Long userId) {
        return consentRepository.findByTeamIdAndUserId(teamId, userId)
                .map(Consent::isAgreed)
                .orElse(false);
    }

    @Transactional
    public void recordConsent(Long teamId, Long userId, boolean agreed) {
        Team team = getById(teamId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        Consent consent = consentRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseGet(() -> {
                    Consent c = new Consent();
                    c.setTeam(team);
                    c.setUser(user);
                    return c;
                });

        consent.setAgreed(agreed);
        consent.setAgreedAt(agreed ? LocalDateTime.now() : null);
        consentRepository.save(consent);
    }

    @Transactional
    public void revokeConsent(Long teamId, Long userId) {
        recordConsent(teamId, userId, false);
    }

    private String generateUniqueInviteCode() {
        return "FS" + UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    }

    private TeamDto mapToDto(Team team, String role) {
        return TeamDto.builder()
                .id(team.getId())
                .name(team.getName())
                .courseName(team.getCourseName())
                .description(team.getDescription())
                .inviteCode(team.getInviteCode())
                .currentRole(role)
                .createdAt(team.getCreatedAt())
                .updatedAt(team.getUpdatedAt())
                .build();
    }
}
