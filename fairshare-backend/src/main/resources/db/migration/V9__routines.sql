-- =============================================================================
-- V9: FairShare – Database Routines
-- Stored Procedures (sp_), Functions (fn_), Triggers (trg_)
-- Thay thế toàn bộ tầng Service Java bằng logic trực tiếp trong DB
-- Target: MariaDB 10.6+
-- =============================================================================
-- Quy ước đặt tên:
--   sp_   Stored Procedure  – thực hiện thao tác, trả về result set hoặc OUT param
--   fn_   Function          – tính toán, trả về scalar value
--   trg_  Trigger           – tự động kích hoạt theo event
-- =============================================================================

DELIMITER $$

-- =============================================================================
-- PHẦN 1 – FUNCTIONS (fn_)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- fn_logistic : σ(x) = 1 / (1 + e^-x)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_logistic$$
CREATE FUNCTION fn_logistic(x DECIMAL(12,6))
RETURNS DECIMAL(10,8)
DETERMINISTIC
BEGIN
    RETURN 1.0 / (1.0 + EXP(-x));
END$$

-- -----------------------------------------------------------------------------
-- fn_ln_transform : x̃ = ln(1 + x)  – giảm lợi ích khi lặp (chống gian lận)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_ln_transform$$
CREATE FUNCTION fn_ln_transform(x DECIMAL(12,4))
RETURNS DECIMAL(12,6)
DETERMINISTIC
BEGIN
    IF x < 0 THEN RETURN 0; END IF;
    RETURN LN(1 + x);
END$$

-- -----------------------------------------------------------------------------
-- fn_robust_zscore : z = (x - median) / (1.4826 * MAD + ε), cắt [-3, 3]
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_robust_zscore$$
CREATE FUNCTION fn_robust_zscore(
    x       DECIMAL(12,6),
    med     DECIMAL(12,6),
    mad     DECIMAL(12,6)
)
RETURNS DECIMAL(6,4)
DETERMINISTIC
BEGIN
    DECLARE z   DECIMAL(12,6);
    DECLARE eps DECIMAL(12,6) DEFAULT 0.000001;
    SET z = (x - med) / (1.4826 * mad + eps);
    IF z >  3 THEN RETURN  3.0000; END IF;
    IF z < -3 THEN RETURN -3.0000; END IF;
    RETURN ROUND(z, 4);
END$$

-- -----------------------------------------------------------------------------
-- fn_clamp_availability : clamp a_i về [0.5, 1.0]
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_clamp_availability$$
CREATE FUNCTION fn_clamp_availability(ratio DECIMAL(6,4))
RETURNS DECIMAL(4,3)
DETERMINISTIC
BEGIN
    IF ratio < 0.5 THEN RETURN 0.500; END IF;
    IF ratio > 1.0 THEN RETURN 1.000; END IF;
    RETURN ROUND(ratio, 3);
END$$

-- -----------------------------------------------------------------------------
-- fn_adjust_dimension : D'_ik = D_ik · (1 + β(1 − a_i))
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_adjust_dimension$$
CREATE FUNCTION fn_adjust_dimension(
    d    DECIMAL(10,5),
    a_i  DECIMAL(4,3),
    beta DECIMAL(4,3)
)
RETURNS DECIMAL(10,5)
DETERMINISTIC
BEGIN
    RETURN ROUND(d * (1 + beta * (1 - a_i)), 5);
END$$

-- -----------------------------------------------------------------------------
-- fn_user_exists : kiểm tra user tồn tại
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_user_exists$$
CREATE FUNCTION fn_user_exists(p_user_id BIGINT)
RETURNS BOOLEAN
READS SQL DATA
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(*) INTO cnt FROM users WHERE id = p_user_id;
    RETURN cnt > 0;
END$$

-- -----------------------------------------------------------------------------
-- fn_is_team_member : kiểm tra user có thuộc team không
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_is_team_member$$
CREATE FUNCTION fn_is_team_member(p_user_id BIGINT, p_team_id BIGINT)
RETURNS BOOLEAN
READS SQL DATA
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(*) INTO cnt
    FROM team_members
    WHERE user_id = p_user_id AND team_id = p_team_id;
    RETURN cnt > 0;
END$$

-- -----------------------------------------------------------------------------
-- fn_is_team_leader : kiểm tra user có phải LEADER không
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_is_team_leader$$
CREATE FUNCTION fn_is_team_leader(p_user_id BIGINT, p_team_id BIGINT)
RETURNS BOOLEAN
READS SQL DATA
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(*) INTO cnt
    FROM team_members
    WHERE user_id = p_user_id AND team_id = p_team_id AND role = 'LEADER';
    RETURN cnt > 0;
END$$

-- -----------------------------------------------------------------------------
-- fn_has_consent : kiểm tra user đã đồng ý chưa
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_has_consent$$
CREATE FUNCTION fn_has_consent(p_user_id BIGINT, p_team_id BIGINT)
RETURNS BOOLEAN
READS SQL DATA
BEGIN
    DECLARE result BOOLEAN DEFAULT FALSE;
    SELECT agreed INTO result
    FROM consents
    WHERE user_id = p_user_id AND team_id = p_team_id;
    RETURN COALESCE(result, FALSE);
END$$

-- -----------------------------------------------------------------------------
-- fn_sprint_total_days : tổng ngày sprint (dùng tính a_i)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_sprint_total_days$$
CREATE FUNCTION fn_sprint_total_days(p_sprint_id BIGINT)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE total INT;
    SELECT DATEDIFF(end_date, start_date) + 1 INTO total
    FROM sprints WHERE id = p_sprint_id;
    RETURN COALESCE(total, 0);
END$$

-- -----------------------------------------------------------------------------
-- fn_peer_submission_count : đếm số lượt chấm chéo nhận được
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS fn_peer_submission_count$$
CREATE FUNCTION fn_peer_submission_count(
    p_review_round_id BIGINT,
    p_reviewee_id     BIGINT
)
RETURNS INT
READS SQL DATA
BEGIN
    DECLARE cnt INT;
    SELECT COUNT(DISTINCT reviewer_id) INTO cnt
    FROM review_submissions
    WHERE review_round_id = p_review_round_id
      AND reviewee_id     = p_reviewee_id;
    RETURN COALESCE(cnt, 0);
END$$

