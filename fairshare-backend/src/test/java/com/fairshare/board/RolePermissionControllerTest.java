package com.fairshare.board;

import com.fairshare.board.controller.BoardController;
import com.fairshare.board.dto.*;
import com.fairshare.board.service.BoardService;
import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.common.exception.GlobalExceptionHandler;
import com.fairshare.report.controller.ReportController;
import com.fairshare.report.service.PdfReportService;
import com.fairshare.sprint.controller.SprintController;
import com.fairshare.sprint.dto.CreateSprintRequest;
import com.fairshare.sprint.dto.SprintDto;
import com.fairshare.sprint.service.SprintService;
import com.fairshare.team.controller.TeamController;
import com.fairshare.team.service.MemberService;
import com.fairshare.team.service.TeamService;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Spring MVC Integration Tests: Role-Based Access Control (Leader vs Member) on APIs (M1)")
class RolePermissionControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private BoardService boardService;
    @Mock
    private SprintService sprintService;
    @Mock
    private PdfReportService pdfReportService;
    @Mock
    private TeamService teamService;
    @Mock
    private MemberService memberService;
    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication leaderAuth;
    @Mock
    private Authentication memberAuth;

    private User leaderUser;
    private User memberUser;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();

        leaderUser = new User();
        leaderUser.setId(1L);
        leaderUser.setEmail("leader@fairshare.com");
        leaderUser.setFullName("Leader User");

        memberUser = new User();
        memberUser.setId(2L);
        memberUser.setEmail("member@fairshare.com");
        memberUser.setFullName("Normal Member");

        lenient().when(leaderAuth.getName()).thenReturn("leader@fairshare.com");
        lenient().when(memberAuth.getName()).thenReturn("member@fairshare.com");

        lenient().when(userRepository.findByEmail("leader@fairshare.com")).thenReturn(Optional.of(leaderUser));
        lenient().when(userRepository.findByEmail("member@fairshare.com")).thenReturn(Optional.of(memberUser));

        BoardController boardController = new BoardController(boardService, userRepository);
        SprintController sprintController = new SprintController(sprintService, userRepository);
        ReportController reportController = new ReportController(pdfReportService, userRepository);
        TeamController teamController = new TeamController(teamService, memberService, sprintService, userRepository);

        mockMvc = MockMvcBuilders.standaloneSetup(boardController, sprintController, reportController, teamController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Nested
    @DisplayName("1. Quyền trên Board & Column: Leader vs Thành viên")
    class BoardAndColumnPermissionTests {

        @Test
        @DisplayName("POST /api/boards: Leader tạo bảng -> 201 Created")
        void testLeaderCanCreateBoardApi() throws Exception {
            CreateBoardRequest req = CreateBoardRequest.builder().teamId(10L).name("Sprint Board").build();
            BoardDto dto = BoardDto.builder().id(100L).name("Sprint Board").build();

            when(boardService.createBoard(any(), eq(1L))).thenReturn(dto);

            mockMvc.perform(post("/api/boards")
                            .principal(leaderAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("POST /api/boards: Thành viên tạo bảng -> 403 Forbidden")
        void testMemberCannotCreateBoardApi() throws Exception {
            CreateBoardRequest req = CreateBoardRequest.builder().teamId(10L).name("Unauthorized Board").build();

            when(boardService.createBoard(any(), eq(2L)))
                    .thenThrow(new ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền tạo bảng"));

            mockMvc.perform(post("/api/boards")
                            .principal(memberAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Chỉ nhóm trưởng (Leader) mới có quyền tạo bảng"));
        }

        @Test
        @DisplayName("PUT /api/boards/{id}: Thành viên sửa bảng -> 403 Forbidden")
        void testMemberCannotUpdateBoardApi() throws Exception {
            CreateBoardRequest req = CreateBoardRequest.builder().name("Renamed Board").build();

            when(boardService.updateBoard(eq(100L), any(), eq(2L)))
                    .thenThrow(new ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền chỉnh sửa thông tin bảng"));

            mockMvc.perform(put("/api/boards/100")
                            .principal(memberAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Chỉ nhóm trưởng (Leader) mới có quyền chỉnh sửa thông tin bảng"));
        }

        @Test
        @DisplayName("DELETE /api/boards/{id}: Thành viên xóa bảng -> 403 Forbidden")
        void testMemberCannotDeleteBoardApi() throws Exception {
            doThrow(new ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền xóa bảng"))
                    .when(boardService).deleteBoard(eq(100L), eq(2L));

            mockMvc.perform(delete("/api/boards/100")
                            .principal(memberAuth))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Chỉ nhóm trưởng (Leader) mới có quyền xóa bảng"));
        }

        @Test
        @DisplayName("POST /api/boards/{id}/columns: Leader thêm cột -> 201 Created")
        void testLeaderCanCreateColumnApi() throws Exception {
            CreateColumnRequest req = CreateColumnRequest.builder().name("Testing").build();
            BoardColumnDto col = BoardColumnDto.builder().id(205L).name("Testing").build();

            when(boardService.createColumn(eq(100L), any(), eq(1L))).thenReturn(col);

            mockMvc.perform(post("/api/boards/100/columns")
                            .principal(leaderAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("POST /api/boards/{id}/columns: Thành viên thêm cột -> 403 Forbidden")
        void testMemberCannotCreateColumnApi() throws Exception {
            CreateColumnRequest req = CreateColumnRequest.builder().name("Testing").build();

            when(boardService.createColumn(eq(100L), any(), eq(2L)))
                    .thenThrow(new ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền thêm cột vào bảng"));

            mockMvc.perform(post("/api/boards/100/columns")
                            .principal(memberAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Chỉ nhóm trưởng (Leader) mới có quyền thêm cột vào bảng"));
        }

        @Test
        @DisplayName("DELETE /api/boards/columns/{id}: Thành viên xóa cột -> 403 Forbidden")
        void testMemberCannotDeleteColumnApi() throws Exception {
            doThrow(new ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền xóa cột"))
                    .when(boardService).deleteColumn(eq(201L), eq(2L));

            mockMvc.perform(delete("/api/boards/columns/201")
                            .principal(memberAuth))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Chỉ nhóm trưởng (Leader) mới có quyền xóa cột"));
        }
    }

    @Nested
    @DisplayName("2. Quyền trên Card (Thẻ): Kéo thả, Sửa, Xóa")
    class CardPermissionTests {

        @Test
        @DisplayName("PUT /api/boards/cards/{id}/move: Thành viên di chuyển thẻ của mình -> 200 OK")
        void testMemberCanMoveOwnCardApi() throws Exception {
            MoveCardRequest req = MoveCardRequest.builder()
                    .targetColumnId(202L)
                    .fromColumnName("To Do")
                    .toColumnName("In Progress")
                    .build();

            CardDto card = CardDto.builder().id(500L).title("Member Task").build();
            when(boardService.moveCard(eq(500L), any(), eq(2L))).thenReturn(card);

            mockMvc.perform(put("/api/boards/cards/500/move")
                            .principal(memberAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("PUT /api/boards/cards/{id}/move: Thành viên di chuyển thẻ người khác -> 403 Forbidden")
        void testMemberCannotMoveOthersCardApi() throws Exception {
            MoveCardRequest req = MoveCardRequest.builder()
                    .targetColumnId(202L)
                    .fromColumnName("To Do")
                    .toColumnName("In Progress")
                    .build();

            when(boardService.moveCard(eq(501L), any(), eq(2L)))
                    .thenThrow(new ForbiddenException("Thành viên chỉ được phép sửa hoặc di chuyển thẻ được giao cho mình"));

            mockMvc.perform(put("/api/boards/cards/501/move")
                            .principal(memberAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Thành viên chỉ được phép sửa hoặc di chuyển thẻ được giao cho mình"));
        }

        @Test
        @DisplayName("PUT /api/boards/cards/{id}/move: Leader di chuyển bất kỳ thẻ nào -> 200 OK")
        void testLeaderCanMoveAnyCardApi() throws Exception {
            MoveCardRequest req = MoveCardRequest.builder()
                    .targetColumnId(204L)
                    .fromColumnName("In Progress")
                    .toColumnName("Done")
                    .build();

            CardDto card = CardDto.builder().id(501L).title("Any Task").build();
            when(boardService.moveCard(eq(501L), any(), eq(1L))).thenReturn(card);

            mockMvc.perform(put("/api/boards/cards/501/move")
                            .principal(leaderAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("PUT /api/boards/cards/{id}: Thành viên sửa thẻ người khác -> 403 Forbidden")
        void testMemberCannotUpdateOthersCardApi() throws Exception {
            UpdateCardRequest req = UpdateCardRequest.builder().title("Tampered Title").build();

            when(boardService.updateCard(eq(501L), any(), eq(2L)))
                    .thenThrow(new ForbiddenException("Thành viên chỉ được phép sửa hoặc di chuyển thẻ được giao cho mình"));

            mockMvc.perform(put("/api/boards/cards/501")
                            .principal(memberAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Thành viên chỉ được phép sửa hoặc di chuyển thẻ được giao cho mình"));
        }

        @Test
        @DisplayName("DELETE /api/boards/cards/{id}: Thành viên xóa thẻ người khác -> 403 Forbidden")
        void testMemberCannotDeleteOthersCardApi() throws Exception {
            doThrow(new ForbiddenException("Thành viên chỉ được phép sửa hoặc di chuyển thẻ được giao cho mình"))
                    .when(boardService).deleteCard(eq(501L), eq(2L));

            mockMvc.perform(delete("/api/boards/cards/501")
                            .principal(memberAuth))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Thành viên chỉ được phép sửa hoặc di chuyển thẻ được giao cho mình"));
        }
    }

    @Nested
    @DisplayName("3. Endpoint chung không bị chặn nhầm (Tạo thẻ, Comment, Checklist)")
    class CommonEndpointsTests {

        @Test
        @DisplayName("POST /api/boards/columns/{id}/cards: Thành viên tạo thẻ -> 201 Created (Không bị chặn)")
        void testMemberCanCreateCardApi() throws Exception {
            CreateCardRequest req = CreateCardRequest.builder().title("New Feature").storyPoints(2.0).build();
            CardDto card = CardDto.builder().id(505L).title("New Feature").build();

            when(boardService.createCard(eq(201L), any(), eq(2L))).thenReturn(card);

            mockMvc.perform(post("/api/boards/columns/201/cards")
                            .principal(memberAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("POST /api/boards/cards/{id}/comments: Thành viên bình luận thẻ -> 200 OK (Không bị chặn)")
        void testMemberCanAddCommentApi() throws Exception {
            AddCardCommentRequest req = AddCardCommentRequest.builder().content("Peer support comment").build();

            doNothing().when(boardService).addCardComment(eq(500L), any(), eq(2L));

            mockMvc.perform(post("/api/boards/cards/500/comments")
                            .principal(memberAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("POST /api/boards/cards/{id}/checklist-items: Thành viên đánh dấu checklist -> 200 OK")
        void testMemberCanCompleteChecklistItemApi() throws Exception {
            CompleteChecklistItemRequest req = CompleteChecklistItemRequest.builder().itemTitle("Code review").build();

            doNothing().when(boardService).completeChecklistItem(eq(500L), any(), eq(2L));

            mockMvc.perform(post("/api/boards/cards/500/checklist-items")
                            .principal(memberAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    @Nested
    @DisplayName("4. Quyền trên Mở/Đóng Đợt (Sprint) & Xuất Báo Cáo PDF: Chỉ Leader")
    class SprintAndReportPermissionTests {

        @Test
        @DisplayName("POST /api/teams/{teamId}/sprints: Leader mở đợt mới -> 201 Created")
        void testLeaderCanCreateSprintApi() throws Exception {
            SprintDto dto = SprintDto.builder().id(50L).teamId(10L).name("Sprint 5").status("ACTIVE").build();
            when(sprintService.createSprint(eq(10L), any(), eq(1L))).thenReturn(dto);

            mockMvc.perform(post("/api/teams/10/sprints")
                            .principal(leaderAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Sprint 5\",\"startDate\":\"2026-11-10\",\"endDate\":\"2026-11-24\"}"))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("POST /api/teams/{teamId}/sprints: Thành viên mở đợt -> 403 Forbidden")
        void testMemberCannotCreateSprintApi() throws Exception {
            when(sprintService.createSprint(eq(10L), any(), eq(2L)))
                    .thenThrow(new ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền tạo và mở đợt đánh giá (sprint)"));

            mockMvc.perform(post("/api/teams/10/sprints")
                            .principal(memberAuth)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"name\":\"Sprint 5\",\"startDate\":\"2026-11-10\",\"endDate\":\"2026-11-24\"}"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Chỉ nhóm trưởng (Leader) mới có quyền tạo và mở đợt đánh giá (sprint)"));
        }

        @Test
        @DisplayName("PUT /api/sprints/{id}/close: Leader đóng đợt -> 200 OK")
        void testLeaderCanCloseSprintApi() throws Exception {
            SprintDto dto = SprintDto.builder().id(50L).teamId(10L).name("Sprint 5").status("CLOSED").build();
            when(sprintService.closeSprint(eq(50L), eq(1L))).thenReturn(dto);

            mockMvc.perform(put("/api/sprints/50/close")
                            .principal(leaderAuth))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("PUT /api/sprints/{id}/close: Thành viên đóng đợt -> 403 Forbidden")
        void testMemberCannotCloseSprintApi() throws Exception {
            when(sprintService.closeSprint(eq(50L), eq(2L)))
                    .thenThrow(new ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền đóng đợt đánh giá (sprint)"));

            mockMvc.perform(put("/api/sprints/50/close")
                            .principal(memberAuth))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Chỉ nhóm trưởng (Leader) mới có quyền đóng đợt đánh giá (sprint)"));
        }

        @Test
        @DisplayName("GET /api/reports/teams/{teamId}/sprints/{sprintId}/pdf: Leader xuất báo cáo PDF -> 200 OK")
        void testLeaderCanExportPdfApi() throws Exception {
            byte[] dummyPdf = "%PDF-1.4 Leader Report".getBytes();
            when(pdfReportService.generateSprintReportPdf(eq(10L), eq(50L), eq(1L))).thenReturn(dummyPdf);

            mockMvc.perform(get("/api/reports/teams/10/sprints/50/pdf")
                            .principal(leaderAuth))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", "application/pdf"));
        }

        @Test
        @DisplayName("GET /api/reports/teams/{teamId}/sprints/{sprintId}/pdf: Thành viên xuất báo cáo PDF -> 403 Forbidden")
        void testMemberCannotExportPdfApi() throws Exception {
            when(pdfReportService.generateSprintReportPdf(eq(10L), eq(50L), eq(2L)))
                    .thenThrow(new ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền xuất báo cáo Sprint PDF"));

            mockMvc.perform(get("/api/reports/teams/10/sprints/50/pdf")
                            .principal(memberAuth))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Chỉ nhóm trưởng (Leader) mới có quyền xuất báo cáo Sprint PDF"));
        }
    }
}
