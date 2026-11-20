-- V27: Lịch dự án (timeline) lưu trong DB
ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS start_date DATE NULL,
    ADD COLUMN IF NOT EXISTS end_date   DATE NULL;

