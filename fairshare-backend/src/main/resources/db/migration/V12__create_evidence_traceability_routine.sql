-- =============================================================================
-- V12: Routine truy xuất bằng chứng đóng góp thành viên (Traceability Routine)
-- Task: M3 (Backend 1 / Data) - Sprint 4 / Thẻ 3 Trello
-- Stored Procedure: sp_get_evidence_traceability
-- Target: MariaDB 11.x / MySQL 8.0+
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_get_evidence_traceability;

DELIMITER //

CREATE PROCEDURE sp_get_evidence_traceability(
    IN p_team_id BIGINT,
    IN p_sprint_id BIGINT,
    IN p_user_id BIGINT
)
BEGIN
    -- 1. Lấy tất cả sự kiện hoạt động từ bảng activity_events (Board / Trello / Git)
    SELECT 
        'TRELLO'                                                     AS source_type,
        ae.id                                                        AS source_id,
        COALESCE(ae.details, ae.event_type, 'Hoạt động Board/Card')  AS task_name,
        CAST(COALESCE(ae.story_points, 1.00) AS DECIMAL(10, 2))     AS story_points,
        CAST(COALESCE(ae.calculated_score, ae.story_points, 1.00) AS DECIMAL(10, 2)) AS earned_score,
        COALESCE(ae.completed_at, ae.occurred_at, ae.created_at)     AS event_time,
        'DONE'                                                       AS status
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
