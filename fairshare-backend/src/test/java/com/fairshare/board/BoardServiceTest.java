package com.fairshare.board;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.activity.service.ActivityService;
import com.fairshare.board.dto.CreateBoardRequest;
import com.fairshare.board.dto.CreateCardRequest;
import com.fairshare.board.dto.MoveCardRequest;
import com.fairshare.board.entity.Board;
import com.fairshare.board.entity.BoardColumn;
import com.fairshare.board.entity.Card;
import com.fairshare.board.repository.BoardColumnRepository;
import com.fairshare.board.repository.BoardRepository;
import com.fairshare.board.repository.CardRepository;
import com.fairshare.board.service.BoardService;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.Team;
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
                contains("Moved card 'Implement JWT' from 'To Do' to 'Done'"),
                any(),
                isNull(),
                eq(3.0),
                eq(true) // on-time is true
        );
    }
}
