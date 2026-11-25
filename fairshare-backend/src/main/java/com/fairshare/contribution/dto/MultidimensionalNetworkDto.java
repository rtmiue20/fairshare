package com.fairshare.contribution.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MultidimensionalNetworkDto {

    private Long teamId;
    private String teamName;
    private Long sprintId;
    private String sprintName;
    private Long focusedUserId;
    private String focusedUserName;
    private String focusedUserRole;

    // Metrics tổng hợp của thành viên đang xem
    private BigDecimal finalPct;
    private BigDecimal score;
    private Double d1Output;
    private Double d2Reliability;
    private Double d3Collaboration;
    private Double d4Peer;
    private Double compositeScore;
    private Double availabilityFactor;
    private Double confidenceIntervalLow;
    private Double confidenceIntervalHigh;
    private Double distanceToCenter;
    private Boolean isSuspicious;
    private Boolean hasSufficientEvidence;
    private Integer totalEventsCount;

    // Thống kê 4 tầng công thức chi tiết
    private TierBreakdownDto tierBreakdown;

    // Danh sách Node và Link cho đồ thị mạng lưới đa chiều
    private List<NetworkNodeDto> nodes;
    private List<NetworkLinkDto> links;

    // Danh sách các sprint trong dự án để timeline scrubber điều hướng
    private List<SprintTimelineDto> sprints;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NetworkNodeDto {
        private String id;
        private String label;
        /**
         * ROOT: Thành viên trọng tâm / Tâm nhóm
         * DIMENSION: 1 trong 4 chiều chính (D1, D2, D3, D4)
         * CATEGORY: Nhóm yếu tố (Sản lượng, Tin cậy, Phối hợp, Chấm chéo, Rào cản ngoại cảnh)
         * EVENT: Sự kiện thô cụ thể (Card xong, Rework, Comment, Khai báo ngoài...)
         * IMPEDIMENT: Rào cản / Tác động cản trở thành viên
         */
        private String type;
        private String category;
        private Double weight;
        private String badge;
        private String status;
        private String color;
        private String description;
        private Map<String, Object> metadata;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NetworkLinkDto {
        private String source;
        private String target;
        private Double weight;
        private String type;
        private String color;
        private Boolean animated;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TierBreakdownDto {
        // Tầng 1: Vector thô x_i
        private Map<String, Object> rawFeatures;

        // Tầng 2: Chuẩn hóa ln(1+x) & Robust Z-Score [-3, 3]
        private Map<String, Double> logFeatures;
        private Map<String, Double> robustZScores;

        // Tầng 3: 4 Chiều chính D_k
        private Map<String, Double> dimensions;

        // Tầng 4: Bù khả dụng D'_k, Logistic Sigmoid C_i, p_i
        private Double availabilityFactor;
        private Double availabilityBonusFactor;
        private Map<String, Double> adjustedDimensions;
        private Double compositeScore;
        private Double finalPercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SprintTimelineDto {
        private Long id;
        private String name;
        private String startDate;
        private String endDate;
        private Boolean isCurrent;
        private String status;
    }
}
