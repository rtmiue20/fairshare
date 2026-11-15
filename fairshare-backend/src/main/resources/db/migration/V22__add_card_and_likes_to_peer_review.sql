-- =============================================================================
-- V22: Bổ sung card_id và likes_count vào bảng review_submissions để chấm chéo theo thẻ Done
-- =============================================================================

ALTER TABLE review_submissions
    ADD COLUMN IF NOT EXISTS card_id BIGINT NULL COMMENT 'ID của thẻ công việc đã hoàn thành được chấm',
    ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0 COMMENT 'Số lượt like/hữu ích của nhận xét';

-- Liên kết khóa ngoại nếu chưa có
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints
                  WHERE constraint_schema = DATABASE()
                    AND table_name = 'review_submissions'
                    AND constraint_name = 'fk_review_submissions_card');

SET @stmt = IF(@fk_exists = 0,
    'ALTER TABLE review_submissions ADD CONSTRAINT fk_review_submissions_card FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE SET NULL;',
    'SELECT 1;');

PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;
