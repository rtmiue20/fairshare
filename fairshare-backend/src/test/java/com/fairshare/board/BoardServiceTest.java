package com.fairshare.board;

import com.fairshare.activity.entity.ActivitySource;
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
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.Team;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
@DisplayName("Unit tests for BoardService & ActivityEvent Generation (M1)")
class BoardServiceTest {

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

    private Team sampleTeam;
    private User sampleUser;
    private Board sampleBoard;
    private BoardColumn colTodo;
    private BoardColumn colInProgress;
    private BoardColumn colDone;

    @BeforeEach
    void setUp() {
        sampleTeam = new Team();
        sampleTeam.setId(10L);
        sampleTeam.setName("Team FairShare");

        sampleUser = new User();
        sampleUser.setId(100L);
        sampleUser.setEmail("dev@fairshare.com");
        sampleUser.setFullName("Developer");

        sampleBoard = new Board();
        sampleBoard.setId(1L);
        sampleBoard.setTeam(sampleTeam);
        sampleBoard.setName("Sprint 3 Board");

        colTodo = new BoardColumn();
        colTodo.setId(11L);
        colTodo.setBoard(sampleBoard);
        colTodo.setName("To Do");
        colTodo.setPosition(0);

        colInProgress = new BoardColumn();
        colInProgress.setId(14L);
        colInProgress.setBoard(sampleBoard);
        colInProgress.setName("In Progress");
        colInProgress.setPosition(1);

        colDone = new BoardColumn();
        colDone.setId(12L);
        colDone.setBoard(sampleBoard);
        colDone.setName("Done");
        colDone.setPosition(3);
    }

    @Test
    @DisplayName("Creating a board auto-creates 4 standard columns")
    void testCreateBoardInitializesColumns() {
        CreateBoardRequest req = CreateBoardRequest.builder()
                .teamId(10L)
                .name("Sprint 3 Board")
                .description("Board description")
                .build();

        when(teamRepository.findById(10L)).thenReturn(Optional.of(sampleTeam));
        when(boardRepository.save(any(Board.class))).thenReturn(sampleBoard);
        when(boardRepository.findById(1L)).thenReturn(Optional.of(sampleBoard));
        when(columnRepository.findByBoardIdOrderByPositionAsc(1L)).thenReturn(List.of(colTodo, colDone));

        var dto = boardService.createBoard(req);

        assertNotNull(dto);
        assertEquals("Sprint 3 Board", dto.getName());
        verify(columnRepository, times(4)).save(any(BoardColumn.class));
    }

