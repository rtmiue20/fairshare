-- =============================================================================
-- V11: Routine tổng hợp điểm đóng góp thành viên theo Sprint
-- Task: M3 (Backend 1) - Sprint 4 / Thẻ 1 Trello
-- Stored Procedure: sp_calculate_contribution_scores
-- Target: MariaDB 11.x / MySQL 8.0+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bổ sung các cột cần thiết cho bảng activity_events (nếu chưa tồn tại)
-- -----------------------------------------------------------------------------
ALTER TABLE activity_events
    ADD COLUMN IF NOT EXISTS calculated_score DECIMAL(10, 2) NULL COMMENT 'Điểm tính toán theo story points và hoàn thành đúng hạn',
    ADD COLUMN IF NOT EXISTS due_date DATETIME NULL COMMENT 'Hạn chót hoàn thành card/task',
    ADD COLUMN IF NOT EXISTS completed_at DATETIME NULL COMMENT 'Thời điểm hoàn thành card/task';

-- -----------------------------------------------------------------------------
-- 2. Bổ sung các cột cần thiết cho bảng manual_contributions (nếu chưa tồn tại)
-- -----------------------------------------------------------------------------
ALTER TABLE manual_contributions
    ADD COLUMN IF NOT EXISTS story_points DECIMAL(10, 2) NULL DEFAULT 0.00 COMMENT 'Story points của đóng góp thủ công',
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'APPROVED' COMMENT 'APPROVED | PENDING | REJECTED';

-- Đồng bộ dữ liệu hiện có (nếu có): các đóng góp đã confirmed được đánh dấu là APPROVED
UPDATE manual_contributions
SET status = 'APPROVED'
WHERE confirmed = TRUE AND (status IS NULL OR status = 'PENDING');

-- -----------------------------------------------------------------------------
-- 3. Bổ sung các cột cần thiết cho bảng contribution_scores (nếu chưa tồn tại)
-- -----------------------------------------------------------------------------
ALTER TABLE contribution_scores
    ADD COLUMN IF NOT EXISTS trello_score DECIMAL(10, 2) NULL DEFAULT 0.00 COMMENT 'Tổng điểm từ activity_events (Trello/Git/Board)',
    ADD COLUMN IF NOT EXISTS manual_score DECIMAL(10, 2) NULL DEFAULT 0.00 COMMENT 'Tổng điểm từ manual_contributions đã APPROVED',
    ADD COLUMN IF NOT EXISTS activity_pct DECIMAL(5, 2) NULL DEFAULT 0.00 COMMENT 'Tỷ lệ % hoạt động so với toàn team trong sprint',
    ADD COLUMN IF NOT EXISTS peer_pct DECIMAL(5, 2) NULL DEFAULT 0.00 COMMENT 'Tỷ lệ % đánh giá chéo',
    ADD COLUMN IF NOT EXISTS final_pct DECIMAL(5, 2) NULL DEFAULT 0.00 COMMENT 'Tỷ lệ % đóng góp tổng hợp cuối cùng',
    ADD COLUMN IF NOT EXISTS calculated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời điểm tính toán điểm gần nhất';

-- Nới lỏng ràng buộc NOT NULL của score & percentage (nếu có từ schema cũ)
ALTER TABLE contribution_scores
    MODIFY COLUMN score DECIMAL(5, 2) NULL DEFAULT 0.00,
    MODIFY COLUMN percentage DECIMAL(5, 2) NULL DEFAULT 0.00;

-- Đảm bảo chỉ mục duy nhất trên (team_id, sprint_id, user_id) phục vụ Upsert
CREATE UNIQUE INDEX IF NOT EXISTS uk_cs_team_sprint_user
    ON contribution_scores (team_id, sprint_id, user_id);

-- -----------------------------------------------------------------------------
-- 4. Stored Procedure: sp_calculate_contribution_scores
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_calculate_contribution_scores;

DELIMITER //

