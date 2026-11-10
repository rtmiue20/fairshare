package com.fairshare.contribution;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.contribution.service.ScoringEngine;
import com.fairshare.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm thử hiệu năng với bộ dữ liệu lớn (Sprint 5 - WBS 5.4.3 - M3).
 * Tiêu chí nghiệm thu (DoD): Nạp dữ liệu mẫu lớn (nhóm 6 người, đến 500 task),
 * đo hiệu năng dashboard và ghi kết quả.
 */
@DisplayName("Kiểm thử hiệu năng xử lý dữ liệu lớn 500 Tasks / 6 Thành viên (WBS 5.4.3 - M3)")
public class LargeDatasetPerformanceTest {

    private ScoringEngine scoringEngine;
    private List<User> members;
    private List<ActivityEvent> largeEventDataset;

    private static final int TOTAL_TASKS = 500;
    private static final int ITERATIONS = 15; // Đo đạc >= 10 lần

    @BeforeEach
    void setUp() {
        scoringEngine = new ScoringEngine();

        // 1. Tạo 6 thành viên nhóm theo đúng cơ cấu đề án FairShare
        members = new ArrayList<>();
        members.add(createUser(1L, "Nguyễn Văn Minh Triều (Leader)", "leader@fairshare.local"));
        members.add(createUser(2L, "Lê Phúc Vương (M1 - Platform)", "m1.vuong@fairshare.local"));
        members.add(createUser(3L, "Hà Ngọc Thiện (M2 - BA)", "m2.thien@fairshare.local"));
        members.add(createUser(4L, "Ngô Trọng Phúc (M3 - Data/DB)", "m3.phuc@fairshare.local"));
        members.add(createUser(5L, "Triệu Nguyễn Huỳnh Khang (M4 - PeerReview)", "m4.khang@fairshare.local"));
        members.add(createUser(6L, "Nguyễn Nam Anh (M5 - QA/Deploy)", "m5.namanh@fairshare.local"));

        // 2. Tạo 500 tasks (ActivityEvents) đa dạng phân bổ cho 6 thành viên
        largeEventDataset = new ArrayList<>(TOTAL_TASKS);
        Random rand = new Random(10074); // MSSV seed
        String[] types = {"CARD_COMPLETED", "CARD_COMPLETED", "CARD_MOVED", "COMMENT_HELPFUL", "REWORK_REQUIRED"};

        for (int i = 1; i <= TOTAL_TASKS; i++) {
            User user = members.get((i - 1) % 6);
            String type = types[rand.nextInt(types.length)];
            double sp = 1.0 + rand.nextInt(8); // Story points 1, 2, 3, 5, 8
            int diff = 1 + rand.nextInt(3);    // Độ khó 1..3
            boolean onTime = rand.nextDouble() > 0.12;
            double delay = onTime ? 0.0 : 1.0 + rand.nextInt(3);

            ActivityEvent event = new ActivityEvent();
            event.setId((long) i);
            event.setUser(user);
            event.setSource(ActivitySource.BOARD);
            event.setEventType(type);
            event.setStoryPoints(sp);
            event.setDifficultyLevel(diff);
            event.setIsOnTime(onTime);
            event.setDelayDays(delay);
            event.setDetails("Task công việc #" + i);
            event.setOccurredAt(LocalDateTime.now().minusDays(30 - (i % 30)));
            largeEventDataset.add(event);
        }
    }

    private User createUser(Long id, String name, String email) {
        User u = new User();
        u.setId(id);
        u.setFullName(name);
        u.setEmail(email);
        return u;
    }

    @Test
    @DisplayName("Đo đạc hiệu năng Dashboard với 500 tasks qua 15 lần chạy (Trung vị, Mean, P95, Throughput)")
    void testPerformanceWith500Tasks() {
        assertEquals(500, largeEventDataset.size(), "Tập dữ liệu phải có chính xác 500 tasks");
        assertEquals(6, members.size(), "Nhóm phải gồm chính xác 6 thành viên");

        // Warm up
        for (int w = 0; w < 3; w++) {
            scoringEngine.calculateScores(members, largeEventDataset, Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), false);
        }

        List<Double> executionTimesMs = new ArrayList<>();

        List<ScoringEngine.MemberContributionResult> lastResults = null;
        for (int it = 0; it < ITERATIONS; it++) {
            long startNanos = System.nanoTime();
            lastResults = scoringEngine.calculateScores(
                    members, largeEventDataset, Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), false
            );
            long elapsedNanos = System.nanoTime() - startNanos;
            executionTimesMs.add(elapsedNanos / 1_000_000.0);
        }

        // Tính toán thống kê
        List<Double> sorted = new ArrayList<>(executionTimesMs);
        Collections.sort(sorted);
        double min = sorted.get(0);
        double max = sorted.get(sorted.size() - 1);
        double mean = sorted.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        double median = (sorted.size() % 2 == 1)
                ? sorted.get(sorted.size() / 2)
                : (sorted.get((sorted.size() / 2) - 1) + sorted.get(sorted.size() / 2)) / 2.0;
        int p95Idx = (int) Math.ceil(0.95 * sorted.size()) - 1;
        double p95 = sorted.get(Math.max(0, Math.min(sorted.size() - 1, p95Idx)));
        double throughput = TOTAL_TASKS / (median / 1000.0);

        System.out.println("=========================================================================");
        System.out.println(" BÁO CÁO HIỆU NĂNG TÍNH TOÁN DỮ LIỆU LỚN 500 TASKS (WBS 5.4.3 - M3)");
        System.out.println("=========================================================================");
        System.out.printf("Quy mô: %d tasks | 6 thành viên | %d lần lặp\n", TOTAL_TASKS, ITERATIONS);
        System.out.printf("Thời gian thực thi Min:    %.3f ms\n", min);
        System.out.printf("Thời gian thực thi Trung vị: %.3f ms\n", median);
        System.out.printf("Thời gian thực thi Mean:   %.3f ms\n", mean);
        System.out.printf("Thời gian thực thi P95:    %.3f ms\n", p95);
        System.out.printf("Năng lực xử lý (Throughput):  %.0f tasks/giây\n", throughput);
        System.out.println("-------------------------------------------------------------------------");
        System.out.println("Phân bổ kết quả điểm 6 thành viên:");
        assertNotNull(lastResults);
        double sumPct = 0.0;
        for (ScoringEngine.MemberContributionResult r : lastResults) {
            sumPct += r.getPercentage().doubleValue();
            System.out.printf(" - %-32s: %5.2f%% (%d cards, %.1f SP, onTime: %.1f%%)\n",
                    r.getUser().getFullName(), r.getFinalScore().doubleValue(),
                    r.getCardsCompleted(), r.getTotalStoryPoints(), r.getOnTimeRate() * 100);
        }
        System.out.printf("Tổng tỷ lệ phần trăm: %.2f%%\n", sumPct * 100);
        System.out.println("=========================================================================");

        // Tiêu chí nghiệm thu (DoD):
        // 1. Phải hoàn tất xử lý 500 task cho 6 thành viên trong < 100ms (vượt xa mục tiêu G4 < 10s)
        assertTrue(median < 100.0, "Thời gian tính toán trung vị phải < 100ms, thực tế: " + median + "ms");
        // 2. Tổng tỷ lệ phần trăm phải bằng 100% (sai số <= 0.01)
        assertEquals(1.0, sumPct, 0.01, "Tổng % của 6 thành viên phải bằng 100%");
        // 3. Mỗi thành viên có dữ liệu thống kê
        assertEquals(6, lastResults.size());
    }
}

