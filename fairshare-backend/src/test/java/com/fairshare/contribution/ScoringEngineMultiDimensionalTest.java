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
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Unit Test cho Mô hình đo lường đóng góp đa chiều 4 tầng (Sprint 4 - CR-03)")
class ScoringEngineMultiDimensionalTest {

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

    private ActivityEvent createEvent(User user, String eventType, Double storyPoints, Boolean isOnTime, Double delayDays) {
        ActivityEvent event = new ActivityEvent();
        event.setUser(user);
        event.setSource(ActivitySource.BOARD);
        event.setEventType(eventType);
        event.setStoryPoints(storyPoints);
        event.setIsOnTime(isOnTime);
        event.setDelayDays(delayDays);
        event.setOccurredAt(LocalDateTime.now());
        return event;
    }

    @Test
    @DisplayName("Tầng 2 - Chống gian lận: Tách nhỏ card thành nhiều card nhỏ bị giảm dần lợi ích theo log(1+x)")
    void testAntiGamingLogTransformDiminishingReturns() {
        User alice = createUser(1L, "Alice", "alice@example.com");
        User bob = createUser(2L, "Bob", "bob@example.com");
        List<User> members = List.of(alice, bob);

        // Alice hoàn thành 1 card lớn 8 SP
        List<ActivityEvent> eventsAlice = List.of(
                createEvent(alice, "CARD_COMPLETED", 8.0, true, 0.0)
        );

        // Bob cố tình "cày card" bằng cách chia nhỏ thành 8 card 1 SP (tổng vẫn là 8 SP)
        List<ActivityEvent> eventsBob = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            eventsBob.add(createEvent(bob, "CARD_COMPLETED", 1.0, true, 0.0));
        }

        List<ActivityEvent> allEvents = new ArrayList<>();
        allEvents.addAll(eventsAlice);
        allEvents.addAll(eventsBob);

        List<ScoringEngine.MemberContributionResult> results = scoringEngine.calculateScores(members, allEvents);

        assertThat(results).hasSize(2);
        // Nhờ chuẩn hóa log(1+x), Bob không thể nhận điểm vượt trội gấp nhiều lần so với Alice chỉ vì số lượng card
        double aliceScore = results.get(0).getFinalScore().doubleValue();
        double bobScore = results.get(1).getFinalScore().doubleValue();

