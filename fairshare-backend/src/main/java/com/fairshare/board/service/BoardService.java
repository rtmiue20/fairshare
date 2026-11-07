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
        String[] defaultColumns = { "To Do", "In Progress", "Review", "Done" };
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
                    .orElseThrow(
                            () -> new ResourceNotFoundException("Assignee user not found: " + request.getAssigneeId()));
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
        card.setDifficultyLevel(request.getDifficultyLevel() != null ? request.getDifficultyLevel() : 2);
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
                    null);
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
        if (request.getDifficultyLevel() != null) {
            card.setDifficultyLevel(request.getDifficultyLevel());
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
                    null);
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

        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(card.getAssignee())
                : card.getAssignee();
        Sprint activeSprint = getActiveSprintForTeam(card.getBoard().getTeam().getId());
        if (actor != null) {
            activityService.logActivity(
                    card.getBoard().getTeam(),
                    actor,
                    ActivitySource.BOARD,
                    "CARD_STORY_POINTS_UPDATED",
                    String.format("Updated story points for card '%s' to %.0f", card.getTitle(),
                            request.getStoryPoints()),
                    LocalDateTime.now(),
                    activeSprint,
                    card.getStoryPoints(),
                    null);
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

        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(card.getAssignee())
                : card.getAssignee();
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
                    null);
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
                .orElseThrow(
                        () -> new ResourceNotFoundException("Target column not found: " + request.getTargetColumnId()));

        BoardColumn fromColumn = card.getColumn();
        String fromColName = request.getFromColumnName() != null ? request.getFromColumnName() : fromColumn.getName();
        String toColName = request.getToColumnName() != null ? request.getToColumnName() : targetColumn.getName();

        boolean wasDone = isDoneColumn(fromColName);
        boolean isDone = isDoneColumn(toColName);
        boolean isReview = isReviewColumn(toColName);

        card.setColumn(targetColumn);
        if (request.getPosition() != null) {
            card.setPosition(request.getPosition());
        }

        Card savedCard = cardRepository.save(card);

        User actor = actorUserId != null ? userRepository.findById(actorUserId).orElse(card.getAssignee())
                : card.getAssignee();
        User assignee = card.getAssignee();
        Sprint activeSprint = getActiveSprintForTeam(card.getBoard().getTeam().getId());
        LocalDateTime now = LocalDateTime.now();

        // 1. Khi card chuyển sang cột Done: ghi nhận CARD_COMPLETED kèm storyPoint, độ
        // khó, thời gian hoàn thành & đối chiếu dueDate tính delay
        if (!wasDone && isDone) {
            Boolean isOnTime = true;
            Double delayDays = 0.0;
            if (card.getDueDate() != null) {
                if (now.isAfter(card.getDueDate())) {
                    isOnTime = false;
                    long hours = java.time.Duration.between(card.getDueDate(), now).toHours();
                    delayDays = Math.max(0.1, Math.round((hours / 24.0) * 10.0) / 10.0);
                } else {
                    isOnTime = true;
                    delayDays = 0.0;
                }
            }

            User completedUser = assignee != null ? assignee : actor;
            if (completedUser != null) {
                activityService.logActivity(
                        card.getBoard().getTeam(),
                        completedUser,
                        ActivitySource.BOARD,
                        "CARD_COMPLETED",
                        String.format(
                                "Completed card '%s' (Story Points: %.1f, Difficulty: %s, On-Time: %s, Delay: %.1f days)",
                                card.getTitle(), card.getStoryPoints(), card.getDifficultyLevel(), isOnTime, delayDays),
                        now,
                        activeSprint,
                        card.getStoryPoints(),
                        card.getDifficultyLevel(),
                        isOnTime,
                        delayDays,
                        false,
                        false,
                        false);
            }
        }
        // 2. Khi card từ cột Done bị kéo ngược về cột khác (To Do / In Progress /
        // Review): ghi nhận REWORK (CARD_REOPENED)
        else if (wasDone && !isDone) {
            User reworkUser = assignee != null ? assignee : actor;
            if (reworkUser != null) {
                activityService.logActivity(
                        card.getBoard().getTeam(),
                        reworkUser,
                        ActivitySource.BOARD,
                        "CARD_REOPENED",
                        String.format("Rework: Card '%s' reopened from '%s' to '%s'",
                                card.getTitle(), fromColName, toColName),
                        now,
                        activeSprint,
                        card.getStoryPoints(),
                        card.getDifficultyLevel(),
                        null,
                        0.0,
                        false,
                        false,
                        false);
            }
        }
        // 3. Khi một thành viên khác (không phải người phụ trách) review hoặc kéo card
        // qua cột Review
        else if (isReview && actor != null && assignee != null && !actor.getId().equals(assignee.getId())) {
            activityService.logActivity(
                    card.getBoard().getTeam(),
                    actor,
                    ActivitySource.BOARD,
                    "REVIEW_CARD",
                    String.format("Member '%s' reviewed card '%s' (Assignee: '%s')",
                            actor.getFullName(), card.getTitle(), assignee.getFullName()),
                    now,
                    activeSprint,
                    card.getStoryPoints(),
                    card.getDifficultyLevel(),
                    null,
                    0.0,
                    false,
                    false,
                    true // isReviewForOthers = true
            );
        }
        // 4. Các trường hợp di chuyển thẻ thông thường
        else if (actor != null) {
            activityService.logActivity(
                    card.getBoard().getTeam(),
                    actor,
                    ActivitySource.BOARD,
                    "CARD_MOVED",
                    String.format("Moved card '%s' from '%s' to '%s'",
                            card.getTitle(), fromColName, toColName),
                    now,
                    activeSprint,
                    card.getStoryPoints(),
                    null);
        }

        return mapCardToDto(savedCard);
    }

    private boolean isDoneColumn(String name) {
        if (name == null)
            return false;
        String lower = name.trim().toLowerCase();
        return lower.contains("done") || lower.contains("hoàn thành") || lower.contains("đã xong");
    }

    private boolean isReviewColumn(String name) {
        if (name == null)
            return false;
        String lower = name.trim().toLowerCase();
        return lower.contains("review") || lower.contains("đánh giá") || lower.contains("kiểm tra")
                || lower.contains("kiểm thử");
    }

    @Transactional
    public void addCardComment(Long cardId, AddCardCommentRequest request, Long actorUserId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardId));
        User actor = actorUserId != null ? userRepository.findById(actorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + actorUserId))
                : card.getAssignee();

        if (actor == null) {
            throw new BusinessException("Cần đăng nhập để bình luận");
        }

        Sprint activeSprint = getActiveSprintForTeam(card.getBoard().getTeam().getId());
        LocalDateTime now = LocalDateTime.now();
        boolean isHelpful = Boolean.TRUE.equals(request.getIsHelpful())
                || (request.getContent() != null && request.getContent().length() > 15);

        // Log comment event
        activityService.logActivity(
                card.getBoard().getTeam(),
                actor,
                ActivitySource.BOARD,
                "COMMENT_ADDED",
                String.format("Commented on card '%s': %s", card.getTitle(), request.getContent()),
                now,
                activeSprint,
                0.0,
                null,
                null,
                0.0,
                isHelpful,
                false,
                false);

        // Parse @username mentions
        if (request.getContent() != null && request.getContent().contains("@")) {
            java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("@([\\w\\.\\-\\+]+)")
                    .matcher(request.getContent());
            List<com.fairshare.team.entity.TeamMember> members = teamMemberRepository
                    .findByTeamId(card.getBoard().getTeam().getId());
            while (matcher.find()) {
                String mentionQuery = matcher.group(1).toLowerCase();
                for (var tm : members) {
                    User u = tm.getUser();
                    if (u.getEmail().toLowerCase().contains(mentionQuery)
                            || u.getFullName().toLowerCase().contains(mentionQuery)) {
                        activityService.logActivity(
                                card.getBoard().getTeam(),
                                u,
                                ActivitySource.BOARD,
                                "SUPPORT_MENTION",
                                String.format("Mentioned by %s in card '%s'", actor.getFullName(), card.getTitle()),
                                now,
                                activeSprint,
                                0.0,
                                null,
                                null,
                                0.0,
                                false,
                                true, // isSupportMention = true
                                false);
                        break;
                    }
                }
            }
        }
    }

    @Transactional
    public void completeChecklistItem(Long cardId, CompleteChecklistItemRequest request, Long actorUserId) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new ResourceNotFoundException("Card not found: " + cardId));
        User actor = actorUserId != null ? userRepository.findById(actorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + actorUserId))
                : card.getAssignee();

        if (actor == null) {
            throw new BusinessException("Cần đăng nhập để hoàn thành công việc");
        }

        Sprint activeSprint = getActiveSprintForTeam(card.getBoard().getTeam().getId());
        LocalDateTime now = LocalDateTime.now();

        activityService.logActivity(
                card.getBoard().getTeam(),
                actor,
                ActivitySource.BOARD,
                "CHECKLIST_ITEM_DONE",
                String.format("Completed checklist item '%s' in card '%s'", request.getItemTitle(), card.getTitle()),
                now,
                activeSprint,
                0.5,
                card.getDifficultyLevel(),
                true,
                0.0,
                false,
                false,
                false);
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
                .difficultyLevel(card.getDifficultyLevel())
                .dueDate(card.getDueDate())
                .position(card.getPosition())
                .createdAt(card.getCreatedAt())
                .updatedAt(card.getUpdatedAt())
                .build();
    }
}
