package com.fairshare.peerreview.controller;

import com.fairshare.board.dto.CardDto;
import com.fairshare.common.dto.ApiResponse;
import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.peerreview.dto.CreateReviewRoundRequest;
import com.fairshare.peerreview.dto.PeerReviewDetailDto;
import com.fairshare.peerreview.dto.ReviewRoundDto;
import com.fairshare.peerreview.dto.ReviewSubmissionDto;
import com.fairshare.peerreview.dto.ReviewerSubmissionDto;
import com.fairshare.peerreview.entity.ReviewRound;
import com.fairshare.peerreview.service.AnonymityAggregator;
import com.fairshare.peerreview.service.PeerReviewService;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/review-rounds")
@RequiredArgsConstructor
public class PeerReviewController {

    private final PeerReviewService peerReviewService;
    private final UserRepository userRepository;

    @PostMapping("/sprint/{sprintId}")
    public ResponseEntity<ApiResponse<ReviewRoundDto>> createRound(
            @PathVariable Long sprintId,
            @Valid @RequestBody CreateReviewRoundRequest request,
            Authentication authentication
    ) {
        ReviewRound round = peerReviewService.createRound(
                sprintId, getUserId(authentication), request.getName(),
                request.getStartDate(), request.getEndDate());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tạo đợt chấm chéo thành công", ReviewRoundDto.from(round)));
    }

    @GetMapping("/team/{teamId}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<ReviewRoundDto>>> getRoundsByTeam(
            @PathVariable Long teamId,
            Authentication authentication
    ) {
        List<ReviewRound> rounds = peerReviewService.getRoundsByTeam(teamId, getUserId(authentication));
        return ResponseEntity.ok(ApiResponse.ok("Danh sách đợt chấm chéo",
                rounds.stream().map(ReviewRoundDto::from).toList()));
    }

    @GetMapping("/sprint/{sprintId}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<ReviewRoundDto>>> getRoundsBySprint(
            @PathVariable Long sprintId,
            Authentication authentication
    ) {
        List<ReviewRound> rounds = peerReviewService.getRoundsBySprint(sprintId, getUserId(authentication));
        return ResponseEntity.ok(ApiResponse.ok("Đợt chấm chéo theo sprint",
                rounds.stream().map(ReviewRoundDto::from).toList()));
    }

    @PostMapping("/{roundId}/open")
    public ResponseEntity<ApiResponse<ReviewRoundDto>> openRound(
            @PathVariable Long roundId,
            Authentication authentication
    ) {
        ReviewRound round = peerReviewService.openRound(roundId, getUserId(authentication));
        return ResponseEntity.ok(ApiResponse.ok("Đã mở đợt chấm chéo", ReviewRoundDto.from(round)));
    }

    @PostMapping("/{roundId}/close")
    public ResponseEntity<ApiResponse<ReviewRoundDto>> closeRound(
            @PathVariable Long roundId,
            Authentication authentication
    ) {
        ReviewRound round = peerReviewService.closeRound(roundId, getUserId(authentication));
        return ResponseEntity.ok(ApiResponse.ok("Đã đóng đợt chấm chéo", ReviewRoundDto.from(round)));
    }

    @PostMapping("/{roundId}/submissions")
    public ResponseEntity<ApiResponse<Integer>> submitReview(
            @PathVariable Long roundId,
            @Valid @RequestBody ReviewSubmissionDto dto,
            Authentication authentication
    ) {
        Long authenticatedId = getUserId(authentication);
        if (dto.getReviewerId() != null && !dto.getReviewerId().equals(authenticatedId)) {
            throw new ForbiddenException("Reviewer must match the authenticated user");
        }
        int savedCount = peerReviewService.submitReview(roundId, authenticatedId, dto).size();
        return ResponseEntity.ok(ApiResponse.ok("Gửi đánh giá thành công", savedCount));
    }

    @GetMapping("/{roundId}/submissions/reviewer/{reviewerId}")
    public ResponseEntity<ApiResponse<List<ReviewerSubmissionDto>>> getSubmissionsByReviewer(
            @PathVariable Long roundId,
            @PathVariable Long reviewerId,
            Authentication authentication
    ) {
        List<ReviewerSubmissionDto> list = peerReviewService.getSubmissionsByReviewer(
                roundId, reviewerId, getUserId(authentication));
        return ResponseEntity.ok(ApiResponse.ok("Danh sách đánh giá của thành viên", list));
    }

    @GetMapping("/{roundId}/results/{revieweeId}")
    public ResponseEntity<ApiResponse<AnonymityAggregator.AggregatedResult>> getResults(
            @PathVariable Long roundId,
            @PathVariable Long revieweeId,
            Authentication authentication
    ) {
        Long requesterId = getUserId(authentication);
        AnonymityAggregator.AggregatedResult result = peerReviewService.getAggregatedResults(roundId, revieweeId, requesterId);
        return ResponseEntity.ok(ApiResponse.ok("Kết quả đánh giá tổng hợp ẩn danh", result));
    }

    @GetMapping("/{roundId}/reviews")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<PeerReviewDetailDto>>> getRoundReviewDetails(
            @PathVariable Long roundId,
            @RequestParam(required = false) Long revieweeId,
            Authentication authentication
    ) {
        List<PeerReviewDetailDto> list = peerReviewService.getRoundReviewDetails(
                roundId, revieweeId, getUserId(authentication));
        return ResponseEntity.ok(ApiResponse.ok("Kết quả chấm chéo tổng hợp ẩn danh", list));
    }

    @PostMapping("/submissions/{submissionId}/like")
    public ResponseEntity<ApiResponse<Integer>> toggleLike(
            @PathVariable Long submissionId,
            Authentication authentication
    ) {
        Long userId = getUserId(authentication);
        int newCount = peerReviewService.toggleLike(submissionId, userId);
        return ResponseEntity.ok(ApiResponse.ok("Đã thích nhận xét", newCount));
    }

    @GetMapping("/team/{teamId}/done-cards")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<CardDto>>> getDoneCardsForTeam(
            @PathVariable Long teamId,
            Authentication authentication
    ) {
        List<CardDto> cards = peerReviewService.getDoneCardsForTeam(teamId, getUserId(authentication));
        return ResponseEntity.ok(ApiResponse.ok("Danh sách thẻ đã hoàn thành", cards));
    }

    private Long getUserId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new BadCredentialsException("Authentication required");
        }
        return userRepository.findByEmail(authentication.getName())
                .map(User::getId)
                .orElseThrow(() -> new BadCredentialsException("Authenticated user was not found"));
    }
}