    @Test
    @DisplayName("Creating a card logs a CARD_CREATED ActivityEvent")
    void testCreateCardLogsActivityEvent() {
        CreateCardRequest req = CreateCardRequest.builder()
                .title("Implement JWT")
                .description("Add JWT security filter")
                .assigneeId(100L)
                .storyPoints(3.0)
                .build();

        when(columnRepository.findById(11L)).thenReturn(Optional.of(colTodo));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(cardRepository.findByColumnIdOrderByPositionAsc(11L)).thenReturn(Collections.emptyList());

        Card savedCard = new Card();
        savedCard.setId(50L);
        savedCard.setBoard(sampleBoard);
        savedCard.setColumn(colTodo);
        savedCard.setTitle("Implement JWT");
        savedCard.setAssignee(sampleUser);
        savedCard.setStoryPoints(3.0);

        when(cardRepository.save(any(Card.class))).thenReturn(savedCard);
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        var dto = boardService.createCard(11L, req, 100L);

        assertNotNull(dto);
        assertEquals("Implement JWT", dto.getTitle());
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_CREATED"),
                contains("Implement JWT"),
                any(),
                isNull(),
                eq(3.0),
                isNull()
        );
    }

    @Test
    @DisplayName("Moving a card to Done before dueDate logs CARD_COMPLETED with ON_TIME status and 0.0 delay")
    void testMoveCardToDoneLogsCardCompleted() {
        Card card = new Card();
        card.setId(50L);
        card.setBoard(sampleBoard);
        card.setColumn(colTodo);
        card.setTitle("Implement JWT");
        card.setAssignee(sampleUser);
        card.setStoryPoints(3.0);
        card.setDifficultyLevel(2);
        card.setDueDate(LocalDateTime.now().plusDays(2)); // before dueDate -> on-time

        MoveCardRequest moveReq = MoveCardRequest.builder()
                .targetColumnId(12L) // colDone
                .position(0)
                .build();

        when(cardRepository.findById(50L)).thenReturn(Optional.of(card));
        when(columnRepository.findById(12L)).thenReturn(Optional.of(colDone));
        when(cardRepository.save(any(Card.class))).thenReturn(card);
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        var result = boardService.moveCard(50L, moveReq, 100L);

        assertNotNull(result);
        ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_COMPLETED"),
                detailsCaptor.capture(),
                any(),
                isNull(),
                eq(3.0),
                eq(2),
                eq(true), // isOnTime = true
                eq(0.0),  // delayDays = 0.0
                eq(false),
                eq(false),
                eq(false)
        );
        assertTrue(detailsCaptor.getValue().contains("Completed card 'Implement JWT'"));
        assertTrue(detailsCaptor.getValue().contains("[ON_TIME]"));
    }

    @Test
    @DisplayName("Moving a card to Done after dueDate logs CARD_COMPLETED with LATE status and positive delayDays")
    void testMoveCardToDoneAfterDueDateLogsLateCardCompleted() {
        Card card = new Card();
        card.setId(55L);
        card.setBoard(sampleBoard);
        card.setColumn(colInProgress);
        card.setTitle("Fix Payment Gateway");
        card.setAssignee(sampleUser);
        card.setStoryPoints(5.0);
        card.setDifficultyLevel(3);
        card.setDueDate(LocalDateTime.now().minusDays(2)); // past dueDate -> LATE

        MoveCardRequest moveReq = MoveCardRequest.builder()
                .targetColumnId(12L) // colDone
                .position(0)
                .fromColumnName("In Progress")
                .toColumnName("Done")
                .build();

        when(cardRepository.findById(55L)).thenReturn(Optional.of(card));
        when(columnRepository.findById(12L)).thenReturn(Optional.of(colDone));
        when(cardRepository.save(any(Card.class))).thenReturn(card);
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        var result = boardService.moveCard(55L, moveReq, 100L);

        assertNotNull(result);
        ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Double> delayCaptor = ArgumentCaptor.forClass(Double.class);
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_COMPLETED"),
                detailsCaptor.capture(),
                any(),
                isNull(),
                eq(5.0),
                eq(3),
                eq(false), // isOnTime = false (LATE)
                delayCaptor.capture(),
                eq(false),
                eq(false),
                eq(false)
        );
        assertTrue(detailsCaptor.getValue().contains("Completed card 'Fix Payment Gateway'"));
        assertTrue(detailsCaptor.getValue().contains("[LATE]"));
        assertTrue(delayCaptor.getValue() >= 1.9, "Expected delayDays >= 1.9 days, got: " + delayCaptor.getValue());
    }

    @Test
    @DisplayName("Moving a card to Done without dueDate defaults to ON_TIME status")
    void testMoveCardToDoneWithoutDueDateDefaultsToOnTime() {
        Card card = new Card();
        card.setId(56L);
        card.setBoard(sampleBoard);
        card.setColumn(colTodo);
        card.setTitle("Setup CI Pipeline");
        card.setAssignee(sampleUser);
        card.setStoryPoints(2.0);
        card.setDifficultyLevel(1);
        card.setDueDate(null); // no due date

        MoveCardRequest moveReq = MoveCardRequest.builder()
                .targetColumnId(12L) // colDone
                .position(0)
                .build();

        when(cardRepository.findById(56L)).thenReturn(Optional.of(card));
        when(columnRepository.findById(12L)).thenReturn(Optional.of(colDone));
        when(cardRepository.save(any(Card.class))).thenReturn(card);
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        boardService.moveCard(56L, moveReq, 100L);

        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_COMPLETED"),
                contains("[ON_TIME]"),
                any(),
                isNull(),
                eq(2.0),
                eq(1),
                eq(true),
                eq(0.0),
                eq(false),
                eq(false),
                eq(false)
        );
    }

    @Test
    @DisplayName("Moving card from Done back to another column logs CARD_REOPENED (Rework)")
    void testMoveCardFromDoneLogsRework() {
        Card card = new Card();
        card.setId(51L);
        card.setBoard(sampleBoard);
        card.setColumn(colDone);
        card.setTitle("Refactor Auth");
        card.setAssignee(sampleUser);
        card.setStoryPoints(4.0);

        MoveCardRequest moveReq = MoveCardRequest.builder()
                .targetColumnId(11L) // colTodo
                .position(0)
                .fromColumnName("Done")
                .toColumnName("To Do")
                .build();

        when(cardRepository.findById(51L)).thenReturn(Optional.of(card));
        when(columnRepository.findById(11L)).thenReturn(Optional.of(colTodo));
        when(cardRepository.save(any(Card.class))).thenReturn(card);
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        var result = boardService.moveCard(51L, moveReq, 100L);

        assertNotNull(result);
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_REOPENED"),
                contains("Rework: Card 'Refactor Auth' reopened"),
                any(),
                isNull(),
                eq(4.0),
                eq(2),
                isNull(),
                eq(0.0),
                eq(false),
                eq(false),
                eq(false)
        );
    }

    @Test
    @DisplayName("Moving card between non-Done columns logs CARD_MOVED with source and target column names")
    void testMoveCardBetweenNormalColumnsLogsCardMoved() {
        Card card = new Card();
        card.setId(57L);
        card.setBoard(sampleBoard);
        card.setColumn(colTodo);
        card.setTitle("Build Kanban UI");
        card.setAssignee(sampleUser);
        card.setStoryPoints(3.0);

        MoveCardRequest moveReq = MoveCardRequest.builder()
                .targetColumnId(14L) // colInProgress
                .position(0)
                .fromColumnName("To Do")
                .toColumnName("In Progress")
                .build();

        when(cardRepository.findById(57L)).thenReturn(Optional.of(card));
        when(columnRepository.findById(14L)).thenReturn(Optional.of(colInProgress));
        when(cardRepository.save(any(Card.class))).thenReturn(card);
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        var result = boardService.moveCard(57L, moveReq, 100L);

        assertNotNull(result);
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_MOVED"),
                contains("Moved card 'Build Kanban UI' from 'To Do' to 'In Progress'"),
                any(),
                isNull(),
                eq(3.0),
                isNull()
        );
    }

    @Test
    @DisplayName("Moving card to Review by a different member logs REVIEW_CARD")
    void testMoveCardToReviewByOtherMemberLogsReviewCard() {
        BoardColumn colReview = new BoardColumn();
        colReview.setId(13L);
        colReview.setBoard(sampleBoard);
        colReview.setName("Review");
        colReview.setPosition(2);

        User reviewer = new User();
        reviewer.setId(200L);
        reviewer.setFullName("Reviewer User");

        Card card = new Card();
        card.setId(52L);
        card.setBoard(sampleBoard);
        card.setColumn(colTodo);
        card.setTitle("Security Patch");
        card.setAssignee(sampleUser); // assignee is 100L
        card.setStoryPoints(2.0);

        MoveCardRequest moveReq = MoveCardRequest.builder()
                .targetColumnId(13L)
                .position(0)
                .fromColumnName("To Do")
                .toColumnName("Review")
                .build();

        when(cardRepository.findById(52L)).thenReturn(Optional.of(card));
        when(columnRepository.findById(13L)).thenReturn(Optional.of(colReview));
        when(cardRepository.save(any(Card.class))).thenReturn(card);
        when(userRepository.findById(200L)).thenReturn(Optional.of(reviewer)); // actor is 200L
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        var result = boardService.moveCard(52L, moveReq, 200L);

        assertNotNull(result);
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(reviewer),
                eq(ActivitySource.BOARD),
                eq("REVIEW_CARD"),
                contains("reviewed card 'Security Patch'"),
                any(),
                isNull(),
                eq(2.0),
                eq(2),
                isNull(),
                eq(0.0),
                eq(false),
                eq(false),
                eq(true) // isReviewForOthers = true
        );
    }

    @Test
    @DisplayName("Updating card assignee succeeds when user is member of the team and logs old -> new assignee")
    void testUpdateAssigneeSuccess() {
        Card card = new Card();
        card.setId(50L);
        card.setBoard(sampleBoard);
        card.setColumn(colTodo);
        card.setTitle("Implement JWT");
        card.setStoryPoints(3.0);

        UpdateAssigneeRequest request = UpdateAssigneeRequest.builder()
                .assigneeId(100L)
                .build();

        when(cardRepository.findById(50L)).thenReturn(Optional.of(card));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(teamMemberRepository.existsByTeamIdAndUserId(10L, 100L)).thenReturn(true);
        when(cardRepository.save(any(Card.class))).thenReturn(card);
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        var dto = boardService.updateAssignee(50L, request, 100L);

        assertNotNull(dto);
        assertEquals(100L, dto.getAssigneeId());
        ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_ASSIGNEE_UPDATED"),
                detailsCaptor.capture(),
                any(),
                isNull(),
                eq(3.0),
                isNull()
        );
        assertTrue(detailsCaptor.getValue().contains("Assigned card 'Implement JWT' to 'Developer'"));
        assertTrue(detailsCaptor.getValue().contains("from 'Unassigned' -> 'Developer'"));
    }

    @Test
    @DisplayName("Updating card assignee throws BusinessException when user does not belong to team")
    void testUpdateAssigneeFailsWhenUserNotMemberOfTeam() {
        Card card = new Card();
        card.setId(50L);
        card.setBoard(sampleBoard);
        card.setColumn(colTodo);
        card.setTitle("Implement JWT");

        User outsider = new User();
        outsider.setId(200L);
        outsider.setFullName("Outsider");

        UpdateAssigneeRequest request = UpdateAssigneeRequest.builder()
                .assigneeId(200L)
                .build();

        when(cardRepository.findById(50L)).thenReturn(Optional.of(card));
        when(userRepository.findById(200L)).thenReturn(Optional.of(outsider));
        when(teamMemberRepository.existsByTeamIdAndUserId(10L, 200L)).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                boardService.updateAssignee(50L, request, 100L));

        assertTrue(ex.getMessage().contains("Người phụ trách phải thuộc nhóm"));
        verify(cardRepository, never()).save(any());
    }

    @Test
    @DisplayName("Updating card assignee throws BusinessException when assigneeId is null")
    void testUpdateAssigneeFailsWhenAssigneeIdNull() {
        UpdateAssigneeRequest request = UpdateAssigneeRequest.builder()
                .assigneeId(null)
                .build();

        assertThrows(BusinessException.class, () ->
                boardService.updateAssignee(50L, request, 100L));
    }

    @Test
    @DisplayName("Updating story points succeeds when value is positive integer and logs old -> new value")
    void testUpdateStoryPointsSuccess() {
        Card card = new Card();
        card.setId(50L);
        card.setBoard(sampleBoard);
        card.setColumn(colTodo);
        card.setTitle("Implement JWT");
        card.setAssignee(sampleUser);
        card.setStoryPoints(3.0);

        UpdateStoryPointsRequest request = UpdateStoryPointsRequest.builder()
                .storyPoints(5.0)
                .build();

        when(cardRepository.findById(50L)).thenReturn(Optional.of(card));
        when(cardRepository.save(any(Card.class))).thenReturn(card);
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        var dto = boardService.updateStoryPoints(50L, request, 100L);

        assertNotNull(dto);
        assertEquals(5.0, dto.getStoryPoints());
        ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_STORY_POINTS_UPDATED"),
                detailsCaptor.capture(),
                any(),
                isNull(),
                eq(5.0),
                isNull()
        );
        assertTrue(detailsCaptor.getValue().contains("Updated story points for card 'Implement JWT' to 5"));
        assertTrue(detailsCaptor.getValue().contains("from 3 -> 5"));
    }

    @Test
    @DisplayName("Updating story points throws BusinessException when value is zero or negative")
    void testUpdateStoryPointsFailsWhenZeroOrNegative() {
        UpdateStoryPointsRequest zeroReq = UpdateStoryPointsRequest.builder().storyPoints(0.0).build();
        UpdateStoryPointsRequest negReq = UpdateStoryPointsRequest.builder().storyPoints(-2.0).build();

        assertThrows(BusinessException.class, () -> boardService.updateStoryPoints(50L, zeroReq, 100L));
        assertThrows(BusinessException.class, () -> boardService.updateStoryPoints(50L, negReq, 100L));
    }

    @Test
    @DisplayName("Updating story points throws BusinessException when value is decimal")
    void testUpdateStoryPointsFailsWhenDecimal() {
        UpdateStoryPointsRequest decimalReq = UpdateStoryPointsRequest.builder().storyPoints(2.5).build();

        assertThrows(BusinessException.class, () -> boardService.updateStoryPoints(50L, decimalReq, 100L));
    }

    @Test
    @DisplayName("Updating due date succeeds when valid LocalDateTime is passed and logs old -> new due date")
    void testUpdateDueDateSuccess() {
        Card card = new Card();
        card.setId(50L);
        card.setBoard(sampleBoard);
        card.setColumn(colTodo);
        card.setTitle("Implement JWT");
        card.setAssignee(sampleUser);
        card.setStoryPoints(3.0);

        LocalDateTime due = LocalDateTime.now().plusDays(5);
        UpdateDueDateRequest request = UpdateDueDateRequest.builder()
                .dueDate(due)
                .build();

        when(cardRepository.findById(50L)).thenReturn(Optional.of(card));
        when(cardRepository.save(any(Card.class))).thenReturn(card);
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        var dto = boardService.updateDueDate(50L, request, 100L);

        assertNotNull(dto);
        assertEquals(due, dto.getDueDate());
        ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_DUE_DATE_UPDATED"),
                detailsCaptor.capture(),
                any(),
                isNull(),
                eq(3.0),
                isNull()
        );
        assertTrue(detailsCaptor.getValue().contains("Updated due date for card 'Implement JWT' to"));
        assertTrue(detailsCaptor.getValue().contains("from none ->"));
    }

    @Test
    @DisplayName("Updating due date throws BusinessException when dueDate is null")
    void testUpdateDueDateFailsWhenNull() {
        UpdateDueDateRequest request = UpdateDueDateRequest.builder().dueDate(null).build();

        assertThrows(BusinessException.class, () -> boardService.updateDueDate(50L, request, 100L));
    }

    @Test
    @DisplayName("Updating card details via updateCard logs assignee, story points, and due date change events")
    void testUpdateCardLogsGranularActivityEvents() {
        Card card = new Card();
        card.setId(60L);
        card.setBoard(sampleBoard);
        card.setColumn(colTodo);
        card.setTitle("Full Update Card");
        card.setStoryPoints(2.0);
        card.setDueDate(null);

        LocalDateTime newDue = LocalDateTime.now().plusDays(3);
        UpdateCardRequest req = UpdateCardRequest.builder()
                .assigneeId(100L)
                .storyPoints(8.0)
                .dueDate(newDue)
                .difficultyLevel(3)
                .build();

        when(cardRepository.findById(60L)).thenReturn(Optional.of(card));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(teamMemberRepository.existsByTeamIdAndUserId(10L, 100L)).thenReturn(true);
        when(cardRepository.save(any(Card.class))).thenReturn(card);
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        var dto = boardService.updateCard(60L, req, 100L);

        assertNotNull(dto);
        assertEquals(100L, dto.getAssigneeId());
        assertEquals(8.0, dto.getStoryPoints());
        assertEquals(newDue, dto.getDueDate());

        verify(activityService, times(1)).logActivity(
                eq(sampleTeam), eq(sampleUser), eq(ActivitySource.BOARD),
                eq("CARD_ASSIGNEE_UPDATED"), contains("from 'Unassigned' -> 'Developer'"),
                any(), isNull(), eq(8.0), isNull());
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam), eq(sampleUser), eq(ActivitySource.BOARD),
                eq("CARD_STORY_POINTS_UPDATED"), contains("from 2 -> 8"),
                any(), isNull(), eq(8.0), isNull());
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam), eq(sampleUser), eq(ActivitySource.BOARD),
                eq("CARD_DUE_DATE_UPDATED"), contains("from none ->"),
                any(), isNull(), eq(8.0), isNull());
    }

    @Test
    @DisplayName("Adding card comment logs COMMENT_ADDED and SUPPORT_MENTION if @username is in text")
    void testAddCardCommentLogsCommentAndMention() {
        Card card = new Card();
        card.setId(50L);
        card.setBoard(sampleBoard);
        card.setTitle("Implement API");

        User mentionedUser = new User();
        mentionedUser.setId(300L);
        mentionedUser.setEmail("alex@fairshare.com");
        mentionedUser.setFullName("Alex Member");

        com.fairshare.team.entity.TeamMember tm = new com.fairshare.team.entity.TeamMember();
        tm.setUser(mentionedUser);

        when(cardRepository.findById(50L)).thenReturn(Optional.of(card));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());
        when(teamMemberRepository.findByTeamId(10L)).thenReturn(List.of(tm));

        AddCardCommentRequest req = AddCardCommentRequest.builder()
                .content("Thanks @alex for supporting this module!")
                .isHelpful(true)
                .build();

        boardService.addCardComment(50L, req, 100L);

        // Verify COMMENT_ADDED for sampleUser
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("COMMENT_ADDED"),
                contains("Commented on card 'Implement API'"),
                any(),
                isNull(),
                eq(0.0),
                isNull(),
                isNull(),
                eq(0.0),
                eq(true),
                eq(false),
                eq(false)
        );

        // Verify SUPPORT_MENTION for mentionedUser
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(mentionedUser),
                eq(ActivitySource.BOARD),
                eq("SUPPORT_MENTION"),
                contains("Mentioned by Developer in card 'Implement API'"),
                any(),
                isNull(),
                eq(0.0),
                isNull(),
                isNull(),
                eq(0.0),
                eq(false),
                eq(true),
                eq(false)
        );
    }

    @Test
    @DisplayName("Completing checklist item logs CHECKLIST_ITEM_DONE")
    void testCompleteChecklistItemLogsActivity() {
        Card card = new Card();
        card.setId(50L);
        card.setBoard(sampleBoard);
        card.setTitle("Implement API");
        card.setDifficultyLevel(3);

        when(cardRepository.findById(50L)).thenReturn(Optional.of(card));
        when(userRepository.findById(100L)).thenReturn(Optional.of(sampleUser));
        when(sprintRepository.findByTeamId(10L)).thenReturn(Collections.emptyList());

        CompleteChecklistItemRequest req = CompleteChecklistItemRequest.builder()
                .itemTitle("Write unit tests")
                .build();

        boardService.completeChecklistItem(50L, req, 100L);

        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CHECKLIST_ITEM_DONE"),
                contains("Completed checklist item 'Write unit tests' in card 'Implement API'"),
                any(),
                isNull(),
                eq(0.5),
                eq(3),
                eq(true),
                eq(0.0),
                eq(false),
                eq(false),
                eq(false)
        );
    }
}