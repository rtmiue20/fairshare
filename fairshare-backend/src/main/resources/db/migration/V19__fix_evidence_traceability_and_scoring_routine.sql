-- =============================================================================
-- V19: Fix evidence traceability source_type and scoring routine alignment
-- Task: M3 (Backend 1 / Data) - Sprint 5 Fixes (DEF-16, DEF-17)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Routine truy xuất bằng chứng đóng góp (sp_get_evidence_traceability)
-- Sửa: sử dụng ae.source thật thay vì gán cứng 'TRELLO' (CR-02),
--      sử dụng trạng thái thật theo event_type thay vì gán cứng 'DONE'.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_get_evidence_traceability;

DELIMITER //

CREATE PROCEDURE sp_get_evidence_traceability(
    IN p_team_id BIGINT,
    IN p_sprint_id BIGINT,
    IN p_user_id BIGINT
)
BEGIN
    -- 1. Lấy tất cả sự kiện hoạt động từ bảng activity_events (BOARD / GIT / MANUAL / TRELLO)
    SELECT 
        COALESCE(ae.source, 'BOARD')                                 AS source_type,
        ae.id                                                        AS source_id,
        COALESCE(ae.details, ae.event_type, 'Hoạt động Board/Card')  AS task_name,
        CAST(COALESCE(ae.story_points, 1.00) AS DECIMAL(10, 2))     AS story_points,
        CAST(COALESCE(ae.calculated_score, ae.story_points, 1.00) AS DECIMAL(10, 2)) AS earned_score,
        COALESCE(ae.completed_at, ae.occurred_at, ae.created_at)     AS event_time,
        CASE 
            WHEN UPPER(ae.event_type) = 'CARD_COMPLETED' THEN 'DONE'
            WHEN UPPER(ae.event_type) = 'CARD_MOVED' THEN 'IN_PROGRESS'
            WHEN UPPER(ae.event_type) = 'CARD_CREATED' THEN 'TODO'
            ELSE COALESCE(ae.event_type, 'DONE')
        END                                                          AS status
    FROM activity_events ae
    WHERE ae.team_id = p_team_id
      AND ae.sprint_id = p_sprint_id
      AND ae.user_id = p_user_id

    UNION ALL

    -- 2. Lấy tất cả đóng góp thủ công đã được duyệt (APPROVED) từ bảng manual_contributions
    SELECT 
        'MANUAL'                                                     AS source_type,
        mc.id                                                        AS source_id,
        COALESCE(mc.title, mc.description, 'Đóng góp thủ công')      AS task_name,
        CAST(COALESCE(mc.story_points, 0.00) AS DECIMAL(10, 2))     AS story_points,
        CAST(COALESCE(mc.story_points, 0.00) AS DECIMAL(10, 2))     AS earned_score,
        mc.created_at                                                AS event_time,
        mc.status                                                    AS status
    FROM manual_contributions mc
    WHERE mc.team_id = p_team_id
      AND mc.sprint_id = p_sprint_id
      AND mc.user_id = p_user_id
      AND UPPER(mc.status) = 'APPROVED'

    ORDER BY event_time DESC;
END //

DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. Cập nhật Stored Procedure sp_calculate_contribution_scores
-- Sửa: Đồng bộ quy tắc tính điểm với ScoringEngine:
--      CARD_COMPLETED tính 100% điểm; CARD_CREATED / CARD_MOVED tính 20% partial credit.
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_calculate_contribution_scores;

DELIMITER //

CREATE PROCEDURE sp_calculate_contribution_scores(
    IN p_team_id BIGINT,
    IN p_sprint_id BIGINT
)
BEGIN
    DECLARE v_team_total DECIMAL(10, 2) DEFAULT 0.00;
    DECLARE v_active_count INT DEFAULT 0;

    -- Khởi tạo bảng tạm chứa kết quả tổng hợp điểm của từng thành viên
    DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
    CREATE TEMPORARY TABLE tmp_member_scores (
        user_id              BIGINT PRIMARY KEY,
        trello_score         DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        manual_score         DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        total_activity_score DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        activity_pct         DECIMAL(5, 2)  NOT NULL DEFAULT 0.00
    ) ENGINE=MEMORY;

    -- Bước 1: Tính toán trello_score và manual_score
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
            SUM(
                CASE 
                    WHEN UPPER(event_type) IN ('CARD_COMPLETED', 'DONE', 'TASK_DONE') 
                        THEN COALESCE(calculated_score, story_points, 1.0)
                    WHEN UPPER(event_type) IN ('CARD_CREATED', 'CARD_MOVED') 
                        THEN COALESCE(calculated_score, story_points, 1.0) * 0.2
                    ELSE COALESCE(calculated_score, 0.0)
                END
            ) AS trello_score
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
    SELECT COALESCE(SUM(total_activity_score), 0.00),
           COUNT(CASE WHEN total_activity_score > 0.00 THEN 1 END)
    INTO v_team_total, v_active_count
    FROM tmp_member_scores;

    -- Nếu nhóm đã có >= 6 thành viên có hoạt động thực tế (> 0), loại bỏ các dòng 0 điểm dư thừa (tài khoản test phát sinh)
    IF v_team_total > 0.00 AND v_active_count >= 6 THEN
        DELETE FROM tmp_member_scores WHERE total_activity_score = 0.00;
        DELETE FROM contribution_scores
        WHERE team_id = p_team_id
          AND sprint_id = p_sprint_id
          AND user_id NOT IN (SELECT user_id FROM tmp_member_scores);
    END IF;

    -- Bước 3: Tính tỷ lệ % đóng góp (activity_pct)
    IF v_team_total > 0.00 THEN
        UPDATE tmp_member_scores
        SET activity_pct = ROUND((total_activity_score / v_team_total) * 100.0, 2);
    ELSE
        UPDATE tmp_member_scores
        SET activity_pct = 0.00;
    END IF;

    -- Bước 4: Upsert vào bảng contribution_scores
    INSERT INTO contribution_scores (
        team_id,
        sprint_id,
        user_id,
        trello_score,
        manual_score,
        activity_pct,
        peer_pct,
        final_pct,
        confidence_interval_low,
        confidence_interval_high,
        has_sufficient_evidence,
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
        GREATEST(0.00, ROUND(tms.activity_pct - 2.10, 2)),
        LEAST(100.00, ROUND(tms.activity_pct + 2.10, 2)),
        CASE WHEN tms.total_activity_score > 0.00 THEN 1 ELSE 0 END,
        NOW(),
        LEAST(tms.total_activity_score, 100.00),
        ROUND(tms.activity_pct / 100.0, 4)
    FROM tmp_member_scores tms
    ON DUPLICATE KEY UPDATE
        trello_score             = VALUES(trello_score),
        manual_score             = VALUES(manual_score),
        activity_pct             = VALUES(activity_pct),
        final_pct                = VALUES(final_pct),
        confidence_interval_low  = COALESCE(confidence_interval_low, VALUES(confidence_interval_low)),
        confidence_interval_high = COALESCE(confidence_interval_high, VALUES(confidence_interval_high)),
        has_sufficient_evidence  = COALESCE(has_sufficient_evidence, VALUES(has_sufficient_evidence)),
        score                    = VALUES(score),
        percentage               = VALUES(percentage),
        calculated_at            = NOW();

    -- Bước 5: Giải phóng bộ nhớ bảng tạm
    DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
END //

DELIMITER ;

