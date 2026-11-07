package com.fairshare.board.service;

import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.activity.service.ActivityService;
import com.fairshare.board.dto.*;
import com.fairshare.board.entity.Board;
import com.fairshare.board.entity.BoardColumn;
import com.fairshare.board.entity.Card;
import com.fairshare.board.repository.BoardColumnRepository;
import com.fairshare.board.repository.BoardRepository;
import com.fairshare.board.repository.CardRepository;
import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.Team;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BoardService {

    private final BoardRepository boardRepository;
    private final BoardColumnRepository columnRepository;
    private final CardRepository cardRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final SprintRepository sprintRepository;
    private final ActivityService activityService;

    @Transactional
    public BoardDto createBoard(CreateBoardRequest request) {
        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + request.getTeamId()));

        Board board = new Board();
        board.setTeam(team);
        board.setName(request.getName().trim());
        board.setDescription(request.getDescription());
        Board savedBoard = boardRepository.save(board);

        // Initialize default columns
        String[] defaultColumns = {"To Do", "In Progress", "Review", "Done"};
        for (int i = 0; i < defaultColumns.length; i++) {
            BoardColumn col = new BoardColumn();
            col.setBoard(savedBoard);
            col.setName(defaultColumns[i]);
            col.setPosition(i);
            columnRepository.save(col);
        }

        return getBoardById(savedBoard.getId());
    }

    @Transactional(readOnly = true)
    public List<BoardDto> getBoardsByTeam(Long teamId) {
        if (!teamRepository.existsById(teamId)) {
            throw new ResourceNotFoundException("Team not found: " + teamId);
        }
        return boardRepository.findByTeamIdOrderByIdAsc(teamId).stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public BoardDto getBoardById(Long id) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found: " + id));
        return mapToDto(board);
    }

    @Transactional
    public BoardDto updateBoard(Long id, CreateBoardRequest request) {
        Board board = boardRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found: " + id));
        if (request.getName() != null && !request.getName().isBlank()) {
            board.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            board.setDescription(request.getDescription());
        }
        return mapToDto(boardRepository.save(board));
    }

    @Transactional
    public void deleteBoard(Long id) {
        if (!boardRepository.existsById(id)) {
            throw new ResourceNotFoundException("Board not found: " + id);
        }
        boardRepository.deleteById(id);
    }

    @Transactional
    public BoardColumnDto createColumn(Long boardId, CreateColumnRequest request) {
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResourceNotFoundException("Board not found: " + boardId));

        int position = request.getPosition() != null ? request.getPosition()
                : columnRepository.findByBoardIdOrderByPositionAsc(boardId).size();

        BoardColumn column = new BoardColumn();
        column.setBoard(board);
        column.setName(request.getName().trim());
        column.setPosition(position);
        BoardColumn saved = columnRepository.save(column);
        return mapColumnToDto(saved);
    }

    @Transactional
    public BoardColumnDto updateColumn(Long columnId, CreateColumnRequest request) {
        BoardColumn column = columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException("Column not found: " + columnId));

        if (request.getName() != null && !request.getName().isBlank()) {
            column.setName(request.getName().trim());
        }
        if (request.getPosition() != null) {
            column.setPosition(request.getPosition());
        }
        return mapColumnToDto(columnRepository.save(column));
    }

    @Transactional
    public void deleteColumn(Long columnId) {
        if (!columnRepository.existsById(columnId)) {
            throw new ResourceNotFoundException("Column not found: " + columnId);
        }
        columnRepository.deleteById(columnId);
    }

    @Transactional
    public CardDto createCard(Long columnId, CreateCardRequest request, Long actorUserId) {
        BoardColumn column = columnRepository.findById(columnId)
                .orElseThrow(() -> new ResourceNotFoundException("Column not found: " + columnId));
        Board board = column.getBoard();

        User assignee = null;
        if (request.getAssigneeId() != null) {
            assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee user not found: " + request.getAssigneeId()));
        }

        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(assignee) : assignee;

        int position = request.getPosition() != null ? request.getPosition()
                : cardRepository.findByColumnIdOrderByPositionAsc(columnId).size();

        Card card = new Card();
        card.setBoard(board);
        card.setColumn(column);
        card.setTitle(request.getTitle().trim());
        card.setDescription(request.getDescription());
        card.setAssignee(assignee);
        card.setStoryPoints(request.getStoryPoints() != null ? request.getStoryPoints() : 1.0);
        card.setDueDate(request.getDueDate());
        card.setPosition(position);
        Card savedCard = cardRepository.save(card);

        // Find active sprint for team
        Sprint activeSprint = getActiveSprintForTeam(board.getTeam().getId());

        // Log ActivityEvent
        if (actor != null) {
            activityService.logActivity(
                    board.getTeam(),
                    actor,
                    ActivitySource.BOARD,
                    "CARD_CREATED",
                    "Created card '" + savedCard.getTitle() + "' in column '" + column.getName() + "'",
                    LocalDateTime.now(),
                    activeSprint,
                    savedCard.getStoryPoints(),
                    null
            );
        }

        return mapCardToDto(savedCard);
    }

    @Transactional(readOnly = true)
    public CardDto getCardById(Long cardId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardId));
        return mapCardToDto(card);
    }

    @Transactional
    public CardDto updateCard(Long cardId, UpdateCardRequest request, Long actorUserId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardId));

        if (request.getTitle() != null && !request.getTitle().isBlank()) {
            card.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            card.setDescription(request.getDescription());
        }
        if (request.getAssigneeId() != null) {
            User assignee = userRepository.findById(request.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found: " + request.getAssigneeId()));
            Long teamId = card.getBoard().getTeam().getId();
            if (!teamMemberRepository.existsByTeamIdAndUserId(teamId, assignee.getId())) {
                throw new BusinessException("Người phụ trách phải thuộc nhóm (Team ID: " + teamId + ")");
            }
            card.setAssignee(assignee);
        }
        if (request.getStoryPoints() != null) {
            validateStoryPoints(request.getStoryPoints());
            card.setStoryPoints(request.getStoryPoints());
        }
        if (request.getDueDate() != null) {
            card.setDueDate(request.getDueDate());
        }
        if (request.getPosition() != null) {
            card.setPosition(request.getPosition());
        }
        return mapCardToDto(cardRepository.save(card));
    }

    @Transactional
    public CardDto updateAssignee(Long cardId, UpdateAssigneeRequest request, Long actorUserId) {
        if (request == null || request.getAssigneeId() == null) {
            throw new BusinessException("Người phụ trách không được để trống");
        }

        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardId));

        User assignee = userRepository.findById(request.getAssigneeId())
                .orElseThrow(() -> new ResourceNotFoundException("Assignee not found: " + request.getAssigneeId()));

        Long teamId = card.getBoard().getTeam().getId();
        boolean isMember = teamMemberRepository.existsByTeamIdAndUserId(teamId, assignee.getId());
        if (!isMember) {
            throw new BusinessException("Người phụ trách phải thuộc nhóm (Team ID: " + teamId + ")");
        }

        card.setAssignee(assignee);
        Card savedCard = cardRepository.save(card);

        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(assignee) : assignee;
        Sprint activeSprint = getActiveSprintForTeam(teamId);
        if (actor != null) {
            activityService.logActivity(
                    card.getBoard().getTeam(),
                    actor,
                    ActivitySource.BOARD,
                    "CARD_ASSIGNEE_UPDATED",
                    String.format("Assigned card '%s' to '%s'", card.getTitle(), assignee.getFullName()),
                    LocalDateTime.now(),
                    activeSprint,
                    card.getStoryPoints(),
                    null
            );
        }

        return mapCardToDto(savedCard);
    }

    @Transactional
    public CardDto updateStoryPoints(Long cardId, UpdateStoryPointsRequest request, Long actorUserId) {
        if (request == null || request.getStoryPoints() == null) {
            throw new BusinessException("Story point không được để trống");
        }

        validateStoryPoints(request.getStoryPoints());

        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardId));

        card.setStoryPoints(request.getStoryPoints());
        Card savedCard = cardRepository.save(card);

        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(card.getAssignee()) : card.getAssignee();
        Sprint activeSprint = getActiveSprintForTeam(card.getBoard().getTeam().getId());
        if (actor != null) {
            activityService.logActivity(
                    card.getBoard().getTeam(),
                    actor,
                    ActivitySource.BOARD,
                    "CARD_STORY_POINTS_UPDATED",
                    String.format("Updated story points for card '%s' to %.0f", card.getTitle(), request.getStoryPoints()),
                    LocalDateTime.now(),
                    activeSprint,
                    card.getStoryPoints(),
                    null
            );
        }

        return mapCardToDto(savedCard);
    }

    @Transactional
    public CardDto updateDueDate(Long cardId, UpdateDueDateRequest request, Long actorUserId) {
        if (request == null || request.getDueDate() == null) {
            throw new BusinessException("Hạn (due date) không được để trống");
        }

        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardId));

        card.setDueDate(request.getDueDate());
        Card savedCard = cardRepository.save(card);

        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(card.getAssignee()) : card.getAssignee();
        Sprint activeSprint = getActiveSprintForTeam(card.getBoard().getTeam().getId());
        if (actor != null) {
            activityService.logActivity(
                    card.getBoard().getTeam(),
                    actor,
                    ActivitySource.BOARD,
                    "CARD_DUE_DATE_UPDATED",
                    String.format("Updated due date for card '%s' to %s", card.getTitle(), request.getDueDate()),
                    LocalDateTime.now(),
                    activeSprint,
                    card.getStoryPoints(),
                    null
            );
        }

        return mapCardToDto(savedCard);
    }

    private void validateStoryPoints(Double storyPoints) {
        if (storyPoints == null || storyPoints <= 0 || storyPoints % 1 != 0) {
            throw new BusinessException("Story point phải là số nguyên dương");
        }
    }

    @Transactional
    public void deleteCard(Long cardId) {
        if (!cardRepository.existsById(cardId)) {
            throw new ResourceNotFoundException("Card not found: " + cardId);
        }
        cardRepository.deleteById(cardId);
    }

    @Transactional
    public CardDto moveCard(Long cardId, MoveCardRequest request, Long actorUserId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardId));

        BoardColumn targetColumn = columnRepository.findById(request.getTargetColumnId())
                .orElseThrow(() -> new ResourceNotFoundException("Target column not found: " + request.getTargetColumnId()));

        BoardColumn fromColumn = card.getColumn();
        card.setColumn(targetColumn);
        if (request.getPosition() != null) {
            card.setPosition(request.getPosition());
        }

        Card savedCard = cardRepository.save(card);

        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(card.getAssignee()) : card.getAssignee();

        boolean isDone = targetColumn.getName().equalsIgnoreCase("done")
                || targetColumn.getName().toLowerCase().contains("hoàn thành");

        Boolean isOnTime = null;
        if (isDone) {
            isOnTime = (card.getDueDate() == null || !LocalDateTime.now().isAfter(card.getDueDate()));
        }

        Sprint activeSprint = getActiveSprintForTeam(card.getBoard().getTeam().getId());

        // Log ActivityEvent
        if (actor != null) {
            String eventType = isDone ? "CARD_COMPLETED" : "CARD_MOVED";
            String details = String.format("Moved card '%s' from '%s' to '%s'",
                    card.getTitle(), fromColumn.getName(), targetColumn.getName());

            activityService.logActivity(
                    card.getBoard().getTeam(),
                    actor,
                    ActivitySource.BOARD,
                    eventType,
                    details,
                    LocalDateTime.now(),
                    activeSprint,
                    card.getStoryPoints(),
                    isOnTime
            );
        }

        return mapCardToDto(savedCard);
    }

    private Sprint getActiveSprintForTeam(Long teamId) {
        List<Sprint> sprints = sprintRepository.findByTeamId(teamId);
        return sprints.stream()
                .filter(s -> s.getEndDate() == null || !s.getEndDate().isBefore(java.time.LocalDate.now()))
                .findFirst()
                .orElse(sprints.isEmpty() ? null : sprints.get(sprints.size() - 1));
    }

    private BoardDto mapToDto(Board board) {
        List<BoardColumn> cols = columnRepository.findByBoardIdOrderByPositionAsc(board.getId());
        List<BoardColumnDto> columnDtos = cols.stream().map(this::mapColumnToDto).toList();

        return BoardDto.builder()
                .id(board.getId())
                .teamId(board.getTeam().getId())
                .name(board.getName())
                .description(board.getDescription())
                .columns(columnDtos)
                .createdAt(board.getCreatedAt())
                .updatedAt(board.getUpdatedAt())
                .build();
    }

    private BoardColumnDto mapColumnToDto(BoardColumn column) {
        List<Card> cards = cardRepository.findByColumnIdOrderByPositionAsc(column.getId());
        List<CardDto> cardDtos = cards.stream().map(this::mapCardToDto).toList();

        return BoardColumnDto.builder()
                .id(column.getId())
                .boardId(column.getBoard().getId())
                .name(column.getName())
                .position(column.getPosition())
                .cards(cardDtos)
                .build();
    }

    private CardDto mapCardToDto(Card card) {
        return CardDto.builder()
                .id(card.getId())
                .boardId(card.getBoard().getId())
                .columnId(card.getColumn().getId())
                .title(card.getTitle())
                .description(card.getDescription())
                .assigneeId(card.getAssignee() != null ? card.getAssignee().getId() : null)
                .assigneeName(card.getAssignee() != null ? card.getAssignee().getFullName() : null)
                .assigneeEmail(card.getAssignee() != null ? card.getAssignee().getEmail() : null)
                .storyPoints(card.getStoryPoints())
                .dueDate(card.getDueDate())
                .position(card.getPosition())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt())
                .build();
    }
}
