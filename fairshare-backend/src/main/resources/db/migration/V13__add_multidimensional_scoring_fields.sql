-- =============================================================================
-- V13: Bổ sung các trường mô hình đo lường đóng góp đa chiều 4 tầng
-- Task: M3 (Database & Backend 1) - Sprint 4 / Đề xuất nâng cấp mô hình
-- Features: D1 Output, D2 Reliability, D3 Collaboration, D4 Peer,
--           Composite Score (Sigmoid), Availability Factor, Bootstrap CI,
--           Anomaly / Suspicion Flag, Evidence Sufficiency Flag
-- =============================================================================

ALTER TABLE contribution_scores
    ADD COLUMN IF NOT EXISTS d1_output DECIMAL(10, 4) NULL DEFAULT 0.0000 COMMENT 'Chiều 1: Sản lượng (Output)',
    ADD COLUMN IF NOT EXISTS d2_reliability DECIMAL(10, 4) NULL DEFAULT 0.0000 COMMENT 'Chiều 2: Độ tin cậy (Reliability)',
    ADD COLUMN IF NOT EXISTS d3_collaboration DECIMAL(10, 4) NULL DEFAULT 0.0000 COMMENT 'Chiều 3: Phối hợp (Collaboration)',
    ADD COLUMN IF NOT EXISTS d4_peer DECIMAL(10, 4) NULL DEFAULT 0.0000 COMMENT 'Chiều 4: Chấm chéo (Peer Review)',
    ADD COLUMN IF NOT EXISTS composite_score DECIMAL(10, 4) NULL DEFAULT 0.0000 COMMENT 'Điểm tổng hợp C_i sau hàm sigmoid',
    ADD COLUMN IF NOT EXISTS availability_factor DECIMAL(5, 2) NULL DEFAULT 1.00 COMMENT 'Hệ số khả dụng a_i trong sprint [0.5, 1.0]',
    ADD COLUMN IF NOT EXISTS confidence_interval_low DECIMAL(5, 2) NULL COMMENT 'Khoảng tin cậy dưới 95% (Bootstrap 2.5%)',
    ADD COLUMN IF NOT EXISTS confidence_interval_high DECIMAL(5, 2) NULL COMMENT 'Khoảng tin cậy trên 95% (Bootstrap 97.5%)',
    ADD COLUMN IF NOT EXISTS distance_to_center DECIMAL(10, 4) NULL DEFAULT 0.0000 COMMENT 'Khoảng cách Mahalanobis/Euclid tới tâm nhóm',
    ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Cờ ngờ vực / bất thường (Output cao nhưng Peer thấp)',
    ADD COLUMN IF NOT EXISTS has_sufficient_evidence BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Đủ bằng chứng (>= 5 events) hay không';
