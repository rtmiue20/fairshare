package com.fairshare.contribution.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.user.entity.User;
import lombok.Builder;
import lombok.Data;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * ScoringEngine - Mô hình đo lường đóng góp đa chiều 4 tầng (Sprint 4 - CR-03)
 *
 * Tầng 1: Vector đặc trưng thô x_i = (Sản lượng, Tin cậy, Phối hợp, Ngoài hệ thống, Chấm chéo)
 * Tầng 2: Chuẩn hóa chống gian lận: ln(1 + x) và chuẩn hóa Robust theo Median & MAD của nhóm
 * Tầng 3: Nén về 4 chiều chính: D1 Output, D2 Reliability, D3 Collaboration, D4 Peer
 * Tầng 4: Hiệu chỉnh khả dụng a_i và điểm tổng hợp C_i qua hàm Logistic Sigmoid, Bootstrap CI 95%
 */
@Component
public class ScoringEngine {

    private static final double EPSILON = 1e-6;
    private static final int DEFAULT_BOOTSTRAP_ROUNDS = 1000;

    @Data
    @Builder
    public static class MemberContributionResult {
        private User user;
        private int cardsCompleted;
        private double totalStoryPoints;
        private double onTimeRate;
        private int reworkCount;
        private int collabCount;
        private double manualPoints;
        private double rawScore;

        // Điểm tỷ lệ & điểm số cuối cùng
        private BigDecimal percentage;
        private BigDecimal finalScore;

        // Mô hình 4 chiều chính (Tầng 3)
        private double d1Output;
        private double d2Reliability;
        private double d3Collaboration;
        private double d4Peer;

        // Tầng 4 & Đánh giá thống kê
        private double compositeScore;
        private double availabilityFactor;
        private Double confidenceIntervalLow;
        private Double confidenceIntervalHigh;
        private double distanceToCenter;
        private boolean isSuspicious;
        private boolean hasSufficientEvidence;
        private int totalEventsCount;
    }

