-- =============================================================================
-- V26: Persist profile & project settings (trang Cài đặt · Hồ sơ)
-- Trước đây các trường này chỉ lưu ở localStorage phía client.
-- =============================================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS student_id      VARCHAR(50)   NULL COMMENT 'Mã số sinh viên / mã định danh',
    ADD COLUMN IF NOT EXISTS phone           VARCHAR(30)   NULL COMMENT 'Số điện thoại liên hệ',
    ADD COLUMN IF NOT EXISTS major           VARCHAR(255)  NULL COMMENT 'Chuyên ngành & khóa',
    ADD COLUMN IF NOT EXISTS team_role       VARCHAR(255)  NULL COMMENT 'Vai trò trong nhóm đồ án',
    ADD COLUMN IF NOT EXISTS bio             VARCHAR(1000) NULL COMMENT 'Trách nhiệm chính trong đồ án',
    ADD COLUMN IF NOT EXISTS github_username VARCHAR(100)  NULL COMMENT 'GitHub username';

ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS lecturer     VARCHAR(255) NULL COMMENT 'Giảng viên hướng dẫn',
    ADD COLUMN IF NOT EXISTS sprint_count INT          NULL COMMENT 'Số sprint dự kiến';
