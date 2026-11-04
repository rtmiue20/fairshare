package com.fairshare.contribution;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.contribution.service.ScoringEngine;
import com.fairshare.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Unit tests for ScoringEngine v1")
class ScoringEngineTest {

    private ScoringEngine scoringEngine;

    @BeforeEach
    void setUp() {
        scoringEngine = new ScoringEngine();
    }

    private User createUser(Long id, String name, String email) {
        User user = new User();
        user.setId(id);
        user.setFullName(name);
        user.setEmail(email);
        return user;
    }

    private ActivityEvent createEvent(User user, String eventType, Double storyPoints, Boolean isOnTime) {
        ActivityEvent event = new ActivityEvent();
        event.setUser(user);
        event.setSource(ActivitySource.BOARD);
        event.setEventType(eventType);
        event.setStoryPoints(storyPoints);
        event.setIsOnTime(isOnTime);
        event.setOccurredAt(LocalDateTime.now());
        return event;
    }

    @Test
    @DisplayName("Single contributor should receive 100% of the score")
    void testSingleContributorTakes100Percent() {
        User alice = createUser(1L, "Alice", "alice@example.com");
        List<User> members = List.of(alice);

        List<ActivityEvent> events = List.of(
                createEvent(alice, "CARD_COMPLETED", 5.0, true),
                createEvent(alice, "CARD_COMPLETED", 3.0, true)
        );

        List<ScoringEngine.MemberContributionResult> results = scoringEngine.calculateScores(members, events);

        assertEquals(1, results.size());
        assertEquals(new BigDecimal("1.0000"), results.get(0).getPercentage());
        assertEquals(new BigDecimal("100.00"), results.get(0).getFinalScore());
        assertEquals(2, results.get(0).getCardsCompleted());
        assertEquals(8.0, results.get(0).getTotalStoryPoints());
    }

    @Test
    @DisplayName("Two equal contributors should get 50% split each")
    void testEqualContributorsGetEqualSplit() {
        User alice = createUser(1L, "Alice", "alice@example.com");
        User bob = createUser(2L, "Bob", "bob@example.com");
        List<User> members = List.of(alice, bob);

        List<ActivityEvent> events = List.of(
                createEvent(alice, "CARD_COMPLETED", 5.0, true),
                createEvent(bob, "CARD_COMPLETED", 5.0, true)
        );

        List<ScoringEngine.MemberContributionResult> results = scoringEngine.calculateScores(members, events);

        assertEquals(2, results.size());
        assertEquals(new BigDecimal("0.5000"), results.get(0).getPercentage());
        assertEquals(new BigDecimal("50.00"), results.get(0).getFinalScore());
        assertEquals(new BigDecimal("0.5000"), results.get(1).getPercentage());
        assertEquals(new BigDecimal("50.00"), results.get(1).getFinalScore());
    }

    @Test
    @DisplayName("Unequal contribution reflects higher score for higher output & timeliness")
    void testUnequalContributorsReflectEffort() {
        User alice = createUser(1L, "Alice", "alice@example.com");
        User bob = createUser(2L, "Bob", "bob@example.com");
        List<User> members = List.of(alice, bob);

        List<ActivityEvent> events = List.of(
                createEvent(alice, "CARD_COMPLETED", 8.0, true),
                createEvent(alice, "CARD_COMPLETED", 5.0, true),
                createEvent(bob, "CARD_COMPLETED", 2.0, false)
        );

        List<ScoringEngine.MemberContributionResult> results = scoringEngine.calculateScores(members, events);

        assertEquals(2, results.size());
        assertTrue(results.get(0).getFinalScore().doubleValue() > results.get(1).getFinalScore().doubleValue());
        assertTrue(results.get(0).getFinalScore().doubleValue() > 70.0);
        assertTrue(results.get(1).getFinalScore().doubleValue() < 30.0);

        // Sum of percentages should be approx 1.00
        double sumPct = results.get(0).getPercentage().doubleValue() + results.get(1).getPercentage().doubleValue();
        assertEquals(1.0, sumPct, 0.01);
    }

    @Test
    @DisplayName("Zero activity events defaults to equal share for all members")
    void testZeroActivityDefaultsToEqualSplit() {
        User alice = createUser(1L, "Alice", "alice@example.com");
        User bob = createUser(2L, "Bob", "bob@example.com");
        User charlie = createUser(3L, "Charlie", "charlie@example.com");
        List<User> members = List.of(alice, bob, charlie);

        List<ScoringEngine.MemberContributionResult> results = scoringEngine.calculateScores(members, new ArrayList<>());

        assertEquals(3, results.size());
        for (ScoringEngine.MemberContributionResult res : results) {
            assertEquals(new BigDecimal("0.3333"), res.getPercentage());
            assertEquals(new BigDecimal("33.33"), res.getFinalScore());
        }
    }

    @Test
    @DisplayName("Collaboration events add positive bonus to score")
    void testCollaborationBonus() {
        User alice = createUser(1L, "Alice", "alice@example.com");
        User bob = createUser(2L, "Bob", "bob@example.com");
        List<User> members = List.of(alice, bob);

        List<ActivityEvent> events = List.of(
                createEvent(alice, "CARD_COMPLETED", 4.0, true),
                createEvent(alice, "COMMENT_HELPFUL", 0.0, true),
                createEvent(alice, "PEER_REVIEW", 0.0, true),
                createEvent(bob, "CARD_COMPLETED", 4.0, true)
        );

        List<ScoringEngine.MemberContributionResult> results = scoringEngine.calculateScores(members, events);

        // Alice has same card completion as Bob but extra collaboration events
        assertTrue(results.get(0).getFinalScore().doubleValue() > results.get(1).getFinalScore().doubleValue());
    }
}