        assertThat(Math.abs(aliceScore - bobScore)).isLessThan(20.0);
    }

    @Test
    @DisplayName("Tầng 3 & 4 - Đánh giá chéo ẩn danh D4: Chỉ kích hoạt khi >= 3 lượt chấm")
    void testPeerReviewWeightActivationCondition() {
        User alice = createUser(1L, "Alice", "alice@example.com");
        User bob = createUser(2L, "Bob", "bob@example.com");
        List<User> members = List.of(alice, bob);

        List<ActivityEvent> events = List.of(
                createEvent(alice, "CARD_COMPLETED", 5.0, true, 0.0),
                createEvent(bob, "CARD_COMPLETED", 5.0, true, 0.0)
        );

        // Trường hợp 1: Chỉ có 2 lượt chấm (< 3) -> D4 không tham gia tính điểm
        Map<Long, Double> peerScores = Map.of(alice.getId(), 5.0, bob.getId(), 3.0);
        Map<Long, Integer> peerCountsInsufficient = Map.of(alice.getId(), 2, bob.getId(), 2);

        List<ScoringEngine.MemberContributionResult> res1 = scoringEngine.calculateScores(
                members, events, Collections.emptyMap(), peerScores, peerCountsInsufficient, Collections.emptyMap(), false
        );

        // Do chưa đủ 3 lượt, trọng số D4 = 0, cả 2 bằng nhau về task nên finalScore xấp xỉ 50-50
        assertThat(res1.get(0).getD4Peer()).isEqualTo(0.0);
        assertThat(res1.get(0).getFinalScore()).isEqualTo(new BigDecimal("50.00"));

        // Trường hợp 2: Có 3 lượt chấm (>= 3) -> D4 kích hoạt, Alice được điểm chéo 5.0 vượt trội hơn Bob 3.0
        Map<Long, Integer> peerCountsSufficient = Map.of(alice.getId(), 3, bob.getId(), 3);
        List<ScoringEngine.MemberContributionResult> res2 = scoringEngine.calculateScores(
                members, events, Collections.emptyMap(), peerScores, peerCountsSufficient, Collections.emptyMap(), false
        );

        assertThat(res2.get(0).getFinalScore().doubleValue()).isGreaterThan(res2.get(1).getFinalScore().doubleValue());
    }

    @Test
    @DisplayName("Tầng 4 - Hệ số khả dụng a_i: Người có mặt ít hơn (nghỉ phép/thi cử) được bù điểm công bằng")
    void testAvailabilityFactorAdjustment() {
        User alice = createUser(1L, "Alice", "alice@example.com");
        User bob = createUser(2L, "Bob", "bob@example.com");
        User charlie = createUser(3L, "Charlie", "charlie@example.com");
        List<User> members = List.of(alice, bob, charlie);

        // Bob làm 6 SP (trên trung vị 5 SP của Alice), Charlie làm 2 SP
        List<ActivityEvent> events = List.of(
                createEvent(bob, "CARD_COMPLETED", 6.0, true, 0.0),
                createEvent(alice, "CARD_COMPLETED", 5.0, true, 0.0),
                createEvent(charlie, "CARD_COMPLETED", 2.0, true, 0.0)
        );

        // Trường hợp không bù (cả 3 đều a_i = 1.0)
        List<ScoringEngine.MemberContributionResult> resNormal = scoringEngine.calculateScores(
                members, events, Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), false
        );

        // Trường hợp Bob được bù khả dụng a_i = 0.5 (hệ số bù 1 + 0.5 * (1 - 0.5) = 1.25)
        Map<Long, Double> availability = Map.of(alice.getId(), 1.0, bob.getId(), 0.5, charlie.getId(), 1.0);
        List<ScoringEngine.MemberContributionResult> resAdjusted = scoringEngine.calculateScores(
                members, events, Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), availability, false
        );

        // Điểm của Bob sau khi được bù khả dụng cao hơn so với khi chưa được bù
        double bobScoreNormal = resNormal.get(1).getFinalScore().doubleValue();
        double bobScoreAdjusted = resAdjusted.get(1).getFinalScore().doubleValue();
        assertThat(bobScoreAdjusted).isGreaterThan(bobScoreNormal);
        assertThat(resAdjusted.get(1).getAvailabilityFactor()).isEqualTo(0.5);
    }

    @Test
    @DisplayName("Phần 3 - Không gian đa chiều: Gắn cờ ngờ vực (Suspicion Flag) khi Output cao bất thường nhưng Peer thấp")
    void testSuspicionFlagAnomalyDetection() {
        User alice = createUser(1L, "Alice", "alice@example.com");
        User bob = createUser(2L, "Bob", "bob@example.com");
        User charlie = createUser(3L, "Charlie", "charlie@example.com");
        List<User> members = List.of(alice, bob, charlie);

        // Alice làm cực nhiều card (Output D1 rất cao)
        List<ActivityEvent> events = List.of(
                createEvent(alice, "CARD_COMPLETED", 20.0, false, 5.0),
                createEvent(bob, "CARD_COMPLETED", 5.0, true, 0.0),
                createEvent(charlie, "CARD_COMPLETED", 5.0, true, 0.0)
        );

        // Nhưng đồng đội đánh giá Alice rất thấp (D4 bị âm / rất thấp)
        Map<Long, Double> peerScores = Map.of(alice.getId(), 1.0, bob.getId(), 4.5, charlie.getId(), 4.5);
        Map<Long, Integer> peerCounts = Map.of(alice.getId(), 3, bob.getId(), 3, charlie.getId(), 3);

        List<ScoringEngine.MemberContributionResult> results = scoringEngine.calculateScores(
                members, events, Collections.emptyMap(), peerScores, peerCounts, Collections.emptyMap(), false
        );

        // Alice bị gắn cờ ngờ vực (isSuspicious = true)
        assertThat(results.get(0).isSuspicious()).isTrue();
        assertThat(results.get(1).isSuspicious()).isFalse();
    }

    @Test
    @DisplayName("Phần 4 - Độ tin cậy Bootstrap: Hiển thị cờ chưa đủ bằng chứng nếu số sự kiện < 5")
    void testInsufficientEvidenceFlagWhenEventsLessThan5() {
        User alice = createUser(1L, "Alice", "alice@example.com");
        User bob = createUser(2L, "Bob", "bob@example.com");
        List<User> members = List.of(alice, bob);

        // Alice chỉ có 2 sự kiện (< 5)
        List<ActivityEvent> events = List.of(
                createEvent(alice, "CARD_COMPLETED", 3.0, true, 0.0),
                createEvent(alice, "CARD_COMPLETED", 2.0, true, 0.0),
                createEvent(bob, "CARD_COMPLETED", 1.0, true, 0.0),
                createEvent(bob, "CARD_COMPLETED", 1.0, true, 0.0),
                createEvent(bob, "CARD_COMPLETED", 1.0, true, 0.0),
                createEvent(bob, "CARD_COMPLETED", 1.0, true, 0.0),
                createEvent(bob, "CARD_COMPLETED", 1.0, true, 0.0) // Bob có 5 sự kiện
        );

        List<ScoringEngine.MemberContributionResult> results = scoringEngine.calculateScores(
                members, events, Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), true
        );

        // Alice: chưa đủ bằng chứng (< 5 sự kiện)
        assertThat(results.get(0).isHasSufficientEvidence()).isFalse();
        // Bob: đủ bằng chứng (>= 5 sự kiện) và có khoảng tin cậy Bootstrap [ciLow, ciHigh]
        assertThat(results.get(1).isHasSufficientEvidence()).isTrue();
        assertThat(results.get(1).getConfidenceIntervalLow()).isNotNull();
        assertThat(results.get(1).getConfidenceIntervalHigh()).isNotNull();
    }
}
