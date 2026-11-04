package com.fairshare.peerreview.controller;

import com.fairshare.common.dto.ApiResponse;
import com.fairshare.peerreview.dto.ReviewSubmissionDto;
import com.fairshare.peerreview.entity.ReviewRound;
import com.fairshare.peerreview.entity.ReviewSubmission;
import com.fairshare.peerreview.service.AnonymityAggregator;
import com.fairshare.peerreview.service.PeerReviewService;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/review-rounds")
@RequiredArgsConstructor
public class PeerReviewController {

    private final PeerReviewService peerReviewService;
    private final UserRepository userRepository;

    @GetMapping("/team/{teamId}")
    public ResponseEntity<ApiResponse<List<ReviewRound>>> getRoundsByTeam(@PathVariable Long teamId) {
        List<ReviewRound> rounds = peerReviewService.getRoundsByTeam(teamId);
        return ResponseEntity.ok(ApiResponse.ok("Danh sách đợt chấm chéo", rounds));
    }

    @GetMapping("/sprint/{sprintId}")
    public ResponseEntity<ApiResponse<List<ReviewRound>>> getRoundsBySprint(@PathVariable Long sprintId) {
        List<ReviewRound> rounds = peerReviewService.getRoundsBySprint(sprintId);
        return ResponseEntity.ok(ApiResponse.ok("Đợt chấm chéo theo sprint", rounds));
    }

    @PostMapping("/{roundId}/submissions")
    public ResponseEntity<ApiResponse<ReviewSubmission>> submitReview(
            @PathVariable Long roundId,
            @RequestBody ReviewSubmissionDto dto,
            Authentication authentication
    ) {
        Long reviewerId = getUserId(authentication);
        ReviewSubmission submission = peerReviewService.submitReview(roundId, reviewerId, dto);
        return ResponseEntity.ok(ApiResponse.ok("Gửi đánh giá thành công", submission));
    }

    @GetMapping("/{roundId}/results/{revieweeId}")
    public ResponseEntity<ApiResponse<AnonymityAggregator.AggregatedResult>> getResults(
            @PathVariable Long roundId,
            @PathVariable Long revieweeId
    ) {
        AnonymityAggregator.AggregatedResult result = peerReviewService.getAggregatedResults(roundId, revieweeId);
        return ResponseEntity.ok(ApiResponse.ok("Kết quả đánh giá tổng hợp ẩn danh", result));
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
