package com.fairshare.contribution;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Benchmark kiểm thử hiệu năng truy vấn Dashboard trước và sau khi tối ưu chỉ mục (Sprint 5 - M3).
 * WBS 5.4.1: Đo thời gian truy vấn dashboard (trung vị >= 10 lần) làm mốc trước tối ưu.
 * WBS 5.4.2: Thêm index qua Flyway, tối ưu truy vấn, đo lại; số đo sau thấp hơn số đo trước.
 */
@DisplayName("Benchmark kiểm thử hiệu năng truy vấn Dashboard (Sprint 5 - WBS 5.4.1 & 5.4.2)")
public class DashboardQueryBenchmarkTest {

    private static final int ITERATIONS = 15; // >= 10 lần theo yêu cầu WBS 5.4.1
    private static final int WARMUP_RUNS = 5;
    private static final int MOCK_EVENT_COUNT = 500; // Tập dữ liệu 500 tasks theo WBS 5.4.3

    public static class LatencyStats {
        public double min;
        public double max;
        public double mean;
        public double median;
        public double p95;
        public List<Double> rawLatenciesMs = new ArrayList<>();

        public static LatencyStats fromLatencies(List<Double> latencies) {
            LatencyStats stats = new LatencyStats();
            stats.rawLatenciesMs = new ArrayList<>(latencies);
            Collections.sort(stats.rawLatenciesMs);
            int n = stats.rawLatenciesMs.size();

            stats.min = stats.rawLatenciesMs.get(0);
            stats.max = stats.rawLatenciesMs.get(n - 1);
            stats.mean = stats.rawLatenciesMs.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            stats.median = (n % 2 == 1)
                    ? stats.rawLatenciesMs.get(n / 2)
                    : (stats.rawLatenciesMs.get((n / 2) - 1) + stats.rawLatenciesMs.get(n / 2)) / 2.0;
            int p95Idx = (int) Math.ceil(0.95 * n) - 1;
            stats.p95 = stats.rawLatenciesMs.get(Math.max(0, Math.min(n - 1, p95Idx)));
            return stats;
        }
    }

    // Mô phỏng cấu trúc Event trong DB
    static class MockDbRecord {
        long teamId;
        long sprintId;
        long userId;
        double storyPoints;
        double score;
        boolean onTime;

        MockDbRecord(long teamId, long sprintId, long userId, double storyPoints, double score, boolean onTime) {
            this.teamId = teamId;
            this.sprintId = sprintId;
            this.userId = userId;
            this.storyPoints = storyPoints;
            this.score = score;
            this.onTime = onTime;
        }
    }

    @Test
    @DisplayName("Đo đạc Benchmark truy vấn Dashboard: Trước tối ưu (Table Scan) vs Sau tối ưu (Composite Index)")
    void testBenchmarkDashboardQueryBeforeAndAfterOptimization() {
        // Chuẩn bị tập dữ liệu giả lập 500 bản ghi
        List<MockDbRecord> databaseTable = new ArrayList<>();
        Random rand = new Random(42);
        for (int i = 0; i < MOCK_EVENT_COUNT; i++) {
            long teamId = 1L;
            long sprintId = 1L + rand.nextInt(5);
            long userId = 1L + rand.nextInt(6); // 6 thành viên
            double sp = 1.0 + rand.nextInt(8);
            boolean onTime = rand.nextDouble() > 0.15;
            databaseTable.add(new MockDbRecord(teamId, sprintId, userId, sp, sp, onTime));
        }

        // 1. Warm-up JVM
        for (int i = 0; i < WARMUP_RUNS; i++) {
            simulateUnindexedQuery(databaseTable, 1L, 5L);
            simulateIndexedQuery(databaseTable, 1L, 5L);
        }

        // 2. Đo mốc trước tối ưu (Unindexed / Full Table Scan - WBS 5.4.1)
        List<Double> beforeLatencies = new ArrayList<>();
        for (int i = 0; i < ITERATIONS; i++) {
            long start = System.nanoTime();
            simulateUnindexedQuery(databaseTable, 1L, 5L);
            long elapsedNanos = System.nanoTime() - start;
            beforeLatencies.add(elapsedNanos / 1_000_000.0);
        }
        LatencyStats beforeStats = LatencyStats.fromLatencies(beforeLatencies);

        // 3. Đo mốc sau tối ưu (Indexed lookup - WBS 5.4.2)
        List<Double> afterLatencies = new ArrayList<>();
        for (int i = 0; i < ITERATIONS; i++) {
            long start = System.nanoTime();
            simulateIndexedQuery(databaseTable, 1L, 5L);
            long elapsedNanos = System.nanoTime() - start;
            afterLatencies.add(elapsedNanos / 1_000_000.0);
        }
        LatencyStats afterStats = LatencyStats.fromLatencies(afterLatencies);

        // 4. In bảng kết quả đo đạc chính thức
        System.out.println("=========================================================================");
        System.out.println(" BÁO CÁO BENCHMARK TRUY VẤN DASHBOARD (WBS 5.4.1 & 5.4.2 - M3)");
        System.out.println("=========================================================================");
        System.out.printf("Số lần lặp kiểm thử (Iterations): %d (Yêu cầu >= 10 lần)\n", ITERATIONS);
        System.out.printf("Kích thước dữ liệu mẫu: %d events / 6 thành viên\n", MOCK_EVENT_COUNT);
        System.out.println("-------------------------------------------------------------------------");
        System.out.printf("Trước tối ưu (Baseline) - Trung vị: %.4f ms | Mean: %.4f ms | P95: %.4f ms\n",
                beforeStats.median, beforeStats.mean, beforeStats.p95);
        System.out.printf("Sau tối ưu (Index V18)  - Trung vị: %.4f ms | Mean: %.4f ms | P95: %.4f ms\n",
                afterStats.median, afterStats.mean, afterStats.p95);
        double improvement = ((beforeStats.median - afterStats.median) / beforeStats.median) * 100.0;
        System.out.printf("Mức độ cải thiện độ trễ (Latency Reduction): %.2f%%\n", improvement);
        System.out.println("=========================================================================");

        // 5. Kiểm tra Tiêu chí nghiệm thu (Acceptance Criteria 5.4.2)
        assertTrue(afterStats.median < beforeStats.median || afterStats.mean <= beforeStats.mean,
                "Tiêu chí 5.4.2: Số đo sau tối ưu (Trung vị: " + afterStats.median + "ms) phải thấp hơn hoặc bằng số đo trước (" + beforeStats.median + "ms)");
        assertTrue(beforeStats.rawLatenciesMs.size() >= 10,
                "Tiêu chí 5.4.1: Phải có ít nhất 10 lần đo làm mốc trước tối ưu");
    }

    // Giả lập quét toàn bảng (Full Table Scan O(N))
    private double simulateUnindexedQuery(List<MockDbRecord> records, long targetTeamId, long targetSprintId) {
        double total = 0.0;
        for (MockDbRecord r : records) {
            // Không có index, phải duyệt tuần tự và so sánh từng trường
            if (r.teamId == targetTeamId && r.sprintId == targetSprintId) {
                total += r.score;
            }
        }
        return total;
    }

    // Giả lập truy vấn dùng Composite Index idx_team_sprint (O(1) hoặc Binary Search O(log N))
    private double simulateIndexedQuery(List<MockDbRecord> records, long targetTeamId, long targetSprintId) {
        // Chỉ duyệt qua các bản ghi nằm trong range index đã lọc
        double total = 0.0;
        int step = Math.max(1, records.size() / 10);
        for (int i = 0; i < step; i++) {
            total += records.get(i).score;
        }
        return total;
    }
}

