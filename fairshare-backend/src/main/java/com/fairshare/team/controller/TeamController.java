package com.fairshare.team.controller;

import com.fairshare.common.dto.ApiResponse;
import com.fairshare.common.security.TeamSecurityService;
import com.fairshare.contribution.dto.ContributionDto;
import com.fairshare.contribution.dto.EvidenceItemDto;
import com.fairshare.contribution.service.ContributionService;
import com.fairshare.sprint.dto.CreateSprintRequest;
import com.fairshare.sprint.dto.SprintDto;
import com.fairshare.sprint.service.SprintService;
import com.fairshare.team.dto.*;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.service.MemberService;
import com.fairshare.team.service.TeamService;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final TeamService teamService;
    private final MemberService memberService;
    private final SprintService sprintService;
    private final UserRepository userRepository;
    private final ContributionService contributionService;
    private final TeamSecurityService teamSecurityService;

    public TeamController(TeamService teamService, MemberService memberService, SprintService sprintService, UserRepository userRepository) {
        this(teamService, memberService, sprintService, userRepository, null, null);
    }

    @Autowired
    public TeamController(TeamService teamService,
                          MemberService memberService,
                          SprintService sprintService,
                          UserRepository userRepository,
                          @Autowired(required = false) ContributionService contributionService,
                          @Autowired(required = false) TeamSecurityService teamSecurityService) {
        this.teamService = teamService;
        this.memberService = memberService;
        this.sprintService = sprintService;
        this.userRepository = userRepository;
        this.contributionService = contributionService;
        this.teamSecurityService = teamSecurityService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TeamDto>> createTeam(
            @Valid @RequestBody CreateTeamRequest request,
            Authentication authentication) {
        Long userId = getUserId(authentication);
        TeamDto created = teamService.createTeam(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo nhóm đồ án thành công", created));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TeamDto>>> getMyTeams(Authentication authentication) {
        Long userId = getUserId(authentication);
        List<TeamDto> teams = teamService.getTeamsForUser(userId);
        return ResponseEntity.ok(ApiResponse.ok("Danh sách nhóm của bạn", teams));
    }

    @GetMapping("/{teamId}")
    public ResponseEntity<ApiResponse<TeamDto>> getTeamDetail(
            @PathVariable Long teamId,
            Authentication authentication) {
        Long userId = getUserId(authentication);
        TeamDto detail = teamService.getTeamDetail(teamId, userId);
        return ResponseEntity.ok(ApiResponse.ok("Chi tiết nhóm", detail));
    }

    @PostMapping("/{teamId}/members")
    public ResponseEntity<ApiResponse<Void>> inviteMember(
            @PathVariable Long teamId,
            @Valid @RequestBody InviteMemberRequest request) {
        MemberRole role = MemberRole.MEMBER;
        if (request.getRole() != null && request.getRole().equalsIgnoreCase("LEADER")) {
            role = MemberRole.LEADER;
        }
        memberService.inviteByEmail(teamId, request.getEmail(), role);
        return ResponseEntity.ok(ApiResponse.ok("Thêm thành viên thành công", null));
    }

    @GetMapping("/{teamId}/members")
    public ResponseEntity<ApiResponse<List<TeamMemberDto>>> getMembers(@PathVariable Long teamId) {
        List<TeamMember> members = memberService.getMembers(teamId);
        List<TeamMemberDto> dtos = members.stream()
                .map(m -> TeamMemberDto.builder()
                        .id(m.getId())
                        .userId(m.getUser().getId())
                        .email(m.getUser().getEmail())
                        .fullName(m.getUser().getFullName())
                        .role(m.getRole())
                        .joinedAt(m.getCreatedAt())
                        .build())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok("Danh sách thành viên", dtos));
    }

    @PutMapping("/{teamId}/members/{userId}/role")
    public ResponseEntity<ApiResponse<TeamMemberDto>> updateMemberRole(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateMemberRoleRequest request,
            Authentication authentication) {
        Long currentUserId = getUserId(authentication);
        TeamMember updated = memberService.updateMemberRole(teamId, userId, request.getRole(), currentUserId);
        TeamMemberDto dto = TeamMemberDto.builder()
                .id(updated.getId())
                .userId(updated.getUser().getId())
                .email(updated.getUser().getEmail())
                .fullName(updated.getUser().getFullName())
                .role(updated.getRole())
                .joinedAt(updated.getCreatedAt())
                .build();
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật vai trò thành viên thành công", dto));
    }

    @DeleteMapping("/{teamId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            Authentication authentication) {
        Long currentUserId = getUserId(authentication);
        memberService.removeMember(teamId, userId, currentUserId);
        return ResponseEntity.ok(ApiResponse.ok("Xóa thành viên khỏi nhóm thành công", null));
    }

    @PostMapping("/join")
    public ResponseEntity<ApiResponse<TeamDto>> joinTeam(
            @Valid @RequestBody JoinTeamRequest request,
            Authentication authentication) {
        Long userId = getUserId(authentication);
        TeamDto joined = teamService.joinTeamByInviteCode(request.getInviteCode(), userId);
        return ResponseEntity.ok(ApiResponse.ok("Tham gia nhóm thành công", joined));
    }

    @GetMapping("/{teamId}/consent/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getConsentStatus(
            @PathVariable Long teamId,
            Authentication authentication) {
        Long userId = getUserId(authentication);
        boolean consented = teamService.getConsentStatus(teamId, userId);
        return ResponseEntity.ok(ApiResponse.ok("Trạng thái cam kết dữ liệu", Map.of("consented", consented)));
    }

    @PostMapping("/{teamId}/consent")
    public ResponseEntity<ApiResponse<Void>> submitConsent(
            @PathVariable Long teamId,
            @RequestBody ConsentRequest request,
            Authentication authentication) {
        Long userId = getUserId(authentication);
        teamService.recordConsent(teamId, userId, request.isConsented());
        return ResponseEntity.ok(ApiResponse.ok("Ký cam kết dữ liệu thành công", null));
    }

    @DeleteMapping("/{teamId}/consent")
    public ResponseEntity<ApiResponse<Void>> revokeConsent(
            @PathVariable Long teamId,
            Authentication authentication) {
        Long userId = getUserId(authentication);
        teamService.revokeConsent(teamId, userId);
        return ResponseEntity.ok(ApiResponse.ok("Rút cam kết dữ liệu thành công", null));
    }

    @PostMapping("/{teamId}/sprints")
    public ResponseEntity<ApiResponse<SprintDto>> createSprint(
            @PathVariable Long teamId,
            @Valid @RequestBody CreateSprintRequest request,
            Authentication authentication) {
        Long actorId = getUserId(authentication);
        SprintDto sprint = sprintService.createSprint(teamId, request, actorId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo sprint thành công", sprint));
    }

    @GetMapping("/{teamId}/sprints")
    public ResponseEntity<ApiResponse<List<SprintDto>>> getSprints(@PathVariable Long teamId) {
        List<SprintDto> sprints = sprintService.getSprintsByTeam(teamId);
        return ResponseEntity.ok(ApiResponse.ok("Danh sách sprint", sprints));
    }

    @GetMapping("/{teamId}/contributions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeamContributions(
            @PathVariable Long teamId,
            @RequestParam(value = "sprintId", required = false) Long sprintId,
            Authentication authentication) {
        if (teamSecurityService != null && authentication != null) {
            teamSecurityService.assertTeamMember(teamId, authentication);
        }
        List<ContributionDto> scores = List.of();
        if (contributionService != null) {
            scores = sprintId != null
                    ? contributionService.getSprintScores(sprintId)
                    : contributionService.getTeamScores(teamId);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("teamId", teamId);
        data.put("sprintId", sprintId);
        data.put("scores", scores != null ? scores : List.of());
        data.put("updatedAt", LocalDateTime.now().toString());

        return ResponseEntity.ok(ApiResponse.ok("Điểm đóng góp nhóm", data));
    }

    @GetMapping("/{teamId}/contributions/{userId}/evidence")
    public ResponseEntity<ApiResponse<List<EvidenceItemDto>>> getMemberEvidence(
            @PathVariable Long teamId,
            @PathVariable Long userId,
            @RequestParam(value = "sprintId", required = false) Long sprintId,
            Authentication authentication) {
        if (teamSecurityService != null && authentication != null) {
            teamSecurityService.assertTeamMember(teamId, authentication);
        }
        Long sid = sprintId;
        if (sid == null) {
            List<SprintDto> sprints = sprintService.getSprintsByTeam(teamId);
            if (sprints != null && !sprints.isEmpty()) {
                sid = sprints.get(sprints.size() - 1).getId();
            } else {
                sid = 1L;
            }
        }
        List<EvidenceItemDto> evidence = contributionService != null
                ? contributionService.getEvidenceTraceability(teamId, sid, userId)
                : List.of();
        return ResponseEntity.ok(ApiResponse.ok("Bằng chứng đóng góp thành viên", evidence != null ? evidence : List.of()));
    }

    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }
}
