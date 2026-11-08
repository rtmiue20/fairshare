package com.fairshare.board;

import com.fairshare.activity.entity.ActivityEvent;
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
import com.fairshare.common.exception.ResourceNotFoundException;
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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit tests for BoardService (M1)")
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
    @DisplayName("Moving a card to Done logs a CARD_COMPLETED ActivityEvent with on-time status")
    void testMoveCardToDoneLogsCardCompleted() {
        Card card = new Card();
        card.setId(50L);
        card.setBoard(sampleBoard);
        card.setColumn(colTodo);
        card.setTitle("Implement JWT");
        card.setAssignee(sampleUser);
        card.setStoryPoints(3.0);
        card.setDueDate(LocalDateTime.now().plusDays(2)); // not late

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
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_COMPLETED"),
                contains("Completed card 'Implement JWT'"),
                any(),
                isNull(),
                eq(3.0),
                eq(2),
                eq(true), // on-time is true
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
    @DisplayName("Updating card assignee succeeds when user is member of the team")
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
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_ASSIGNEE_UPDATED"),
                contains("Assigned card 'Implement JWT' to 'Developer'"),
                any(),
                isNull(),
                eq(3.0),
                isNull()
        );
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
    @DisplayName("Updating story points succeeds when value is positive integer")
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
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_STORY_POINTS_UPDATED"),
                contains("Updated story points for card 'Implement JWT' to 5"),
                any(),
                isNull(),
                eq(5.0),
                isNull()
        );
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
    @DisplayName("Updating due date succeeds when valid LocalDateTime is passed")
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
        verify(activityService, times(1)).logActivity(
                eq(sampleTeam),
                eq(sampleUser),
                eq(ActivitySource.BOARD),
                eq("CARD_DUE_DATE_UPDATED"),
                contains("Updated due date for card 'Implement JWT' to"),
                any(),
                isNull(),
                eq(3.0),
                isNull()
        );
    }

    @Test
    @DisplayName("Updating due date throws BusinessException when dueDate is null")
    void testUpdateDueDateFailsWhenNull() {
        UpdateDueDateRequest request = UpdateDueDateRequest.builder().dueDate(null).build();

        assertThrows(BusinessException.class, () -> boardService.updateDueDate(50L, request, 100L));
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
