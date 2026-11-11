package com.fairshare.sprint.service;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.sprint.dto.CreateSprintRequest;
import com.fairshare.sprint.dto.SprintDto;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SprintService {

    private final SprintRepository sprintRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    @Transactional
    public SprintDto createSprint(Long teamId, CreateSprintRequest request, Long userId) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new BusinessException("Sprint name is required");
        }
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));

        if (userId != null) {
            TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                    .orElseThrow(() -> new ForbiddenException("Bạn không phải là thành viên của nhóm này"));
            if (member.getRole() != MemberRole.LEADER) {
                throw new ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền tạo và mở đợt đánh giá (sprint)");
            }
        }

        Sprint sprint = new Sprint();
        sprint.setTeam(team);
        sprint.setName(request.getName().trim());
        sprint.setStartDate(request.getStartDate());
        sprint.setEndDate(request.getEndDate());
        sprint.setStatus("ACTIVE");

        return mapToDto(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintDto createSprint(Long teamId, CreateSprintRequest request) {
        return createSprint(teamId, request, null);
    }

    @Transactional(readOnly = true)
    public List<SprintDto> getSprintsByTeam(Long teamId) {
        if (!teamRepository.existsById(teamId)) {
            throw new ResourceNotFoundException("Team not found: " + teamId);
        }
        return sprintRepository.findByTeamId(teamId).stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public SprintDto getSprintById(Long id) {
        Sprint sprint = sprintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found: " + id));
        return mapToDto(sprint);
    }

    @Transactional
    public SprintDto closeSprint(Long sprintId, Long userId) {
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found: " + sprintId));

        if (userId != null) {
            TeamMember member = teamMemberRepository.findByTeamIdAndUserId(sprint.getTeam().getId(), userId)
                    .orElseThrow(() -> new ForbiddenException("Bạn không phải là thành viên của nhóm này"));
            if (member.getRole() != MemberRole.LEADER) {
                throw new ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền đóng đợt đánh giá (sprint)");
            }
        }

        sprint.setStatus("CLOSED");
        return mapToDto(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintDto closeSprint(Long sprintId) {
        return closeSprint(sprintId, null);
    }

    private SprintDto mapToDto(Sprint sprint) {
        return SprintDto.builder()
                .id(sprint.getId())
                .teamId(sprint.getTeam().getId())
                .name(sprint.getName())
                .startDate(sprint.getStartDate())
                .endDate(sprint.getEndDate())
                .status(sprint.getStatus())
                .build();
    }
}
