-- =============================================================================
-- V13: Bổ sung difficulty_level cho bảng cards để liên kết với đặc trưng Tầng 1
-- =============================================================================

ALTER TABLE cards
    ADD COLUMN IF NOT EXISTS difficulty_level TINYINT NULL DEFAULT 2
        COMMENT 'Độ khó của card (1=Dễ 2=Trung bình 3=Khó 4=Rất khó)';

