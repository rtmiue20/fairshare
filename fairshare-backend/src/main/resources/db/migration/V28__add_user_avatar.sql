-- V28: Ảnh đại diện người dùng (lưu file tại uploads/avatars, DB giữ đường dẫn)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL COMMENT 'Đường dẫn ảnh đại diện (/uploads/avatars/...)';
