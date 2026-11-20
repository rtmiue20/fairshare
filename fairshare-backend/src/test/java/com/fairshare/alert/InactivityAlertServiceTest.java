package com.fairshare.alert;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.alert.dto.AlertDto;
import com.fairshare.alert.dto.CreateAlertRequest;
import com.fairshare.alert.dto.MemberInactivityDto;
import com.fairshare.alert.entity.Alert;
import com.fairshare.alert.repository.AlertRepository;
import com.fairshare.alert.service.InactivityAlertService;
import com.fairshare.board.entity.Board;
import com.fairshare.board.entity.BoardColumn;
import com.fairshare.board.entity.Card;
import com.fairshare.board.repository.CardRepository;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InactivityAlertServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private CardRepository cardRepository;

    @Mock
    private TeamMemberRepository teamMemberRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private ActivityEventRepository activityEventRepository;

    @InjectMocks
    private InactivityAlertService alertService;

    private Team mockTeam;
    private User mockUser;

    @BeforeEach
    void setUp() {
        mockTeam = new Team();
        mockTeam.setId(1L);
        mockTeam.setName("EduConnect");

        mockUser = new User();
        mockUser.setId(109L);
        mockUser.setFullName("Nguyễn Hoàng Nam");
        mockUser.setEmail("demo@fairshare.io");
    }

    @Test
    @DisplayName("Quét và tạo cảnh báo thẻ In Progress quá hạn chót (CR-04 Mức Đỏ)")
    void testScanOverdueCardAlert() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));

        Board mockBoard = new Board();
        mockBoard.setTeam(mockTeam);

        BoardColumn inProgressCol = new BoardColumn();
        inProgressCol.setName("In Progress");

        Card overdueCard = new Card();
        overdueCard.setId(101L);
        overdueCard.setTitle("Tích hợp API cổng thanh toán");
        overdueCard.setBoard(mockBoard);
        overdueCard.setColumn(inProgressCol);
        overdueCard.setAssignee(mockUser);
        overdueCard.setDueDate(LocalDateTime.now().minusDays(3));

        when(cardRepository.findByBoardTeamId(1L)).thenReturn(List.of(overdueCard));
        when(alertRepository.existsByTeamIdAndUserIdAndAlertTypeAndResolvedFalse(1L, 109L, "OVERDUE_TASK"))
                .thenReturn(false);

        alertService.scanRuleBasedAlerts(1L, 5);

        verify(alertRepository, times(1)).save(any(Alert.class));
    }

    @Test
    @DisplayName("Quét và tạo cảnh báo thành viên im lặng quá số ngày threshold (CR-04 Mức Vàng)")
    void testScanInactivityWarningAlert() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));
        when(cardRepository.findByBoardTeamId(1L)).thenReturn(List.of());

        TeamMember tm = new TeamMember();
        tm.setTeam(mockTeam);
        tm.setUser(mockUser);

        when(teamMemberRepository.findByTeamIdWithUser(1L)).thenReturn(List.of(tm));

        ActivityEvent oldEvent = new ActivityEvent();
        oldEvent.setOccurredAt(LocalDateTime.now().minusDays(6));
        when(activityEventRepository.findByTeamIdAndUserId(1L, 109L)).thenReturn(List.of(oldEvent));

        when(alertRepository.existsByTeamIdAndUserIdAndAlertTypeAndResolvedFalse(1L, 109L, "INACTIVITY_WARNING"))
                .thenReturn(false);

        alertService.scanRuleBasedAlerts(1L, 5);

        verify(alertRepository, times(1)).save(any(Alert.class));
    }

    @Test
    @DisplayName("Lấy danh sách inactivity breakdown của thành viên trong nhóm")
    void testGetMemberInactivity() {
        TeamMember tm = new TeamMember();
        tm.setTeam(mockTeam);
        tm.setUser(mockUser);

        when(teamMemberRepository.findByTeamIdWithUser(1L)).thenReturn(List.of(tm));

        ActivityEvent event = new ActivityEvent();
        event.setOccurredAt(LocalDateTime.now().minusDays(6));
        when(activityEventRepository.findByTeamIdAndUserId(1L, 109L)).thenReturn(List.of(event));

        List<MemberInactivityDto> list = alertService.getMemberInactivity(1L, 5);

        assertEquals(1, list.size());
        assertEquals("Nguyễn Hoàng Nam", list.get(0).getUserName());
        assertEquals(6L, list.get(0).getDaysInactive());
        assertTrue(list.get(0).isExceeded());
    }

    @Test
    @DisplayName("Đánh dấu giải quyết cảnh báo (Resolve Alert)")
    void testResolveAlert() {
        Alert alert = new Alert();
        alert.setId(99L);
        alert.setTeam(mockTeam);
        alert.setUser(mockUser);
        alert.setAlertType("OVERDUE_TASK");
        alert.setResolved(false);

        when(alertRepository.findById(99L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AlertDto result = alertService.resolveAlert(99L);

        assertTrue(result.isResolved());
        verify(alertRepository, times(1)).save(alert);
    }

    @Test
    @DisplayName("Quét và tạo cảnh báo công việc sắp trễ hạn chót (DUE_SOON_TASK - Warning)")
    void testScanDueSoonCardAlert() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));

        Board mockBoard = new Board();
        mockBoard.setTeam(mockTeam);

        BoardColumn inProgressCol = new BoardColumn();
        inProgressCol.setName("In Progress");

        Card dueSoonCard = new Card();
        dueSoonCard.setId(102L);
        dueSoonCard.setTitle("Kiểm thử tích hợp API");
        dueSoonCard.setBoard(mockBoard);
        dueSoonCard.setColumn(inProgressCol);
        dueSoonCard.setAssignee(mockUser);
        dueSoonCard.setDueDate(LocalDateTime.now().plusDays(1));

        when(cardRepository.findByBoardTeamId(1L)).thenReturn(List.of(dueSoonCard));
        when(alertRepository.existsByTeamIdAndUserIdAndAlertTypeAndResolvedFalse(1L, 109L, "DUE_SOON_TASK"))
                .thenReturn(false);

        alertService.scanRuleBasedAlerts(1L, 5);

        verify(alertRepository, times(1)).save(argThat(a ->
                "DUE_SOON_TASK".equals(a.getAlertType()) && "WARNING".equals(a.getSeverity())
        ));
    }

    @Test
    @DisplayName("Quét và tạo cảnh báo công việc To Do cần bắt đầu thực hiện (TASK_TODO - Info)")
    void testScanTodoCardAlert() {
        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));

        Board mockBoard = new Board();
        mockBoard.setTeam(mockTeam);

        BoardColumn todoCol = new BoardColumn();
        todoCol.setName("To Do");

        Card todoCard = new Card();
        todoCard.setId(103L);
        todoCard.setTitle("Thiết kế biểu đồ tiến độ");
        todoCard.setBoard(mockBoard);
        todoCard.setColumn(todoCol);
        todoCard.setAssignee(mockUser);
        todoCard.setDueDate(LocalDateTime.now().plusDays(6));

        when(cardRepository.findByBoardTeamId(1L)).thenReturn(List.of(todoCard));
        when(alertRepository.existsByTeamIdAndUserIdAndAlertTypeAndResolvedFalse(1L, 109L, "TASK_TODO"))
                .thenReturn(false);

        alertService.scanRuleBasedAlerts(1L, 5);

        verify(alertRepository, times(1)).save(argThat(a ->
                "TASK_TODO".equals(a.getAlertType()) && "INFO".equals(a.getSeverity())
        ));
    }

    @Test
    @DisplayName("Tạo cảnh báo thủ công theo mẫu (Info / Warning / Success / Error) kèm mô tả")
    void testCreateManualAlert() {
        TeamMember tm = new TeamMember();
        tm.setTeam(mockTeam);
        tm.setUser(mockUser);

        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));
        when(teamMemberRepository.findByTeamIdWithUser(1L)).thenReturn(List.of(tm));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> {
            Alert saved = invocation.getArgument(0);
            saved.setId(200L);
            return saved;
        });

        CreateAlertRequest req = CreateAlertRequest.builder()
                .userId(109L)
                .templateType("WARNING")
                .title("Nhắc nhở task sắp đến hạn")
                .message("Vui lòng cập nhật tiến độ task trước 18h hôm nay.")
                .taskTitle("API thanh toán")
                .senderName("Minh Triều")
                .senderRole("Nhóm trưởng")
                .build();

        AlertDto created = alertService.createManualAlert(1L, req);

        assertEquals(200L, created.getId());
        assertEquals("CUSTOM_WARNING", created.getAlertType());
        assertEquals("WARNING", created.getSeverity());
        assertTrue(created.getMessage().contains("[Nhắc nhở task sắp đến hạn]"));
        assertTrue(created.getMessage().contains("API thanh toán"));
        assertTrue(created.getMessage().contains("Nhóm trưởng (Minh Triều)"));
    }

    @Test
    @DisplayName("Tài khoản mới tạo chưa có hoạt động (events rỗng) tính 0 ngày im lặng và không tạo cảnh báo")
    void testNewAccountWithoutActivityHasZeroDaysInactive() {
        TeamMember tm = new TeamMember();
        tm.setTeam(mockTeam);
        tm.setUser(mockUser);

        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));
        when(cardRepository.findByBoardTeamId(1L)).thenReturn(List.of());
        when(teamMemberRepository.findByTeamIdWithUser(1L)).thenReturn(List.of(tm));
        when(activityEventRepository.findByTeamIdAndUserId(1L, 109L)).thenReturn(List.of());

        alertService.scanRuleBasedAlerts(1L, 5);
        verify(alertRepository, never()).save(any(Alert.class));

        List<MemberInactivityDto> list = alertService.getMemberInactivity(1L, 5);
        assertEquals(1, list.size());
        assertEquals(0L, list.get(0).getDaysInactive());
        assertFalse(list.get(0).isExceeded());
    }
}

