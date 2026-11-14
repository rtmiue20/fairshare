package com.fairshare.board.controller;

import com.fairshare.board.dto.*;
import com.fairshare.board.service.BoardService;
import com.fairshare.common.dto.ApiResponse;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cards")
@RequiredArgsConstructor
public class CardController {

    private final BoardService boardService;
    private final UserRepository userRepository;

    @GetMapping("/{cardId}")
    public ResponseEntity<ApiResponse<CardDto>> getCardById(@PathVariable Long cardId) {
        CardDto card = boardService.getCardById(cardId);
        return ResponseEntity.ok(ApiResponse.ok("Card retrieved successfully", card));
    }

    @PutMapping("/{cardId}")
    public ResponseEntity<ApiResponse<CardDto>> updateCard(
            @PathVariable Long cardId,
            @RequestBody UpdateCardRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto updated = boardService.updateCard(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card updated successfully", updated));
    }

    @DeleteMapping("/{cardId}")
    public ResponseEntity<ApiResponse<Void>> deleteCard(
            @PathVariable Long cardId,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        boardService.deleteCard(cardId, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card deleted successfully", null));
    }

    @RequestMapping(value = "/{cardId}/assignee", method = { RequestMethod.PUT, RequestMethod.PATCH })
    public ResponseEntity<ApiResponse<CardDto>> updateAssignee(
            @PathVariable Long cardId,
            @Valid @RequestBody UpdateAssigneeRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto updated = boardService.updateAssignee(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card assignee updated successfully", updated));
    }

    @RequestMapping(value = "/{cardId}/story-points", method = { RequestMethod.PUT, RequestMethod.PATCH })
    public ResponseEntity<ApiResponse<CardDto>> updateStoryPoints(
            @PathVariable Long cardId,
            @Valid @RequestBody UpdateStoryPointsRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto updated = boardService.updateStoryPoints(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card story points updated successfully", updated));
    }

    @RequestMapping(value = "/{cardId}/due-date", method = { RequestMethod.PUT, RequestMethod.PATCH })
    public ResponseEntity<ApiResponse<CardDto>> updateDueDate(
            @PathVariable Long cardId,
            @Valid @RequestBody UpdateDueDateRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto updated = boardService.updateDueDate(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card due date updated successfully", updated));
    }

    @PutMapping("/{cardId}/move")
    public ResponseEntity<ApiResponse<CardDto>> moveCard(
            @PathVariable Long cardId,
            @Valid @RequestBody MoveCardRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        CardDto moved = boardService.moveCard(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Card moved successfully", moved));
    }

    @PostMapping("/{cardId}/comments")
    public ResponseEntity<ApiResponse<Void>> addComment(
            @PathVariable Long cardId,
            @Valid @RequestBody AddCardCommentRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        boardService.addCardComment(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Bình luận thành công", null));
    }

    @PostMapping("/{cardId}/checklist-items")
    public ResponseEntity<ApiResponse<Void>> completeChecklistItem(
            @PathVariable Long cardId,
            @Valid @RequestBody CompleteChecklistItemRequest request,
            Authentication authentication) {
        Long actorId = getRequiredUserId(authentication);
        boardService.completeChecklistItem(cardId, request, actorId);
        return ResponseEntity.ok(ApiResponse.ok("Đã đánh dấu hoàn thành việc cần làm", null));
    }

    @GetMapping("/{cardId}/activities")
    public ResponseEntity<ApiResponse<java.util.List<CardActivityDto>>> getCardActivities(@PathVariable Long cardId) {
        java.util.List<CardActivityDto> activities = boardService.getCardActivities(cardId);
        return ResponseEntity.ok(ApiResponse.ok("Lịch sử hoạt động thẻ", activities));
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
