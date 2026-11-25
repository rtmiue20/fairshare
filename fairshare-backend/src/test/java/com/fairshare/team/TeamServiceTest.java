package com.fairshare.team;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.DuplicateResourceException;
import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.team.dto.CreateTeamRequest;
import com.fairshare.team.dto.TeamDto;
import com.fairshare.team.entity.Consent;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.ConsentRepository;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.team.service.TeamService;
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
@DisplayName("Unit tests for TeamService (M2 - Quản lý Nhóm, Mã mời & Cam kết Consent)")
class TeamServiceTest {

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ConsentRepository consentRepository;

    @InjectMocks
    private TeamService teamService;

    private User leaderUser;
    private User memberUser;
    private Team team;
    private TeamMember leaderMember;

    @BeforeEach
    void setUp() {
        leaderUser = new User();
        leaderUser.setId(10L);
        leaderUser.setFullName("Nguyễn Văn Minh Triều");
        leaderUser.setEmail("trieu@ueh.edu.vn");

        memberUser = new User();
        memberUser.setId(20L);
        memberUser.setFullName("Hà Ngọc Thiện");
        memberUser.setEmail("thien@ueh.edu.vn");

        team = new Team();
        team.setId(1L);
        team.setName("Dự án FairShare Nhóm 7");
        team.setCourseName("Quản lý dự án CNTT - UEH");
        team.setDescription("Hệ thống đo lường đóng góp đồ án nhóm");
        team.setInviteCode("FS123456");

        leaderMember = new TeamMember();
        leaderMember.setId(101L);
        leaderMember.setTeam(team);
        leaderMember.setUser(leaderUser);
        leaderMember.setRole(MemberRole.LEADER);
    }

    @Test
    @DisplayName("createTeam: Tạo nhóm thành công, gán Leader và tự động ký consent")
    void createTeam_success() {
        CreateTeamRequest request = new CreateTeamRequest();
        request.setName("Dự án FairShare Nhóm 7");
        request.setCourseName("Quản lý dự án CNTT");
        request.setDescription("Đề tài FairShare");

        when(userRepository.findById(10L)).thenReturn(Optional.of(leaderUser));
        when(teamRepository.save(any(Team.class))).thenAnswer(i -> {
            Team t = i.getArgument(0);
            t.setId(1L);
            return t;
        });

        TeamDto result = teamService.createTeam(request, 10L);

        assertNotNull(result);
        assertEquals("Dự án FairShare Nhóm 7", result.getName());
        assertEquals(MemberRole.LEADER.name(), result.getCurrentRole());
        assertNotNull(result.getInviteCode());
        assertTrue(result.getInviteCode().matches("^FS[A-Z0-9]{6}$"),
                "Mã mời phải gồm tiền tố FS + 6 ký tự (tổng 8 ký tự theo DEF-37)");
        verify(teamMemberRepository).save(any(TeamMember.class));
        verify(consentRepository).save(any(Consent.class));
    }

    @Test
    @DisplayName("createTeam: Ném BusinessException khi tên nhóm để trống")
    void createTeam_throwsException_whenNameBlank() {
        CreateTeamRequest request = new CreateTeamRequest();
        request.setName("   ");

        assertThrows(BusinessException.class, () -> teamService.createTeam(request, 10L));
        verify(teamRepository, never()).save(any());
    }

    @Test
    @DisplayName("createTeam: Ném BusinessException khi ownerId null")
    void createTeam_throwsException_whenOwnerIdNull() {
        CreateTeamRequest request = new CreateTeamRequest();
        request.setName("Nhóm 7");

        assertThrows(BusinessException.class, () -> teamService.createTeam(request, null));
    }

    @Test
    @DisplayName("joinTeamByInviteCode: Tham gia nhóm thành công bằng mã mời")
    void joinTeamByInviteCode_success() {
        when(teamRepository.findByInviteCode("FS123456")).thenReturn(Optional.of(team));
        when(userRepository.findById(20L)).thenReturn(Optional.of(memberUser));
        when(teamMemberRepository.existsByTeamIdAndUserId(1L, 20L)).thenReturn(false);

        TeamDto result = teamService.joinTeamByInviteCode("FS123456", 20L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals(MemberRole.MEMBER.name(), result.getCurrentRole());
        verify(teamMemberRepository).save(any(TeamMember.class));
    }

    @Test
    @DisplayName("joinTeamByInviteCode: Ném DuplicateResourceException khi đã là thành viên của nhóm")
    void joinTeamByInviteCode_throwsDuplicate_whenAlreadyMember() {
        when(teamRepository.findByInviteCode("FS123456")).thenReturn(Optional.of(team));
        when(userRepository.findById(20L)).thenReturn(Optional.of(memberUser));
        when(teamMemberRepository.existsByTeamIdAndUserId(1L, 20L)).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> teamService.joinTeamByInviteCode("FS123456", 20L));
        verify(teamMemberRepository, never()).save(any());
    }

