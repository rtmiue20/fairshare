-- =============================================================================
-- V16: Bổ sung các trường phục vụ API Khai báo đóng góp thủ công (Card 8 - M3 Sprint 5)
-- Bổ sung: task_name, evidence_link, reviewer_id và thiết lập default PENDING
-- =============================================================================

ALTER TABLE manual_contributions
    MODIFY COLUMN title VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS task_name VARCHAR(255) NULL COMMENT 'Tên công việc đóng góp ngoài board',
    ADD COLUMN IF NOT EXISTS evidence_link VARCHAR(500) NULL COMMENT 'Đường dẫn minh chứng ngoài (Docs, Figma, v.v.)',
    ADD COLUMN IF NOT EXISTS reviewer_id BIGINT NULL COMMENT 'ID của thành viên duyệt/từ chối';

-- Đặt mặc định trạng thái cho các bản ghi mới là PENDING
ALTER TABLE manual_contributions
    ALTER COLUMN status SET DEFAULT 'PENDING';

-- Đồng bộ dữ liệu hiện có
UPDATE manual_contributions
SET task_name = title
WHERE task_name IS NULL AND title IS NOT NULL;

UPDATE manual_contributions
SET reviewer_id = confirmed_by
WHERE reviewer_id IS NULL AND confirmed_by IS NOT NULL;

