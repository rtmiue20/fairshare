package com.fairshare.board;

import com.fairshare.activity.service.ActivityService;
import com.fairshare.board.dto.*;
import com.fairshare.board.entity.Board;
import com.fairshare.board.entity.BoardColumn;
import com.fairshare.board.entity.Card;
import com.fairshare.board.repository.BoardColumnRepository;
import com.fairshare.board.repository.BoardRepository;
import com.fairshare.board.repository.CardRepository;
import com.fairshare.board.service.BoardService;
import com.fairshare.common.exception.BusinessException;
import com.fairshare.report.service.PdfReportService;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit tests for Role-Based Access Control (Leader vs Member) on Board & Report APIs (M1)")
class BoardPermissionTest {

    @Mock
    private BoardRepository boardRepository;
    @Mock
    private BoardColumnRepository columnRepository;
    @Mock
    private CardRepository cardRepository;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private ActivityService activityService;

    @InjectMocks
    private BoardService boardService;

    private Team team;
    private User leaderUser;
    private User memberUser1;
    private User memberUser2;
    private TeamMember leaderMember;
    private TeamMember normalMember1;
    private TeamMember normalMember2;
    private Board board;
    private BoardColumn colTodo;
    private BoardColumn colInProgress;
    private BoardColumn colReview;
    private BoardColumn colDone;

    @BeforeEach
    void setUp() {
        team = new Team();
        team.setId(10L);
        team.setName("FairShare Core Team");

        leaderUser = new User();
        leaderUser.setId(1L);
        leaderUser.setFullName("Team Leader");
        leaderUser.setEmail("leader@fairshare.com");

        memberUser1 = new User();
        memberUser1.setId(2L);
        memberUser1.setFullName("Member One");
        memberUser1.setEmail("member1@fairshare.com");

        memberUser2 = new User();
        memberUser2.setId(3L);
        memberUser2.setFullName("Member Two");
        memberUser2.setEmail("member2@fairshare.com");

        leaderMember = new TeamMember();
        leaderMember.setId(101L);
        leaderMember.setTeam(team);
        leaderMember.setUser(leaderUser);
        leaderMember.setRole(MemberRole.LEADER);

        normalMember1 = new TeamMember();
        normalMember1.setId(102L);
        normalMember1.setTeam(team);
        normalMember1.setUser(memberUser1);
        normalMember1.setRole(MemberRole.MEMBER);

        normalMember2 = new TeamMember();
        normalMember2.setId(103L);
        normalMember2.setTeam(team);
        normalMember2.setUser(memberUser2);
        normalMember2.setRole(MemberRole.MEMBER);

        board = new Board();
        board.setId(100L);
        board.setTeam(team);
        board.setName("Sprint 5 Board");

        colTodo = new BoardColumn();
        colTodo.setId(201L);
        colTodo.setBoard(board);
        colTodo.setName("To Do");
        colTodo.setPosition(0);

        colInProgress = new BoardColumn();
        colInProgress.setId(202L);
        colInProgress.setBoard(board);
        colInProgress.setName("In Progress");
        colInProgress.setPosition(1);

        colReview = new BoardColumn();
        colReview.setId(203L);
        colReview.setBoard(board);
        colReview.setName("Review");
        colReview.setPosition(2);

        colDone = new BoardColumn();
        colDone.setId(204L);
        colDone.setBoard(board);
        colDone.setName("Done");
        colDone.setPosition(3);
    }

    @Nested
    @DisplayName("1. Quyền trên Board (Tạo, Sửa, Xóa): Chỉ Leader")
    class BoardPermissionTests {

        @Test
        @DisplayName("Leader tạo bảng thành công")
        void testLeaderCanCreateBoard() {
            CreateBoardRequest req = CreateBoardRequest.builder()
                    .teamId(10L)
                    .name("New Sprint Board")
                    .build();

            when(teamRepository.findById(10L)).thenReturn(Optional.of(team));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 1L)).thenReturn(Optional.of(leaderMember));
            when(boardRepository.save(any(Board.class))).thenReturn(board);
            when(boardRepository.findById(100L)).thenReturn(Optional.of(board));
            when(columnRepository.findByBoardIdOrderByPositionAsc(100L)).thenReturn(List.of(colTodo));

