package com.fairshare.sprint;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.sprint.dto.CreateSprintRequest;
import com.fairshare.sprint.dto.SprintDto;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.sprint.service.SprintService;
import com.fairshare.team.entity.Team;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit tests for SprintService (M2 - Quản lý Sprint & Đóng Sprint)")
class SprintServiceTest {

    @Mock
    private SprintRepository sprintRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @InjectMocks
    private SprintService sprintService;

    private Team team;
    private Sprint activeSprint;
    private CreateSprintRequest createRequest;

    @BeforeEach
    void setUp() {
        team = new Team();
        team.setId(1L);
        team.setName("Dự án FairShare Nhóm 7");

        activeSprint = new Sprint();
        activeSprint.setId(10L);
        activeSprint.setTeam(team);
        activeSprint.setName("Sprint 5 - Chấm chéo ẩn danh & Báo cáo PDF");
        activeSprint.setStartDate(LocalDate.of(2026, 11, 11));
        activeSprint.setEndDate(LocalDate.of(2026, 11, 17));
        activeSprint.setStatus("ACTIVE");

        createRequest = new CreateSprintRequest();
        createRequest.setName("Sprint 5 - Chấm chéo ẩn danh & Báo cáo PDF");
        createRequest.setStartDate(LocalDate.of(2026, 11, 11));
        createRequest.setEndDate(LocalDate.of(2026, 11, 17));
    }

    @Test
    @DisplayName("createSprint: Khởi tạo Sprint mới thành công với trạng thái ACTIVE")
    void createSprint_success() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(team));
        when(sprintRepository.save(any(Sprint.class))).thenAnswer(invocation -> {
            Sprint s = invocation.getArgument(0);
            s.setId(10L);
            return s;
        });

        SprintDto result = sprintService.createSprint(1L, createRequest);

        assertNotNull(result);
        assertEquals(10L, result.getId());
        assertEquals(1L, result.getTeamId());
        assertEquals("Sprint 5 - Chấm chéo ẩn danh & Báo cáo PDF", result.getName());
        assertEquals("ACTIVE", result.getStatus());
        assertEquals(LocalDate.of(2026, 11, 11), result.getStartDate());
        assertEquals(LocalDate.of(2026, 11, 17), result.getEndDate());
        verify(sprintRepository).save(any(Sprint.class));
    }

    @Test
    @DisplayName("createSprint: Ném BusinessException khi tên Sprint rỗng hoặc null")
    void createSprint_throwsException_whenNameIsBlank() {
        CreateSprintRequest invalidReq = new CreateSprintRequest();
        invalidReq.setName("   ");

        BusinessException ex = assertThrows(BusinessException.class,
                () -> sprintService.createSprint(1L, invalidReq));
        assertTrue(ex.getMessage().contains("Sprint name is required"));
        verify(sprintRepository, never()).save(any());
    }

    @Test
    @DisplayName("createSprint: Ném ResourceNotFoundException khi không tìm thấy nhóm đồ án")
    void createSprint_throwsNotFound_whenTeamNotFound() {
        when(teamRepository.findById(99L)).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(ResourceNotFoundException.class,
                () -> sprintService.createSprint(99L, createRequest));
        assertTrue(ex.getMessage().contains("Team not found"));
        verify(sprintRepository, never()).save(any());
    }

    @Test
    @DisplayName("getSprintsByTeam: Lấy danh sách Sprint theo Team ID thành công")
    void getSprintsByTeam_success() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(sprintRepository.findByTeamId(1L)).thenReturn(List.of(activeSprint));

        List<SprintDto> list = sprintService.getSprintsByTeam(1L);

        assertEquals(1, list.size());
        assertEquals("Sprint 5 - Chấm chéo ẩn danh & Báo cáo PDF", list.get(0).getName());
        assertEquals("ACTIVE", list.get(0).getStatus());
    }

    @Test
    @DisplayName("getSprintsByTeam: Ném ResourceNotFoundException khi Team ID không tồn tại")
    void getSprintsByTeam_throwsNotFound_whenTeamNotExists() {
        when(teamRepository.existsById(99L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class,
                () -> sprintService.getSprintsByTeam(99L));
        verify(sprintRepository, never()).findByTeamId(anyLong());
    }

    @Test
    @DisplayName("getSprintById: Lấy chi tiết Sprint theo ID thành công")
    void getSprintById_success() {
        when(sprintRepository.findById(10L)).thenReturn(Optional.of(activeSprint));

        SprintDto dto = sprintService.getSprintById(10L);

        assertNotNull(dto);
        assertEquals(10L, dto.getId());
        assertEquals("Sprint 5 - Chấm chéo ẩn danh & Báo cáo PDF", dto.getName());
    }

    @Test
    @DisplayName("getSprintById: Ném ResourceNotFoundException khi Sprint không tồn tại")
    void getSprintById_throwsNotFound() {
        when(sprintRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> sprintService.getSprintById(99L));
    }

    @Test
    @DisplayName("closeSprint: Đóng Sprint thành công, chuyển trạng thái sang CLOSED")
    void closeSprint_success() {
        when(sprintRepository.findById(10L)).thenReturn(Optional.of(activeSprint));
        when(sprintRepository.save(any(Sprint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SprintDto closed = sprintService.closeSprint(10L);

        assertNotNull(closed);
        assertEquals("CLOSED", closed.getStatus());
        verify(sprintRepository).save(activeSprint);
    }

    @Test
    @DisplayName("closeSprint: Ném ResourceNotFoundException khi Sprint cần đóng không tồn tại")
    void closeSprint_throwsNotFound() {
        when(sprintRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> sprintService.closeSprint(99L));
        verify(sprintRepository, never()).save(any());
    }

    @Test
    @DisplayName("createSprint (DEF-36): Ném BusinessException khi endDate trước startDate")
    void createSprint_throwsException_whenEndDateBeforeStartDate() {
        CreateSprintRequest invalidDates = new CreateSprintRequest();
        invalidDates.setName("Sprint ngày sai");
        invalidDates.setStartDate(LocalDate.of(2026, 11, 20));
        invalidDates.setEndDate(LocalDate.of(2026, 11, 15));

        assertThrows(BusinessException.class,
                () -> sprintService.createSprint(1L, invalidDates));
        verify(sprintRepository, never()).save(any());
    }

    @Test
    @DisplayName("getSprintsByTeam (DEF-35): Ném ForbiddenException khi người ngoài nhóm truy vấn")
    void getSprintsByTeam_throwsForbidden_whenNotMember() {
        when(teamRepository.existsById(1L)).thenReturn(true);
        when(teamMemberRepository.existsByTeamIdAndUserId(1L, 999L)).thenReturn(false);

        assertThrows(ForbiddenException.class,
                () -> sprintService.getSprintsByTeam(1L, 999L));
        verify(sprintRepository, never()).findByTeamId(anyLong());
    }
}