    /**
     * Phương thức tương thích ngược v1 (sử dụng danh sách User và ActivityEvent).
     */
    public List<MemberContributionResult> calculateScores(List<User> members, List<ActivityEvent> events) {
        return calculateScores(members, events, Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), Collections.emptyMap(), true);
    }

    /**
     * Phương thức tính toán toàn diện theo Mô hình 4 tầng.
     *
     * @param members             Danh sách thành viên nhóm
     * @param events              Danh sách ActivityEvent trong sprint
     * @param manualPointsMap     Map điểm đóng góp thủ công (manual_contributions approved) theo userId
     * @param peerScoresMap       Map điểm chấm chéo ẩn danh (peer review average) theo userId
     * @param peerCountsMap       Map số lượt chấm chéo nhận được theo userId
     * @param availabilityMap     Map hệ số khả dụng a_i theo userId (giá trị trong [0.5, 1.0])
     * @param runBootstrap        Có chạy mô phỏng Bootstrap 1000 lần để tính khoảng tin cậy không
     * @return Danh sách kết quả chi tiết từng thành viên
     */
    public List<MemberContributionResult> calculateScores(
            List<User> members,
            List<ActivityEvent> events,
            Map<Long, Double> manualPointsMap,
            Map<Long, Double> peerScoresMap,
            Map<Long, Integer> peerCountsMap,
            Map<Long, Double> availabilityMap,
            boolean runBootstrap
    ) {
        if (members == null || members.isEmpty()) {
            return Collections.emptyList();
        }

        int memberCount = members.size();

        // 1. Phân loại sự kiện theo thành viên
        Map<Long, List<ActivityEvent>> userEventsMap = new HashMap<>();
        for (User m : members) {
            userEventsMap.put(m.getId(), new ArrayList<>());
        }

        if (events != null) {
            for (ActivityEvent e : events) {
                if (e.getUser() != null && userEventsMap.containsKey(e.getUser().getId())) {
                    userEventsMap.get(e.getUser().getId()).add(e);
                }
            }
        }

        // =====================================================================
        // TẦNG 1: TRÍCH XUẤT VECTOR ĐẶC TRƯNG THÔ x_i
        // =====================================================================
        double[] rawSp = new double[memberCount];
        double[] rawCards = new double[memberCount];
        double[] rawManual = new double[memberCount];
        double[] rawOnTime = new double[memberCount];
        double[] rawRework = new double[memberCount];
        double[] rawLatency = new double[memberCount];
        double[] rawCollab = new double[memberCount];
        double[] rawPeer = new double[memberCount];
        boolean[] hasPeerReview = new boolean[memberCount];
        double[] rawAvailability = new double[memberCount];
        int[] eventCounts = new int[memberCount];

        for (int i = 0; i < memberCount; i++) {
            User m = members.get(i);
            List<ActivityEvent> userEvents = userEventsMap.get(m.getId());
            eventCounts[i] = userEvents.size();

            int cardsDone = 0;
            double spDone = 0.0;
            int onTimeCount = 0;
            int reworkCount = 0;
            int collabCount = 0;
            double totalLatencyDays = 0.0;

            for (ActivityEvent e : userEvents) {
                String type = e.getEventType() != null ? e.getEventType().toUpperCase() : "";

                if (type.contains("COMPLETED") || type.contains("DONE")) {
                    cardsDone++;
                    double sp = e.getStoryPoints() != null ? e.getStoryPoints() : 1.0;
                    if (e.getDifficultyLevel() != null && e.getDifficultyLevel() > 1) {
                        sp *= (1.0 + 0.1 * (e.getDifficultyLevel() - 1));
                    }
                    spDone += sp;

                    if (Boolean.TRUE.equals(e.getIsOnTime())) {
                        onTimeCount++;
                    }
                    if (e.getDelayDays() != null && e.getDelayDays() > 0.0) {
                        totalLatencyDays += e.getDelayDays();
                    }
                } else if (type.contains("CARD_CREATED") || type.contains("CARD_MOVED")) {
                    if (e.getStoryPoints() != null && e.getStoryPoints() > 0) {
                        spDone += e.getStoryPoints() * 0.2; // partial credit
                    }
                }

                if (type.contains("REWORK") || type.contains("REOPEN") || type.contains("BACK")) {
                    reworkCount++;
                }

                if (type.contains("COMMENT") || type.contains("HELPFUL") || type.contains("REVIEW") || type.contains("SUPPORT")) {
                    collabCount++;
                }
            }

            rawCards[i] = cardsDone;
            rawSp[i] = spDone;
            rawOnTime[i] = cardsDone > 0 ? (double) onTimeCount / cardsDone : 1.0;
            rawRework[i] = reworkCount;
            rawLatency[i] = cardsDone > 0 ? totalLatencyDays / cardsDone : 0.0;
            rawCollab[i] = collabCount;

            // Đóng góp thủ công
            rawManual[i] = manualPointsMap.getOrDefault(m.getId(), 0.0);

            // Chấm chéo (chỉ ghi nhận khi >= 3 lượt chấm)
            int peerCount = peerCountsMap.getOrDefault(m.getId(), 0);
            if (peerCount >= 3 && peerScoresMap.containsKey(m.getId())) {
                rawPeer[i] = peerScoresMap.get(m.getId());
                hasPeerReview[i] = true;
            } else {
                rawPeer[i] = 0.0;
                hasPeerReview[i] = false;
            }

            // Hệ số khả dụng (trong khoảng [0.5, 1.0], mặc định 1.0)
            double avail = availabilityMap.getOrDefault(m.getId(), 1.0);
            rawAvailability[i] = Math.max(0.5, Math.min(1.0, avail));
        }

        // =====================================================================
        // TẦNG 2: CHUẨN HÓA CHỐNG GIAN LẬN: ln(1 + x) & ROBUST MEDIAN + MAD
        // =====================================================================
        double[] logSp = applyLogTransform(rawSp);
        double[] logCards = applyLogTransform(rawCards);
        double[] logManual = applyLogTransform(rawManual);
        double[] logCollab = applyLogTransform(rawCollab);
        double[] logRework = applyLogTransform(rawRework);
        double[] logLatency = applyLogTransform(rawLatency);

        // Chuẩn hóa Robust Z-Score: z = (x~ - Median) / (1.4826 * MAD + eps), clamp [-3, 3]
        double[] zSp = robustNormalize(logSp);
        double[] zCards = robustNormalize(logCards);
        double[] zManual = robustNormalize(logManual);
        double[] zOnTime = robustNormalize(rawOnTime);
        double[] zRework = robustNormalize(logRework);
        double[] zLatency = robustNormalize(logLatency);
        double[] zCollab = robustNormalize(logCollab);
        double[] zPeer = robustNormalize(rawPeer);

        // =====================================================================
        // TẦNG 3: NÉN VỀ 4 CHIỀU CHÍNH (D1, D2, D3, D4)
        // =====================================================================
        double[] d1Output = new double[memberCount];
        double[] d2Reliability = new double[memberCount];
        double[] d3Collab = new double[memberCount];
        double[] d4Peer = new double[memberCount];

        for (int i = 0; i < memberCount; i++) {
            // D1: Output = 0.50*z(SP) + 0.25*z(Cards) + 0.25*z(Manual)
            d1Output[i] = (0.50 * zSp[i]) + (0.25 * zCards[i]) + (0.25 * zManual[i]);

            // D2: Reliability = 0.60*z(OnTime) - 0.20*z(Rework) - 0.20*z(Latency)
            d2Reliability[i] = (0.60 * zOnTime[i]) - (0.20 * zRework[i]) - (0.20 * zLatency[i]);

            // D3: Collaboration = 1.00*z(Collab)
            d3Collab[i] = zCollab[i];

            // D4: Peer Review = 1.00*z(Peer) (nếu >= 3 lượt)
            d4Peer[i] = hasPeerReview[i] ? zPeer[i] : 0.0;
        }

        // =====================================================================
        // TẦNG 4: HIỆU CHỈNH KHẢ DỤNG VÀ ĐIỂM TỔNG HỢP (SIGMOID)
        // =====================================================================
        double beta = 0.5; // Hệ số bù khả dụng
        double[] compositeScores = new double[memberCount];
        double totalComposite = 0.0;

        for (int i = 0; i < memberCount; i++) {
            // Bù khả dụng: D' = D * (1 + beta * (1 - a_i))
            double factor = 1.0 + (beta * (1.0 - rawAvailability[i]));
            double d1Prime = d1Output[i] * factor;
            double d2Prime = d2Reliability[i] * factor;
            double d3Prime = d3Collab[i] * factor;
            double d4Prime = d4Peer[i] * factor;

            // Trọng số w = (0.40, 0.20, 0.15, 0.25). Nếu chưa đủ lượt chấm: chia lại cho 3 chiều còn lại
            double w1, w2, w3, w4;
            if (hasPeerReview[i]) {
                w1 = 0.40;
                w2 = 0.20;
                w3 = 0.15;
                w4 = 0.25;
            } else {
                w1 = 0.40 / 0.75;
                w2 = 0.20 / 0.75;
                w3 = 0.15 / 0.75;
                w4 = 0.0;
            }

            double u_i = 2.5 * ((w1 * d1Prime) + (w2 * d2Prime) + (w3 * d3Prime) + (w4 * d4Prime));

            // Hàm Logistic Sigmoid: C_i = 100 * sigma(u_i) = 100 / (1 + exp(-u_i))
            double c_i = 100.0 / (1.0 + Math.exp(-u_i));
            compositeScores[i] = c_i;
            totalComposite += c_i;
        }

        // =====================================================================
        // PHẦN 3: KHÔNG GIAN ĐA CHIỀU & PHÁT HIỆN BẤT THƯỜNG (MAHALANOBIS/EUCLID)
        // =====================================================================
        double meanD1 = Arrays.stream(d1Output).average().orElse(0.0);
        double meanD2 = Arrays.stream(d2Reliability).average().orElse(0.0);
        double meanD3 = Arrays.stream(d3Collab).average().orElse(0.0);
        double meanD4 = Arrays.stream(d4Peer).average().orElse(0.0);

        double stdD1 = calculateStd(d1Output, meanD1);
        double stdD2 = calculateStd(d2Reliability, meanD2);
        double stdD3 = calculateStd(d3Collab, meanD3);
        double stdD4 = calculateStd(d4Peer, meanD4);

        double[] distances = new double[memberCount];
        boolean[] isSuspicious = new boolean[memberCount];

        for (int i = 0; i < memberCount; i++) {
            // Khoảng cách Euclid chuẩn hóa tới tâm nhóm
            double distSq = Math.pow((d1Output[i] - meanD1) / (stdD1 + EPSILON), 2)
                    + Math.pow((d2Reliability[i] - meanD2) / (stdD2 + EPSILON), 2)
                    + Math.pow((d3Collab[i] - meanD3) / (stdD3 + EPSILON), 2)
                    + Math.pow((d4Peer[i] - meanD4) / (stdD4 + EPSILON), 2);
            distances[i] = Math.sqrt(distSq);

            // Điểm ngờ vực: Output cao bất thường (D1 > 1.2) nhưng Peer thấp (D4 < -0.8) hoặc Reliability kém (D2 < -1.0)
            if (d1Output[i] > 1.2 && ((hasPeerReview[i] && d4Peer[i] < -0.8) || d2Reliability[i] < -1.0)) {
                isSuspicious[i] = true;
            }
        }

        // =====================================================================
        // PHẦN 4: ĐỘ TIN CẬY KÈM THEO KẾT QUẢ (BOOTSTRAP 1000 LẦN)
        // =====================================================================
        Double[] ciLows = new Double[memberCount];
        Double[] ciHighs = new Double[memberCount];

        if (runBootstrap && events != null && !events.isEmpty()) {
            calculateBootstrapConfidenceIntervals(members, events, manualPointsMap, peerScoresMap, peerCountsMap, availabilityMap, ciLows, ciHighs);
        }

        // =====================================================================
        // TỔNG HỢP KẾT QUẢ TRẢ VỀ CHO TỪNG THÀNH VIÊN
        // =====================================================================
        List<MemberContributionResult> results = new ArrayList<>();

        for (int i = 0; i < memberCount; i++) {
            User user = members.get(i);
            double pct = totalComposite > 0.0 ? compositeScores[i] / totalComposite : 1.0 / memberCount;
            BigDecimal percentage = BigDecimal.valueOf(pct).setScale(4, RoundingMode.HALF_UP);
            BigDecimal finalScore = BigDecimal.valueOf(pct * 100.0).setScale(2, RoundingMode.HALF_UP);

            boolean hasSufficientEvidence = eventCounts[i] >= 5;

            // Giá trị raw score để tương thích các code hiển thị cũ
            double rawScore = (rawSp[i] * 1.5) + (rawCards[i] * 3.0) + (rawOnTime[i] * 10.0) + (rawCollab[i] * 2.0);

            results.add(MemberContributionResult.builder()
                    .user(user)
                    .cardsCompleted((int) rawCards[i])
                    .totalStoryPoints(rawSp[i])
                    .onTimeRate(rawOnTime[i])
                    .reworkCount((int) rawRework[i])
                    .collabCount((int) rawCollab[i])
                    .manualPoints(rawManual[i])
                    .rawScore(rawScore)
                    .percentage(percentage)
                    .finalScore(finalScore)
                    .d1Output(d1Output[i])
                    .d2Reliability(d2Reliability[i])
                    .d3Collaboration(d3Collab[i])
                    .d4Peer(d4Peer[i])
                    .compositeScore(compositeScores[i])
                    .availabilityFactor(rawAvailability[i])
                    .confidenceIntervalLow(ciLows[i])
                    .confidenceIntervalHigh(ciHighs[i])
                    .distanceToCenter(distances[i])
                    .isSuspicious(isSuspicious[i])
                    .hasSufficientEvidence(hasSufficientEvidence)
                    .totalEventsCount(eventCounts[i])
                    .build());
        }

        return results;
    }

    // =========================================================================
    // CÁC HÀM TOÁN HỌC & STATISTICAL UTILITIES
    // =========================================================================

    private double[] applyLogTransform(double[] raw) {
        double[] res = new double[raw.length];
        for (int i = 0; i < raw.length; i++) {
            res[i] = Math.log1p(Math.max(0.0, raw[i]));
        }
        return res;
    }

    private double[] robustNormalize(double[] values) {
        int n = values.length;
        if (n == 0) return new double[0];
        if (n == 1) return new double[]{0.0};

        double median = calculateMedian(values);

        double[] absDeviations = new double[n];
        for (int i = 0; i < n; i++) {
            absDeviations[i] = Math.abs(values[i] - median);
        }

        double mad = calculateMedian(absDeviations);
        double scale = 1.4826 * mad + EPSILON;

        double[] z = new double[n];
        for (int i = 0; i < n; i++) {
            double normalized = (values[i] - median) / scale;
            // Clamping / Winsorizing về [-3.0, 3.0]
            z[i] = Math.max(-3.0, Math.min(3.0, normalized));
        }
        return z;
    }

    private double calculateMedian(double[] values) {
        double[] sorted = values.clone();
        Arrays.sort(sorted);
        int n = sorted.length;
        if (n == 0) return 0.0;
        if (n % 2 == 1) {
            return sorted[n / 2];
        } else {
            return (sorted[(n / 2) - 1] + sorted[n / 2]) / 2.0;
        }
    }

    private double calculateStd(double[] values, double mean) {
        if (values.length <= 1) return 1.0;
        double sumSq = 0.0;
        for (double v : values) {
            sumSq += Math.pow(v - mean, 2);
        }
        return Math.sqrt(sumSq / values.length);
    }

    private void calculateBootstrapConfidenceIntervals(
            List<User> members,
            List<ActivityEvent> events,
            Map<Long, Double> manualPointsMap,
            Map<Long, Double> peerScoresMap,
            Map<Long, Integer> peerCountsMap,
            Map<Long, Double> availabilityMap,
            Double[] ciLows,
            Double[] ciHighs
    ) {
        int nEvents = events.size();
        if (nEvents == 0) return;

        int nMembers = members.size();
        List<List<Double>> bootstrapScores = new ArrayList<>();
        for (int i = 0; i < nMembers; i++) {
            bootstrapScores.add(new ArrayList<>(DEFAULT_BOOTSTRAP_ROUNDS));
        }

        // Lặp Bootstrap 1000 lần (resampling có hoàn lại)
        for (int b = 0; b < DEFAULT_BOOTSTRAP_ROUNDS; b++) {
            List<ActivityEvent> resampledEvents = new ArrayList<>(nEvents);
            for (int k = 0; k < nEvents; k++) {
                int randomIndex = ThreadLocalRandom.current().nextInt(nEvents);
                resampledEvents.add(events.get(randomIndex));
            }

            // Tính điểm nhanh cho sample (không đệ quy bootstrap)
            List<MemberContributionResult> sampleResults = calculateScores(
                    members, resampledEvents, manualPointsMap, peerScoresMap, peerCountsMap, availabilityMap, false
            );

            for (int i = 0; i < nMembers; i++) {
                bootstrapScores.get(i).add(sampleResults.get(i).getFinalScore().doubleValue());
            }
        }

        // Xác định khoảng tin cậy 95% (2.5% đến 97.5%)
        int lowIndex = (int) (DEFAULT_BOOTSTRAP_ROUNDS * 0.025);
        int highIndex = (int) (DEFAULT_BOOTSTRAP_ROUNDS * 0.975);

        for (int i = 0; i < nMembers; i++) {
            List<Double> scores = bootstrapScores.get(i);
            Collections.sort(scores);
            ciLows[i] = BigDecimal.valueOf(scores.get(lowIndex)).setScale(2, RoundingMode.HALF_UP).doubleValue();
            ciHighs[i] = BigDecimal.valueOf(scores.get(highIndex)).setScale(2, RoundingMode.HALF_UP).doubleValue();
        }
    }
}