            BoardDto dto = boardService.createBoard(req, 1L);
            assertNotNull(dto);
            verify(boardRepository).save(any(Board.class));
        }

        @Test
        @DisplayName("Thành viên thường tạo bảng -> Bị chặn với BusinessException")
        void testMemberCannotCreateBoard() {
            CreateBoardRequest req = CreateBoardRequest.builder()
                    .teamId(10L)
                    .name("Unauthorized Board")
                    .build();

            when(teamRepository.findById(10L)).thenReturn(Optional.of(team));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember1));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> boardService.createBoard(req, 2L));
            assertTrue(ex.getMessage().contains("Chỉ nhóm trưởng (Leader) mới có quyền tạo bảng"));
        }

        @Test
        @DisplayName("Leader cập nhật bảng thành công")
        void testLeaderCanUpdateBoard() {
            CreateBoardRequest req = CreateBoardRequest.builder()
                    .name("Updated Board Name")
                    .build();

            when(boardRepository.findById(100L)).thenReturn(Optional.of(board));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 1L)).thenReturn(Optional.of(leaderMember));
            when(boardRepository.save(any(Board.class))).thenReturn(board);

            BoardDto dto = boardService.updateBoard(100L, req, 1L);
            assertNotNull(dto);
        }

        @Test
        @DisplayName("Thành viên thường sửa bảng -> Bị chặn với BusinessException")
        void testMemberCannotUpdateBoard() {
            CreateBoardRequest req = CreateBoardRequest.builder()
                    .name("Hacked Board Name")
                    .build();

            when(boardRepository.findById(100L)).thenReturn(Optional.of(board));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember1));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> boardService.updateBoard(100L, req, 2L));
            assertTrue(ex.getMessage().contains("Chỉ nhóm trưởng (Leader) mới có quyền chỉnh sửa thông tin bảng"));
        }

        @Test
        @DisplayName("Leader xóa bảng thành công")
        void testLeaderCanDeleteBoard() {
            when(boardRepository.findById(100L)).thenReturn(Optional.of(board));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 1L)).thenReturn(Optional.of(leaderMember));

            boardService.deleteBoard(100L, 1L);
            verify(boardRepository).delete(board);
        }

        @Test
        @DisplayName("Thành viên thường xóa bảng -> Bị chặn với BusinessException")
        void testMemberCannotDeleteBoard() {
            when(boardRepository.findById(100L)).thenReturn(Optional.of(board));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember1));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> boardService.deleteBoard(100L, 2L));
            assertTrue(ex.getMessage().contains("Chỉ nhóm trưởng (Leader) mới có quyền xóa bảng"));
        }
    }

    @Nested
    @DisplayName("2. Quyền trên Cột (Tạo, Sửa, Xóa): Chỉ Leader")
    class ColumnPermissionTests {

        @Test
        @DisplayName("Leader thêm cột thành công")
        void testLeaderCanCreateColumn() {
            CreateColumnRequest req = CreateColumnRequest.builder().name("Testing").build();

            when(boardRepository.findById(100L)).thenReturn(Optional.of(board));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 1L)).thenReturn(Optional.of(leaderMember));
            when(columnRepository.save(any(BoardColumn.class))).thenReturn(colTodo);

            BoardColumnDto dto = boardService.createColumn(100L, req, 1L);
            assertNotNull(dto);
        }

        @Test
        @DisplayName("Thành viên thường thêm cột -> Bị chặn")
        void testMemberCannotCreateColumn() {
            CreateColumnRequest req = CreateColumnRequest.builder().name("Extra Column").build();

            when(boardRepository.findById(100L)).thenReturn(Optional.of(board));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember1));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> boardService.createColumn(100L, req, 2L));
            assertTrue(ex.getMessage().contains("Chỉ nhóm trưởng (Leader) mới có quyền thêm cột vào bảng"));
        }

        @Test
        @DisplayName("Leader sửa cột thành công")
        void testLeaderCanUpdateColumn() {
            CreateColumnRequest req = CreateColumnRequest.builder().name("Renamed Column").build();

            when(columnRepository.findById(201L)).thenReturn(Optional.of(colTodo));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 1L)).thenReturn(Optional.of(leaderMember));
            when(columnRepository.save(any(BoardColumn.class))).thenReturn(colTodo);

            BoardColumnDto dto = boardService.updateColumn(201L, req, 1L);
            assertNotNull(dto);
        }

        @Test
        @DisplayName("Thành viên thường sửa cột -> Bị chặn")
        void testMemberCannotUpdateColumn() {
            CreateColumnRequest req = CreateColumnRequest.builder().name("Renamed Column").build();

            when(columnRepository.findById(201L)).thenReturn(Optional.of(colTodo));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember1));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> boardService.updateColumn(201L, req, 2L));
            assertTrue(ex.getMessage().contains("Chỉ nhóm trưởng (Leader) mới có quyền chỉnh sửa cột"));
        }

        @Test
        @DisplayName("Thành viên thường xóa cột -> Bị chặn")
        void testMemberCannotDeleteColumn() {
            when(columnRepository.findById(201L)).thenReturn(Optional.of(colTodo));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember1));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> boardService.deleteColumn(201L, 2L));
            assertTrue(ex.getMessage().contains("Chỉ nhóm trưởng (Leader) mới có quyền xóa cột"));
        }
    }

    @Nested
    @DisplayName("3. Quyền trên Thẻ: Thành viên chỉ sửa/di chuyển thẻ của mình (Leader sửa được mọi thẻ)")
    class CardPermissionTests {

        private Card cardAssignedToMember1;
        private Card cardUnassigned;

        @BeforeEach
        void initCards() {
            cardAssignedToMember1 = new Card();
            cardAssignedToMember1.setId(500L);
            cardAssignedToMember1.setBoard(board);
            cardAssignedToMember1.setColumn(colTodo);
            cardAssignedToMember1.setTitle("Member 1 Task");
            cardAssignedToMember1.setAssignee(memberUser1);
            cardAssignedToMember1.setStoryPoints(3.0);
            cardAssignedToMember1.setDifficultyLevel(2);

            cardUnassigned = new Card();
            cardUnassigned.setId(501L);
            cardUnassigned.setBoard(board);
            cardUnassigned.setColumn(colTodo);
            cardUnassigned.setTitle("Unassigned Task");
            cardUnassigned.setAssignee(null);
            cardUnassigned.setStoryPoints(2.0);
            cardUnassigned.setDifficultyLevel(1);
        }

        @Test
        @DisplayName("Thành viên di chuyển thẻ của chính mình -> Thành công")
        void testMemberCanMoveOwnCard() {
            MoveCardRequest moveReq = MoveCardRequest.builder()
                    .targetColumnId(202L)
                    .fromColumnName("To Do")
                    .toColumnName("In Progress")
                    .build();

            when(cardRepository.findById(500L)).thenReturn(Optional.of(cardAssignedToMember1));
            when(columnRepository.findById(202L)).thenReturn(Optional.of(colInProgress));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember1));
            when(cardRepository.save(any(Card.class))).thenReturn(cardAssignedToMember1);
            when(userRepository.findById(2L)).thenReturn(Optional.of(memberUser1));
            when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

            CardDto dto = boardService.moveCard(500L, moveReq, 2L);
            assertNotNull(dto);
        }

        @Test
        @DisplayName("Thành viên di chuyển thẻ chưa gán (unassigned) -> Thành công")
        void testMemberCanMoveUnassignedCard() {
            MoveCardRequest moveReq = MoveCardRequest.builder()
                    .targetColumnId(202L)
                    .fromColumnName("To Do")
                    .toColumnName("In Progress")
                    .build();

            when(cardRepository.findById(501L)).thenReturn(Optional.of(cardUnassigned));
            when(columnRepository.findById(202L)).thenReturn(Optional.of(colInProgress));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember1));
            when(cardRepository.save(any(Card.class))).thenReturn(cardUnassigned);
            when(userRepository.findById(2L)).thenReturn(Optional.of(memberUser1));
            when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

            CardDto dto = boardService.moveCard(501L, moveReq, 2L);
            assertNotNull(dto);
        }

        @Test
        @DisplayName("Thành viên khác cố di chuyển thẻ của Member 1 sang In Progress -> Bị chặn")
        void testMemberCannotMoveAnotherMembersCard() {
            MoveCardRequest moveReq = MoveCardRequest.builder()
                    .targetColumnId(202L)
                    .fromColumnName("To Do")
                    .toColumnName("In Progress")
                    .build();

            when(cardRepository.findById(500L)).thenReturn(Optional.of(cardAssignedToMember1));
            when(columnRepository.findById(202L)).thenReturn(Optional.of(colInProgress));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 3L)).thenReturn(Optional.of(normalMember2));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> boardService.moveCard(500L, moveReq, 3L));
            assertTrue(ex.getMessage().contains("Thành viên chỉ được phép sửa hoặc di chuyển thẻ được giao cho mình"));
        }

        @Test
        @DisplayName("Thành viên khác kéo thẻ sang cột Review để đánh giá chéo -> Được phép (Ngoại lệ Review)")
        void testMemberCanMoveAnotherMembersCardToReview() {
            MoveCardRequest moveReq = MoveCardRequest.builder()
                    .targetColumnId(203L)
                    .fromColumnName("In Progress")
                    .toColumnName("Review")
                    .build();

            when(cardRepository.findById(500L)).thenReturn(Optional.of(cardAssignedToMember1));
            when(columnRepository.findById(203L)).thenReturn(Optional.of(colReview));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 3L)).thenReturn(Optional.of(normalMember2));
            when(cardRepository.save(any(Card.class))).thenReturn(cardAssignedToMember1);
            when(userRepository.findById(3L)).thenReturn(Optional.of(memberUser2));
            when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

            CardDto dto = boardService.moveCard(500L, moveReq, 3L);
            assertNotNull(dto);
        }

        @Test
        @DisplayName("Leader di chuyển thẻ của bất kỳ ai sang bất kỳ cột nào -> Luôn thành công")
        void testLeaderCanMoveAnyCard() {
            MoveCardRequest moveReq = MoveCardRequest.builder()
                    .targetColumnId(204L)
                    .fromColumnName("In Progress")
                    .toColumnName("Done")
                    .build();

            when(cardRepository.findById(500L)).thenReturn(Optional.of(cardAssignedToMember1));
            when(columnRepository.findById(204L)).thenReturn(Optional.of(colDone));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 1L)).thenReturn(Optional.of(leaderMember));
            when(cardRepository.save(any(Card.class))).thenReturn(cardAssignedToMember1);
            when(userRepository.findById(1L)).thenReturn(Optional.of(leaderUser));
            when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

            CardDto dto = boardService.moveCard(500L, moveReq, 1L);
            assertNotNull(dto);
        }

        @Test
        @DisplayName("Thành viên khác cố sửa thông tin thẻ của Member 1 -> Bị chặn")
        void testMemberCannotUpdateAnotherMembersCard() {
            UpdateCardRequest req = UpdateCardRequest.builder().title("Tampered Title").build();

            when(cardRepository.findById(500L)).thenReturn(Optional.of(cardAssignedToMember1));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 3L)).thenReturn(Optional.of(normalMember2));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> boardService.updateCard(500L, req, 3L));
            assertTrue(ex.getMessage().contains("Thành viên chỉ được phép sửa hoặc di chuyển thẻ được giao cho mình"));
        }

        @Test
        @DisplayName("Thành viên khác cố xóa thẻ của Member 1 -> Bị chặn")
        void testMemberCannotDeleteAnotherMembersCard() {
            when(cardRepository.findById(500L)).thenReturn(Optional.of(cardAssignedToMember1));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 3L)).thenReturn(Optional.of(normalMember2));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> boardService.deleteCard(500L, 3L));
            assertTrue(ex.getMessage().contains("Thành viên chỉ được phép sửa hoặc di chuyển thẻ được giao cho mình"));
        }

        @Test
        @DisplayName("Leader xóa thẻ của bất kỳ thành viên nào -> Thành công")
        void testLeaderCanDeleteAnyCard() {
            when(cardRepository.findById(500L)).thenReturn(Optional.of(cardAssignedToMember1));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 1L)).thenReturn(Optional.of(leaderMember));

            boardService.deleteCard(500L, 1L);
            verify(cardRepository).delete(cardAssignedToMember1);
        }

        @Test
        @DisplayName("Người ngoài không thuộc nhóm cố thao tác thẻ -> Báo lỗi không phải thành viên")
        void testNonMemberCannotAccessCard() {
            when(cardRepository.findById(500L)).thenReturn(Optional.of(cardAssignedToMember1));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 999L)).thenReturn(Optional.empty());

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> boardService.deleteCard(500L, 999L));
            assertTrue(ex.getMessage().contains("Bạn không phải là thành viên của nhóm này"));
        }
    }

    @Nested
    @DisplayName("4. Endpoint thành viên không bị chặn nhầm (Create card, Comment, Checklist)")
    class MemberNonBlockedEndpointsTests {

        @Test
        @DisplayName("Bất kỳ thành viên nào trong team đều có thể tạo thẻ mới")
        void testAnyMemberCanCreateCard() {
            CreateCardRequest req = CreateCardRequest.builder()
                    .title("New Feature")
                    .storyPoints(2.0)
                    .build();

            when(columnRepository.findById(201L)).thenReturn(Optional.of(colTodo));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 2L)).thenReturn(Optional.of(normalMember1));
            when(cardRepository.findByColumnIdOrderByPositionAsc(201L)).thenReturn(Collections.emptyList());

            Card saved = new Card();
            saved.setId(505L);
            saved.setBoard(board);
            saved.setColumn(colTodo);
            saved.setTitle("New Feature");
            saved.setStoryPoints(2.0);

            when(cardRepository.save(any(Card.class))).thenReturn(saved);
            when(userRepository.findById(2L)).thenReturn(Optional.of(memberUser1));
            when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

            CardDto created = boardService.createCard(201L, req, 2L);
            assertNotNull(created);
            assertEquals("New Feature", created.getTitle());
        }

        @Test
        @DisplayName("Thành viên bình luận trên thẻ của người khác -> Thành công")
        void testMemberCanCommentOnAnyCard() {
            Card card = new Card();
            card.setId(500L);
            card.setBoard(board);
            card.setTitle("Card Title");
            card.setAssignee(memberUser1);

            AddCardCommentRequest commentReq = AddCardCommentRequest.builder()
                    .content("Great job on this feature!")
                    .build();

            when(cardRepository.findById(500L)).thenReturn(Optional.of(card));
            when(userRepository.findById(3L)).thenReturn(Optional.of(memberUser2));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 3L)).thenReturn(Optional.of(normalMember2));
            when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

            assertDoesNotThrow(() -> boardService.addCardComment(500L, commentReq, 3L));
        }

        @Test
        @DisplayName("Thành viên hoàn thành checklist item -> Thành công")
        void testMemberCanCompleteChecklistItem() {
            Card card = new Card();
            card.setId(500L);
            card.setBoard(board);
            card.setTitle("Card Title");
            card.setAssignee(memberUser1);

            CompleteChecklistItemRequest req = CompleteChecklistItemRequest.builder()
                    .itemTitle("Write unit tests")
                    .build();

            when(cardRepository.findById(500L)).thenReturn(Optional.of(card));
            when(userRepository.findById(3L)).thenReturn(Optional.of(memberUser2));
            when(teamMemberRepository.findByTeamIdAndUserId(10L, 3L)).thenReturn(Optional.of(normalMember2));
            when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

            assertDoesNotThrow(() -> boardService.completeChecklistItem(500L, req, 3L));
        }
    }
}
