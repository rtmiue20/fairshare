package com.fairshare.peerreview;

import com.fairshare.peerreview.entity.ReviewSubmission;
import com.fairshare.peerreview.service.AnonymityAggregator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Unit tests for AnonymityAggregator (M4)")
public class AnonymityAggregatorTest {

    private AnonymityAggregator aggregator;

    @BeforeEach
    void setUp() {
        aggregator = new AnonymityAggregator();
    }

    private ReviewSubmission createSubmission(int score, String feedback) {
        ReviewSubmission s = new ReviewSubmission();
        s.setScore(score);
        s.setFeedback(feedback);
        return s;
    }

    @Test
    @DisplayName("When submissions are below threshold, feedback is hidden and safe flag is false")
    void testAnonymityBelowThreshold() {
        List<ReviewSubmission> list = List.of(
                createSubmission(5, "Good job"),
                createSubmission(4, "Nice work")
        );

        AnonymityAggregator.AggregatedResult result = aggregator.aggregateForReviewee(100L, list, 3);

        assertFalse(result.isAnonymousSafe());
        assertEquals(2, result.getSubmissionCount());
        assertTrue(result.getFeedbackComments().isEmpty());
    }

    @Test
    @DisplayName("When submissions meet or exceed threshold, feedback is visible and safe flag is true")
    void testAnonymityAboveThreshold() {
        List<ReviewSubmission> list = List.of(
                createSubmission(5, "Good job"),
                createSubmission(4, "Nice work"),
                createSubmission(3, "Needs improvement")
        );

        AnonymityAggregator.AggregatedResult result = aggregator.aggregateForReviewee(100L, list, 3);

        assertTrue(result.isAnonymousSafe());
        assertEquals(3, result.getSubmissionCount());
        assertEquals(4.0, result.getAverageScore(), 0.01);
        assertEquals(3, result.getFeedbackComments().size());
    }
}
