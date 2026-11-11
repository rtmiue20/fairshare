package com.fairshare.board.controller;

import com.fairshare.board.dto.*;
import com.fairshare.board.service.BoardService;
import com.fairshare.common.dto.ApiResponse;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;
    private final UserRepository userRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<BoardDto>> createBoard(
            @Valid @RequestBody CreateBoardRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        BoardDto created = boardService.createBoard(request, actorId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Board created successfully", created));
    }

    @GetMapping("/team/{teamId}")
    public ResponseEntity<ApiResponse<List<BoardDto>>> getBoardsByTeam(@PathVariable Long teamId) {
        List<BoardDto> boards = boardService.getBoardsByTeam(teamId);
        return ResponseEntity.ok(ApiResponse.ok("Boards retrieved successfully", boards));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BoardDto>> getBoardById(@PathVariable Long id) {
        BoardDto board = boardService.getBoardById(id);
        return ResponseEntity.ok(ApiResponse.ok("Board retrieved successfully", board));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BoardDto>> updateBoard(
            @PathVariable Long id,
            @RequestBody CreateBoardRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        BoardDto updated = boardService.updateBoard(id, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Board updated successfully", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBoard(
            @PathVariable Long id,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        boardService.deleteBoard(id, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Board deleted successfully", null));
    }

    @PostMapping("/{boardId}/columns")
    public ResponseEntity<ApiResponse<BoardColumnDto>> createColumn(
            @PathVariable Long boardId,
            @Valid @RequestBody CreateColumnRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        BoardColumnDto created = boardService.createColumn(boardId, request, actorId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Column created successfully", created));
    }

    @PutMapping("/columns/{columnId}")
    public ResponseEntity<ApiResponse<BoardColumnDto>> updateColumn(
            @PathVariable Long columnId,
            @RequestBody CreateColumnRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        BoardColumnDto updated = boardService.updateColumn(columnId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Column updated successfully", updated));
    }

    @DeleteMapping("/columns/{columnId}")
    public ResponseEntity<ApiResponse<Void>> deleteColumn(
            @PathVariable Long columnId,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        boardService.deleteColumn(columnId, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Column deleted successfully", null));
    }

    @PostMapping("/columns/{columnId}/cards")
    public ResponseEntity<ApiResponse<CardDto>> createCard(
            @PathVariable Long columnId,
            @Valid @RequestBody CreateCardRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto created = boardService.createCard(columnId, request, actorId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Card created successfully", created));
    }

    @GetMapping("/cards/{cardId}")
    public ResponseEntity<ApiResponse<CardDto>> getCardById(@PathVariable Long cardId) {
        CardDto card = boardService.getCardById(cardId);
        return ResponseEntity.ok(ApiResponse.ok("Card retrieved successfully", card));
    }

    @PutMapping("/cards/{cardId}")
    public ResponseEntity<ApiResponse<CardDto>> updateCard(
            @PathVariable Long cardId,
            @RequestBody UpdateCardRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto updated = boardService.updateCard(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card updated successfully", updated));
    }

    @RequestMapping(value = "/cards/{cardId}/assignee", method = { RequestMethod.PUT, RequestMethod.PATCH })
    public ResponseEntity<ApiResponse<CardDto>> updateCardAssignee(
            @PathVariable Long cardId,
            @Valid @RequestBody UpdateAssigneeRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto updated = boardService.updateAssignee(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card assignee updated successfully", updated));
    }

    @RequestMapping(value = "/cards/{cardId}/story-points", method = { RequestMethod.PUT, RequestMethod.PATCH })
    public ResponseEntity<ApiResponse<CardDto>> updateCardStoryPoints(
            @PathVariable Long cardId,
            @Valid @RequestBody UpdateStoryPointsRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto updated = boardService.updateStoryPoints(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card story points updated successfully", updated));
    }

    @RequestMapping(value = "/cards/{cardId}/due-date", method = { RequestMethod.PUT, RequestMethod.PATCH })
    public ResponseEntity<ApiResponse<CardDto>> updateCardDueDate(
            @PathVariable Long cardId,
            @Valid @RequestBody UpdateDueDateRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto updated = boardService.updateDueDate(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card due date updated successfully", updated));
    }

    @DeleteMapping("/cards/{cardId}")
    public ResponseEntity<ApiResponse<Void>> deleteCard(
            @PathVariable Long cardId,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        boardService.deleteCard(cardId, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card deleted successfully", null));
    }

    @PutMapping("/cards/{cardId}/move")
    public ResponseEntity<ApiResponse<CardDto>> moveCard(
            @PathVariable Long cardId,
            @Valid @RequestBody MoveCardRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto moved = boardService.moveCard(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card moved successfully", moved));
    }

    @PostMapping("/cards/{cardId}/comments")
    public ResponseEntity<ApiResponse<Void>> addComment(
            @PathVariable Long cardId,
            @Valid @RequestBody AddCardCommentRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        boardService.addCardComment(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Bình luận thành công", null));
    }

    @PostMapping("/cards/{cardId}/checklist-items")
    public ResponseEntity<ApiResponse<Void>> completeChecklistItem(
            @PathVariable Long cardId,
            @Valid @RequestBody CompleteChecklistItemRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        boardService.completeChecklistItem(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Đã đánh dấu hoàn thành việc cần làm", null));
    }

    private Long getRequiredUserId(Authentication authentication) {
        Long userId = getUserId(authentication);
        if (userId == null) {
            throw new com.fairshare.common.exception.ForbiddenException("Bạn không có quyền thực hiện thao tác này");
        }
        return userId;
    }

    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName())
                .map(User::getId)
                .orElse(null);
    }

}