CREATE PROCEDURE sp_calculate_contribution_scores(
    IN p_team_id BIGINT,
    IN p_sprint_id BIGINT
)
BEGIN
    DECLARE v_team_total DECIMAL(10, 2) DEFAULT 0.00;

    -- Khởi tạo bảng tạm để tổng hợp điểm của từng thành viên
    DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
    CREATE TEMPORARY TABLE tmp_member_scores (
        user_id              BIGINT PRIMARY KEY,
        trello_score         DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        manual_score         DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        total_activity_score DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        activity_pct         DECIMAL(5, 2)  NOT NULL DEFAULT 0.00
    );

    -- Bước 1: Tính toán trello_score và manual_score cho tất cả thành viên trong team/sprint
    INSERT INTO tmp_member_scores (user_id, trello_score, manual_score, total_activity_score)
    SELECT
        m.user_id,
        COALESCE(t.trello_score, 0.00) AS trello_score,
        COALESCE(s.manual_score, 0.00) AS manual_score,
        (COALESCE(t.trello_score, 0.00) + COALESCE(s.manual_score, 0.00)) AS total_activity_score
    FROM (
        -- Lấy toàn bộ thành viên của team và bất kỳ user nào có đóng góp trong sprint này
        SELECT user_id FROM team_members WHERE team_id = p_team_id
        UNION
        SELECT user_id FROM activity_events WHERE team_id = p_team_id AND sprint_id = p_sprint_id
        UNION
        SELECT user_id FROM manual_contributions WHERE team_id = p_team_id AND sprint_id = p_sprint_id
    ) m
    LEFT JOIN (
        -- trello_score = SUM(COALESCE(calculated_score, story_points, 1.0))
        SELECT
            user_id,
            SUM(COALESCE(calculated_score, story_points, 1.0)) AS trello_score
        FROM activity_events
        WHERE team_id = p_team_id
          AND sprint_id = p_sprint_id
        GROUP BY user_id
    ) t ON m.user_id = t.user_id
    LEFT JOIN (
        -- manual_score = SUM(COALESCE(story_points, 0.0)) với status = 'APPROVED'
        SELECT
            user_id,
            SUM(COALESCE(story_points, 0.0)) AS manual_score
        FROM manual_contributions
        WHERE team_id = p_team_id
          AND sprint_id = p_sprint_id
          AND UPPER(status) = 'APPROVED'
        GROUP BY user_id
    ) s ON m.user_id = s.user_id;

    -- Bước 2: Tính tổng điểm hoạt động của toàn team trong sprint
    SELECT COALESCE(SUM(total_activity_score), 0.00)
    INTO v_team_total
    FROM tmp_member_scores;

    -- Bước 3: Tính tỷ lệ % đóng góp (activity_pct) - Xử lý trường hợp team_total = 0 để tránh chia cho 0
    IF v_team_total > 0.00 THEN
        UPDATE tmp_member_scores
        SET activity_pct = ROUND((total_activity_score / v_team_total) * 100.0, 2);
    ELSE
        UPDATE tmp_member_scores
        SET activity_pct = 0.00;
    END IF;

    -- Bước 4: Upsert (INSERT ... ON DUPLICATE KEY UPDATE) vào bảng contribution_scores
    INSERT INTO contribution_scores (
        team_id,
        sprint_id,
        user_id,
        trello_score,
        manual_score,
        activity_pct,
        peer_pct,
        final_pct,
        calculated_at,
        score,
        percentage
    )
    SELECT
        p_team_id,
        p_sprint_id,
        tms.user_id,
        tms.trello_score,
        tms.manual_score,
        tms.activity_pct,
        0.00,                               -- peer_pct để 0.00, chờ module peer review tích hợp sau
        tms.activity_pct,                   -- final_pct tạm thời bằng activity_pct
        NOW(),                              -- calculated_at
        tms.total_activity_score,           -- tương thích cột score cũ
        ROUND(tms.activity_pct / 100.0, 4)  -- tương thích cột percentage cũ
    FROM tmp_member_scores tms
    ON DUPLICATE KEY UPDATE
        trello_score  = VALUES(trello_score),
        manual_score  = VALUES(manual_score),
        activity_pct  = VALUES(activity_pct),
        final_pct     = VALUES(final_pct),
        score         = VALUES(score),
        percentage    = VALUES(percentage),
        calculated_at = NOW();

    -- Bước 5: Thu dọn bảng tạm
    DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
END //

DELIMITER ;