-- =============================================================================
-- PHẦN 2 – STORED PROCEDURES: USER & AUTH (sp_user_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_user_create : tạo user mới (password đã được hash ở app layer)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_create$$
CREATE PROCEDURE sp_user_create(
    IN  p_email     VARCHAR(255),
    IN  p_password  VARCHAR(255),
    IN  p_full_name VARCHAR(255),
    OUT p_user_id   BIGINT,
    OUT p_error     VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_user_id = NULL;
        SET p_error   = 'DB_ERROR';
        ROLLBACK;
    END;

    SET p_error = NULL;

    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        SET p_user_id = NULL;
        SET p_error   = 'EMAIL_EXISTS';
    ELSE
        START TRANSACTION;
        INSERT INTO users (email, password, full_name)
        VALUES (p_email, p_password, p_full_name);
        SET p_user_id = LAST_INSERT_ID();
        COMMIT;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_user_get_by_id
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_get_by_id$$
CREATE PROCEDURE sp_user_get_by_id(IN p_user_id BIGINT)
BEGIN
    SELECT id, email, full_name, created_at, updated_at
    FROM users
    WHERE id = p_user_id;
END$$

-- -----------------------------------------------------------------------------
-- sp_user_get_by_email
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_get_by_email$$
CREATE PROCEDURE sp_user_get_by_email(IN p_email VARCHAR(255))
BEGIN
    SELECT id, email, password, full_name, created_at
    FROM users
    WHERE email = p_email;
END$$

-- -----------------------------------------------------------------------------
-- sp_user_update_profile
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_update_profile$$
CREATE PROCEDURE sp_user_update_profile(
    IN  p_user_id   BIGINT,
    IN  p_full_name VARCHAR(255),
    OUT p_error     VARCHAR(255)
)
BEGIN
    SET p_error = NULL;
    IF NOT fn_user_exists(p_user_id) THEN
        SET p_error = 'USER_NOT_FOUND';
    ELSE
        UPDATE users SET full_name = p_full_name WHERE id = p_user_id;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_user_change_password
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_user_change_password$$
CREATE PROCEDURE sp_user_change_password(
    IN  p_user_id     BIGINT,
    IN  p_new_password VARCHAR(255),
    OUT p_error       VARCHAR(255)
)
BEGIN
    SET p_error = NULL;
    IF NOT fn_user_exists(p_user_id) THEN
        SET p_error = 'USER_NOT_FOUND';
    ELSE
        UPDATE users SET password = p_new_password WHERE id = p_user_id;
    END IF;
END$$

-- =============================================================================
-- PHẦN 3 – STORED PROCEDURES: TEAM (sp_team_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_team_create : tạo team + thêm creator làm LEADER
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_team_create$$
CREATE PROCEDURE sp_team_create(
    IN  p_name        VARCHAR(255),
    IN  p_description TEXT,
    IN  p_creator_id  BIGINT,
    OUT p_team_id     BIGINT,
    OUT p_error       VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        SET p_error = 'DB_ERROR'; ROLLBACK;
    END;
    SET p_error = NULL;
    IF NOT fn_user_exists(p_creator_id) THEN
        SET p_team_id = NULL;
        SET p_error   = 'USER_NOT_FOUND';
    ELSE
        START TRANSACTION;
        INSERT INTO teams (name, description) VALUES (p_name, p_description);
        SET p_team_id = LAST_INSERT_ID();
        INSERT INTO team_members (team_id, user_id, role)
        VALUES (p_team_id, p_creator_id, 'LEADER');
        COMMIT;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_team_get_by_id
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_team_get_by_id$$
CREATE PROCEDURE sp_team_get_by_id(IN p_team_id BIGINT)
BEGIN
    SELECT t.id, t.name, t.description, t.created_at,
           COUNT(tm.id) AS member_count
    FROM teams t
    LEFT JOIN team_members tm ON tm.team_id = t.id
    WHERE t.id = p_team_id
    GROUP BY t.id;
END$$

-- -----------------------------------------------------------------------------
-- sp_team_get_members : danh sách thành viên kèm role
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_team_get_members$$
CREATE PROCEDURE sp_team_get_members(IN p_team_id BIGINT)
BEGIN
    SELECT tm.id AS member_id, u.id AS user_id,
           u.full_name, u.email, tm.role, tm.created_at
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.team_id = p_team_id
    ORDER BY FIELD(tm.role, 'LEADER', 'MEMBER'), u.full_name;
END$$

-- -----------------------------------------------------------------------------
-- sp_team_add_member
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_team_add_member$$
CREATE PROCEDURE sp_team_add_member(
    IN  p_team_id    BIGINT,
    IN  p_user_id    BIGINT,
    IN  p_role       VARCHAR(50),
    IN  p_inviter_id BIGINT,
    OUT p_member_id  BIGINT,
    OUT p_error      VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN SET p_error = 'DB_ERROR'; ROLLBACK; END;
    SET p_error = NULL;

    IF NOT fn_is_team_leader(p_inviter_id, p_team_id) THEN
        SET p_error = 'NOT_AUTHORIZED';
    ELSEIF NOT fn_user_exists(p_user_id) THEN
        SET p_error = 'USER_NOT_FOUND';
    ELSEIF fn_is_team_member(p_user_id, p_team_id) THEN
        SET p_error = 'ALREADY_MEMBER';
    ELSE
        START TRANSACTION;
        INSERT INTO team_members (team_id, user_id, role)
        VALUES (p_team_id, p_user_id, p_role);
        SET p_member_id = LAST_INSERT_ID();
        -- Tự động tạo bản ghi consent chờ xác nhận
        INSERT IGNORE INTO consents (team_id, user_id, agreed)
        VALUES (p_team_id, p_user_id, FALSE);
        COMMIT;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_team_remove_member
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_team_remove_member$$
CREATE PROCEDURE sp_team_remove_member(
    IN  p_team_id    BIGINT,
    IN  p_user_id    BIGINT,
    IN  p_remover_id BIGINT,
    OUT p_error      VARCHAR(255)
)
BEGIN
    SET p_error = NULL;
    IF NOT fn_is_team_leader(p_remover_id, p_team_id) THEN
        SET p_error = 'NOT_AUTHORIZED';
    ELSEIF NOT fn_is_team_member(p_user_id, p_team_id) THEN
        SET p_error = 'NOT_A_MEMBER';
    ELSE
        DELETE FROM team_members
        WHERE team_id = p_team_id AND user_id = p_user_id;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_team_get_by_user : danh sách team của user
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_team_get_by_user$$
CREATE PROCEDURE sp_team_get_by_user(IN p_user_id BIGINT)
BEGIN
    SELECT t.id, t.name, t.description, tm.role, t.created_at
    FROM teams t
    JOIN team_members tm ON tm.team_id = t.id
    WHERE tm.user_id = p_user_id
    ORDER BY t.created_at DESC;
END$$

-- =============================================================================
-- PHẦN 4 – STORED PROCEDURES: CONSENT (sp_consent_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_consent_record : ghi nhận đồng ý / từ chối
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_consent_record$$
CREATE PROCEDURE sp_consent_record(
    IN  p_user_id  BIGINT,
    IN  p_team_id  BIGINT,
    IN  p_agreed   BOOLEAN,
    OUT p_error    VARCHAR(255)
)
BEGIN
    SET p_error = NULL;
    IF NOT fn_is_team_member(p_user_id, p_team_id) THEN
        SET p_error = 'NOT_A_MEMBER';
    ELSE
        INSERT INTO consents (team_id, user_id, agreed, agreed_at)
        VALUES (p_team_id, p_user_id, p_agreed, IF(p_agreed, NOW(), NULL))
        ON DUPLICATE KEY UPDATE
            agreed    = p_agreed,
            agreed_at = IF(p_agreed, NOW(), NULL);
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_consent_get_status : trạng thái đồng ý của cả team
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_consent_get_status$$
CREATE PROCEDURE sp_consent_get_status(IN p_team_id BIGINT)
BEGIN
    SELECT u.id AS user_id, u.full_name, u.email,
           COALESCE(c.agreed, FALSE) AS agreed,
           c.agreed_at
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    LEFT JOIN consents c ON c.user_id = tm.user_id AND c.team_id = tm.team_id
    WHERE tm.team_id = p_team_id
    ORDER BY u.full_name;
END$$

-- =============================================================================
-- PHẦN 5 – STORED PROCEDURES: SPRINT (sp_sprint_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_sprint_create
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_sprint_create$$
CREATE PROCEDURE sp_sprint_create(
    IN  p_team_id    BIGINT,
    IN  p_name       VARCHAR(255),
    IN  p_start_date DATE,
    IN  p_end_date   DATE,
    IN  p_creator_id BIGINT,
    OUT p_sprint_id  BIGINT,
    OUT p_error      VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN SET p_error = 'DB_ERROR'; ROLLBACK; END;
    SET p_error = NULL;

    IF NOT fn_is_team_leader(p_creator_id, p_team_id) THEN
        SET p_error = 'NOT_AUTHORIZED';
    ELSEIF p_end_date < p_start_date THEN
        SET p_error = 'INVALID_DATES';
    ELSE
        START TRANSACTION;
        INSERT INTO sprints (team_id, name, start_date, end_date, status)
        VALUES (p_team_id, p_name, p_start_date, p_end_date, 'ACTIVE');
        SET p_sprint_id = LAST_INSERT_ID();
        COMMIT;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_sprint_get_by_id
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_sprint_get_by_id$$
CREATE PROCEDURE sp_sprint_get_by_id(IN p_sprint_id BIGINT)
BEGIN
    SELECT s.id, s.team_id, s.name, s.start_date, s.end_date,
           s.status,
           DATEDIFF(s.end_date, s.start_date) + 1 AS total_days,
           t.name AS team_name
    FROM sprints s
    JOIN teams t ON t.id = s.team_id
    WHERE s.id = p_sprint_id;
END$$

-- -----------------------------------------------------------------------------
-- sp_sprint_list_by_team : liệt kê sprint theo team, lọc theo status
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_sprint_list_by_team$$
CREATE PROCEDURE sp_sprint_list_by_team(
    IN p_team_id BIGINT,
    IN p_status  VARCHAR(20)   -- NULL = tất cả
)
BEGIN
    SELECT id, name, start_date, end_date, status,
           DATEDIFF(end_date, start_date) + 1 AS total_days
    FROM sprints
    WHERE team_id = p_team_id
      AND (p_status IS NULL OR status = p_status)
    ORDER BY start_date DESC;
END$$

-- -----------------------------------------------------------------------------
-- sp_sprint_close : đóng sprint, chuẩn bị tính điểm
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_sprint_close$$
CREATE PROCEDURE sp_sprint_close(
    IN  p_sprint_id  BIGINT,
    IN  p_closer_id  BIGINT,
    OUT p_error      VARCHAR(255)
)
BEGIN
    DECLARE v_team_id BIGINT;
    SET p_error = NULL;
    SELECT team_id INTO v_team_id FROM sprints WHERE id = p_sprint_id;
    IF v_team_id IS NULL THEN
        SET p_error = 'SPRINT_NOT_FOUND';
    ELSEIF NOT fn_is_team_leader(p_closer_id, v_team_id) THEN
        SET p_error = 'NOT_AUTHORIZED';
    ELSE
        UPDATE sprints SET status = 'CLOSED' WHERE id = p_sprint_id;
    END IF;
END$$

-- =============================================================================
-- PHẦN 6 – STORED PROCEDURES: ACTIVITY EVENT (sp_activity_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_activity_log : ghi nhận sự kiện hoạt động thô
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_activity_log$$
CREATE PROCEDURE sp_activity_log(
    IN  p_team_id              BIGINT,
    IN  p_sprint_id            BIGINT,
    IN  p_user_id              BIGINT,
    IN  p_source               VARCHAR(50),
    IN  p_event_type           VARCHAR(100),
    IN  p_story_points         DECIMAL(5,1),
    IN  p_difficulty_level     TINYINT,
    IN  p_is_on_time           BOOLEAN,
    IN  p_delay_days           DECIMAL(5,1),
    IN  p_is_helpful_comment   BOOLEAN,
    IN  p_is_support_mention   BOOLEAN,
    IN  p_is_review_for_others BOOLEAN,
    IN  p_details              TEXT,
    IN  p_occurred_at          TIMESTAMP,
    OUT p_event_id             BIGINT,
    OUT p_error                VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN SET p_error = 'DB_ERROR'; ROLLBACK; END;
    SET p_error = NULL;

    IF NOT fn_is_team_member(p_user_id, p_team_id) THEN
        SET p_error = 'NOT_A_MEMBER';
    ELSEIF NOT fn_has_consent(p_user_id, p_team_id) THEN
        SET p_error = 'NO_CONSENT';
    ELSE
        START TRANSACTION;
        INSERT INTO activity_events (
            team_id, sprint_id, user_id, source, event_type,
            story_points, difficulty_level, is_on_time, delay_days,
            is_helpful_comment, is_support_mention, is_review_for_others,
            details, occurred_at
        ) VALUES (
            p_team_id, p_sprint_id, p_user_id, p_source, p_event_type,
            p_story_points, p_difficulty_level, p_is_on_time, p_delay_days,
            p_is_helpful_comment, p_is_support_mention, p_is_review_for_others,
            p_details, COALESCE(p_occurred_at, NOW())
        );
        SET p_event_id = LAST_INSERT_ID();
        COMMIT;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_activity_get_by_sprint_user
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_activity_get_by_sprint_user$$
CREATE PROCEDURE sp_activity_get_by_sprint_user(
    IN p_sprint_id BIGINT,
    IN p_user_id   BIGINT
)
BEGIN
    SELECT id, source, event_type,
           story_points, difficulty_level,
           is_on_time, delay_days,
           is_helpful_comment, is_support_mention, is_review_for_others,
           occurred_at
    FROM activity_events
    WHERE sprint_id = p_sprint_id AND user_id = p_user_id
    ORDER BY occurred_at;
END$$

-- -----------------------------------------------------------------------------
-- sp_activity_get_by_sprint : tất cả events trong sprint
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_activity_get_by_sprint$$
CREATE PROCEDURE sp_activity_get_by_sprint(IN p_sprint_id BIGINT)
BEGIN
    SELECT ae.id, ae.user_id, u.full_name,
           ae.source, ae.event_type,
           ae.story_points, ae.difficulty_level,
           ae.is_on_time, ae.delay_days, ae.rework_count,
           ae.occurred_at
    FROM activity_events ae
    JOIN users u ON u.id = ae.user_id
    WHERE ae.sprint_id = p_sprint_id
    ORDER BY ae.occurred_at;
END$$

-- =============================================================================
-- PHẦN 7 – STORED PROCEDURES: SPRINT AVAILABILITY (sp_availability_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_availability_set : khai báo ngày khả dụng (a_i)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_availability_set$$
CREATE PROCEDURE sp_availability_set(
    IN  p_sprint_id        BIGINT,
    IN  p_user_id          BIGINT,
    IN  p_available_days   INT,
    IN  p_reason           VARCHAR(255),
    IN  p_confirmed_by_leader BOOLEAN,
    OUT p_error            VARCHAR(255)
)
BEGIN
    DECLARE v_team_id     BIGINT;
    DECLARE v_total_days  INT;
    DECLARE v_member_id   BIGINT;
    DECLARE v_ratio       DECIMAL(4,3);

    SET p_error = NULL;
    SELECT team_id INTO v_team_id FROM sprints WHERE id = p_sprint_id;
    SELECT id INTO v_member_id
    FROM team_members WHERE team_id = v_team_id AND user_id = p_user_id;

    IF v_member_id IS NULL THEN
        SET p_error = 'NOT_A_MEMBER';
    ELSE
        SET v_total_days = fn_sprint_total_days(p_sprint_id);
        IF v_total_days = 0 THEN
            SET v_ratio = 1.000;
        ELSE
            SET v_ratio = fn_clamp_availability(p_available_days / v_total_days);
        END IF;

        INSERT INTO sprint_availability
            (sprint_id, team_member_id, available_days, reason,
             availability_ratio, confirmed_by_leader)
        VALUES
            (p_sprint_id, v_member_id, p_available_days, p_reason,
             v_ratio, p_confirmed_by_leader)
        ON DUPLICATE KEY UPDATE
            available_days       = p_available_days,
            reason               = p_reason,
            availability_ratio   = v_ratio,
            confirmed_by_leader  = p_confirmed_by_leader;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_availability_get_sprint : xem khả dụng cả nhóm trong sprint
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_availability_get_sprint$$
CREATE PROCEDURE sp_availability_get_sprint(IN p_sprint_id BIGINT)
BEGIN
    SELECT u.id AS user_id, u.full_name,
           COALESCE(sa.available_days, fn_sprint_total_days(p_sprint_id)) AS available_days,
           fn_sprint_total_days(p_sprint_id)   AS total_days,
           COALESCE(sa.availability_ratio, 1.0) AS availability_ratio,
           sa.reason,
           sa.confirmed_by_leader
    FROM sprints sp
    JOIN team_members tm ON tm.team_id = sp.team_id
    JOIN users u ON u.id = tm.user_id
    LEFT JOIN sprint_availability sa
        ON sa.sprint_id = sp.id AND sa.team_member_id = tm.id
    WHERE sp.id = p_sprint_id
    ORDER BY u.full_name;
END$$

-- =============================================================================
-- PHẦN 8 – SCORING ENGINE: TẦNG 1 (sp_scoring_compute_raw_features)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_scoring_compute_raw_features
-- Tổng hợp activity_events → raw_feature_vectors cho cả team trong sprint
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_scoring_compute_raw_features$$
CREATE PROCEDURE sp_scoring_compute_raw_features(
    IN  p_sprint_id BIGINT,
    OUT p_error     VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_team_id BIGINT;
    SET p_error = NULL;
    SELECT team_id INTO v_team_id FROM sprints WHERE id = p_sprint_id;
    IF v_team_id IS NULL THEN
        SET p_error = 'SPRINT_NOT_FOUND';
        LEAVE proc_label;
    END IF;

    -- Xóa dữ liệu cũ nếu có (recalculate)
    DELETE FROM raw_feature_vectors
    WHERE sprint_id = p_sprint_id AND team_id = v_team_id;

    -- Tổng hợp từ activity_events + manual_contributions
    INSERT INTO raw_feature_vectors (
        sprint_id, user_id, team_id,
        cards_completed, total_story_points, avg_difficulty, checklist_items_done,
        on_time_rate, median_delay_days, rework_count,
        helpful_comments, cards_reviewed_others, support_mentions,
        confirmed_manual_contributions, total_events, computed_at
    )
    SELECT
        p_sprint_id,
        tm.user_id,
        v_team_id,
        -- A: Sản lượng
        SUM(CASE WHEN ae.event_type = 'CARD_COMPLETED'     THEN 1 ELSE 0 END),
        COALESCE(SUM(ae.story_points), 0),
        COALESCE(AVG(CASE WHEN ae.event_type = 'CARD_COMPLETED'
                          THEN ae.difficulty_level END), 0),
        SUM(CASE WHEN ae.event_type = 'CHECKLIST_ITEM_DONE' THEN 1 ELSE 0 END),
        -- B: Tin cậy
        COALESCE(
            SUM(CASE WHEN ae.is_on_time = TRUE  THEN 1 ELSE 0 END)
            / NULLIF(SUM(CASE WHEN ae.event_type = 'CARD_COMPLETED' THEN 1 ELSE 0 END), 0),
        0),
        -- median_delay_days: dùng percentile_cont approximate
        COALESCE(AVG(CASE WHEN ae.delay_days > 0 THEN ae.delay_days END), 0),
        SUM(CASE WHEN ae.event_type = 'CARD_REOPENED'  THEN 1 ELSE 0 END),
        -- C: Phối hợp
        SUM(CASE WHEN ae.is_helpful_comment   = TRUE THEN 1 ELSE 0 END),
        SUM(CASE WHEN ae.is_review_for_others = TRUE THEN 1 ELSE 0 END),
        SUM(CASE WHEN ae.is_support_mention   = TRUE THEN 1 ELSE 0 END),
        -- D: Ngoài hệ thống
        COALESCE((
            SELECT COUNT(*) FROM manual_contributions mc
            WHERE mc.user_id  = tm.user_id
              AND mc.sprint_id = p_sprint_id
              AND mc.confirmed = TRUE
        ), 0),
        -- total_events
        COUNT(ae.id),
        NOW()
    FROM team_members tm
    LEFT JOIN activity_events ae
        ON ae.user_id = tm.user_id AND ae.sprint_id = p_sprint_id
    WHERE tm.team_id = v_team_id
      AND fn_has_consent(tm.user_id, v_team_id)
    GROUP BY tm.user_id;

END$$

-- =============================================================================
-- PHẦN 9 – SCORING ENGINE: TẦNG 2 (sp_scoring_normalize)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_scoring_compute_group_stats : tính median & MAD của nhóm (sau ln-transform)
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_scoring_compute_group_stats$$
CREATE PROCEDURE sp_scoring_compute_group_stats(
    IN  p_sprint_id BIGINT,
    OUT p_error     VARCHAR(255)
)
BEGIN
    DECLARE v_team_id BIGINT;
    SET p_error = NULL;
    SELECT team_id INTO v_team_id FROM sprints WHERE id = p_sprint_id;

    DELETE FROM sprint_feature_stats
    WHERE sprint_id = p_sprint_id AND team_id = v_team_id;

    -- MariaDB: dùng subquery + percentile simulation bằng AVG (đơn giản hóa)
    -- Với nhóm nhỏ (≤ 10 người), AVG của ln-transform xấp xỉ median đủ tốt
    -- Production nên dùng PERCENTILE_CONT qua window function (MariaDB 10.3.3+)
    INSERT INTO sprint_feature_stats (
        sprint_id, team_id,
        -- cards_completed
        median_ln_cards_completed, mad_ln_cards_completed,
        -- story_points
        median_ln_story_points, mad_ln_story_points,
        -- avg_difficulty
        median_ln_avg_difficulty, mad_ln_avg_difficulty,
        -- checklist_done
        median_ln_checklist_done, mad_ln_checklist_done,
        -- on_time_rate
        median_ln_on_time_rate, mad_ln_on_time_rate,
        -- median_delay
        median_ln_median_delay, mad_ln_median_delay,
        -- rework
        median_ln_rework_count, mad_ln_rework_count,
        -- helpful_comments
        median_ln_helpful_comments, mad_ln_helpful_comments,
        -- cards_reviewed
        median_ln_cards_reviewed, mad_ln_cards_reviewed,
        -- support_mentions
        median_ln_support_mentions, mad_ln_support_mentions,
        -- manual_contrib
        median_ln_manual_contrib, mad_ln_manual_contrib,
        computed_at
    )
    SELECT
        p_sprint_id, v_team_id,
        AVG(fn_ln_transform(cards_completed)),
        AVG(ABS(fn_ln_transform(cards_completed)
            - (SELECT AVG(fn_ln_transform(cards_completed))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        AVG(fn_ln_transform(total_story_points)),
        AVG(ABS(fn_ln_transform(total_story_points)
            - (SELECT AVG(fn_ln_transform(total_story_points))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        AVG(fn_ln_transform(avg_difficulty)),
        AVG(ABS(fn_ln_transform(avg_difficulty)
            - (SELECT AVG(fn_ln_transform(avg_difficulty))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        AVG(fn_ln_transform(checklist_items_done)),
        AVG(ABS(fn_ln_transform(checklist_items_done)
            - (SELECT AVG(fn_ln_transform(checklist_items_done))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        AVG(fn_ln_transform(on_time_rate)),
        AVG(ABS(fn_ln_transform(on_time_rate)
            - (SELECT AVG(fn_ln_transform(on_time_rate))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        AVG(fn_ln_transform(median_delay_days)),
        AVG(ABS(fn_ln_transform(median_delay_days)
            - (SELECT AVG(fn_ln_transform(median_delay_days))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        AVG(fn_ln_transform(rework_count)),
        AVG(ABS(fn_ln_transform(rework_count)
            - (SELECT AVG(fn_ln_transform(rework_count))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        AVG(fn_ln_transform(helpful_comments)),
        AVG(ABS(fn_ln_transform(helpful_comments)
            - (SELECT AVG(fn_ln_transform(helpful_comments))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        AVG(fn_ln_transform(cards_reviewed_others)),
        AVG(ABS(fn_ln_transform(cards_reviewed_others)
            - (SELECT AVG(fn_ln_transform(cards_reviewed_others))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        AVG(fn_ln_transform(support_mentions)),
        AVG(ABS(fn_ln_transform(support_mentions)
            - (SELECT AVG(fn_ln_transform(support_mentions))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        AVG(fn_ln_transform(confirmed_manual_contributions)),
        AVG(ABS(fn_ln_transform(confirmed_manual_contributions)
            - (SELECT AVG(fn_ln_transform(confirmed_manual_contributions))
               FROM raw_feature_vectors WHERE sprint_id = p_sprint_id AND team_id = v_team_id))),
        NOW()
    FROM raw_feature_vectors
    WHERE sprint_id = p_sprint_id AND team_id = v_team_id;
END$$

-- -----------------------------------------------------------------------------
-- sp_scoring_normalize : tính z-score robust, cắt [-3,3] → normalized_features
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_scoring_normalize$$
CREATE PROCEDURE sp_scoring_normalize(
    IN  p_sprint_id BIGINT,
    OUT p_error     VARCHAR(255)
)
BEGIN
    DECLARE v_team_id BIGINT;
    SET p_error = NULL;
    SELECT team_id INTO v_team_id FROM sprints WHERE id = p_sprint_id;

    DELETE FROM normalized_features
    WHERE sprint_id = p_sprint_id AND team_id = v_team_id;

    INSERT INTO normalized_features (
        sprint_id, user_id, team_id,
        z_cards_completed, z_story_points, z_avg_difficulty, z_checklist_done,
        z_on_time_rate, z_median_delay, z_rework_count,
        z_helpful_comments, z_cards_reviewed, z_support_mentions,
        z_manual_contrib, computed_at
    )
    SELECT
        r.sprint_id, r.user_id, r.team_id,
        fn_robust_zscore(fn_ln_transform(r.cards_completed),
            s.median_ln_cards_completed, s.mad_ln_cards_completed),
        fn_robust_zscore(fn_ln_transform(r.total_story_points),
            s.median_ln_story_points, s.mad_ln_story_points),
        fn_robust_zscore(fn_ln_transform(r.avg_difficulty),
            s.median_ln_avg_difficulty, s.mad_ln_avg_difficulty),
        fn_robust_zscore(fn_ln_transform(r.checklist_items_done),
            s.median_ln_checklist_done, s.mad_ln_checklist_done),
        fn_robust_zscore(fn_ln_transform(r.on_time_rate),
            s.median_ln_on_time_rate, s.mad_ln_on_time_rate),
        -- delay & rework: đảo dấu (thấp = tốt)
        -fn_robust_zscore(fn_ln_transform(r.median_delay_days),
            s.median_ln_median_delay, s.mad_ln_median_delay),
        -fn_robust_zscore(fn_ln_transform(r.rework_count),
            s.median_ln_rework_count, s.mad_ln_rework_count),
        fn_robust_zscore(fn_ln_transform(r.helpful_comments),
            s.median_ln_helpful_comments, s.mad_ln_helpful_comments),
        fn_robust_zscore(fn_ln_transform(r.cards_reviewed_others),
            s.median_ln_cards_reviewed, s.mad_ln_cards_reviewed),
        fn_robust_zscore(fn_ln_transform(r.support_mentions),
            s.median_ln_support_mentions, s.mad_ln_support_mentions),
        fn_robust_zscore(fn_ln_transform(r.confirmed_manual_contributions),
            s.median_ln_manual_contrib, s.mad_ln_manual_contrib),
        NOW()
    FROM raw_feature_vectors r
    JOIN sprint_feature_stats s
        ON s.sprint_id = r.sprint_id AND s.team_id = r.team_id
    WHERE r.sprint_id = p_sprint_id AND r.team_id = v_team_id;
END$$

-- =============================================================================
-- PHẦN 10 – SCORING ENGINE: TẦNG 3 (sp_scoring_compute_dimensions)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_scoring_compute_dimensions
-- d_ik = Σⱼ λ_kj · z_ij  →  D'_ik = D_ik · (1 + β(1 − a_i))
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_scoring_compute_dimensions$$
CREATE PROCEDURE sp_scoring_compute_dimensions(
    IN  p_sprint_id BIGINT,
    IN  p_beta      DECIMAL(4,3),  -- mặc định 0.5
    OUT p_error     VARCHAR(255)
)
BEGIN
    DECLARE v_team_id BIGINT;
    SET p_error = NULL;
    IF p_beta IS NULL THEN SET p_beta = 0.500; END IF;
    SELECT team_id INTO v_team_id FROM sprints WHERE id = p_sprint_id;

    DELETE FROM dimension_scores
    WHERE sprint_id = p_sprint_id AND team_id = v_team_id;

    INSERT INTO dimension_scores (
        sprint_id, user_id, team_id,
        d1_output, d2_reliability, d3_collaboration, d4_peer,
        d1_output_adj, d2_reliability_adj, d3_collaboration_adj, d4_peer_adj,
        availability_ratio, beta_used, computed_at
    )
    SELECT
        nf.sprint_id,
        nf.user_id,
        nf.team_id,
        -- D1: Output (loading mặc định: cards 0.3, sp 0.4, diff 0.2, checklist 0.1)
        COALESCE(
            dl1.lam_cards_completed  * nf.z_cards_completed
          + dl1.lam_story_points     * nf.z_story_points
          + dl1.lam_avg_difficulty   * nf.z_avg_difficulty
          + dl1.lam_checklist_done   * nf.z_checklist_done,
          -- fallback nếu chưa cấu hình dimension_loadings
          0.30 * COALESCE(nf.z_cards_completed,0)
          + 0.40 * COALESCE(nf.z_story_points,0)
          + 0.20 * COALESCE(nf.z_avg_difficulty,0)
          + 0.10 * COALESCE(nf.z_checklist_done,0)
        ) AS d1,
        -- D2: Reliability (on_time 0.4, delay 0.4, rework 0.2)
        COALESCE(
            dl2.lam_on_time_rate * nf.z_on_time_rate
          + dl2.lam_median_delay * nf.z_median_delay
          + dl2.lam_rework_count * nf.z_rework_count,
          0.40 * COALESCE(nf.z_on_time_rate,0)
          + 0.40 * COALESCE(nf.z_median_delay,0)
          + 0.20 * COALESCE(nf.z_rework_count,0)
        ) AS d2,
        -- D3: Collaboration (helpful 0.4, review 0.3, support 0.3)
        COALESCE(
            dl3.lam_helpful_comments  * nf.z_helpful_comments
          + dl3.lam_cards_reviewed    * nf.z_cards_reviewed
          + dl3.lam_support_mentions  * nf.z_support_mentions,
          0.40 * COALESCE(nf.z_helpful_comments,0)
          + 0.30 * COALESCE(nf.z_cards_reviewed,0)
          + 0.30 * COALESCE(nf.z_support_mentions,0)
        ) AS d3,
        -- D4: từ peer_score_aggregates (NULL nếu chưa đủ)
        psa.d4_score AS d4,
        -- D1 adj
        fn_adjust_dimension(
          COALESCE(
            dl1.lam_cards_completed * nf.z_cards_completed
            + dl1.lam_story_points  * nf.z_story_points
            + dl1.lam_avg_difficulty* nf.z_avg_difficulty
            + dl1.lam_checklist_done* nf.z_checklist_done,
            0.30*COALESCE(nf.z_cards_completed,0)+0.40*COALESCE(nf.z_story_points,0)
            +0.20*COALESCE(nf.z_avg_difficulty,0)+0.10*COALESCE(nf.z_checklist_done,0)
          ),
          COALESCE(sa.availability_ratio, 1.0), p_beta
        ),
        fn_adjust_dimension(
          COALESCE(
            dl2.lam_on_time_rate*nf.z_on_time_rate
            +dl2.lam_median_delay*nf.z_median_delay
            +dl2.lam_rework_count*nf.z_rework_count,
            0.40*COALESCE(nf.z_on_time_rate,0)+0.40*COALESCE(nf.z_median_delay,0)
            +0.20*COALESCE(nf.z_rework_count,0)
          ),
          COALESCE(sa.availability_ratio, 1.0), p_beta
        ),
        fn_adjust_dimension(
          COALESCE(
            dl3.lam_helpful_comments*nf.z_helpful_comments
            +dl3.lam_cards_reviewed*nf.z_cards_reviewed
            +dl3.lam_support_mentions*nf.z_support_mentions,
            0.40*COALESCE(nf.z_helpful_comments,0)+0.30*COALESCE(nf.z_cards_reviewed,0)
            +0.30*COALESCE(nf.z_support_mentions,0)
          ),
          COALESCE(sa.availability_ratio, 1.0), p_beta
        ),
        fn_adjust_dimension(
          COALESCE(psa.d4_score, 0),
          COALESCE(sa.availability_ratio, 1.0), p_beta
        ),
        COALESCE(sa.availability_ratio, 1.0),
        p_beta,
        NOW()
    FROM normalized_features nf
    -- availability
    LEFT JOIN team_members tm
        ON tm.user_id = nf.user_id AND tm.team_id = nf.team_id
    LEFT JOIN sprint_availability sa
        ON sa.sprint_id = nf.sprint_id AND sa.team_member_id = tm.id
    -- loadings D1
    LEFT JOIN dimension_loadings dl1
        ON dl1.team_id = nf.team_id AND dl1.dimension = 'D1_OUTPUT'
       AND (dl1.sprint_id = nf.sprint_id OR dl1.is_default = TRUE)
    -- loadings D2
    LEFT JOIN dimension_loadings dl2
        ON dl2.team_id = nf.team_id AND dl2.dimension = 'D2_RELIABILITY'
       AND (dl2.sprint_id = nf.sprint_id OR dl2.is_default = TRUE)
    -- loadings D3
    LEFT JOIN dimension_loadings dl3
        ON dl3.team_id = nf.team_id AND dl3.dimension = 'D3_COLLABORATION'
       AND (dl3.sprint_id = nf.sprint_id OR dl3.is_default = TRUE)
    -- peer D4
    LEFT JOIN review_rounds rr
        ON rr.sprint_id = nf.sprint_id AND rr.team_id = nf.team_id
    LEFT JOIN peer_score_aggregates psa
        ON psa.review_round_id = rr.id
       AND psa.reviewee_id = nf.user_id
       AND psa.is_sufficient = TRUE
    WHERE nf.sprint_id = p_sprint_id AND nf.team_id = v_team_id;
END$$

-- =============================================================================
-- PHẦN 11 – SCORING ENGINE: TẦNG 4 (sp_scoring_compute_contributions)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_scoring_compute_contributions
-- C_i = 100 · σ(Σₖ w_k · D'_ik)   p_i = C_i / Σⱼ C_j
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_scoring_compute_contributions$$
CREATE PROCEDURE sp_scoring_compute_contributions(
    IN  p_sprint_id BIGINT,
    OUT p_error     VARCHAR(255)
)
BEGIN
    DECLARE v_team_id   BIGINT;
    DECLARE v_total_ci  DECIMAL(12,4);
    SET p_error = NULL;
    SELECT team_id INTO v_team_id FROM sprints WHERE id = p_sprint_id;

    DELETE FROM contribution_scores
    WHERE sprint_id = p_sprint_id AND team_id = v_team_id;

    -- Bước 1: Tính C_i tạm thời (chưa có p_i)
    INSERT INTO contribution_scores (
        team_id, sprint_id, user_id,
        raw_weighted_sum, score, percentage,
        peer_included, has_sufficient_data, total_events_used, computed_at
    )
    SELECT
        ds.team_id,
        ds.sprint_id,
        ds.user_id,
        -- raw weighted sum Σ w_k D'_ik
        CASE WHEN ds.d4_peer_adj IS NOT NULL THEN
            COALESCE(sw.w_output,       0.40) * COALESCE(ds.d1_output_adj,0)
          + COALESCE(sw.w_reliability,  0.20) * COALESCE(ds.d2_reliability_adj,0)
          + COALESCE(sw.w_collaboration,0.15) * COALESCE(ds.d3_collaboration_adj,0)
          + COALESCE(sw.w_peer,         0.25) * COALESCE(ds.d4_peer_adj,0)
        ELSE
            COALESCE(sw.w_output_no_peer,       0.5333) * COALESCE(ds.d1_output_adj,0)
          + COALESCE(sw.w_reliability_no_peer,  0.2667) * COALESCE(ds.d2_reliability_adj,0)
          + COALESCE(sw.w_collaboration_no_peer,0.2000) * COALESCE(ds.d3_collaboration_adj,0)
        END AS raw_ws,
        -- C_i = 100 · σ(raw_ws)
        ROUND(100 * fn_logistic(
            CASE WHEN ds.d4_peer_adj IS NOT NULL THEN
                COALESCE(sw.w_output,0.40)*COALESCE(ds.d1_output_adj,0)
              + COALESCE(sw.w_reliability,0.20)*COALESCE(ds.d2_reliability_adj,0)
              + COALESCE(sw.w_collaboration,0.15)*COALESCE(ds.d3_collaboration_adj,0)
              + COALESCE(sw.w_peer,0.25)*COALESCE(ds.d4_peer_adj,0)
            ELSE
                COALESCE(sw.w_output_no_peer,0.5333)*COALESCE(ds.d1_output_adj,0)
              + COALESCE(sw.w_reliability_no_peer,0.2667)*COALESCE(ds.d2_reliability_adj,0)
              + COALESCE(sw.w_collaboration_no_peer,0.2000)*COALESCE(ds.d3_collaboration_adj,0)
            END
        ), 2),
        0.0000,   -- percentage placeholder
        ds.d4_peer_adj IS NOT NULL,
        rfv.total_events >= 5,
        COALESCE(rfv.total_events, 0),
        NOW()
    FROM dimension_scores ds
    LEFT JOIN scoring_weights sw
        ON sw.team_id = ds.team_id
       AND (sw.sprint_id = ds.sprint_id OR sw.is_default = TRUE)
    LEFT JOIN raw_feature_vectors rfv
        ON rfv.sprint_id = ds.sprint_id AND rfv.user_id = ds.user_id
    WHERE ds.sprint_id = p_sprint_id AND ds.team_id = v_team_id;

    -- Bước 2: Tính Σ C_j
    SELECT SUM(score) INTO v_total_ci
    FROM contribution_scores
    WHERE sprint_id = p_sprint_id AND team_id = v_team_id;

    -- Bước 3: Cập nhật p_i = C_i / Σ C_j
    IF v_total_ci > 0 THEN
        UPDATE contribution_scores
        SET percentage = ROUND(score / v_total_ci, 4)
        WHERE sprint_id = p_sprint_id AND team_id = v_team_id;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_scoring_run_pipeline : chạy toàn bộ pipeline Tầng 1 → 4 cho một sprint
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_scoring_run_pipeline$$
CREATE PROCEDURE sp_scoring_run_pipeline(
    IN  p_sprint_id BIGINT,
    OUT p_error     VARCHAR(255)
)
proc_label: BEGIN
    SET p_error = NULL;

    CALL sp_scoring_compute_raw_features(p_sprint_id, @err);
    IF @err IS NOT NULL THEN SET p_error = CONCAT('T1:', @err); LEAVE proc_label; END IF;

    CALL sp_scoring_compute_group_stats(p_sprint_id, @err);
    IF @err IS NOT NULL THEN SET p_error = CONCAT('T2_STATS:', @err); LEAVE proc_label; END IF;

    CALL sp_scoring_normalize(p_sprint_id, @err);
    IF @err IS NOT NULL THEN SET p_error = CONCAT('T2_NORM:', @err); LEAVE proc_label; END IF;

    CALL sp_scoring_compute_dimensions(p_sprint_id, 0.500, @err);
    IF @err IS NOT NULL THEN SET p_error = CONCAT('T3:', @err); LEAVE proc_label; END IF;

    CALL sp_scoring_compute_contributions(p_sprint_id, @err);
    IF @err IS NOT NULL THEN SET p_error = CONCAT('T4:', @err); LEAVE proc_label; END IF;

    CALL sp_fraud_detect(p_sprint_id, @err);

END$$

-- =============================================================================
-- PHẦN 12 – PEER REVIEW (sp_review_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_review_open_round : mở vòng chấm chéo
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_review_open_round$$
CREATE PROCEDURE sp_review_open_round(
    IN  p_sprint_id   BIGINT,
    IN  p_name        VARCHAR(255),
    IN  p_end_date    TIMESTAMP,
    IN  p_opener_id   BIGINT,
    OUT p_round_id    BIGINT,
    OUT p_error       VARCHAR(255)
)
BEGIN
    DECLARE v_team_id BIGINT;
    SET p_error = NULL;
    SELECT team_id INTO v_team_id FROM sprints WHERE id = p_sprint_id;

    IF NOT fn_is_team_leader(p_opener_id, v_team_id) THEN
        SET p_error = 'NOT_AUTHORIZED';
    ELSE
        INSERT INTO review_rounds (team_id, sprint_id, name, start_date, end_date, status)
        VALUES (v_team_id, p_sprint_id, p_name, NOW(), p_end_date, 'OPEN');
        SET p_round_id = LAST_INSERT_ID();
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_review_submit : nộp phiếu chấm chéo
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_review_submit$$
CREATE PROCEDURE sp_review_submit(
    IN  p_round_id    BIGINT,
    IN  p_reviewer_id BIGINT,
    IN  p_reviewee_id BIGINT,
    IN  p_criterion   VARCHAR(50),
    IN  p_score       TINYINT,
    IN  p_feedback    TEXT,
    OUT p_sub_id      BIGINT,
    OUT p_error       VARCHAR(255)
)
BEGIN
    DECLARE v_team_id  BIGINT;
    DECLARE v_status   VARCHAR(20);
    SET p_error = NULL;

    SELECT rr.team_id, rr.status INTO v_team_id, v_status
    FROM review_rounds rr WHERE id = p_round_id;

    IF v_status != 'OPEN' THEN
        SET p_error = 'ROUND_NOT_OPEN';
    ELSEIF p_reviewer_id = p_reviewee_id THEN
        SET p_error = 'SELF_REVIEW_NOT_ALLOWED';
    ELSEIF NOT fn_is_team_member(p_reviewer_id, v_team_id) THEN
        SET p_error = 'NOT_A_MEMBER';
    ELSEIF p_score NOT BETWEEN 1 AND 5 THEN
        SET p_error = 'INVALID_SCORE';
    ELSE
        INSERT INTO review_submissions
            (review_round_id, reviewer_id, reviewee_id, criterion, score, feedback)
        VALUES
            (p_round_id, p_reviewer_id, p_reviewee_id, p_criterion, p_score, p_feedback)
        ON DUPLICATE KEY UPDATE score = p_score, feedback = p_feedback;
        SET p_sub_id = LAST_INSERT_ID();
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_review_aggregate : tổng hợp D4 cho tất cả reviewee trong vòng
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_review_aggregate$$
CREATE PROCEDURE sp_review_aggregate(
    IN  p_round_id BIGINT,
    OUT p_error    VARCHAR(255)
)
BEGIN
    DECLARE v_sprint_id BIGINT;
    DECLARE v_team_id   BIGINT;
    DECLARE v_min_sub   INT;
    SET p_error = NULL;

    SELECT sprint_id, team_id, min_submissions_required
    INTO v_sprint_id, v_team_id, v_min_sub
    FROM review_rounds WHERE id = p_round_id;

    DELETE FROM peer_score_aggregates WHERE review_round_id = p_round_id;

    INSERT INTO peer_score_aggregates (
        review_round_id, sprint_id, reviewee_id, team_id,
        submission_count, avg_quality, avg_punctuality, avg_cooperation,
        d4_score, is_sufficient, computed_at
    )
    SELECT
        p_round_id,
        v_sprint_id,
        rs.reviewee_id,
        v_team_id,
        COUNT(DISTINCT rs.reviewer_id) AS sub_count,
        AVG(CASE WHEN rs.criterion = 'QUALITY'      THEN rs.score END),
        AVG(CASE WHEN rs.criterion = 'PUNCTUALITY'  THEN rs.score END),
        AVG(CASE WHEN rs.criterion = 'COOPERATION'  THEN rs.score END),
        -- d4_score: normalize avg_total về [0,1]
        CASE WHEN COUNT(DISTINCT rs.reviewer_id) >= v_min_sub THEN
            ROUND((AVG(rs.score) - 1) / 4, 4)
        ELSE NULL END,
        COUNT(DISTINCT rs.reviewer_id) >= v_min_sub,
        NOW()
    FROM review_submissions rs
    WHERE rs.review_round_id = p_round_id
    GROUP BY rs.reviewee_id;

    UPDATE review_rounds SET status = 'AGGREGATED' WHERE id = p_round_id;
END$$

-- -----------------------------------------------------------------------------
-- sp_review_get_results : xem kết quả ẩn danh của vòng chấm
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_review_get_results$$
CREATE PROCEDURE sp_review_get_results(IN p_round_id BIGINT)
BEGIN
    SELECT
        u.full_name,
        psa.submission_count,
        psa.avg_quality,
        psa.avg_punctuality,
        psa.avg_cooperation,
        psa.d4_score,
        psa.is_sufficient,
        CASE WHEN NOT psa.is_sufficient
             THEN 'Chưa đủ bằng chứng (< 3 lượt chấm)'
             ELSE NULL END AS notice
    FROM peer_score_aggregates psa
    JOIN users u ON u.id = psa.reviewee_id
    WHERE psa.review_round_id = p_round_id
    ORDER BY psa.d4_score DESC;
END$$

-- =============================================================================
-- PHẦN 13 – MANUAL CONTRIBUTION (sp_manual_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_manual_submit : thành viên khai báo đóng góp ngoài hệ thống
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_manual_submit$$
CREATE PROCEDURE sp_manual_submit(
    IN  p_team_id    BIGINT,
    IN  p_sprint_id  BIGINT,
    IN  p_user_id    BIGINT,
    IN  p_title      VARCHAR(255),
    IN  p_description TEXT,
    IN  p_equiv_sp   DECIMAL(5,1),
    OUT p_contrib_id BIGINT,
    OUT p_error      VARCHAR(255)
)
BEGIN
    SET p_error = NULL;
    IF NOT fn_is_team_member(p_user_id, p_team_id) THEN
        SET p_error = 'NOT_A_MEMBER';
    ELSE
        INSERT INTO manual_contributions
            (team_id, sprint_id, user_id, title, description,
             equivalent_story_points, confirmed)
        VALUES
            (p_team_id, p_sprint_id, p_user_id, p_title, p_description,
             COALESCE(p_equiv_sp, 0), FALSE);
        SET p_contrib_id = LAST_INSERT_ID();
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_manual_confirm : leader xác nhận đóng góp
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_manual_confirm$$
CREATE PROCEDURE sp_manual_confirm(
    IN  p_contrib_id   BIGINT,
    IN  p_leader_id    BIGINT,
    IN  p_approved     BOOLEAN,
    OUT p_error        VARCHAR(255)
)
BEGIN
    DECLARE v_team_id BIGINT;
    SET p_error = NULL;
    SELECT team_id INTO v_team_id FROM manual_contributions WHERE id = p_contrib_id;

    IF NOT fn_is_team_leader(p_leader_id, v_team_id) THEN
        SET p_error = 'NOT_AUTHORIZED';
    ELSE
        UPDATE manual_contributions
        SET confirmed    = p_approved,
            confirmed_by = p_leader_id,
            confirmed_at = NOW()
        WHERE id = p_contrib_id;
    END IF;
END$$

-- =============================================================================
-- PHẦN 14 – FRAUD DETECTION (sp_fraud_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_fraud_detect : phát hiện gian lận sau khi tính dimension_scores
-- δ_i = Euclidean chuẩn hoá tới tâm nhóm
-- Cờ: D1 cao bất thường (> 1.5) + D4 thấp (< -0.5) → GAMING_SUSPICION
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_fraud_detect$$
CREATE PROCEDURE sp_fraud_detect(
    IN  p_sprint_id BIGINT,
    OUT p_error     VARCHAR(255)
)
BEGIN
    DECLARE v_team_id BIGINT;
    SET p_error = NULL;
    SELECT team_id INTO v_team_id FROM sprints WHERE id = p_sprint_id;

    DELETE FROM fraud_flags
    WHERE sprint_id = p_sprint_id AND team_id = v_team_id AND is_resolved = FALSE;

    INSERT INTO fraud_flags (
        sprint_id, user_id, team_id,
        distance_to_centroid, suspicion_score,
        flag_reason, flag_type, severity
    )
    SELECT
        ds.sprint_id,
        ds.user_id,
        ds.team_id,
        -- δ_i = sqrt(Σ (D_ik - D̄_k)²) / 4 chiều
        ROUND(SQRT(
            POW(COALESCE(ds.d1_output_adj,0)        - avg_d1, 2) +
            POW(COALESCE(ds.d2_reliability_adj,0)   - avg_d2, 2) +
            POW(COALESCE(ds.d3_collaboration_adj,0) - avg_d3, 2) +
            POW(COALESCE(ds.d4_peer_adj,0)          - avg_d4, 2)
        ), 4),
        -- suspicion_score
        LEAST(100, ROUND(
            CASE
                WHEN COALESCE(ds.d1_output_adj,0) > 1.5
                 AND COALESCE(ds.d4_peer_adj, 0) < -0.5
                THEN 80 + (ds.d1_output_adj - 1.5) * 10
                WHEN SQRT(
                    POW(COALESCE(ds.d1_output_adj,0)-avg_d1,2)+
                    POW(COALESCE(ds.d2_reliability_adj,0)-avg_d2,2)+
                    POW(COALESCE(ds.d3_collaboration_adj,0)-avg_d3,2)
                ) > 2.5 THEN 60
                WHEN COALESCE(ds.d1_output_adj,0) < -1.0
                 AND COALESCE(ds.d2_reliability_adj,0) < -1.0
                 AND COALESCE(ds.d3_collaboration_adj,0) < -1.0 THEN 70
                ELSE 0
            END, 1)),
        -- flag_reason
        CASE
            WHEN COALESCE(ds.d1_output_adj,0) > 1.5
             AND COALESCE(ds.d4_peer_adj,0) < -0.5 THEN 'D1_HIGH_D4_LOW'
            WHEN COALESCE(ds.d1_output_adj,0) < -1.0
             AND COALESCE(ds.d2_reliability_adj,0) < -1.0
             AND COALESCE(ds.d3_collaboration_adj,0) < -1.0 THEN 'ALL_DIMS_LOW'
            ELSE 'OUTLIER_DISTANCE'
        END,
        -- flag_type
        CASE
            WHEN COALESCE(ds.d1_output_adj,0) > 1.5
             AND COALESCE(ds.d4_peer_adj,0) < -0.5  THEN 'GAMING_SUSPICION'
            WHEN COALESCE(ds.d1_output_adj,0) < -1.0
             AND COALESCE(ds.d2_reliability_adj,0) < -1.0
             AND COALESCE(ds.d3_collaboration_adj,0) < -1.0 THEN 'FREE_RIDER'
            ELSE 'OUTLIER'
        END,
        CASE
            WHEN LEAST(100, ROUND(
                CASE WHEN COALESCE(ds.d1_output_adj,0)>1.5 AND COALESCE(ds.d4_peer_adj,0)<-0.5
                     THEN 80 ELSE 60 END, 1)) >= 75 THEN 'HIGH'
            WHEN LEAST(100, ROUND(
                CASE WHEN COALESCE(ds.d1_output_adj,0)>1.5 AND COALESCE(ds.d4_peer_adj,0)<-0.5
                     THEN 80 ELSE 60 END, 1)) >= 50 THEN 'MEDIUM'
            ELSE 'LOW'
        END
    FROM dimension_scores ds
    JOIN (
        SELECT sprint_id, team_id,
               AVG(COALESCE(d1_output_adj,0))        AS avg_d1,
               AVG(COALESCE(d2_reliability_adj,0))   AS avg_d2,
               AVG(COALESCE(d3_collaboration_adj,0)) AS avg_d3,
               AVG(COALESCE(d4_peer_adj,0))          AS avg_d4
        FROM dimension_scores
        WHERE sprint_id = p_sprint_id AND team_id = v_team_id
        GROUP BY sprint_id, team_id
    ) centroid ON centroid.sprint_id = ds.sprint_id AND centroid.team_id = ds.team_id
    WHERE ds.sprint_id = p_sprint_id AND ds.team_id = v_team_id
      AND (
        (COALESCE(ds.d1_output_adj,0) > 1.5 AND COALESCE(ds.d4_peer_adj,0) < -0.5)
        OR SQRT(POW(COALESCE(ds.d1_output_adj,0)-avg_d1,2)+POW(COALESCE(ds.d2_reliability_adj,0)-avg_d2,2)) > 2.5
        OR (COALESCE(ds.d1_output_adj,0) < -1.0 AND COALESCE(ds.d2_reliability_adj,0) < -1.0 AND COALESCE(ds.d3_collaboration_adj,0) < -1.0)
      );
END$$

-- -----------------------------------------------------------------------------
-- sp_fraud_resolve : leader xử lý cờ gian lận
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_fraud_resolve$$
CREATE PROCEDURE sp_fraud_resolve(
    IN  p_flag_id   BIGINT,
    IN  p_leader_id BIGINT,
    IN  p_note      TEXT,
    OUT p_error     VARCHAR(255)
)
BEGIN
    DECLARE v_team_id BIGINT;
    SET p_error = NULL;
    SELECT team_id INTO v_team_id FROM fraud_flags WHERE id = p_flag_id;
    IF NOT fn_is_team_leader(p_leader_id, v_team_id) THEN
        SET p_error = 'NOT_AUTHORIZED';
    ELSE
        UPDATE fraud_flags
        SET is_resolved    = TRUE,
            resolved_by    = p_leader_id,
            resolved_at    = NOW(),
            resolution_note = p_note
        WHERE id = p_flag_id;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_fraud_get_active : lấy danh sách cờ chưa xử lý theo team
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_fraud_get_active$$
CREATE PROCEDURE sp_fraud_get_active(IN p_team_id BIGINT)
BEGIN
    SELECT ff.id, s.name AS sprint_name, u.full_name,
           ff.flag_type, ff.severity, ff.flag_reason,
           ff.distance_to_centroid, ff.suspicion_score,
           ff.created_at
    FROM fraud_flags ff
    JOIN sprints s ON s.id = ff.sprint_id
    JOIN users   u ON u.id = ff.user_id
    WHERE ff.team_id    = p_team_id
      AND ff.is_resolved = FALSE
    ORDER BY ff.severity DESC, ff.suspicion_score DESC;
END$$

-- =============================================================================
-- PHẦN 15 – EXPENSE & SPLIT (sp_expense_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_expense_create : tạo chi phí
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_expense_create$$
CREATE PROCEDURE sp_expense_create(
    IN  p_team_id          BIGINT,
    IN  p_paid_by_member_id BIGINT,
    IN  p_title            VARCHAR(255),
    IN  p_description      TEXT,
    IN  p_amount           DECIMAL(19,2),
    IN  p_currency         VARCHAR(3),
    IN  p_split_method     VARCHAR(20),
    IN  p_expense_date     DATE,
    IN  p_linked_sprint_id BIGINT,
    OUT p_expense_id       BIGINT,
    OUT p_error            VARCHAR(255)
)
BEGIN
    DECLARE v_team_check BIGINT;
    SET p_error = NULL;

    SELECT team_id INTO v_team_check FROM team_members WHERE id = p_paid_by_member_id;
    IF v_team_check != p_team_id THEN
        SET p_error = 'PAYER_NOT_IN_TEAM';
    ELSEIF p_amount <= 0 THEN
        SET p_error = 'INVALID_AMOUNT';
    ELSE
        INSERT INTO expenses
            (team_id, paid_by_member_id, title, description, amount,
             currency, split_method, expense_date, linked_sprint_id)
        VALUES
            (p_team_id, p_paid_by_member_id, p_title, p_description, p_amount,
             COALESCE(p_currency,'VND'), p_split_method,
             COALESCE(p_expense_date, CURDATE()), p_linked_sprint_id);
        SET p_expense_id = LAST_INSERT_ID();
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- sp_expense_split_equal : chia đều cho tất cả thành viên
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_expense_split_equal$$
CREATE PROCEDURE sp_expense_split_equal(
    IN  p_expense_id BIGINT,
    OUT p_error      VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_team_id    BIGINT;
    DECLARE v_amount     DECIMAL(19,2);
    DECLARE v_count      INT;
    DECLARE v_share      DECIMAL(19,2);

    SET p_error = NULL;
    SELECT team_id, amount INTO v_team_id, v_amount FROM expenses WHERE id = p_expense_id;
    SELECT COUNT(*) INTO v_count FROM team_members WHERE team_id = v_team_id;

    IF v_count = 0 THEN SET p_error = 'NO_MEMBERS'; LEAVE proc_label; END IF;

    SET v_share = ROUND(v_amount / v_count, 2);

    DELETE FROM splits WHERE expense_id = p_expense_id;

    INSERT INTO splits (expense_id, team_member_id, amount)
    SELECT p_expense_id, id, v_share
    FROM team_members WHERE team_id = v_team_id;
END$$

-- -----------------------------------------------------------------------------
-- sp_expense_split_by_contribution : chia theo p_i của sprint
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_expense_split_by_contribution$$
CREATE PROCEDURE sp_expense_split_by_contribution(
    IN  p_expense_id BIGINT,
    IN  p_sprint_id  BIGINT,
    OUT p_error      VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_team_id BIGINT;
    DECLARE v_amount  DECIMAL(19,2);
    SET p_error = NULL;
    SELECT team_id, amount INTO v_team_id, v_amount FROM expenses WHERE id = p_expense_id;

    IF NOT EXISTS (
        SELECT 1 FROM contribution_scores
        WHERE sprint_id = p_sprint_id AND team_id = v_team_id
    ) THEN
        SET p_error = 'NO_CONTRIBUTION_SCORES';
        LEAVE proc_label;
    END IF;

    DELETE FROM splits WHERE expense_id = p_expense_id;

    INSERT INTO splits (expense_id, team_member_id, amount, contribution_ratio)
    SELECT
        p_expense_id,
        tm.id,
        ROUND(v_amount * cs.percentage, 2),
        cs.percentage
    FROM team_members tm
    JOIN contribution_scores cs
        ON cs.user_id = tm.user_id AND cs.sprint_id = p_sprint_id
    WHERE tm.team_id = v_team_id;
END$$

-- -----------------------------------------------------------------------------
-- sp_expense_get_team_balance : số dư mỗi thành viên
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_expense_get_team_balance$$
CREATE PROCEDURE sp_expense_get_team_balance(IN p_team_id BIGINT)
BEGIN
    SELECT u.id AS user_id, u.full_name,
           COALESCE(SUM(CASE WHEN e.paid_by_member_id = tm.id
                             THEN e.amount ELSE 0 END), 0)   AS total_paid,
           COALESCE(SUM(sp.amount), 0)                       AS total_owed,
           COALESCE(SUM(CASE WHEN e.paid_by_member_id = tm.id
                             THEN e.amount ELSE 0 END), 0)
           - COALESCE(SUM(sp.amount), 0)                     AS balance
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    LEFT JOIN expenses e  ON e.team_id = p_team_id
    LEFT JOIN splits   sp ON sp.team_member_id = tm.id
                          AND sp.expense_id = e.id
    WHERE tm.team_id = p_team_id
    GROUP BY tm.id, u.id, u.full_name
    ORDER BY balance DESC;
END$$

-- =============================================================================
-- PHẦN 16 – ALERT (sp_alert_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_alert_create
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_alert_create$$
CREATE PROCEDURE sp_alert_create(
    IN  p_team_id    BIGINT,
    IN  p_sprint_id  BIGINT,
    IN  p_user_id    BIGINT,
    IN  p_alert_type VARCHAR(50),
    IN  p_message    TEXT,
    IN  p_severity   VARCHAR(20),
    OUT p_alert_id   BIGINT
)
BEGIN
    INSERT INTO alerts (team_id, sprint_id, user_id, alert_type, message, severity)
    VALUES (p_team_id, p_sprint_id, p_user_id, p_alert_type,
            p_message, COALESCE(p_severity,'INFO'));
    SET p_alert_id = LAST_INSERT_ID();
END$$

-- -----------------------------------------------------------------------------
-- sp_alert_resolve
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_alert_resolve$$
CREATE PROCEDURE sp_alert_resolve(IN p_alert_id BIGINT)
BEGIN
    UPDATE alerts SET resolved = TRUE, resolved_at = NOW() WHERE id = p_alert_id;
END$$

-- -----------------------------------------------------------------------------
-- sp_alert_get_active : cảnh báo chưa xử lý theo team
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_alert_get_active$$
CREATE PROCEDURE sp_alert_get_active(IN p_team_id BIGINT)
BEGIN
    SELECT a.id, u.full_name, a.alert_type,
           a.severity, a.message, a.created_at
    FROM alerts a
    JOIN users u ON u.id = a.user_id
    WHERE a.team_id  = p_team_id
      AND a.resolved = FALSE
    ORDER BY FIELD(a.severity,'CRITICAL','WARNING','INFO'), a.created_at DESC;
END$$

-- =============================================================================
-- PHẦN 17 – REPORT (sp_report_*)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- sp_report_sprint_summary : báo cáo tổng kết sprint
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_report_sprint_summary$$
CREATE PROCEDURE sp_report_sprint_summary(IN p_sprint_id BIGINT)
BEGIN
    SELECT * FROM v_sprint_member_summary
    WHERE sprint_id = p_sprint_id
    ORDER BY contribution_score DESC;
END$$

-- -----------------------------------------------------------------------------
-- sp_report_radar : dữ liệu radar chart cho sprint
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_report_radar$$
CREATE PROCEDURE sp_report_radar(IN p_sprint_id BIGINT)
BEGIN
    SELECT * FROM v_radar_profile
    WHERE sprint_id = p_sprint_id
    ORDER BY full_name;
END$$

-- -----------------------------------------------------------------------------
-- sp_report_feature_audit : audit trail đặc trưng raw → z-score
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_report_feature_audit$$
CREATE PROCEDURE sp_report_feature_audit(IN p_sprint_id BIGINT)
BEGIN
    SELECT * FROM v_feature_audit
    WHERE sprint_id = p_sprint_id
    ORDER BY full_name;
END$$

-- -----------------------------------------------------------------------------
-- sp_report_member_history : lịch sử điểm của 1 thành viên qua các sprint
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_report_member_history$$
CREATE PROCEDURE sp_report_member_history(
    IN p_user_id  BIGINT,
    IN p_team_id  BIGINT
)
BEGIN
    SELECT
        s.name AS sprint_name, s.start_date, s.end_date,
        cs.score, cs.percentage,
        cs.peer_included, cs.has_sufficient_data,
        ds.d1_output_adj, ds.d2_reliability_adj,
        ds.d3_collaboration_adj, ds.d4_peer_adj,
        bci.ci_lower_95, bci.ci_upper_95
    FROM contribution_scores cs
    JOIN sprints            s   ON s.id  = cs.sprint_id
    LEFT JOIN dimension_scores   ds  ON ds.sprint_id = cs.sprint_id AND ds.user_id = cs.user_id
    LEFT JOIN score_bootstrap_ci bci ON bci.contribution_score_id = cs.id
    WHERE cs.user_id  = p_user_id
      AND cs.team_id  = p_team_id
    ORDER BY s.start_date DESC;
END$$

-- =============================================================================
-- PHẦN 18 – TRIGGERS (trg_)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- trg_after_sprint_close : khi sprint đóng → tự tạo alert nếu chưa tính điểm
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_sprint_close$$
CREATE TRIGGER trg_after_sprint_close
AFTER UPDATE ON sprints
FOR EACH ROW
BEGIN
    IF NEW.status = 'CLOSED' AND OLD.status = 'ACTIVE' THEN
        -- Alert toàn team: sprint đã đóng, cần chạy pipeline tính điểm
        INSERT INTO alerts (team_id, sprint_id, user_id, alert_type, message, severity)
        SELECT NEW.team_id, NEW.id, tm.user_id,
               'SPRINT_CLOSED',
               CONCAT('Sprint "', NEW.name, '" đã đóng. Leader cần chạy tính điểm.'),
               'INFO'
        FROM team_members tm
        WHERE tm.team_id = NEW.team_id AND tm.role = 'LEADER'
        LIMIT 1;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- trg_after_review_submission : khi đủ 3 lượt chấm → cập nhật is_sufficient
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_review_submission$$
CREATE TRIGGER trg_after_review_submission
AFTER INSERT ON review_submissions
FOR EACH ROW
BEGIN
    DECLARE v_count    INT;
    DECLARE v_min_sub  INT;
    DECLARE v_sprint   BIGINT;
    DECLARE v_team     BIGINT;

    SELECT COUNT(DISTINCT reviewer_id) INTO v_count
    FROM review_submissions
    WHERE review_round_id = NEW.review_round_id AND reviewee_id = NEW.reviewee_id;

    SELECT min_submissions_required, sprint_id, team_id
    INTO v_min_sub, v_sprint, v_team
    FROM review_rounds WHERE id = NEW.review_round_id;

    -- Nếu vừa đủ ngưỡng → cập nhật aggregate
    IF v_count = v_min_sub THEN
        INSERT INTO alerts (team_id, sprint_id, user_id, alert_type, message, severity)
        VALUES (v_team, v_sprint, NEW.reviewee_id,
                'PEER_REVIEW_SUFFICIENT',
                'Đủ lượt chấm chéo (≥ 3). D4 sẽ được tính trong pipeline tiếp theo.',
                'INFO');
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- trg_before_split_insert : validate splits amount > 0
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_before_split_insert$$
CREATE TRIGGER trg_before_split_insert
BEFORE INSERT ON splits
FOR EACH ROW
BEGIN
    IF NEW.amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Split amount phải > 0';
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- trg_after_fraud_flag_high : khi phát hiện cờ HIGH → tạo alert CRITICAL
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_after_fraud_flag_high$$
CREATE TRIGGER trg_after_fraud_flag_high
AFTER INSERT ON fraud_flags
FOR EACH ROW
BEGIN
    IF NEW.severity = 'HIGH' THEN
        INSERT INTO alerts
            (team_id, sprint_id, user_id, alert_type, message, severity)
        VALUES (
            NEW.team_id,
            NEW.sprint_id,
            NEW.user_id,
            'FRAUD_SUSPICION',
            CONCAT('[', NEW.flag_type, '] ', NEW.flag_reason,
                   ' – Điểm ngờ vực: ', NEW.suspicion_score),
            'CRITICAL'
        );
    END IF;
END$$

DELIMITER ;

-- =============================================================================
-- Seed: Scoring Weights mặc định (template) cho các team mới tạo
-- =============================================================================
-- Chú ý: bảng này sẽ được insert per-team khi sp_team_create được gọi.
-- Dưới đây là template reference; KHÔNG insert vì team_id chưa tồn tại.

-- CALL sp_scoring_run_pipeline(<sprint_id>, @err);
-- SELECT @err;
