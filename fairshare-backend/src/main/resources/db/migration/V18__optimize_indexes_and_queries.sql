-- =============================================================================
-- V18: Tối ưu hoá chỉ mục (Indexes) và truy vấn Stored Procedures (Sprint 5 - M3)
-- Phân hệ 5.4 WP3: CSDL, đóng góp và Dashboard (Task 5.4.2)
-- Thành viên: Ngô Trọng Phúc (M3 - Data & Database / Backend)
-- Target: MariaDB 11.x / MySQL 8.0+
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Bổ sung các chỉ mục tối ưu (Composite Indexes) cho bảng activity_events
-- -----------------------------------------------------------------------------
-- Phục vụ truy vấn tổng hợp theo nhóm, sprint và thành viên trong Stored Procedure
CREATE INDEX IF NOT EXISTS idx_activity_events_team_sprint_user
    ON activity_events (team_id, sprint_id, user_id);

CREATE INDEX IF NOT EXISTS idx_activity_events_team_sprint
    ON activity_events (team_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_activity_events_user_occurred
    ON activity_events (user_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_activity_events_event_type
    ON activity_events (event_type);

-- -----------------------------------------------------------------------------
-- 2. Bổ sung chỉ mục cho bảng manual_contributions
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_manual_contrib_team_sprint_user_status
    ON manual_contributions (team_id, sprint_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_manual_contrib_status
    ON manual_contributions (status);

-- -----------------------------------------------------------------------------
-- 3. Bổ sung chỉ mục cho bảng cards (Nội bộ Task Board)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_cards_board_column
    ON cards (board_id, column_id);

CREATE INDEX IF NOT EXISTS idx_cards_assignee
    ON cards (assignee_id);

-- -----------------------------------------------------------------------------
-- 4. Bổ sung chỉ mục cho bảng contribution_scores & team_members
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_contribution_scores_team_sprint
    ON contribution_scores (team_id, sprint_id);

CREATE INDEX IF NOT EXISTS idx_team_members_team_user
    ON team_members (team_id, user_id);

-- -----------------------------------------------------------------------------
-- 5. Cập nhật Stored Procedure sp_calculate_contribution_scores tối ưu hoá
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_calculate_contribution_scores;

DELIMITER //

CREATE PROCEDURE sp_calculate_contribution_scores(
    IN p_team_id BIGINT,
    IN p_sprint_id BIGINT
)
BEGIN
    DECLARE v_team_total DECIMAL(10, 2) DEFAULT 0.00;

    -- Khởi tạo bảng tạm chứa kết quả tổng hợp điểm của từng thành viên
    DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
    CREATE TEMPORARY TABLE tmp_member_scores (
        user_id              BIGINT PRIMARY KEY,
        trello_score         DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        manual_score         DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        total_activity_score DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        activity_pct         DECIMAL(5, 2)  NOT NULL DEFAULT 0.00
    ) ENGINE=MEMORY;

    -- Bước 1: Tính toán trello_score và manual_score (Tận dụng composite indexes idx_activity_events_team_sprint_user)
    INSERT INTO tmp_member_scores (user_id, trello_score, manual_score, total_activity_score)
    SELECT
        m.user_id,
        COALESCE(t.trello_score, 0.00) AS trello_score,
        COALESCE(s.manual_score, 0.00) AS manual_score,
        (COALESCE(t.trello_score, 0.00) + COALESCE(s.manual_score, 0.00)) AS total_activity_score
    FROM (
        SELECT user_id FROM team_members WHERE team_id = p_team_id
        UNION
        SELECT user_id FROM activity_events WHERE team_id = p_team_id AND sprint_id = p_sprint_id
        UNION
        SELECT user_id FROM manual_contributions WHERE team_id = p_team_id AND sprint_id = p_sprint_id
    ) m
    LEFT JOIN (
        SELECT
            user_id,
            SUM(COALESCE(calculated_score, story_points, 1.0)) AS trello_score
        FROM activity_events
        WHERE team_id = p_team_id
          AND sprint_id = p_sprint_id
        GROUP BY user_id
    ) t ON m.user_id = t.user_id
    LEFT JOIN (
        SELECT
            user_id,
            SUM(COALESCE(story_points, 0.0)) AS manual_score
        FROM manual_contributions
        WHERE team_id = p_team_id
          AND sprint_id = p_sprint_id
          AND UPPER(status) = 'APPROVED'
        GROUP BY user_id
    ) s ON m.user_id = s.user_id;

    -- Bước 2: Tính tổng điểm hoạt động toàn nhóm
    SELECT COALESCE(SUM(total_activity_score), 0.00)
    INTO v_team_total
    FROM tmp_member_scores;

    -- Bước 3: Tính tỷ lệ % đóng góp (activity_pct)
    IF v_team_total > 0.00 THEN
        UPDATE tmp_member_scores
        SET activity_pct = ROUND((total_activity_score / v_team_total) * 100.0, 2);
    ELSE
        UPDATE tmp_member_scores
        SET activity_pct = 0.00;
    END IF;

    -- Bước 4: Upsert vào bảng contribution_scores (Sử dụng unique index uk_cs_team_sprint_user)
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
        0.00,
        tms.activity_pct,
        NOW(),
        LEAST(tms.total_activity_score, 100.00),
        ROUND(tms.activity_pct / 100.0, 4)
    FROM tmp_member_scores tms
    ON DUPLICATE KEY UPDATE
        trello_score  = VALUES(trello_score),
        manual_score  = VALUES(manual_score),
        activity_pct  = VALUES(activity_pct),
        final_pct     = VALUES(final_pct),
        score         = VALUES(score),
        percentage    = VALUES(percentage),
        calculated_at = NOW();

    -- Bước 5: Giải phóng bộ nhớ bảng tạm
    DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
END //

DELIMITER ;

