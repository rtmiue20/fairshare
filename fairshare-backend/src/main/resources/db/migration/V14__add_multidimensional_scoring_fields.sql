-- =============================================================================
-- V14: Bổ sung các trường tính điểm đa chiều (Multidimensional Scoring Fields)
-- Phân hệ: M3 (Contribution & Scoring Engine) - Sprint 4
-- Mục đích: Lưu trữ chi tiết điểm số theo 4 chiều (D1 Output, D2 Reliability,
--          D3 Collaboration, D4 Peer) và điểm tổng hợp đa chiều.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bổ sung các chiều điểm số đa chiều vào bảng contribution_scores (nếu chưa có)
-- -----------------------------------------------------------------------------
ALTER TABLE contribution_scores
    ADD COLUMN IF NOT EXISTS d1_output_score DECIMAL(8, 4) NULL DEFAULT 0.0000
        COMMENT 'Điểm chiều Sản lượng (D1 Output)',
    ADD COLUMN IF NOT EXISTS d2_reliability_score DECIMAL(8, 4) NULL DEFAULT 0.0000
        COMMENT 'Điểm chiều Tin cậy (D2 Reliability)',
    ADD COLUMN IF NOT EXISTS d3_collaboration_score DECIMAL(8, 4) NULL DEFAULT 0.0000
        COMMENT 'Điểm chiều Phối hợp (D3 Collaboration)',
    ADD COLUMN IF NOT EXISTS d4_peer_score DECIMAL(8, 4) NULL DEFAULT 0.0000
        COMMENT 'Điểm chiều Đánh giá chéo (D4 Peer)',
    ADD COLUMN IF NOT EXISTS composite_score DECIMAL(8, 4) NULL DEFAULT 0.0000
        COMMENT 'Điểm tổng hợp đa chiều (Composite Score C_i)';

-- -----------------------------------------------------------------------------
-- 2. Tối ưu chỉ mục phục vụ truy vấn tra cứu điểm và báo cáo
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cs_composite_score
    ON contribution_scores (composite_score);

