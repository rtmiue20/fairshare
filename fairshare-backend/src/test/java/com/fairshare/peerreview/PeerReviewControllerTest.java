package com.fairshare.peerreview;

import com.fairshare.common.exception.ForbiddenException;
import com.fairshare.peerreview.controller.PeerReviewController;
import com.fairshare.peerreview.dto.ReviewSubmissionDto;
import com.fairshare.peerreview.service.PeerReviewService;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class PeerReviewControllerTest {

    private final PeerReviewService peerReviewService = mock(PeerReviewService.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final PeerReviewController controller = new PeerReviewController(peerReviewService, userRepository);

    @Test
    void submitReview_rejectsReviewerIdThatDoesNotMatchAuthenticatedUser() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getName()).thenReturn("member@example.com");
        User user = new User();
        user.setId(3L);
        when(userRepository.findByEmail("member@example.com")).thenReturn(Optional.of(user));

        ReviewSubmissionDto request = new ReviewSubmissionDto();
        request.setReviewerId(99L);

        assertThatThrownBy(() -> controller.submitReview(12L, request, authentication))
                .isInstanceOf(ForbiddenException.class)
                .hasMessageContaining("authenticated user");
        verifyNoInteractions(peerReviewService);
    }
}