    @Test
    @DisplayName("joinTeamByInviteCode: Ném ResourceNotFoundException khi mã mời không tồn tại")
    void joinTeamByInviteCode_throwsNotFound_whenCodeInvalid() {
        when(teamRepository.findByInviteCode("INVALID")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> teamService.joinTeamByInviteCode("INVALID", 20L));
    }

    @Test
    @DisplayName("recordConsent: Lưu trạng thái đồng thuận chia sẻ dữ liệu thành công")
    void recordConsent_success() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(userRepository.findById(20L)).thenReturn(Optional.of(memberUser));
        when(consentRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.empty());

        teamService.recordConsent(1L, 20L, true);

        verify(consentRepository).save(any(Consent.class));
    }

    @Test
    @DisplayName("revokeConsent: Rút lại đồng thuận chia sẻ dữ liệu thành công")
    void revokeConsent_success() {
        Consent existingConsent = new Consent();
        existingConsent.setTeam(team);
        existingConsent.setUser(memberUser);
        existingConsent.setAgreed(true);

        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(userRepository.findById(20L)).thenReturn(Optional.of(memberUser));
        when(consentRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.of(existingConsent));

        teamService.revokeConsent(1L, 20L);

        assertFalse(existingConsent.isAgreed());
        assertNull(existingConsent.getAgreedAt());
        verify(consentRepository).save(existingConsent);
    }

    @Test
    @DisplayName("getConsentStatus: Kiểm tra đúng trạng thái đồng thuận của thành viên")
    void getConsentStatus_returnsCorrectStatus() {
        Consent consent = new Consent();
        consent.setAgreed(true);
        when(consentRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.of(consent));

        boolean status = teamService.getConsentStatus(1L, 20L);
        assertTrue(status);
    }

    @Test
    @DisplayName("updateTeam (DEF-59): LEADER cập nhật thông tin nhóm thành công")
    void updateTeam_asLeader_success() {
        CreateTeamRequest request = new CreateTeamRequest();
        request.setName("FairShare Đã Cập Nhật");
        request.setLecturer("TS. Nguyễn Văn A");
        request.setSprintCount(6);

        when(teamMemberRepository.findByTeamIdAndUserId(1L, 10L)).thenReturn(Optional.of(leaderMember));
        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(teamRepository.save(any(Team.class))).thenAnswer(i -> i.getArgument(0));
        when(teamMemberRepository.findByTeamId(1L)).thenReturn(List.of(leaderMember));
        when(consentRepository.findByTeamIdAndUserId(1L, 10L)).thenReturn(Optional.empty());

        TeamDto result = teamService.updateTeam(1L, request, 10L);

        assertNotNull(result);
        assertEquals("FairShare Đã Cập Nhật", result.getName());
        assertEquals("TS. Nguyễn Văn A", result.getLecturer());
        assertEquals(6, result.getSprintCount());
        verify(teamRepository).save(team);
    }

    @Test
    @DisplayName("updateTeam (DEF-59): MEMBER thường bị từ chối bằng ForbiddenException và không lưu")
    void updateTeam_asMember_throwsForbidden() {
        TeamMember regularMember = new TeamMember();
        regularMember.setId(102L);
        regularMember.setTeam(team);
        regularMember.setUser(memberUser);
        regularMember.setRole(MemberRole.MEMBER);

        CreateTeamRequest request = new CreateTeamRequest();
        request.setName("Đổi tên bởi member");

        when(teamMemberRepository.findByTeamIdAndUserId(1L, 20L)).thenReturn(Optional.of(regularMember));

        assertThrows(ForbiddenException.class, () -> teamService.updateTeam(1L, request, 20L));
        verify(teamRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateTeam (DEF-59): Người ngoài nhóm bị từ chối bằng ForbiddenException và không lưu")
    void updateTeam_asOutsider_throwsForbidden() {
        CreateTeamRequest request = new CreateTeamRequest();
        request.setName("Đổi tên bởi outsider");

        when(teamMemberRepository.findByTeamIdAndUserId(1L, 999L)).thenReturn(Optional.empty());

        assertThrows(ForbiddenException.class, () -> teamService.updateTeam(1L, request, 999L));
        verify(teamRepository, never()).save(any());
    }
}
