package com.fairshare.contribution.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Projection interface & DTO cho kết quả truy xuất bằng chứng đóng góp từ Stored Procedure {@code sp_get_evidence_traceability}.
 */
public interface EvidenceItemDto {

    String getSourceType();

    Long getSourceId();

    String getTaskName();

    BigDecimal getStoryPoints();

    BigDecimal getEarnedScore();

    LocalDateTime getEventTime();

    String getStatus();

    /**
     * Lớp POJO cụ thể triển khai {@link EvidenceItemDto}, phục vụ khởi tạo trong Unit Test hoặc serialization.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    class Impl implements EvidenceItemDto {
        private String sourceType;
        private Long sourceId;
        private String taskName;
        private BigDecimal storyPoints;
        private BigDecimal earnedScore;
        private LocalDateTime eventTime;
        private String status;
    }
}
