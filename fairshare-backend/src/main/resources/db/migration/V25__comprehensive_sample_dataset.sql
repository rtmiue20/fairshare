-- =============================================================================
-- V25: Bộ dữ liệu mẫu toàn diện & chuẩn hóa cho cả 3 Dự án (EduConnect, EKLA, KINGSHA)
--      + Nâng cấp Stored Procedure sp_calculate_contribution_scores đồng bộ team_id
--        và tính Robust Z-Score ổn định cho nhóm nhỏ 5-6 thành viên
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Nâng cấp sp_calculate_contribution_scores
--    - Khắc phục triệt để lệch team_id trên uk_cs_sprint_user
--    - Chuẩn hóa mẫu số Robust Z-Score: GREATEST(1.4826 * MAD, STDDEV_POP, 0.15)
--      giúp nhóm nhỏ (MAD = 0) vẫn phản ánh chính xác sự khác biệt trên D1-D4
-- -----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS sp_calculate_contribution_scores;

DELIMITER //

CREATE PROCEDURE sp_calculate_contribution_scores(
    IN p_team_id BIGINT,
    IN p_sprint_id BIGINT
)
proc_main: BEGIN
    DECLARE v_member_count INT DEFAULT 0;
    DECLARE v_team_total DECIMAL(12, 2) DEFAULT 0.00;
    DECLARE v_active_count INT DEFAULT 0;
    DECLARE v_has_any_peer INT DEFAULT 0;
    DECLARE v_total_composite DOUBLE DEFAULT 0.0;

    -- Thống kê Median, MAD & Std cho tầng 2 (Robust Z-Score)
    DECLARE v_med_sp DOUBLE DEFAULT 0.0;
    DECLARE v_mad_sp DOUBLE DEFAULT 0.0;
    DECLARE v_std_sp DOUBLE DEFAULT 0.0;
    DECLARE v_med_cards DOUBLE DEFAULT 0.0;
    DECLARE v_mad_cards DOUBLE DEFAULT 0.0;
    DECLARE v_std_cards DOUBLE DEFAULT 0.0;
    DECLARE v_med_manual DOUBLE DEFAULT 0.0;
    DECLARE v_mad_manual DOUBLE DEFAULT 0.0;
    DECLARE v_std_manual DOUBLE DEFAULT 0.0;
    DECLARE v_med_ontime DOUBLE DEFAULT 1.0;
    DECLARE v_mad_ontime DOUBLE DEFAULT 0.0;
    DECLARE v_std_ontime DOUBLE DEFAULT 0.0;
    DECLARE v_med_rework DOUBLE DEFAULT 0.0;
    DECLARE v_mad_rework DOUBLE DEFAULT 0.0;
    DECLARE v_std_rework DOUBLE DEFAULT 0.0;
    DECLARE v_med_delay DOUBLE DEFAULT 0.0;
    DECLARE v_mad_delay DOUBLE DEFAULT 0.0;
    DECLARE v_std_delay DOUBLE DEFAULT 0.0;
    DECLARE v_med_collab DOUBLE DEFAULT 0.0;
    DECLARE v_mad_collab DOUBLE DEFAULT 0.0;
    DECLARE v_std_collab DOUBLE DEFAULT 0.0;
    DECLARE v_med_peer DOUBLE DEFAULT 0.0;
    DECLARE v_mad_peer DOUBLE DEFAULT 0.0;
    DECLARE v_std_peer DOUBLE DEFAULT 0.0;

    -- Thống kê Mean & Std cho khoảng cách Euclid tới tâm nhóm
    DECLARE v_mean_d1 DOUBLE DEFAULT 0.0;
    DECLARE v_mean_d2 DOUBLE DEFAULT 0.0;
    DECLARE v_mean_d3 DOUBLE DEFAULT 0.0;
    DECLARE v_mean_d4 DOUBLE DEFAULT 0.0;
    DECLARE v_std_d1 DOUBLE DEFAULT 1.0;
    DECLARE v_std_d2 DOUBLE DEFAULT 1.0;
    DECLARE v_std_d3 DOUBLE DEFAULT 1.0;
    DECLARE v_std_d4 DOUBLE DEFAULT 1.0;

    DECLARE v_eps DOUBLE DEFAULT 0.000001;

    -- Dọn các bản ghi sai team_id (nếu tồn tại trước đó trên uk_cs_sprint_user)
    DELETE FROM contribution_scores
    WHERE sprint_id = p_sprint_id
      AND team_id <> p_team_id;

    DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
    CREATE TEMPORARY TABLE tmp_member_scores (
        user_id                 BIGINT PRIMARY KEY,
        trello_score            DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        manual_score            DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        total_activity_score    DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        raw_sp                  DOUBLE NOT NULL DEFAULT 0.0,
        cards_done              INT NOT NULL DEFAULT 0,
        on_time_rate            DOUBLE NOT NULL DEFAULT 1.0,
        rework_count            INT NOT NULL DEFAULT 0,
        avg_delay               DOUBLE NOT NULL DEFAULT 0.0,
        collab_count            INT NOT NULL DEFAULT 0,
        event_count             INT NOT NULL DEFAULT 0,
        peer_avg                DOUBLE NOT NULL DEFAULT 0.0,
        peer_reviewers          INT NOT NULL DEFAULT 0,
        has_peer                TINYINT(1) NOT NULL DEFAULT 0,
        availability_factor     DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
        ln_sp                   DOUBLE NOT NULL DEFAULT 0.0,
        ln_cards                DOUBLE NOT NULL DEFAULT 0.0,
        ln_manual               DOUBLE NOT NULL DEFAULT 0.0,
        ln_rework               DOUBLE NOT NULL DEFAULT 0.0,
        ln_delay                DOUBLE NOT NULL DEFAULT 0.0,
        ln_collab               DOUBLE NOT NULL DEFAULT 0.0,
        z_sp                    DOUBLE NOT NULL DEFAULT 0.0,
        z_cards                 DOUBLE NOT NULL DEFAULT 0.0,
        z_manual                DOUBLE NOT NULL DEFAULT 0.0,
        z_ontime                DOUBLE NOT NULL DEFAULT 0.0,
        z_rework                DOUBLE NOT NULL DEFAULT 0.0,
        z_delay                 DOUBLE NOT NULL DEFAULT 0.0,
        z_collab                DOUBLE NOT NULL DEFAULT 0.0,
        z_peer                  DOUBLE NOT NULL DEFAULT 0.0,
        d1_output               DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
        d2_reliability          DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
        d3_collaboration        DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
        d4_peer                 DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
        composite_score         DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
        activity_pct            DECIMAL(5, 2)  NOT NULL DEFAULT 0.00,
        peer_pct                DECIMAL(5, 2)  NOT NULL DEFAULT 0.00,
        final_pct               DECIMAL(5, 2)  NOT NULL DEFAULT 0.00,
        distance_to_center      DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
        is_suspicious           TINYINT(1) NOT NULL DEFAULT 0,
        has_sufficient_evidence TINYINT(1) NOT NULL DEFAULT 0
    ) ENGINE=MEMORY;

    -- Bước 1: Tổng hợp Tầng 1 từ activity_events, manual_contributions và review_submissions
    INSERT INTO tmp_member_scores (
        user_id,
        trello_score,
        manual_score,
        total_activity_score,
        raw_sp,
        cards_done,
        on_time_rate,
        rework_count,
        avg_delay,
        collab_count,
        event_count,
        peer_avg,
        peer_reviewers,
        has_peer,
        availability_factor
    )
    SELECT
        m.user_id,
        COALESCE(t.trello_score, 0.00),
        COALESCE(s.manual_score, 0.00),
        (COALESCE(t.trello_score, 0.00) + COALESCE(s.manual_score, 0.00)),
        COALESCE(t.raw_sp, 0.0),
        COALESCE(t.cards_done, 0),
        CASE WHEN COALESCE(t.cards_done, 0) > 0 THEN COALESCE(t.ontime_cnt, 0) / t.cards_done ELSE 1.0 END,
        COALESCE(t.rework_cnt, 0),
        CASE WHEN COALESCE(t.cards_done, 0) > 0 THEN COALESCE(t.delay_sum, 0.0) / t.cards_done ELSE 0.0 END,
        COALESCE(t.collab_cnt, 0),
        COALESCE(t.event_cnt, 0),
        COALESCE(pr.peer_avg, 0.0),
        COALESCE(pr.peer_reviewers, 0),
        COALESCE(pr.has_peer, 0),
        LEAST(1.00, GREATEST(0.50, COALESCE(sa.availability_ratio, ecs.availability_factor, 1.00)))
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
            ) AS trello_score,
            SUM(
                CASE
                    WHEN UPPER(event_type) LIKE '%COMPLETED%' OR UPPER(event_type) LIKE '%DONE%'
                        THEN COALESCE(story_points, 1.0) * (1.0 + 0.1 * GREATEST(0, COALESCE(difficulty_level, 1) - 1))
                    WHEN UPPER(event_type) IN ('CARD_CREATED', 'CARD_MOVED') AND COALESCE(story_points, 0.0) > 0
                        THEN story_points * 0.2
                    WHEN UPPER(event_type) = 'GIT_COMMIT'
                        THEN COALESCE(story_points, calculated_score, 1.0) * 0.5
                    ELSE 0.0
                END
            ) AS raw_sp,
            SUM(CASE WHEN UPPER(event_type) LIKE '%COMPLETED%' OR UPPER(event_type) LIKE '%DONE%' THEN 1 ELSE 0 END) AS cards_done,
            SUM(CASE WHEN (UPPER(event_type) LIKE '%COMPLETED%' OR UPPER(event_type) LIKE '%DONE%') AND is_on_time = 1 THEN 1 ELSE 0 END) AS ontime_cnt,
            SUM(CASE WHEN (UPPER(event_type) LIKE '%COMPLETED%' OR UPPER(event_type) LIKE '%DONE%') AND COALESCE(delay_days, 0.0) > 0.0 THEN delay_days ELSE 0.0 END) AS delay_sum,
            SUM(CASE WHEN UPPER(event_type) LIKE '%REWORK%' OR UPPER(event_type) LIKE '%REOPEN%' THEN 1 ELSE 0 END) AS rework_cnt,
            SUM(CASE WHEN UPPER(event_type) LIKE '%COMMENT%' OR UPPER(event_type) LIKE '%HELPFUL%' OR UPPER(event_type) LIKE '%REVIEW%' OR UPPER(event_type) LIKE '%SUPPORT%' OR is_helpful_comment = 1 OR is_support_mention = 1 OR is_review_for_others = 1 THEN 1 ELSE 0 END) AS collab_cnt,
            COUNT(*) AS event_cnt
        FROM activity_events
        WHERE team_id = p_team_id
          AND sprint_id = p_sprint_id
        GROUP BY user_id
    ) t ON m.user_id = t.user_id
    LEFT JOIN (
        SELECT
            user_id,
            SUM(COALESCE(story_points, equivalent_story_points, 0.0)) AS manual_score
        FROM manual_contributions
        WHERE team_id = p_team_id
          AND sprint_id = p_sprint_id
          AND UPPER(status) = 'APPROVED'
        GROUP BY user_id
    ) s ON m.user_id = s.user_id
    LEFT JOIN (
        SELECT
            rs.reviewee_id AS user_id,
            AVG(rs.score) AS peer_avg,
            COUNT(DISTINCT rs.reviewer_id) AS peer_reviewers,
            CASE
                WHEN COUNT(DISTINCT rs.reviewer_id) >= MAX(COALESCE(rr.min_submissions_required, 3)) THEN 1
                ELSE 0
            END AS has_peer
        FROM review_submissions rs
        JOIN review_rounds rr ON rr.id = rs.review_round_id
        WHERE rr.team_id = p_team_id
          AND rr.sprint_id = p_sprint_id
        GROUP BY rs.reviewee_id
    ) pr ON m.user_id = pr.user_id
    LEFT JOIN team_members tm
        ON tm.team_id = p_team_id AND tm.user_id = m.user_id
    LEFT JOIN sprint_availability sa
        ON sa.sprint_id = p_sprint_id AND sa.team_member_id = tm.id
    LEFT JOIN contribution_scores ecs
        ON ecs.team_id = p_team_id AND ecs.sprint_id = p_sprint_id AND ecs.user_id = m.user_id;

    SELECT COUNT(*),
           COALESCE(SUM(total_activity_score), 0.00),
           COUNT(CASE WHEN total_activity_score > 0.00 THEN 1 END),
           COALESCE(SUM(has_peer), 0)
    INTO v_member_count, v_team_total, v_active_count, v_has_any_peer
    FROM tmp_member_scores;

    IF v_member_count = 0 THEN
        DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
        LEAVE proc_main;
    END IF;

    -- Loại bỏ các dòng 0 điểm dư thừa nếu nhóm có >= 6 thành viên có hoạt động thực tế
    IF v_team_total > 0.00 AND v_active_count >= 6 THEN
        DELETE FROM tmp_member_scores WHERE total_activity_score = 0.00;
        DELETE FROM contribution_scores
        WHERE team_id = p_team_id
          AND sprint_id = p_sprint_id
          AND user_id NOT IN (SELECT user_id FROM tmp_member_scores);
        SELECT COUNT(*) INTO v_member_count FROM tmp_member_scores;
    END IF;

    -- Bước 2: Biến đổi log ln(1 + x) chống spam và tính tỷ lệ hoạt động / chấm chéo thô
    UPDATE tmp_member_scores
    SET ln_sp     = LN(1.0 + GREATEST(0.0, raw_sp)),
        ln_cards  = LN(1.0 + GREATEST(0.0, cards_done)),
        ln_manual = LN(1.0 + GREATEST(0.0, manual_score)),
        ln_rework = LN(1.0 + GREATEST(0.0, rework_count)),
        ln_delay  = LN(1.0 + GREATEST(0.0, avg_delay)),
        ln_collab = LN(1.0 + GREATEST(0.0, collab_count)),
        activity_pct = CASE WHEN v_team_total > 0.00 THEN ROUND((total_activity_score / v_team_total) * 100.0, 2) ELSE 0.00 END,
        peer_pct     = CASE WHEN has_peer = 1 THEN LEAST(100.00, ROUND((peer_avg / 5.0) * 100.0, 2)) ELSE 0.00 END,
        has_sufficient_evidence = CASE WHEN event_count >= 5 THEN 1 ELSE 0 END;

    -- Nếu hoàn toàn chưa có dữ liệu hoạt động và chưa có đánh giá chéo -> lưu trạng thái trống 0%
    IF v_team_total <= 0.00 AND v_has_any_peer = 0 THEN
        INSERT INTO contribution_scores (
            team_id, sprint_id, user_id,
            trello_score, manual_score, activity_pct, peer_pct, final_pct,
            d1_output, d2_reliability, d3_collaboration, d4_peer,
            composite_score, availability_factor,
            confidence_interval_low, confidence_interval_high,
            distance_to_center, is_suspicious, has_sufficient_evidence,
            peer_included, has_sufficient_data, total_events_used,
            calculated_at, computed_at, score, percentage
        )
        SELECT
            p_team_id, p_sprint_id, tms.user_id,
            0.00, 0.00, 0.00, 0.00, 0.00,
            0.0000, 0.0000, 0.0000, 0.0000,
            0.0000, tms.availability_factor,
            0.00, 0.00,
            0.0000, 0, tms.has_sufficient_evidence,
            0, tms.has_sufficient_evidence, tms.event_count,
            NOW(), NOW(), 0.00, 0.0000
        FROM tmp_member_scores tms
        ON DUPLICATE KEY UPDATE
            team_id                  = VALUES(team_id),
            trello_score             = VALUES(trello_score),
            manual_score             = VALUES(manual_score),
            activity_pct             = VALUES(activity_pct),
            peer_pct                 = VALUES(peer_pct),
            final_pct                = VALUES(final_pct),
            d1_output                = VALUES(d1_output),
            d2_reliability           = VALUES(d2_reliability),
            d3_collaboration         = VALUES(d3_collaboration),
            d4_peer                  = VALUES(d4_peer),
            composite_score          = VALUES(composite_score),
            availability_factor      = VALUES(availability_factor),
            confidence_interval_low  = VALUES(confidence_interval_low),
            confidence_interval_high = VALUES(confidence_interval_high),
            distance_to_center       = VALUES(distance_to_center),
            is_suspicious            = VALUES(is_suspicious),
            has_sufficient_evidence  = VALUES(has_sufficient_evidence),
            peer_included            = VALUES(peer_included),
            has_sufficient_data      = VALUES(has_sufficient_data),
            total_events_used        = VALUES(total_events_used),
            calculated_at            = NOW(),
            computed_at              = NOW(),
            score                    = VALUES(score),
            percentage               = VALUES(percentage);

        DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
        LEAVE proc_main;
    END IF;

    -- Bước 3: Tính Median, MAD và Std cho từng đặc trưng (khi số thành viên > 1)
    IF v_member_count > 1 THEN
        SELECT COALESCE(STDDEV_POP(ln_sp), 0.0),
               COALESCE(STDDEV_POP(ln_cards), 0.0),
               COALESCE(STDDEV_POP(ln_manual), 0.0),
               COALESCE(STDDEV_POP(on_time_rate), 0.0),
               COALESCE(STDDEV_POP(ln_rework), 0.0),
               COALESCE(STDDEV_POP(ln_delay), 0.0),
               COALESCE(STDDEV_POP(ln_collab), 0.0),
               COALESCE(STDDEV_POP(CASE WHEN has_peer = 1 THEN peer_avg ELSE NULL END), 0.0)
        INTO v_std_sp, v_std_cards, v_std_manual, v_std_ontime, v_std_rework, v_std_delay, v_std_collab, v_std_peer
        FROM tmp_member_scores;

        SELECT AVG(val) INTO v_med_sp FROM (
            SELECT ln_sp AS val, ROW_NUMBER() OVER (ORDER BY ln_sp) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));
        SELECT AVG(dev) INTO v_mad_sp FROM (
            SELECT ABS(ln_sp - v_med_sp) AS dev, ROW_NUMBER() OVER (ORDER BY ABS(ln_sp - v_med_sp)) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));

        SELECT AVG(val) INTO v_med_cards FROM (
            SELECT ln_cards AS val, ROW_NUMBER() OVER (ORDER BY ln_cards) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));
        SELECT AVG(dev) INTO v_mad_cards FROM (
            SELECT ABS(ln_cards - v_med_cards) AS dev, ROW_NUMBER() OVER (ORDER BY ABS(ln_cards - v_med_cards)) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));

        SELECT AVG(val) INTO v_med_manual FROM (
            SELECT ln_manual AS val, ROW_NUMBER() OVER (ORDER BY ln_manual) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));
        SELECT AVG(dev) INTO v_mad_manual FROM (
            SELECT ABS(ln_manual - v_med_manual) AS dev, ROW_NUMBER() OVER (ORDER BY ABS(ln_manual - v_med_manual)) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));

        SELECT AVG(val) INTO v_med_ontime FROM (
            SELECT on_time_rate AS val, ROW_NUMBER() OVER (ORDER BY on_time_rate) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));
        SELECT AVG(dev) INTO v_mad_ontime FROM (
            SELECT ABS(on_time_rate - v_med_ontime) AS dev, ROW_NUMBER() OVER (ORDER BY ABS(on_time_rate - v_med_ontime)) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));

        SELECT AVG(val) INTO v_med_rework FROM (
            SELECT ln_rework AS val, ROW_NUMBER() OVER (ORDER BY ln_rework) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));
        SELECT AVG(dev) INTO v_mad_rework FROM (
            SELECT ABS(ln_rework - v_med_rework) AS dev, ROW_NUMBER() OVER (ORDER BY ABS(ln_rework - v_med_rework)) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));

        SELECT AVG(val) INTO v_med_delay FROM (
            SELECT ln_delay AS val, ROW_NUMBER() OVER (ORDER BY ln_delay) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));
        SELECT AVG(dev) INTO v_mad_delay FROM (
            SELECT ABS(ln_delay - v_med_delay) AS dev, ROW_NUMBER() OVER (ORDER BY ABS(ln_delay - v_med_delay)) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));

        SELECT AVG(val) INTO v_med_collab FROM (
            SELECT ln_collab AS val, ROW_NUMBER() OVER (ORDER BY ln_collab) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));
        SELECT AVG(dev) INTO v_mad_collab FROM (
            SELECT ABS(ln_collab - v_med_collab) AS dev, ROW_NUMBER() OVER (ORDER BY ABS(ln_collab - v_med_collab)) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));

        IF v_has_any_peer > 0 THEN
            SELECT AVG(val) INTO v_med_peer FROM (
                SELECT peer_avg AS val, ROW_NUMBER() OVER (ORDER BY peer_avg) AS rn, COUNT(*) OVER () AS cnt
                FROM tmp_member_scores WHERE has_peer = 1
            ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));
            SELECT AVG(dev) INTO v_mad_peer FROM (
                SELECT ABS(peer_avg - v_med_peer) AS dev, ROW_NUMBER() OVER (ORDER BY ABS(peer_avg - v_med_peer)) AS rn, COUNT(*) OVER () AS cnt
                FROM tmp_member_scores WHERE has_peer = 1
            ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));
        END IF;

        -- Tính Robust Z-score kẹp biên [-3, 3] với mẫu số ổn định cho nhóm nhỏ (GREATEST(1.4826*MAD, STD, 0.15))
        UPDATE tmp_member_scores
        SET z_sp     = GREATEST(-3.0, LEAST(3.0, (ln_sp - v_med_sp) / GREATEST(1.4826 * COALESCE(v_mad_sp, 0.0), COALESCE(v_std_sp, 0.0), 0.15))),
            z_cards  = GREATEST(-3.0, LEAST(3.0, (ln_cards - v_med_cards) / GREATEST(1.4826 * COALESCE(v_mad_cards, 0.0), COALESCE(v_std_cards, 0.0), 0.15))),
            z_manual = GREATEST(-3.0, LEAST(3.0, (ln_manual - v_med_manual) / GREATEST(1.4826 * COALESCE(v_mad_manual, 0.0), COALESCE(v_std_manual, 0.0), 0.15))),
            z_ontime = GREATEST(-3.0, LEAST(3.0, (on_time_rate - v_med_ontime) / GREATEST(1.4826 * COALESCE(v_mad_ontime, 0.0), COALESCE(v_std_ontime, 0.0), 0.15))),
            z_rework = GREATEST(-3.0, LEAST(3.0, (ln_rework - v_med_rework) / GREATEST(1.4826 * COALESCE(v_mad_rework, 0.0), COALESCE(v_std_rework, 0.0), 0.15))),
            z_delay  = GREATEST(-3.0, LEAST(3.0, (ln_delay - v_med_delay) / GREATEST(1.4826 * COALESCE(v_mad_delay, 0.0), COALESCE(v_std_delay, 0.0), 0.15))),
            z_collab = GREATEST(-3.0, LEAST(3.0, (ln_collab - v_med_collab) / GREATEST(1.4826 * COALESCE(v_mad_collab, 0.0), COALESCE(v_std_collab, 0.0), 0.15))),
            z_peer   = CASE
                WHEN has_peer = 1 THEN GREATEST(-3.0, LEAST(3.0, (peer_avg - COALESCE(v_med_peer, 0.0)) / GREATEST(1.4826 * COALESCE(v_mad_peer, 0.0), COALESCE(v_std_peer, 0.0), 0.15)))
                ELSE 0.0
            END;
    END IF;

    -- Bước 4: Nén về 4 chiều chính (Tầng 3) và tính Composite Score qua hàm Logistic Sigmoid (Tầng 4)
    UPDATE tmp_member_scores
    SET d1_output        = ROUND((0.60 * z_sp) + (0.20 * z_cards) + (0.20 * z_manual), 4),
        d2_reliability   = ROUND((0.60 * z_ontime) - (0.20 * z_rework) - (0.20 * z_delay), 4),
        d3_collaboration = ROUND(z_collab, 4),
        d4_peer          = ROUND(CASE WHEN has_peer = 1 THEN z_peer ELSE 0.0 END, 4);

    UPDATE tmp_member_scores
    SET composite_score = ROUND(
        100.0 / (1.0 + EXP(-2.5 * (1.0 + 0.5 * (1.0 - availability_factor)) * (
            CASE
                WHEN has_peer = 1 THEN
                    (0.40 * d1_output) + (0.20 * d2_reliability) + (0.15 * d3_collaboration) + (0.25 * d4_peer)
                ELSE
                    ((0.40 / 0.75) * d1_output) + ((0.20 / 0.75) * d2_reliability) + ((0.15 / 0.75) * d3_collaboration)
            END
        ))),
        4
    );

    -- Bước 5: Tính tổng Composite Score, Mean/Std các chiều và chuẩn hóa tỷ lệ % (tổng = 100%)
    SELECT COALESCE(SUM(composite_score), 0.0),
           COALESCE(AVG(d1_output), 0.0),
           COALESCE(AVG(d2_reliability), 0.0),
           COALESCE(AVG(d3_collaboration), 0.0),
           COALESCE(AVG(d4_peer), 0.0),
           GREATEST(COALESCE(STDDEV_POP(d1_output), 1.0), 0.0),
           GREATEST(COALESCE(STDDEV_POP(d2_reliability), 1.0), 0.0),
           GREATEST(COALESCE(STDDEV_POP(d3_collaboration), 1.0), 0.0),
           GREATEST(COALESCE(STDDEV_POP(d4_peer), 1.0), 0.0)
    INTO v_total_composite,
         v_mean_d1, v_mean_d2, v_mean_d3, v_mean_d4,
         v_std_d1, v_std_d2, v_std_d3, v_std_d4
    FROM tmp_member_scores;

    UPDATE tmp_member_scores
    SET final_pct = CASE
            WHEN v_total_composite > 0.0 THEN ROUND((composite_score / v_total_composite) * 100.0, 2)
            ELSE ROUND(100.0 / v_member_count, 2)
        END,
        distance_to_center = ROUND(SQRT(
            POW((d1_output - v_mean_d1) / (v_std_d1 + v_eps), 2) +
            POW((d2_reliability - v_mean_d2) / (v_std_d2 + v_eps), 2) +
            POW((d3_collaboration - v_mean_d3) / (v_std_d3 + v_eps), 2) +
            POW((d4_peer - v_mean_d4) / (v_std_d4 + v_eps), 2)
        ), 4),
        is_suspicious = CASE
            WHEN d1_output > 1.2 AND ((has_peer = 1 AND d4_peer < -0.8) OR d2_reliability < -1.0) THEN 1
            ELSE 0
        END;

    -- Bước 6: Upsert vào bảng contribution_scores
    INSERT INTO contribution_scores (
        team_id, sprint_id, user_id,
        trello_score, manual_score, activity_pct, peer_pct, final_pct,
        d1_output, d2_reliability, d3_collaboration, d4_peer,
        composite_score, availability_factor,
        confidence_interval_low, confidence_interval_high,
        distance_to_center, is_suspicious, has_sufficient_evidence,
        peer_included, has_sufficient_data, total_events_used,
        calculated_at, computed_at, score, percentage
    )
    SELECT
        p_team_id,
        p_sprint_id,
        tms.user_id,
        tms.trello_score,
        tms.manual_score,
        tms.activity_pct,
        tms.peer_pct,
        tms.final_pct,
        tms.d1_output,
        tms.d2_reliability,
        tms.d3_collaboration,
        tms.d4_peer,
        tms.composite_score,
        tms.availability_factor,
        GREATEST(0.00, ROUND(tms.final_pct - 2.10, 2)),
        LEAST(100.00, ROUND(tms.final_pct + 2.10, 2)),
        tms.distance_to_center,
        tms.is_suspicious,
        tms.has_sufficient_evidence,
        tms.has_peer,
        tms.has_sufficient_evidence,
        tms.event_count,
        NOW(),
        NOW(),
        LEAST(100.00, GREATEST(0.00, tms.final_pct)),
        LEAST(1.0000, GREATEST(0.0000, ROUND(tms.final_pct / 100.0, 4)))
    FROM tmp_member_scores tms
    ON DUPLICATE KEY UPDATE
        team_id                  = VALUES(team_id),
        trello_score             = VALUES(trello_score),
        manual_score             = VALUES(manual_score),
        activity_pct             = VALUES(activity_pct),
        peer_pct                 = VALUES(peer_pct),
        final_pct                = VALUES(final_pct),
        d1_output                = VALUES(d1_output),
        d2_reliability           = VALUES(d2_reliability),
        d3_collaboration         = VALUES(d3_collaboration),
        d4_peer                  = VALUES(d4_peer),
        composite_score          = VALUES(composite_score),
        availability_factor      = VALUES(availability_factor),
        confidence_interval_low  = VALUES(confidence_interval_low),
        confidence_interval_high = VALUES(confidence_interval_high),
        distance_to_center       = VALUES(distance_to_center),
        is_suspicious            = VALUES(is_suspicious),
        has_sufficient_evidence  = VALUES(has_sufficient_evidence),
        peer_included            = VALUES(peer_included),
        has_sufficient_data      = VALUES(has_sufficient_data),
        total_events_used        = VALUES(total_events_used),
        calculated_at            = NOW(),
        computed_at              = NOW(),
        score                    = VALUES(score),
        percentage               = VALUES(percentage);

    DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
END //

DELIMITER ;

-- -----------------------------------------------------------------------------
-- 2. Chuẩn hóa Users, Teams, Team Members & Consents cho cả 3 Dự án
-- -----------------------------------------------------------------------------

-- Giữ nguyên tài khoản chính (id=1) và chuẩn hóa tên hiển thị; đảm bảo 1, 109..113 đầy đủ
INSERT INTO users (id, email, password, full_name, created_at, updated_at) VALUES
(1,   'minhtrieu.po@fairshare.io', '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Minh Triều (Product Owner)', NOW(), NOW()),
(109, 'demo@fairshare.io',         '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Nguyễn Hoàng Nam (Trưởng nhóm)', NOW(), NOW()),
(110, 'trang.tran@edu.vn',         '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Trần Thu Trang (Frontend Dev)', NOW(), NOW()),
(111, 'bao.le@edu.vn',             '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Lê Quốc Bảo (Backend Dev)', NOW(), NOW()),
(112, 'duc.pham@edu.vn',           '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Phạm Minh Đức (DevOps)', NOW(), NOW()),
(113, 'vy.dang@edu.vn',            '$2a$10$T7WhM/EqhnzJ2JfyKpL9seY7wdE0zpLAPsyWJtCAmatzHRd0Gjgx2', 'Đặng Thảo Vy (QA Engineer)', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name);

-- Chuẩn hóa thông tin 3 Teams (tên ngắn gọn, mô tả tách riêng vào cột description)
INSERT INTO teams (id, name, course_name, description, invite_code, created_at, updated_at) VALUES
(1, 'EduConnect', 'Quản lý Dự án Công nghệ Thông tin', 'Nền tảng học tập nhóm, quản lý tiến độ Kanban và đo lường đóng góp đa chiều minh bạch.', 'FS1E04FC', NOW(), NOW()),
(2, 'EKLA', 'Học máy & Trí tuệ Nhân tạo (ML)', 'Hệ thống gợi ý lộ trình học tập thông minh cá nhân hóa theo năng lực sinh viên.', 'FS3CB46178AB', NOW(), NOW()),
(3, 'KINGSHA', 'Công nghệ Y Dược & Kiểm thử (KINGSHA2012)', 'Nền tảng quản lý lô dược phẩm, chuẩn bảo mật HIPAA và hồ sơ lâm sàng thời gian thực.', 'FS8F5661827D', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name        = VALUES(name),
    course_name = VALUES(course_name),
    description = VALUES(description);

-- Gán đầy đủ thành viên cho cả 3 Teams (theo cặp unique uk_team_members_team_user)
INSERT INTO team_members (team_id, user_id, role, created_at, updated_at) VALUES
-- Team 1: EduConnect (6 thành viên)
(1, 1,   'LEADER', NOW(), NOW()),
(1, 109, 'LEADER', NOW(), NOW()),
(1, 110, 'MEMBER', NOW(), NOW()),
(1, 111, 'MEMBER', NOW(), NOW()),
(1, 112, 'MEMBER', NOW(), NOW()),
(1, 113, 'MEMBER', NOW(), NOW()),
-- Team 2: EKLA (5 thành viên)
(2, 1,   'LEADER', NOW(), NOW()),
(2, 109, 'MEMBER', NOW(), NOW()),
(2, 110, 'MEMBER', NOW(), NOW()),
(2, 111, 'MEMBER', NOW(), NOW()),
(2, 112, 'MEMBER', NOW(), NOW()),
-- Team 3: KINGSHA (5 thành viên)
(3, 1,   'LEADER', NOW(), NOW()),
(3, 109, 'MEMBER', NOW(), NOW()),
(3, 110, 'MEMBER', NOW(), NOW()),
(3, 111, 'MEMBER', NOW(), NOW()),
(3, 113, 'MEMBER', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    role = VALUES(role);

-- Đảm bảo 100% Consent Nghị định 13 cho mọi thành viên ở cả 3 Teams
INSERT INTO consents (team_id, user_id, agreed, agreed_at, created_at, updated_at)
SELECT tm.team_id, tm.user_id, 1, NOW(), NOW(), NOW()
FROM team_members tm
ON DUPLICATE KEY UPDATE
    agreed    = 1,
    agreed_at = COALESCE(consents.agreed_at, VALUES(agreed_at));

-- -----------------------------------------------------------------------------
-- 3. Chuẩn hóa Sprints cho cả 3 Teams (Sprints 1-3 thuộc Team 1, 4-5 Team 2, 6-7 Team 3)
-- -----------------------------------------------------------------------------
INSERT INTO sprints (id, team_id, name, start_date, end_date, status, created_at, updated_at) VALUES
(1, 1, 'Sprint 1 - Thiết kế Kiến trúc & UI Kit',                 '2026-10-15', '2026-10-28', 'CLOSED', NOW(), NOW()),
(2, 1, 'Sprint 2 - Phát triển Tính năng & Tích hợp API',          '2026-10-29', '2026-11-12', 'CLOSED', NOW(), NOW()),
(3, 1, 'Sprint 3 - Hoàn thiện MVP & Đánh giá Đa chiều',           '2026-11-13', '2026-11-27', 'ACTIVE', NOW(), NOW()),
(4, 2, 'Sprint 1 - Thu thập Dữ liệu & Feature Engineering',       '2026-10-25', '2026-11-08', 'CLOSED', NOW(), NOW()),
(5, 2, 'Sprint 2 - Huấn luyện Mô hình Gợi ý & Triển khai API',    '2026-11-09', '2026-11-25', 'ACTIVE', NOW(), NOW()),
(6, 3, 'Sprint 1 - Chuẩn hóa Dữ liệu Dược điển & Bảo mật HIPAA',  '2026-10-28', '2026-11-10', 'CLOSED', NOW(), NOW()),
(7, 3, 'Sprint 2 - Truy xuất Nguồn gốc Lô thuốc & Lâm sàng',      '2026-11-11', '2026-11-26', 'ACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    team_id    = VALUES(team_id),
    name       = VALUES(name),
    start_date = VALUES(start_date),
    end_date   = VALUES(end_date),
    status     = VALUES(status);

-- -----------------------------------------------------------------------------
-- 4. Bảng Kanban, Thẻ công việc (Cards) & Tài liệu đính kèm (Attachments)
-- -----------------------------------------------------------------------------
INSERT INTO boards (id, team_id, name, description, created_at, updated_at) VALUES
(1, 1, 'EduConnect Kanban Board', 'Bảng theo dõi tiến độ công việc và hoạt động của dự án EduConnect', NOW(), NOW()),
(2, 2, 'EKLA ML Pipeline Board',  'Bảng điều phối pipeline thu thập dữ liệu, huấn luyện và đánh giá mô hình ML', NOW(), NOW()),
(3, 3, 'KINGSHA Pharma Board',    'Bảng quản lý phát triển hệ thống truy xuất nguồn gốc và hồ sơ y dược', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    team_id     = VALUES(team_id),
    name        = VALUES(name),
    description = VALUES(description);

INSERT INTO board_columns (id, board_id, name, position, created_at, updated_at) VALUES
(1,  1, 'To Do',       0, NOW(), NOW()),
(2,  1, 'In Progress', 1, NOW(), NOW()),
(3,  1, 'Review',      2, NOW(), NOW()),
(4,  1, 'Done',        3, NOW(), NOW()),
(5,  2, 'To Do',       0, NOW(), NOW()),
(6,  2, 'In Progress', 1, NOW(), NOW()),
(7,  2, 'Review',      2, NOW(), NOW()),
(8,  2, 'Done',        3, NOW(), NOW()),
(9,  3, 'To Do',       1, NOW(), NOW()),
(10, 3, 'In Progress', 2, NOW(), NOW()),
(11, 3, 'Review',      3, NOW(), NOW()),
(12, 3, 'Done',        4, NOW(), NOW()),
(13, 3, 'Backlog',     0, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    board_id = VALUES(board_id),
    name     = VALUES(name),
    position = VALUES(position);

-- Cards Team 1 (bổ sung thẻ cho Minh Triều id=1 và đồng bộ toàn team)
INSERT INTO cards (id, board_id, column_id, title, description, assignee_id, story_points, difficulty_level, position, due_date, created_at, updated_at) VALUES
(114, 1, 1, 'Thiết lập Webhook thông báo nhắc nhở tự động CR-04', 'Tích hợp lịch cron gửi cảnh báo thành viên trễ hạn quá 48 giờ', 1, 3.0, 2, 2, '2026-11-21 18:00:00', NOW(), NOW()),
(115, 1, 2, 'Tối ưu hóa mô hình tính điểm 4 tầng & Bootstrap CI 95%', 'Đồng bộ công thức Robust Z-Score từ ScoringEngine vào Stored Procedure MariaDB', 1, 5.0, 4, 2, '2026-11-18 18:00:00', NOW(), NOW()),
(116, 1, 3, 'Hoàn thiện màn hình Thống kê & Xuất báo cáo PDF cá nhân', 'Tích hợp tỷ lệ Consent thực tế từ DB và biểu đồ Radar đa chiều', 1, 3.0, 3, 2, '2026-11-17 20:00:00', NOW(), NOW()),
(117, 1, 4, 'Xác định kiến trúc FairShare & Ma trận đánh giá 4 chiều', 'Chốt tài liệu đặc tả 4 trục D1-D4 và quy trình kiểm duyệt minh chứng', 1, 5.0, 3, 7, '2026-11-04 18:00:00', NOW(), NOW()),
(118, 1, 4, 'Đồng bộ giao diện Không gian Vector & Lịch Kanban Realtime', 'Kết nối trực tiếp node sự kiện thực tế từ MariaDB lên đồ thị Cosmic Network', 1, 4.0, 3, 8, '2026-11-15 18:00:00', NOW(), NOW()),

-- Cards Team 2: EKLA (columns: 5=To Do, 6=In Progress, 7=Review, 8=Done)
(201, 2, 5, 'Tích hợp Pipeline OCR trích xuất đề cương môn học', 'Sử dụng Tesseract OCR chuẩn hóa syllabus PDF thành văn bản sạch', 111, 3.0, 3, 0, '2026-11-22 18:00:00', NOW(), NOW()),
(202, 2, 5, 'Thiết lập Grafana Dashboard giám sát độ trễ Inference', 'Theo dõi p95 latency của API gợi ý dưới 120ms trên Staging', 112, 2.0, 2, 1, '2026-11-23 18:00:00', NOW(), NOW()),
(203, 2, 6, 'Huấn luyện mô hình LightGCN cho hệ thống gợi ý khóa học', 'Đánh giá chỉ số NDCG@10 và Recall@20 trên tập kiểm thử 50k tương tác', 1, 5.0, 4, 0, '2026-11-19 18:00:00', NOW(), NOW()),
(204, 2, 6, 'Giao diện trực quan hóa cây lộ trình kỹ năng sinh viên', 'Hiển thị biểu đồ DAG kiến thức tương tác và độ phù hợp theo từng kỳ', 110, 4.0, 3, 1, '2026-11-20 18:00:00', NOW(), NOW()),
(205, 2, 7, 'API FastAPI phục vụ gợi ý thời gian thực & caching Redis', 'Đóng gói endpoint /api/recommend kèm fallback khi cold-start user', 109, 3.0, 3, 0, '2026-11-18 18:00:00', NOW(), NOW()),
(206, 2, 8, 'Làm sạch & chuẩn hóa 120.000 dòng lịch sử học tập sinh viên', 'Loại bỏ nhiễu, mã hóa one-hot ngành học và tách tập train/val/test', 1, 5.0, 3, 0, '2026-11-05 18:00:00', NOW(), NOW()),
(207, 2, 8, 'Đóng gói môi trường PyTorch & MLflow Tracking Server', 'Dựng Docker Compose quản lý experiment runs và model registry', 112, 3.0, 2, 1, '2026-11-06 18:00:00', NOW(), NOW()),
(208, 2, 8, 'Xây dựng bộ Baseline SVD++ & Matrix Factorization', 'Thiết lập điểm chuẩn hiệu năng trước khi nâng cấp sang mô hình đồ thị', 109, 4.0, 3, 2, '2026-11-07 18:00:00', NOW(), NOW()),

-- Cards Team 3: KINGSHA (columns: 13=Backlog, 9=To Do, 10=In Progress, 11=Review, 12=Done)
(1,   3, 10, 'Nâng cấp UI Quản lý Tồn kho Dược phẩm theo lô FIFO/FEFO', 'Hiển thị cảnh báo lô thuốc cận hạn dưới 30 ngày và biểu đồ xuất nhập', 1, 3.0, 2, 0, '2026-11-19 18:00:00', NOW(), NOW()),
(2,   3, 11, 'Kiểm tra bảo mật phân quyền Bác sĩ & Dược sĩ (RBAC HIPAA)', 'Xác thực truy cập hồ sơ bệnh án điện tử và nhật ký audit bất biến', 1, 3.0, 3, 0, '2026-11-17 18:00:00', NOW(), NOW()),
(301, 3, 9,  'Tích hợp máy quét mã vạch GS1-128 cho kho thuốc trung tâm', 'Nhận diện nhanh số lô, hạn sử dụng và nhà sản xuất khi nhập kho', 111, 3.0, 3, 0, '2026-11-22 18:00:00', NOW(), NOW()),
(302, 3, 9,  'Cấu hình sao lưu dữ liệu mã hóa AES-256 định kỳ hàng ngày', 'Đồng bộ snapshot MariaDB y tế lên vùng lưu trữ an toàn chuẩn HIPAA', 109, 3.0, 3, 1, '2026-11-24 18:00:00', NOW(), NOW()),
(303, 3, 10, 'Giao diện Tra cứu Tương tác Thuốc & Cảnh báo Kê đơn', 'Highlight xung đột hoạt chất nguy hiểm theo thời gian thực cho bác sĩ', 110, 5.0, 3, 1, '2026-11-20 18:00:00', NOW(), NOW()),
(304, 3, 11, 'Kiểm thử hộp đen API Đơn thuốc Điện tử & Xuất PDF chuẩn Bộ Y tế', 'Chạy 40 bộ kiểm thử UAT bao gồm các ca kê đơn nhi khoa đặc biệt', 113, 3.0, 2, 1, '2026-11-18 18:00:00', NOW(), NOW()),
(305, 3, 12, 'Chuẩn hóa danh mục 5.000 hoạt chất theo Dược điển Việt Nam V', 'Thiết kế schema phân cấp nhóm điều trị, mã ATC và liều tối đa', 111, 5.0, 3, 0, '2026-11-06 18:00:00', NOW(), NOW()),
(306, 3, 12, 'Xây dựng Audit Trail bất biến cho mọi thao tác chỉnh sửa bệnh án', 'Cài đặt trigger chống sửa/xóa lịch sử cấp phát và ký số thay đổi', 1, 5.0, 4, 1, '2026-11-08 18:00:00', NOW(), NOW()),
(307, 3, 12, 'Thiết kế UI Portal tra cứu nguồn gốc thuốc dành cho bệnh nhân', 'Hỗ trợ quét QR trên hộp thuốc để xem lịch sử kiểm định chất lượng', 110, 4.0, 2, 2, '2026-11-09 18:00:00', NOW(), NOW()),
(308, 3, 12, 'Kiểm định hiệu năng tải cao 500 truy vấn kê đơn đồng thời', 'Benchmark truy vấn index danh mục dược và tối ưu connection pool', 109, 3.0, 3, 3, '2026-11-10 18:00:00', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    board_id         = VALUES(board_id),
    column_id        = VALUES(column_id),
    title            = VALUES(title),
    description      = VALUES(description),
    assignee_id      = VALUES(assignee_id),
    story_points     = VALUES(story_points),
    difficulty_level = VALUES(difficulty_level),
    due_date         = VALUES(due_date);

-- Bổ sung tài liệu đính kèm mẫu cho Cards ở cả 3 Teams
INSERT INTO card_attachments (card_id, user_id, file_name, file_url, file_size, content_type, created_at)
SELECT src.card_id, src.user_id, src.file_name, src.file_url, src.file_size, src.content_type, NOW()
FROM (
    SELECT 115 AS card_id, 1 AS user_id, '4Tier_Scoring_Math_Spec_v2.pdf' AS file_name, 'https://docs.educonnect.vn/specs/4tier-math-v2.pdf' AS file_url, 482100 AS file_size, 'application/pdf' AS content_type
    UNION ALL SELECT 116, 1,   'EduConnect_Report_UI_Preview.png',     'https://cdn.educonnect.vn/assets/report-preview.png',     215400, 'image/png'
    UNION ALL SELECT 203, 1,   'EKLA_LightGCN_Benchmark_Results.csv',  'https://mlflow.ekla.edu.vn/artifacts/lightgcn-ndcg.csv',   94200,  'text/csv'
    UNION ALL SELECT 306, 111, 'KINGSHA_HIPAA_Audit_Architecture.pdf', 'https://vault.kingsha.vn/docs/hipaa-audit-arch.pdf',     618900, 'application/pdf'
) src
WHERE NOT EXISTS (
    SELECT 1 FROM card_attachments ca
    WHERE ca.card_id = src.card_id AND ca.file_name = src.file_name
);

-- -----------------------------------------------------------------------------
-- 5. Nạp activity_events idempotent (chỉ INSERT ... WHERE NOT EXISTS, không DELETE/UPDATE)
--    Đảm bảo Minh Triều (1) & toàn bộ thành viên ở Team 1, 2, 3 đều có dữ liệu đa chiều
--    với sự phân hóa rõ rệt trên D1 (Output), D2 (Reliability), D3 (Collaboration)
-- -----------------------------------------------------------------------------
INSERT INTO activity_events (
    team_id, sprint_id, user_id, source, event_type, details,
    occurred_at, completed_at, calculated_score, story_points, difficulty_level,
    delay_days, is_on_time, is_helpful_comment, is_support_mention, is_review_for_others
)
SELECT
    src.team_id, src.sprint_id, src.user_id, src.source, src.event_type, src.details,
    src.occurred_at, src.occurred_at, src.calculated_score, src.story_points, src.difficulty_level,
    src.delay_days, src.is_on_time, src.is_helpful_comment, src.is_support_mention, src.is_review_for_others
FROM (
    -- ========== TEAM 1 (EduConnect): Bổ sung user_id = 1 cho Sprint 1, 2, 3 ==========
    SELECT 1 AS team_id, 1 AS sprint_id, 1 AS user_id, 'BOARD' AS source, 'CARD_COMPLETED' AS event_type, 'Chốt kiến trúc tổng thể hệ thống FairShare & mô hình 4 tầng' AS details, '2026-10-21 15:00:00' AS occurred_at, 6.00 AS calculated_score, 5.0 AS story_points, 3 AS difficulty_level, 0.0 AS delay_days, 1 AS is_on_time, 0 AS is_helpful_comment, 0 AS is_support_mention, 0 AS is_review_for_others
    UNION ALL SELECT 1, 1, 1, 'GIT',   'GIT_COMMIT',      'feat(arch): define 4-tier contribution model & ERD entities',       '2026-10-23 10:00:00', 4.00, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 1, 'BOARD', 'REVIEW_CARD',     'Phản biện thiết kế ERD và schema V1-V8 của Quốc Bảo',                '2026-10-24 16:00:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 1, 1, 'BOARD', 'COMMENT_HELPFUL', 'Định nghĩa tiêu chí chấp nhận DoD cho toàn bộ backlog Sprint 1',     '2026-10-25 11:30:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 1, 1, 'BOARD', 'SUPPORT_MENTION', 'Điều phối giải quyết vướng mắc tích hợp JWT với Frontend React',    '2026-10-26 14:15:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0
    UNION ALL SELECT 1, 1, 1, 'BOARD', 'CARD_COMPLETED',  'Hoàn tất bộ tài liệu Vision & Scope EduConnect v1.0',                '2026-10-27 17:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0

    UNION ALL SELECT 1, 2, 1, 'BOARD', 'CARD_COMPLETED',  'Xác định kiến trúc FairShare & Ma trận đánh giá 4 chiều',                '2026-11-04 17:30:00', 5.50, 5.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 1, 'GIT',   'GIT_COMMIT',      'feat(scoring): implement Robust Z-Score & Bootstrap CI 95%',         '2026-11-06 20:00:00', 4.50, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 1, 'BOARD', 'CARD_COMPLETED',  'Tối ưu hóa thuật toán gom nhóm bằng chứng Evidence Traceability',     '2026-11-09 19:00:00', 3.00, 3.0, 2, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 1, 2, 1, 'BOARD', 'REVIEW_CARD',     'Review luồng đồng bộ Kanban với TaskCalendar của Thu Trang',         '2026-11-10 14:20:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 2, 1, 'BOARD', 'COMMENT_HELPFUL', 'Gợi ý tối ưu chỉ mục index trên activity_events giảm query time',    '2026-11-11 09:40:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 2, 1, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ QA Thảo Vy thiết lập bộ dữ liệu test edge case',             '2026-11-11 16:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 1, 3, 1, 'BOARD', 'CARD_COMPLETED',  'Đồng bộ giao diện Không gian Vector & Lịch Kanban Realtime',         '2026-11-15 17:45:00', 5.00, 4.5, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 1, 'GIT',   'GIT_COMMIT',      'feat(db): tune HikariCP pool & complete V25 full sample seed',      '2026-11-16 11:20:00', 4.50, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 1, 'BOARD', 'CARD_COMPLETED',  'Hoàn thiện xuất báo cáo PDF & đồng bộ Consent rate từ DB',           '2026-11-16 15:30:00', 3.50, 3.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 1, 'BOARD', 'REVIEW_CARD',     'Review PR nâng cấp CosmicNetworkCanvas & InspectorDrawer',           '2026-11-16 18:00:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 3, 1, 'BOARD', 'COMMENT_HELPFUL', 'Hướng dẫn cân chỉnh hệ số khả dụng a_i cho ca bất khả kháng',      '2026-11-16 19:15:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 3, 1, 'BOARD', 'SUPPORT_MENTION', 'Điều phối chốt checklist bảo vệ đồ án cuối kỳ',                    '2026-11-16 20:45:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0

    -- ========== TEAM 1: Sự kiện phân hóa thêm cho 109..113 (tạo variance cho D1, D2, D3) ==========
    UNION ALL SELECT 1, 1, 112, 'BOARD', 'CARD_COMPLETED',  'Hoàn thiện cấu hình CI Gradle/Maven ban đầu (trễ 0.5 ngày)',       '2026-10-27 21:00:00', 2.50, 2.5, 2, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 1, 2, 112, 'BOARD', 'CARD_COMPLETED',  'Tối ưu Dockerfile multi-stage cho backend Java 21 (trễ 1 ngày)',   '2026-11-12 20:00:00', 2.50, 2.5, 2, 1.0, 0, 0, 0, 0
    UNION ALL SELECT 1, 2, 110, 'BOARD', 'COMMENT_HELPFUL', 'Bổ sung tài liệu hướng dẫn dùng component RadarChart & Toast',     '2026-11-12 15:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 2, 113, 'BOARD', 'REVIEW_CARD',     'Kiểm tra chéo độ chính xác số liệu trên Báo cáo Tổng quan',       '2026-11-12 16:30:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 3, 110, 'BOARD', 'CARD_COMPLETED',  'Hoàn thiện chế độ Dark/Light Theme đồng bộ cho Peer Review',      '2026-11-16 21:00:00', 3.00, 3.0, 2, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 1, 3, 111, 'BOARD', 'CARD_REOPENED',   'Mở lại thẻ tối ưu truy vấn để xử lý edge case nhóm 6 thành viên',  '2026-11-16 14:00:00', 0.00, 1.0, 2, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 1, 3, 112, 'BOARD', 'CARD_COMPLETED',  'Thiết lập cảnh báo healthcheck container MariaDB (trễ 0.5 ngày)',  '2026-11-16 22:00:00', 2.50, 2.5, 2, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 1, 3, 113, 'BOARD', 'COMMENT_HELPFUL', 'Tổng hợp danh sách 20 bộ unit test Vitest & JUnit5 đạt 100% pass', '2026-11-16 17:30:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0

    -- ========== TEAM 2 (EKLA - Machine Learning): Sprint 4 (CLOSED) & Sprint 5 (ACTIVE) ==========
    -- Sprint 4: Users 1, 109, 110, 111, 112
    UNION ALL SELECT 2, 4, 1,   'BOARD', 'CARD_COMPLETED',  'Làm sạch & chuẩn hóa 120.000 dòng lịch sử học tập sinh viên',     '2026-11-05 17:00:00', 5.50, 5.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 4, 1,   'GIT',   'GIT_COMMIT',      'feat(data): build parquet ETL pipeline and feature encoders',       '2026-11-06 11:00:00', 4.00, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 4, 1,   'BOARD', 'REVIEW_CARD',     'Review ma trận đặc trưng tương tác user-course của Hoàng Nam',     '2026-11-07 14:00:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 2, 4, 1,   'BOARD', 'COMMENT_HELPFUL', 'Đề xuất chuẩn hóa TF-IDF cho mô tả môn học tăng độ phủ cold-start', '2026-11-07 16:30:00', 1.50, 1.5, 2, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 2, 4, 1,   'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ Minh Đức cấu hình GPU runtime trong MLflow container',      '2026-11-08 10:00:00', 1.50, 1.5, 1, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 2, 4, 109, 'BOARD', 'CARD_COMPLETED',  'Xây dựng bộ Baseline SVD++ & Matrix Factorization',              '2026-11-07 16:00:00', 4.50, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 4, 109, 'GIT',   'GIT_COMMIT',      'feat(model): evaluate SVD++ baseline with 5-fold cross validation', '2026-11-07 19:00:00', 3.50, 3.5, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 4, 109, 'BOARD', 'REVIEW_CARD',     'Review pipeline tiền xử lý văn bản syllabus tiếng Việt',          '2026-11-08 09:30:00', 1.50, 1.5, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 2, 4, 109, 'BOARD', 'COMMENT_HELPFUL', 'Chia sẻ script tính metric NDCG@10 & HitRate@20 thống nhất',     '2026-11-08 13:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 2, 4, 109, 'BOARD', 'CARD_MOVED',      'Đẩy notebook phân tích EDA dữ liệu sinh viên sang cột Done',       '2026-11-08 15:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 0

    UNION ALL SELECT 2, 4, 110, 'BOARD', 'CARD_COMPLETED',  'Thiết kế Wireframe giao diện Gợi ý Lộ trình Học tập EKLA',       '2026-11-06 18:00:00', 4.00, 4.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 4, 110, 'GIT',   'GIT_COMMIT',      'feat(ui): prototype skill graph and course card recommendation',  '2026-11-07 15:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 4, 110, 'BOARD', 'CARD_COMPLETED',  'Cập nhật bộ lọc ngành học & học kỳ theo góp ý nhóm (trễ 0.5 ngày)', '2026-11-08 20:00:00', 2.00, 2.0, 1, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 2, 4, 110, 'BOARD', 'COMMENT_HELPFUL', 'Tư vấn bố cục hiển thị điểm tương đồng Cosine dễ hiểu cho user', '2026-11-08 11:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 2, 4, 110, 'BOARD', 'SUPPORT_MENTION', 'Chuẩn bị bộ JSON mock khớp schema FastAPI cho frontend test sớm',  '2026-11-08 14:30:00', 1.00, 1.0, 1, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 2, 4, 111, 'BOARD', 'CARD_COMPLETED',  'Thiết kế schema lưu trữ Vector Embedding & lịch sử gợi ý EKLA',   '2026-11-06 16:30:00', 4.00, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 4, 111, 'GIT',   'GIT_COMMIT',      'feat(api): create recommendation log repository and cache key',   '2026-11-07 12:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 4, 111, 'BOARD', 'CARD_REOPENED',   'Mở lại thẻ ETL syllabus để sửa lỗi font encoding UTF-8 tiếng Việt', '2026-11-08 10:00:00', 0.00, 1.0, 2, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 2, 4, 111, 'BOARD', 'REVIEW_CARD',     'Review tối ưu truy vấn lịch sử điểm học phần dưới 30ms',          '2026-11-08 16:00:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 2, 4, 111, 'BOARD', 'COMMENT_HELPFUL', 'Hướng dẫn cấu trúc lưu feature vector tối ưu bộ nhớ PostgreSQL',  '2026-11-08 17:30:00', 1.00, 1.0, 1, 0.0, 1, 1, 0, 0

    UNION ALL SELECT 2, 4, 112, 'BOARD', 'CARD_COMPLETED',  'Đóng gói môi trường PyTorch & MLflow Tracking Server',           '2026-11-06 17:00:00', 3.50, 3.5, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 4, 112, 'GIT',   'GIT_COMMIT',      'ops(mlops): configure docker compose for mlflow and redis cache', '2026-11-07 17:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 4, 112, 'BOARD', 'CARD_COMPLETED',  'Cài đặt tự động lưu artifact checkpoint lên MinIO (trễ 1 ngày)',  '2026-11-08 22:00:00', 2.00, 2.0, 2, 1.0, 0, 0, 0, 0
    UNION ALL SELECT 2, 4, 112, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ cả nhóm chạy notebook training từ xa qua SSH tunnel',     '2026-11-08 14:00:00', 1.50, 1.5, 1, 0.0, 1, 0, 1, 0
    UNION ALL SELECT 2, 4, 112, 'BOARD', 'CARD_MOVED',      'Đưa pipeline kiểm thử tự động mô hình lên môi trường Staging',    '2026-11-08 18:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 0

    -- Sprint 5 (ACTIVE - EKLA): Users 1, 109, 110, 111, 112
    UNION ALL SELECT 2, 5, 1,   'BOARD', 'CARD_COMPLETED',  'Tinh chỉnh siêu tham số LightGCN nâng NDCG@10 đạt 0.842',        '2026-11-13 17:00:00', 5.50, 5.0, 4, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 5, 1,   'GIT',   'GIT_COMMIT',      'feat(gnn): implement multi-hop LightGCN graph propagation layer', '2026-11-14 15:00:00', 4.50, 4.0, 4, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 5, 1,   'BOARD', 'REVIEW_CARD',     'Review code API FastAPI caching Redis của Hoàng Nam',              '2026-11-15 11:00:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 2, 5, 1,   'BOARD', 'COMMENT_HELPFUL', 'Phân tích nguyên nhân cold-start cho tân sinh viên K50',          '2026-11-15 16:00:00', 2.00, 2.0, 2, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 2, 5, 1,   'BOARD', 'SUPPORT_MENTION', 'Phối hợp Thu Trang gắn giải thích XAI lên từng thẻ môn gợi ý',     '2026-11-16 10:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 2, 5, 109, 'BOARD', 'CARD_COMPLETED',  'Hoàn thiện API FastAPI phục vụ gợi ý thời gian thực',            '2026-11-14 18:00:00', 4.50, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 5, 109, 'GIT',   'GIT_COMMIT',      'feat(serving): add batch embedding warmup and Redis TTL fallback', '2026-11-15 09:30:00', 3.50, 3.5, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 5, 109, 'BOARD', 'REVIEW_CARD',     'Đánh giá chéo pull request tích hợp OCR syllabus của Quốc Bảo',  '2026-11-15 17:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 2, 5, 109, 'BOARD', 'COMMENT_HELPFUL', 'Tài liệu hóa OpenAPI Swagger cho 6 endpoint gợi ý học tập',     '2026-11-16 11:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 2, 5, 109, 'BOARD', 'CARD_MOVED',      'Chuyển thẻ API FastAPI sang cột Review sau khi pass unit tests',  '2026-11-16 14:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 0

    UNION ALL SELECT 2, 5, 110, 'BOARD', 'CARD_COMPLETED',  'Xây dựng biểu đồ DAG cây lộ trình kỹ năng tương tác',             '2026-11-14 19:00:00', 4.00, 4.0, 3, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 2, 5, 110, 'GIT',   'GIT_COMMIT',      'feat(dag): render interactive prerequisite graph using SVG zoom',  '2026-11-15 14:00:00', 3.50, 3.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 5, 110, 'BOARD', 'COMMENT_HELPFUL', 'Cải thiện độ tương phản màu đường nối đồ thị trên Dark Mode',    '2026-11-15 18:30:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 2, 5, 110, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ gắn tooltip hiển thị độ phù hợp kỹ năng từ API',          '2026-11-16 09:30:00', 1.50, 1.5, 1, 0.0, 1, 0, 1, 0
    UNION ALL SELECT 2, 5, 110, 'BOARD', 'CARD_MOVED',      'Cập nhật trạng thái giao diện DAG hoàn thành 85% tiêu chí',      '2026-11-16 16:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 0

    UNION ALL SELECT 2, 5, 111, 'BOARD', 'CARD_COMPLETED',  'Tối ưu Pipeline OCR trích xuất văn bản đề cương học phần',       '2026-11-14 16:00:00', 3.50, 3.5, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 5, 111, 'GIT',   'GIT_COMMIT',      'feat(ocr): parallelize tesseract worker pool for PDF batches',  '2026-11-15 10:30:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 5, 111, 'BOARD', 'IMPEDIMENT_SCHEDULE', 'Nghỉ 1.5 ngày tham gia kỳ thi chứng chỉ AWS Solution Architect', '2026-11-13 08:00:00', 0.00, 0.0, 1, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 5, 111, 'BOARD', 'REVIEW_CARD',     'Kiểm tra hiệu suất kết nối Redis cho cache recommendation',      '2026-11-16 10:15:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 2, 5, 111, 'BOARD', 'COMMENT_HELPFUL', 'Gợi ý lọc stopwords tiếng Việt giúp cải thiện embedding môn học', '2026-11-16 15:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0

    UNION ALL SELECT 2, 5, 112, 'BOARD', 'CARD_COMPLETED',  'Triển khai Prometheus + Grafana theo dõi độ trễ API ML',         '2026-11-15 16:30:00', 3.00, 3.0, 2, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 2, 5, 112, 'GIT',   'GIT_COMMIT',      'ops(monitoring): add fastapi latency histograms and alerts',    '2026-11-15 19:00:00', 2.50, 2.5, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 2, 5, 112, 'BOARD', 'CARD_REOPENED',   'Mở lại thẻ Grafana dashboard do thiếu chỉ số memory GPU',       '2026-11-16 09:00:00', 0.00, 1.0, 2, 1.0, 0, 0, 0, 0
    UNION ALL SELECT 2, 5, 112, 'BOARD', 'SUPPORT_MENTION', 'Cấu hình xong cảnh báo Telegram khi p95 inference vượt 200ms',    '2026-11-16 14:30:00', 1.50, 1.5, 1, 0.0, 1, 0, 1, 0
    UNION ALL SELECT 2, 5, 112, 'BOARD', 'COMMENT_HELPFUL', 'Viết hướng dẫn triển khai model serving trên Cloud Run',          '2026-11-16 17:00:00', 1.00, 1.0, 1, 0.0, 1, 1, 0, 0

    -- ========== TEAM 3 (KINGSHA - Công nghệ Y Dược): Sprint 6 (CLOSED) & Sprint 7 (ACTIVE) ==========
    -- Sprint 6: Users 1, 109, 110, 111, 113
    UNION ALL SELECT 3, 6, 1,   'BOARD', 'CARD_COMPLETED',  'Xây dựng Audit Trail bất biến cho mọi thao tác bệnh án điện tử',  '2026-11-08 17:00:00', 5.50, 5.0, 4, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 6, 1,   'GIT',   'GIT_COMMIT',      'feat(hipaa): add immutable prescription audit log triggers',    '2026-11-08 20:00:00', 4.50, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 6, 1,   'BOARD', 'REVIEW_CARD',     'Review chuẩn hóa mã ATC và 5.000 hoạt chất của Quốc Bảo',        '2026-11-09 10:30:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 3, 6, 1,   'BOARD', 'COMMENT_HELPFUL', 'Chốt quy trình ký số xác thực dược sĩ trước khi xuất kho',       '2026-11-09 16:00:00', 1.50, 1.5, 2, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 3, 6, 1,   'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ QA Thảo Vy đối chiếu tiêu chuẩn kiểm thử Bộ Y tế',       '2026-11-10 09:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 3, 6, 109, 'BOARD', 'CARD_COMPLETED',  'Kiểm định hiệu năng tải cao 500 truy vấn kê đơn đồng thời',      '2026-11-09 17:00:00', 4.00, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 6, 109, 'GIT',   'GIT_COMMIT',      'perf(pharma): optimize drug lookup index for 500 req/s load',   '2026-11-09 20:00:00', 3.50, 3.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 6, 109, 'BOARD', 'REVIEW_CARD',     'Review giao diện Portal quét QR nguồn gốc dược phẩm',           '2026-11-10 11:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 3, 6, 109, 'BOARD', 'SUPPORT_MENTION', 'Điều phối giải quyết xung đột cấu hình SSL nội bộ bệnh viện',    '2026-11-10 14:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0
    UNION ALL SELECT 3, 6, 109, 'BOARD', 'COMMENT_HELPFUL', 'Đề xuất phân vùng bảng log đơn thuốc theo quý tăng tốc độ',     '2026-11-10 16:30:00', 1.00, 1.0, 1, 0.0, 1, 1, 0, 0

    UNION ALL SELECT 3, 6, 110, 'BOARD', 'CARD_COMPLETED',  'Thiết kế UI Portal tra cứu nguồn gốc thuốc cho bệnh nhân',       '2026-11-09 16:00:00', 4.00, 4.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 6, 110, 'GIT',   'GIT_COMMIT',      'feat(qr): add mobile camera QR scanner for medicine tracking',  '2026-11-09 19:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 6, 110, 'BOARD', 'CARD_COMPLETED',  'Chỉnh sửa kích thước chữ cảnh báo dễ đọc cho người cao tuổi (trễ 0.5 ngày)', '2026-11-10 18:00:00', 2.00, 2.0, 1, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 3, 6, 110, 'BOARD', 'COMMENT_HELPFUL', 'Chia sẻ bộ icon y tế đạt chuẩn dễ nhận diện trên màn hình nhỏ', '2026-11-10 11:30:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 3, 6, 110, 'BOARD', 'CARD_MOVED',      'Bàn giao giao diện Portal quét QR sang kiểm thử hồi quy',       '2026-11-10 15:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 0

    UNION ALL SELECT 3, 6, 111, 'BOARD', 'CARD_COMPLETED',  'Chuẩn hóa danh mục 5.000 hoạt chất theo Dược điển Việt Nam V',  '2026-11-06 18:00:00', 5.00, 5.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 6, 111, 'GIT',   'GIT_COMMIT',      'feat(catalog): import 5000 ATC drug interactions and limits',   '2026-11-07 15:00:00', 4.00, 3.5, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 6, 111, 'BOARD', 'CARD_REOPENED',   'Mở lại thẻ ánh xạ mã ATC do thiếu biệt dược ngoại nhập',         '2026-11-08 11:00:00', 0.00, 1.0, 2, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 3, 6, 111, 'BOARD', 'COMMENT_HELPFUL', 'Giải thích cấu trúc cây tương tác hoạt chất cho nhóm Frontend', '2026-11-09 14:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 3, 6, 111, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ import file CSV kiểm định lô thuốc từ Cục Quản lý Dược',  '2026-11-10 10:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 3, 6, 113, 'BOARD', 'CARD_COMPLETED',  'Hoàn thiện bộ test UAT phân hệ Kho thuốc & Cảnh báo cận hạn',  '2026-11-08 17:00:00', 3.50, 3.5, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 6, 113, 'GOOGLE_DOCS', 'DOC_EDIT',   'Cập nhật ma trận truy xuất yêu cầu RTM chuẩn kiểm định Y tế',    '2026-11-09 13:00:00', 2.50, 2.5, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 6, 113, 'BOARD', 'REVIEW_CARD',     'Kiểm thử kỹ luồng ẩn danh bệnh án và phân quyền bác sĩ',        '2026-11-09 17:30:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 3, 6, 113, 'BOARD', 'COMMENT_HELPFUL', 'Báo cáo kịp thời 3 lỗi làm tròn liều lượng nhi khoa ở UI',      '2026-11-10 12:00:00', 2.00, 2.0, 2, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 3, 6, 113, 'BOARD', 'CARD_MOVED',      'Đóng toàn bộ test case Sprint 6 đạt 100% pass rate',             '2026-11-10 16:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 0

    -- Sprint 7 (ACTIVE - KINGSHA): Bổ sung cho 1, 109, 110, 111, 113 (user 1 bổ sung hoàn thành card/review chuẩn xác)
    UNION ALL SELECT 3, 7, 1,   'BOARD', 'CARD_COMPLETED',  'Hoàn thiện kiểm tra phân quyền Bác sĩ & Dược sĩ (RBAC HIPAA)',  '2026-11-15 17:00:00', 5.00, 4.5, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 7, 1,   'GIT',   'GIT_COMMIT',      'feat(security): enforce HIPAA role audit interceptor on API',   '2026-11-16 10:00:00', 4.00, 3.5, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 7, 1,   'BOARD', 'REVIEW_CARD',     'Review thuật toán cảnh báo xung đột hoạt chất kê đơn',          '2026-11-16 14:30:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1

    UNION ALL SELECT 3, 7, 109, 'BOARD', 'CARD_COMPLETED',  'Thiết lập lịch sao lưu tự động dữ liệu y tế mã hóa AES-256',    '2026-11-14 17:00:00', 4.00, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 7, 109, 'GIT',   'GIT_COMMIT',      'ops(backup): schedule encrypted MariaDB snapshots every 6h',    '2026-11-15 11:00:00', 3.50, 3.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 7, 109, 'BOARD', 'REVIEW_CARD',     'Review kết nối máy quét mã vạch kho thuốc GS1-128',             '2026-11-15 16:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 3, 7, 109, 'BOARD', 'COMMENT_HELPFUL', 'Đề xuất cơ chế failover tự động khi mất kết nối mạng kho',      '2026-11-16 09:30:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 3, 7, 109, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ tối ưu memory pool dịch vụ xuất PDF đơn thuốc',          '2026-11-16 15:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 3, 7, 110, 'BOARD', 'CARD_COMPLETED',  'Xây dựng giao diện Tra cứu Tương tác Thuốc & Cảnh báo Kê đơn',  '2026-11-14 19:30:00', 4.50, 4.5, 3, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 3, 7, 110, 'GIT',   'GIT_COMMIT',      'feat(prescribe): render realtime drug interaction warning modal', '2026-11-15 14:30:00', 3.50, 3.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 7, 110, 'BOARD', 'COMMENT_HELPFUL', 'Đồng bộ màu sắc phân mức độ cảnh báo Đỏ/Cam/Vàng chuẩn y tế',   '2026-11-15 18:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 3, 7, 110, 'BOARD', 'CARD_MOVED',      'Đẩy module cảnh báo kê đơn sang bước kiểm thử với bác sĩ giả lập', '2026-11-16 11:00:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 7, 110, 'BOARD', 'REVIEW_CARD',     'Review lại giao diện thống kê lô thuốc cận hạn FIFO/FEFO',       '2026-11-16 16:30:00', 1.50, 1.5, 2, 0.0, 1, 0, 0, 1

    UNION ALL SELECT 3, 7, 111, 'BOARD', 'CARD_COMPLETED',  'Hoàn thiện API kiểm tra tương tác thuốc thời gian thực < 25ms', '2026-11-14 18:00:00', 4.00, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 7, 111, 'GIT',   'GIT_COMMIT',      'feat(engine): add pairwise active-ingredient conflict lookup',  '2026-11-15 15:00:00', 3.50, 3.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 7, 111, 'BOARD', 'CARD_REOPENED',   'Mở lại thẻ đọc mã vạch GS1-128 để hỗ trợ chuẩn lô nhập ngoại',   '2026-11-16 09:00:00', 0.00, 1.0, 2, 1.0, 0, 0, 0, 0
    UNION ALL SELECT 3, 7, 111, 'BOARD', 'COMMENT_HELPFUL', 'Bổ sung tài liệu phân tích độ phức tạp truy vấn bảng dược',    '2026-11-16 13:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 3, 7, 111, 'BOARD', 'SUPPORT_MENTION', 'Phối hợp Thảo Vy tạo 20 bộ dữ liệu kê đơn giả lập test UAT',    '2026-11-16 17:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 3, 7, 113, 'BOARD', 'CARD_COMPLETED',  'Kiểm thử hộp đen API Đơn thuốc & Xuất PDF chuẩn Bộ Y tế',     '2026-11-15 16:00:00', 4.00, 4.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 7, 113, 'GOOGLE_DOCS', 'DOC_EDIT',   'Hoàn thiện báo cáo thẩm định phần mềm y tế KINGSHA v2.0',      '2026-11-15 19:00:00', 2.50, 2.5, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 3, 7, 113, 'BOARD', 'REVIEW_CARD',     'Kiểm thử chéo 40 tình huống tương tác thuốc nguy hiểm',        '2026-11-16 10:00:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 3, 7, 113, 'BOARD', 'COMMENT_HELPFUL', 'Ghi chú tối ưu font và mã vạch trên biểu mẫu PDF đơn thuốc',   '2026-11-16 14:00:00', 2.00, 2.0, 2, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 3, 7, 113, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ kiểm tra bảo mật phân quyền không rò rỉ ID bệnh nhân',   '2026-11-16 18:00:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0
) src
WHERE NOT EXISTS (
    SELECT 1 FROM activity_events ae
    WHERE ae.team_id = src.team_id
      AND ae.sprint_id = src.sprint_id
      AND ae.user_id = src.user_id
      AND ae.event_type = src.event_type
      AND ae.details = src.details
);

-- -----------------------------------------------------------------------------
-- 6. Hệ số khả dụng Sprint (sprint_availability) & Đóng góp thủ công (manual_contributions)
-- -----------------------------------------------------------------------------
INSERT INTO sprint_availability (sprint_id, team_member_id, available_days, reason, availability_ratio, confirmed_by_leader, created_at, updated_at)
SELECT src.sprint_id, tm.id, src.available_days, src.reason, src.availability_ratio, 1, NOW(), NOW()
FROM (
    SELECT 2 AS team_id, 5 AS sprint_id, 111 AS user_id, 11 AS available_days, 'Thi chứng chỉ chuyên môn (1.5 ngày nghỉ đã duyệt)' AS reason, 0.850 AS availability_ratio
    UNION ALL SELECT 1, 3, 111, 12, 'Trùng lịch thi cuối kỳ CSDL phân tán (2 ngày)', 0.900
    UNION ALL SELECT 1, 3, 112, 13, 'Nghỉ ốm có giấy xác nhận y tế (1 ngày)', 0.930
    UNION ALL SELECT 3, 7, 110, 12, 'Tham dự hội thảo UI/UX quốc gia (1.5 ngày)', 0.900
) src
JOIN team_members tm ON tm.team_id = src.team_id AND tm.user_id = src.user_id
ON DUPLICATE KEY UPDATE
    available_days      = VALUES(available_days),
    reason              = VALUES(reason),
    availability_ratio  = VALUES(availability_ratio),
    confirmed_by_leader = 1;

INSERT INTO manual_contributions (
    team_id, sprint_id, user_id, title, task_name, description, evidence_link,
    story_points, equivalent_story_points, status, confirmed, confirmed_by, reviewer_id, confirmed_at, created_at, updated_at
)
SELECT
    src.team_id, src.sprint_id, src.user_id, src.task_name, src.task_name, src.description, src.evidence_link,
    src.story_points, src.story_points, src.status, src.confirmed, src.reviewer_id, src.reviewer_id,
    CASE WHEN src.confirmed = 1 THEN NOW() ELSE NULL END, NOW(), NOW()
FROM (
    -- Team 1 (EduConnect): bổ sung cho Minh Triều (1) ở Sprint 1, 2, 3
    SELECT 1 AS team_id, 1 AS sprint_id, 1 AS user_id, 'Chủ trì họp Kick-off & Chốt Scope Dự án EduConnect' AS task_name, 'Điều phối thống nhất backlog, phân vai trò và cam kết tiến độ 3 sprint' AS description, 'https://docs.google.com/document/d/educonnect-kickoff' AS evidence_link, 2.50 AS story_points, 'APPROVED' AS status, 1 AS confirmed, 109 AS reviewer_id
    UNION ALL SELECT 1, 2, 1, 'Trình bày Demo giữa kỳ trước Hội đồng Giảng viên' AS task_name, 'Chuẩn bị kịch bản live demo luồng Kanban, Scoring 4 tầng & Peer Review' AS description, 'https://docs.google.com/presentation/d/educonnect-midterm' AS evidence_link, 3.00, 'APPROVED', 1, 109
    UNION ALL SELECT 1, 3, 1, 'Hoàn thiện Hướng dẫn Vận hành & Đánh giá An toàn Dữ liệu' AS task_name, 'Tổng hợp quy trình bảo mật Nghị định 13 và tài liệu bàn giao hệ thống' AS description, 'https://docs.google.com/document/d/educonnect-handover' AS evidence_link, 3.00, 'APPROVED', 1, 109

    -- Team 2 (EKLA): APPROVED + PENDING
    UNION ALL SELECT 2, 4, 1,   'Thu thập & gắn nhãn bộ dữ liệu khảo sát nhu cầu môn học (500 sinh viên)', 'Làm sạch phản hồi khảo sát đầu vào phục vụ kiểm chứng mô hình LightGCN', 'https://sheets.google.com/ekla-survey-dataset', 3.00, 'APPROVED', 1, 109
    UNION ALL SELECT 2, 5, 110, 'Thiết kế poster & sơ đồ kiến trúc ML phục vụ báo cáo đồ án EKLA', 'Biên tập sơ đồ pipeline ETL -> Feature -> LightGCN -> FastAPI', 'https://figma.com/file/ekla-architecture-poster', 2.50, 'APPROVED', 1, 1
    UNION ALL SELECT 2, 5, 111, 'Viết tài liệu hướng dẫn tái lập thí nghiệm MLflow cho nhóm', 'Ghi chú seed ngẫu nhiên, hyperparameters và cách so sánh runs', 'https://github.com/ekla/docs/REPRODUCE.md', 2.00, 'PENDING', 0, NULL

    -- Team 3 (KINGSHA): APPROVED + PENDING
    UNION ALL SELECT 3, 6, 1,   'Đối chiếu danh mục quy định HIPAA & Nghị định 13 cho dữ liệu bệnh án', 'Lập bảng kiểm 18 tiêu chí ẩn danh dữ liệu y tế trước khi lưu trữ', 'https://docs.google.com/document/d/kingsha-hipaa-checklist', 3.00, 'APPROVED', 1, 109
    UNION ALL SELECT 3, 7, 113, 'Phỏng vấn kiểm thử tính khả dụng với 2 dược sĩ thực tế', 'Tổng hợp 10 góp ý về cảnh báo tương tác thuốc và luồng quét mã vạch', 'https://docs.google.com/document/d/kingsha-pharmacist-uat', 2.50, 'APPROVED', 1, 1
    UNION ALL SELECT 3, 7, 109, 'Soạn thảo quy trình xử lý sự cố sao lưu khẩn cấp kho dược', 'Mô tả kịch bản RPO/RTO dưới 15 phút khi phục hồi MariaDB', 'https://github.com/kingsha/docs/DR_PLAN.md', 2.00, 'PENDING', 0, NULL
) src
WHERE NOT EXISTS (
    SELECT 1 FROM manual_contributions mc
    WHERE mc.team_id = src.team_id
      AND mc.sprint_id = src.sprint_id
      AND mc.user_id = src.user_id
      AND COALESCE(mc.task_name, mc.title) = src.task_name
);

-- -----------------------------------------------------------------------------
-- 7. Đợt Chấm chéo (Review Rounds 4-7 cho Team 2, 3) & Review Submissions đầy đủ
--    Đảm bảo TẤT CẢ thành viên (bao gồm Minh Triều id=1) ở cả 7 Sprint đều có >= 3 reviewers
-- -----------------------------------------------------------------------------
INSERT INTO review_rounds (id, team_id, sprint_id, name, status, min_submissions_required, start_date, end_date, created_at, updated_at) VALUES
(4, 2, 4, 'Đợt chấm chéo EKLA Sprint 1 - Dữ liệu & Baseline Model',      'CLOSED', 3, '2026-11-04 08:00:00', '2026-11-08 23:59:59', NOW(), NOW()),
(5, 2, 5, 'Đợt chấm chéo EKLA Sprint 2 - Huấn luyện LightGCN & Serving', 'OPEN',   3, '2026-11-12 08:00:00', '2026-11-25 23:59:59', NOW(), NOW()),
(6, 3, 6, 'Đợt chấm chéo KINGSHA Sprint 1 - Chuẩn hóa Dược điển & HIPAA','CLOSED', 3, '2026-11-06 08:00:00', '2026-11-10 23:59:59', NOW(), NOW()),
(7, 3, 7, 'Đợt chấm chéo KINGSHA Sprint 2 - Cảnh báo Kê đơn & Kho thuốc','OPEN',   3, '2026-11-13 08:00:00', '2026-11-26 23:59:59', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    team_id    = VALUES(team_id),
    sprint_id  = VALUES(sprint_id),
    name       = VALUES(name),
    status     = VALUES(status),
    start_date = VALUES(start_date),
    end_date   = VALUES(end_date);

INSERT INTO review_submissions (
    review_round_id, reviewer_id, reviewee_id, criterion, score, feedback, card_id, likes_count, created_at, updated_at
)
SELECT
    src.round_id, src.reviewer_id, src.reviewee_id, src.criterion, src.score, src.feedback, src.card_id, src.likes_count, src.created_at, NOW()
FROM (
    -- ========== TEAM 1 (Rounds 1, 2, 3): Chấm chéo đầy đủ cho Minh Triều (id=1) ==========
    SELECT 1 AS round_id, 109 AS reviewer_id, 1 AS reviewee_id, 'QUALITY' AS criterion, 5 AS score, 'Định hướng kiến trúc 4 tầng rõ ràng ngay từ Sprint 1, dẫn dắt team bám sát mục tiêu.' AS feedback, 117 AS card_id, 6 AS likes_count, '2026-10-26 10:00:00' AS created_at
    UNION ALL SELECT 1, 109, 1, 'PUNCTUALITY', 5, 'Định hướng kiến trúc 4 tầng rõ ràng ngay từ Sprint 1, dẫn dắt team bám sát mục tiêu.', 117, 6, '2026-10-26 10:00:00'
    UNION ALL SELECT 1, 109, 1, 'COOPERATION', 5, 'Định hướng kiến trúc 4 tầng rõ ràng ngay từ Sprint 1, dẫn dắt team bám sát mục tiêu.', 117, 6, '2026-10-26 10:00:00'
    UNION ALL SELECT 1, 110, 1, 'QUALITY',     5, 'Review wireframe và tiêu chí nghiệm thu rất chi tiết, giúp FE làm đúng ngay lần đầu.', 117, 5, '2026-10-26 13:00:00'
    UNION ALL SELECT 1, 110, 1, 'PUNCTUALITY', 5, 'Review wireframe và tiêu chí nghiệm thu rất chi tiết, giúp FE làm đúng ngay lần đầu.', 117, 5, '2026-10-26 13:00:00'
    UNION ALL SELECT 1, 110, 1, 'COOPERATION', 5, 'Review wireframe và tiêu chí nghiệm thu rất chi tiết, giúp FE làm đúng ngay lần đầu.', 117, 5, '2026-10-26 13:00:00'
    UNION ALL SELECT 1, 111, 1, 'QUALITY',     5, 'Đặc tả ERD và công thức Robust Z-Score cực kỳ chặt chẽ.', 117, 4, '2026-10-26 15:00:00'
    UNION ALL SELECT 1, 111, 1, 'PUNCTUALITY', 4, 'Đặc tả ERD và công thức Robust Z-Score cực kỳ chặt chẽ.', 117, 4, '2026-10-26 15:00:00'
    UNION ALL SELECT 1, 111, 1, 'COOPERATION', 5, 'Đặc tả ERD và công thức Robust Z-Score cực kỳ chặt chẽ.', 117, 4, '2026-10-26 15:00:00'

    UNION ALL SELECT 2, 109, 1, 'QUALITY',     5, 'Triển khai Bootstrap CI 95% và đồng bộ API Evidence xuất sắc.', 115, 7, '2026-11-11 10:00:00'
    UNION ALL SELECT 2, 109, 1, 'PUNCTUALITY', 5, 'Triển khai Bootstrap CI 95% và đồng bộ API Evidence xuất sắc.', 115, 7, '2026-11-11 10:00:00'
    UNION ALL SELECT 2, 109, 1, 'COOPERATION', 5, 'Triển khai Bootstrap CI 95% và đồng bộ API Evidence xuất sắc.', 115, 7, '2026-11-11 10:00:00'
    UNION ALL SELECT 2, 110, 1, 'QUALITY',     5, 'Hỗ trợ FE gỡ nhiều vướng mắc liên kết dữ liệu Lịch & Kanban.', 118, 6, '2026-11-11 14:00:00'
    UNION ALL SELECT 2, 110, 1, 'PUNCTUALITY', 4, 'Hỗ trợ FE gỡ nhiều vướng mắc liên kết dữ liệu Lịch & Kanban.', 118, 6, '2026-11-11 14:00:00'
    UNION ALL SELECT 2, 110, 1, 'COOPERATION', 5, 'Hỗ trợ FE gỡ nhiều vướng mắc liên kết dữ liệu Lịch & Kanban.', 118, 6, '2026-11-11 14:00:00'
    UNION ALL SELECT 2, 113, 1, 'QUALITY',     5, 'Hợp tác chặt chẽ với QA trong kiểm thử edge cases chấm điểm.', 116, 5, '2026-11-12 09:30:00'
    UNION ALL SELECT 2, 113, 1, 'PUNCTUALITY', 5, 'Hợp tác chặt chẽ với QA trong kiểm thử edge cases chấm điểm.', 116, 5, '2026-11-12 09:30:00'
    UNION ALL SELECT 2, 113, 1, 'COOPERATION', 5, 'Hợp tác chặt chẽ với QA trong kiểm thử edge cases chấm điểm.', 116, 5, '2026-11-12 09:30:00'

    UNION ALL SELECT 3, 109, 1, 'QUALITY',     5, 'Hoàn thiện toàn diện DB -> Backend -> UI Cosmic Network mượt mà.', 118, 8, '2026-11-16 10:00:00'
    UNION ALL SELECT 3, 109, 1, 'PUNCTUALITY', 5, 'Hoàn thiện toàn diện DB -> Backend -> UI Cosmic Network mượt mà.', 118, 8, '2026-11-16 10:00:00'
    UNION ALL SELECT 3, 109, 1, 'COOPERATION', 5, 'Hoàn thiện toàn diện DB -> Backend -> UI Cosmic Network mượt mà.', 118, 8, '2026-11-16 10:00:00'
    UNION ALL SELECT 3, 110, 1, 'QUALITY',     5, 'Thiết kế trải nghiệm UX đồng nhất từ Dashboard tới trang Vector 4D.', 118, 7, '2026-11-16 13:00:00'
    UNION ALL SELECT 3, 110, 1, 'PUNCTUALITY', 5, 'Thiết kế trải nghiệm UX đồng nhất từ Dashboard tới trang Vector 4D.', 118, 7, '2026-11-16 13:00:00'
    UNION ALL SELECT 3, 110, 1, 'COOPERATION', 5, 'Thiết kế trải nghiệm UX đồng nhất từ Dashboard tới trang Vector 4D.', 118, 7, '2026-11-16 13:00:00'
    UNION ALL SELECT 3, 111, 1, 'QUALITY',     5, 'Tối ưu Connection Pool & Stored Procedure chạy chuẩn xác trên MariaDB.', 115, 6, '2026-11-16 16:00:00'
    UNION ALL SELECT 3, 111, 1, 'PUNCTUALITY', 5, 'Tối ưu Connection Pool & Stored Procedure chạy chuẩn xác trên MariaDB.', 115, 6, '2026-11-16 16:00:00'
    UNION ALL SELECT 3, 111, 1, 'COOPERATION', 5, 'Tối ưu Connection Pool & Stored Procedure chạy chuẩn xác trên MariaDB.', 115, 6, '2026-11-16 16:00:00'

    -- ========== TEAM 2 (Rounds 4, 5 - EKLA): >= 3 reviewers cho cả 5 thành viên (1, 109, 110, 111, 112) ==========
    -- Round 4
    UNION ALL SELECT 4, 109, 1,   'QUALITY', 5, 'Pipeline ETL sạch, tách dữ liệu train/test không bị data leakage.', 206, 6, '2026-11-08 09:00:00'
    UNION ALL SELECT 4, 109, 1,   'PUNCTUALITY', 5, 'Pipeline ETL sạch, tách dữ liệu train/test không bị data leakage.', 206, 6, '2026-11-08 09:00:00'
    UNION ALL SELECT 4, 109, 1,   'COOPERATION', 5, 'Pipeline ETL sạch, tách dữ liệu train/test không bị data leakage.', 206, 6, '2026-11-08 09:00:00'
    UNION ALL SELECT 4, 110, 1,   'QUALITY', 5, 'Hỗ trợ xuất feature giải thích được giúp UI hiển thị trực quan.', 206, 5, '2026-11-08 11:00:00'
    UNION ALL SELECT 4, 110, 1,   'PUNCTUALITY', 5, 'Hỗ trợ xuất feature giải thích được giúp UI hiển thị trực quan.', 206, 5, '2026-11-08 11:00:00'
    UNION ALL SELECT 4, 110, 1,   'COOPERATION', 5, 'Hỗ trợ xuất feature giải thích được giúp UI hiển thị trực quan.', 206, 5, '2026-11-08 11:00:00'
    UNION ALL SELECT 4, 111, 1,   'QUALITY', 5, 'Tối ưu hóa tốc độ đọc parquet tăng gấp 4 lần cho team.', 206, 4, '2026-11-08 14:00:00'
    UNION ALL SELECT 4, 111, 1,   'PUNCTUALITY', 4, 'Tối ưu hóa tốc độ đọc parquet tăng gấp 4 lần cho team.', 206, 4, '2026-11-08 14:00:00'
    UNION ALL SELECT 4, 111, 1,   'COOPERATION', 5, 'Tối ưu hóa tốc độ đọc parquet tăng gấp 4 lần cho team.', 206, 4, '2026-11-08 14:00:00'

    UNION ALL SELECT 4, 1,   109, 'QUALITY', 5, 'Bộ baseline SVD++ chạy ổn định, làm mốc so sánh rất tin cậy.', 208, 5, '2026-11-08 09:30:00'
    UNION ALL SELECT 4, 1,   109, 'PUNCTUALITY', 5, 'Bộ baseline SVD++ chạy ổn định, làm mốc so sánh rất tin cậy.', 208, 5, '2026-11-08 09:30:00'
    UNION ALL SELECT 4, 1,   109, 'COOPERATION', 5, 'Bộ baseline SVD++ chạy ổn định, làm mốc so sánh rất tin cậy.', 208, 5, '2026-11-08 09:30:00'
    UNION ALL SELECT 4, 110, 109, 'QUALITY', 4, 'Tài liệu giải thích các chỉ số đánh giá NDCG dễ hiểu.', 208, 4, '2026-11-08 12:00:00'
    UNION ALL SELECT 4, 110, 109, 'PUNCTUALITY', 5, 'Tài liệu giải thích các chỉ số đánh giá NDCG dễ hiểu.', 208, 4, '2026-11-08 12:00:00'
    UNION ALL SELECT 4, 110, 109, 'COOPERATION', 5, 'Tài liệu giải thích các chỉ số đánh giá NDCG dễ hiểu.', 208, 4, '2026-11-08 12:00:00'
    UNION ALL SELECT 4, 112, 109, 'QUALITY', 5, 'Code sạch, tích hợp log metric trực tiếp lên MLflow.', 208, 4, '2026-11-08 16:00:00'
    UNION ALL SELECT 4, 112, 109, 'PUNCTUALITY', 4, 'Code sạch, tích hợp log metric trực tiếp lên MLflow.', 208, 4, '2026-11-08 16:00:00'
    UNION ALL SELECT 4, 112, 109, 'COOPERATION', 4, 'Code sạch, tích hợp log metric trực tiếp lên MLflow.', 208, 4, '2026-11-08 16:00:00'

    UNION ALL SELECT 4, 1,   110, 'QUALITY', 4, 'Prototype UI lộ trình học tập đẹp, cần tối ưu thêm khi nhiều node.', 204, 5, '2026-11-08 10:00:00'
    UNION ALL SELECT 4, 1,   110, 'PUNCTUALITY', 4, 'Prototype UI lộ trình học tập đẹp, cần tối ưu thêm khi nhiều node.', 204, 5, '2026-11-08 10:00:00'
    UNION ALL SELECT 4, 1,   110, 'COOPERATION', 5, 'Prototype UI lộ trình học tập đẹp, cần tối ưu thêm khi nhiều node.', 204, 5, '2026-11-08 10:00:00'
    UNION ALL SELECT 4, 109, 110, 'QUALITY', 5, 'Thiết kế thẻ môn học gợi ý trực quan, phản hồi nhanh.', 204, 4, '2026-11-08 13:00:00'
    UNION ALL SELECT 4, 109, 110, 'PUNCTUALITY', 4, 'Thiết kế thẻ môn học gợi ý trực quan, phản hồi nhanh.', 204, 4, '2026-11-08 13:00:00'
    UNION ALL SELECT 4, 109, 110, 'COOPERATION', 5, 'Thiết kế thẻ môn học gợi ý trực quan, phản hồi nhanh.', 204, 4, '2026-11-08 13:00:00'
    UNION ALL SELECT 4, 111, 110, 'QUALITY', 4, 'Chủ động điều chỉnh payload khớp định dạng API.', 204, 3, '2026-11-08 16:30:00'
    UNION ALL SELECT 4, 111, 110, 'PUNCTUALITY', 4, 'Chủ động điều chỉnh payload khớp định dạng API.', 204, 3, '2026-11-08 16:30:00'
    UNION ALL SELECT 4, 111, 110, 'COOPERATION', 5, 'Chủ động điều chỉnh payload khớp định dạng API.', 204, 3, '2026-11-08 16:30:00'

    UNION ALL SELECT 4, 1,   111, 'QUALITY', 4, 'Thiết kế bảng embedding chuẩn, hỗ trợ lookup nhanh.', 201, 4, '2026-11-08 10:30:00'
    UNION ALL SELECT 4, 1,   111, 'PUNCTUALITY', 4, 'Thiết kế bảng embedding chuẩn, hỗ trợ lookup nhanh.', 201, 4, '2026-11-08 10:30:00'
    UNION ALL SELECT 4, 1,   111, 'COOPERATION', 4, 'Thiết kế bảng embedding chuẩn, hỗ trợ lookup nhanh.', 201, 4, '2026-11-08 10:30:00'
    UNION ALL SELECT 4, 109, 111, 'QUALITY', 4, 'Xử lý triệt để lỗi charset UTF-8 trên đề cương PDF.', 201, 3, '2026-11-08 13:30:00'
    UNION ALL SELECT 4, 109, 111, 'PUNCTUALITY', 4, 'Xử lý triệt để lỗi charset UTF-8 trên đề cương PDF.', 201, 3, '2026-11-08 13:30:00'
    UNION ALL SELECT 4, 109, 111, 'COOPERATION', 5, 'Xử lý triệt để lỗi charset UTF-8 trên đề cương PDF.', 201, 3, '2026-11-08 13:30:00'
    UNION ALL SELECT 4, 112, 111, 'QUALITY', 4, 'Tối ưu tốt kết nối database từ các container ML.', 201, 3, '2026-11-08 17:00:00'
    UNION ALL SELECT 4, 112, 111, 'PUNCTUALITY', 3, 'Tối ưu tốt kết nối database từ các container ML.', 201, 3, '2026-11-08 17:00:00'
    UNION ALL SELECT 4, 112, 111, 'COOPERATION', 4, 'Tối ưu tốt kết nối database từ các container ML.', 201, 3, '2026-11-08 17:00:00'

    UNION ALL SELECT 4, 1,   112, 'QUALITY', 4, 'MLflow server chạy mượt giúp quản lý version model rất tiện.', 207, 4, '2026-11-08 11:30:00'
    UNION ALL SELECT 4, 1,   112, 'PUNCTUALITY', 3, 'MLflow server chạy mượt giúp quản lý version model rất tiện.', 207, 4, '2026-11-08 11:30:00'
    UNION ALL SELECT 4, 1,   112, 'COOPERATION', 5, 'MLflow server chạy mượt giúp quản lý version model rất tiện.', 207, 4, '2026-11-08 11:30:00'
    UNION ALL SELECT 4, 109, 112, 'QUALITY', 4, 'Hỗ trợ thiết lập GPU tunnel ổn định trong suốt kỳ training.', 207, 3, '2026-11-08 14:30:00'
    UNION ALL SELECT 4, 109, 112, 'PUNCTUALITY', 4, 'Hỗ trợ thiết lập GPU tunnel ổn định trong suốt kỳ training.', 207, 3, '2026-11-08 14:30:00'
    UNION ALL SELECT 4, 109, 112, 'COOPERATION', 4, 'Hỗ trợ thiết lập GPU tunnel ổn định trong suốt kỳ training.', 207, 3, '2026-11-08 14:30:00'
    UNION ALL SELECT 4, 110, 112, 'QUALITY', 4, 'Triển khai môi trường staging tự động khi merge code.', 207, 3, '2026-11-08 17:30:00'
    UNION ALL SELECT 4, 110, 112, 'PUNCTUALITY', 3, 'Triển khai môi trường staging tự động khi merge code.', 207, 3, '2026-11-08 17:30:00'
    UNION ALL SELECT 4, 110, 112, 'COOPERATION', 4, 'Triển khai môi trường staging tự động khi merge code.', 207, 3, '2026-11-08 17:30:00'

    -- Round 5 (EKLA Sprint 2)
    UNION ALL SELECT 5, 109, 1,   'QUALITY', 5, 'Nâng NDCG@10 vượt mục tiêu đề ra, kết quả thực nghiệm thuyết phục.', 203, 8, '2026-11-16 10:00:00'
    UNION ALL SELECT 5, 109, 1,   'PUNCTUALITY', 5, 'Nâng NDCG@10 vượt mục tiêu đề ra, kết quả thực nghiệm thuyết phục.', 203, 8, '2026-11-16 10:00:00'
    UNION ALL SELECT 5, 109, 1,   'COOPERATION', 5, 'Nâng NDCG@10 vượt mục tiêu đề ra, kết quả thực nghiệm thuyết phục.', 203, 8, '2026-11-16 10:00:00'
    UNION ALL SELECT 5, 110, 1,   'QUALITY', 5, 'Tích hợp lý do gợi ý (XAI) rất tự nhiên và giàu ngữ nghĩa.', 203, 6, '2026-11-16 12:00:00'
    UNION ALL SELECT 5, 110, 1,   'PUNCTUALITY', 5, 'Tích hợp lý do gợi ý (XAI) rất tự nhiên và giàu ngữ nghĩa.', 203, 6, '2026-11-16 12:00:00'
    UNION ALL SELECT 5, 110, 1,   'COOPERATION', 5, 'Tích hợp lý do gợi ý (XAI) rất tự nhiên và giàu ngữ nghĩa.', 203, 6, '2026-11-16 12:00:00'
    UNION ALL SELECT 5, 112, 1,   'QUALITY', 5, 'Model phục vụ nhẹ, lượng RAM tiêu thụ giảm 30%.', 203, 5, '2026-11-16 15:00:00'
    UNION ALL SELECT 5, 112, 1,   'PUNCTUALITY', 5, 'Model phục vụ nhẹ, lượng RAM tiêu thụ giảm 30%.', 203, 5, '2026-11-16 15:00:00'
    UNION ALL SELECT 5, 112, 1,   'COOPERATION', 5, 'Model phục vụ nhẹ, lượng RAM tiêu thụ giảm 30%.', 203, 5, '2026-11-16 15:00:00'

    UNION ALL SELECT 5, 1,   109, 'QUALITY', 5, 'API FastAPI xử lý concurrency tốt, latency p95 đạt 78ms.', 205, 6, '2026-11-16 10:30:00'
    UNION ALL SELECT 5, 1,   109, 'PUNCTUALITY', 5, 'API FastAPI xử lý concurrency tốt, latency p95 đạt 78ms.', 205, 6, '2026-11-16 10:30:00'
    UNION ALL SELECT 5, 1,   109, 'COOPERATION', 5, 'API FastAPI xử lý concurrency tốt, latency p95 đạt 78ms.', 205, 6, '2026-11-16 10:30:00'
    UNION ALL SELECT 5, 110, 109, 'QUALITY', 5, 'Swagger rõ ràng giúp Frontend tích hợp chỉ trong nửa buổi.', 205, 5, '2026-11-16 13:00:00'
    UNION ALL SELECT 5, 110, 109, 'PUNCTUALITY', 4, 'Swagger rõ ràng giúp Frontend tích hợp chỉ trong nửa buổi.', 205, 5, '2026-11-16 13:00:00'
    UNION ALL SELECT 5, 110, 109, 'COOPERATION', 5, 'Swagger rõ ràng giúp Frontend tích hợp chỉ trong nửa buổi.', 205, 5, '2026-11-16 13:00:00'
    UNION ALL SELECT 5, 111, 109, 'QUALITY', 4, 'Hỗ trợ review kỹ phần caching fallback khi cold-start.', 205, 4, '2026-11-16 16:00:00'
    UNION ALL SELECT 5, 111, 109, 'PUNCTUALITY', 5, 'Hỗ trợ review kỹ phần caching fallback khi cold-start.', 205, 4, '2026-11-16 16:00:00'
    UNION ALL SELECT 5, 111, 109, 'COOPERATION', 5, 'Hỗ trợ review kỹ phần caching fallback khi cold-start.', 205, 4, '2026-11-16 16:00:00'

    UNION ALL SELECT 5, 1,   110, 'QUALITY', 5, 'Đồ thị DAG mượt mà, zoom/pan rất nhạy cả trên laptop yếu.', 204, 6, '2026-11-16 11:00:00'
    UNION ALL SELECT 5, 1,   110, 'PUNCTUALITY', 4, 'Đồ thị DAG mượt mà, zoom/pan rất nhạy cả trên laptop yếu.', 204, 6, '2026-11-16 11:00:00'
    UNION ALL SELECT 5, 1,   110, 'COOPERATION', 5, 'Đồ thị DAG mượt mà, zoom/pan rất nhạy cả trên laptop yếu.', 204, 6, '2026-11-16 11:00:00'
    UNION ALL SELECT 5, 109, 110, 'QUALITY', 4, 'Tích hợp XAI tooltips hợp lý, giao diện hiện đại.', 204, 4, '2026-11-16 13:30:00'
    UNION ALL SELECT 5, 109, 110, 'PUNCTUALITY', 4, 'Tích hợp XAI tooltips hợp lý, giao diện hiện đại.', 204, 4, '2026-11-16 13:30:00'
    UNION ALL SELECT 5, 109, 110, 'COOPERATION', 5, 'Tích hợp XAI tooltips hợp lý, giao diện hiện đại.', 204, 4, '2026-11-16 13:30:00'
    UNION ALL SELECT 5, 112, 110, 'QUALITY', 5, 'Hoàn thành bundle UI không có lỗi console.', 204, 4, '2026-11-16 16:30:00'
    UNION ALL SELECT 5, 112, 110, 'PUNCTUALITY', 4, 'Hoàn thành bundle UI không có lỗi console.', 204, 4, '2026-11-16 16:30:00'
    UNION ALL SELECT 5, 112, 110, 'COOPERATION', 4, 'Hoàn thành bundle UI không có lỗi console.', 204, 4, '2026-11-16 16:30:00'

    UNION ALL SELECT 5, 1,   111, 'QUALITY', 5, 'Dù bận thi AWS nhưng vẫn hoàn thành phần OCR song song vượt kỳ vọng.', 201, 5, '2026-11-16 11:30:00'
    UNION ALL SELECT 5, 1,   111, 'PUNCTUALITY', 4, 'Dù bận thi AWS nhưng vẫn hoàn thành phần OCR song song vượt kỳ vọng.', 201, 5, '2026-11-16 11:30:00'
    UNION ALL SELECT 5, 1,   111, 'COOPERATION', 5, 'Dù bận thi AWS nhưng vẫn hoàn thành phần OCR song song vượt kỳ vọng.', 201, 5, '2026-11-16 11:30:00'
    UNION ALL SELECT 5, 109, 111, 'QUALITY', 4, 'Lọc stopwords chuẩn xác giúp giảm nhiễu cho bước nhúng vector.', 201, 4, '2026-11-16 14:00:00'
    UNION ALL SELECT 5, 109, 111, 'PUNCTUALITY', 4, 'Lọc stopwords chuẩn xác giúp giảm nhiễu cho bước nhúng vector.', 201, 4, '2026-11-16 14:00:00'
    UNION ALL SELECT 5, 109, 111, 'COOPERATION', 5, 'Lọc stopwords chuẩn xác giúp giảm nhiễu cho bước nhúng vector.', 201, 4, '2026-11-16 14:00:00'
    UNION ALL SELECT 5, 112, 111, 'QUALITY', 4, 'Phối hợp cấu hình worker pool hợp lý không bị tràn RAM.', 201, 4, '2026-11-16 17:00:00'
    UNION ALL SELECT 5, 112, 111, 'PUNCTUALITY', 4, 'Phối hợp cấu hình worker pool hợp lý không bị tràn RAM.', 201, 4, '2026-11-16 17:00:00'
    UNION ALL SELECT 5, 112, 111, 'COOPERATION', 4, 'Phối hợp cấu hình worker pool hợp lý không bị tràn RAM.', 201, 4, '2026-11-16 17:00:00'

    UNION ALL SELECT 5, 1,   112, 'QUALITY', 4, 'Dashboard Grafana hữu ích, cần bổ sung sớm metric GPU ngay từ đầu.', 202, 4, '2026-11-16 12:00:00'
    UNION ALL SELECT 5, 1,   112, 'PUNCTUALITY', 3, 'Dashboard Grafana hữu ích, cần bổ sung sớm metric GPU ngay từ đầu.', 202, 4, '2026-11-16 12:00:00'
    UNION ALL SELECT 5, 1,   112, 'COOPERATION', 4, 'Dashboard Grafana hữu ích, cần bổ sung sớm metric GPU ngay từ đầu.', 202, 4, '2026-11-16 12:00:00'
    UNION ALL SELECT 5, 109, 112, 'QUALITY', 4, 'Cảnh báo Telegram hoạt động chính xác khi tải tăng cao.', 202, 3, '2026-11-16 14:30:00'
    UNION ALL SELECT 5, 109, 112, 'PUNCTUALITY', 3, 'Cảnh báo Telegram hoạt động chính xác khi tải tăng cao.', 202, 3, '2026-11-16 14:30:00'
    UNION ALL SELECT 5, 109, 112, 'COOPERATION', 5, 'Cảnh báo Telegram hoạt động chính xác khi tải tăng cao.', 202, 3, '2026-11-16 14:30:00'
    UNION ALL SELECT 5, 111, 112, 'QUALITY', 4, 'Tài liệu deploy Cloud Run dễ làm theo.', 202, 3, '2026-11-16 17:30:00'
    UNION ALL SELECT 5, 111, 112, 'PUNCTUALITY', 3, 'Tài liệu deploy Cloud Run dễ làm theo.', 202, 3, '2026-11-16 17:30:00'
    UNION ALL SELECT 5, 111, 112, 'COOPERATION', 4, 'Tài liệu deploy Cloud Run dễ làm theo.', 202, 3, '2026-11-16 17:30:00'

    -- ========== TEAM 3 (Rounds 6, 7 - KINGSHA): >= 3 reviewers cho cả 5 thành viên (1, 109, 110, 111, 113) ==========
    -- Round 6
    UNION ALL SELECT 6, 109, 1,   'QUALITY', 5, 'Audit Trail HIPAA chặt chẽ, đáp ứng đầy đủ yêu cầu kiểm toán y tế.', 306, 7, '2026-11-10 09:00:00'
    UNION ALL SELECT 6, 109, 1,   'PUNCTUALITY', 5, 'Audit Trail HIPAA chặt chẽ, đáp ứng đầy đủ yêu cầu kiểm toán y tế.', 306, 7, '2026-11-10 09:00:00'
    UNION ALL SELECT 6, 109, 1,   'COOPERATION', 5, 'Audit Trail HIPAA chặt chẽ, đáp ứng đầy đủ yêu cầu kiểm toán y tế.', 306, 7, '2026-11-10 09:00:00'
    UNION ALL SELECT 6, 111, 1,   'QUALITY', 5, 'Trigger ký số bất biến giúp bảng lịch sử cấp phát an toàn tuyệt đối.', 306, 6, '2026-11-10 11:30:00'
    UNION ALL SELECT 6, 111, 1,   'PUNCTUALITY', 5, 'Trigger ký số bất biến giúp bảng lịch sử cấp phát an toàn tuyệt đối.', 306, 6, '2026-11-10 11:30:00'
    UNION ALL SELECT 6, 111, 1,   'COOPERATION', 5, 'Trigger ký số bất biến giúp bảng lịch sử cấp phát an toàn tuyệt đối.', 306, 6, '2026-11-10 11:30:00'
    UNION ALL SELECT 6, 113, 1,   'QUALITY', 5, 'Bảng kiểm 18 tiêu chí HIPAA giúp QA viết test bảo mật rất nhanh.', 306, 5, '2026-11-10 14:30:00'
    UNION ALL SELECT 6, 113, 1,   'PUNCTUALITY', 5, 'Bảng kiểm 18 tiêu chí HIPAA giúp QA viết test bảo mật rất nhanh.', 306, 5, '2026-11-10 14:30:00'
    UNION ALL SELECT 6, 113, 1,   'COOPERATION', 5, 'Bảng kiểm 18 tiêu chí HIPAA giúp QA viết test bảo mật rất nhanh.', 306, 5, '2026-11-10 14:30:00'

    UNION ALL SELECT 6, 1,   109, 'QUALITY', 5, 'Benchmark 500 req/s đạt kết quả ổn định, index chuẩn.', 308, 5, '2026-11-10 09:30:00'
    UNION ALL SELECT 6, 1,   109, 'PUNCTUALITY', 5, 'Benchmark 500 req/s đạt kết quả ổn định, index chuẩn.', 308, 5, '2026-11-10 09:30:00'
    UNION ALL SELECT 6, 1,   109, 'COOPERATION', 4, 'Benchmark 500 req/s đạt kết quả ổn định, index chuẩn.', 308, 5, '2026-11-10 09:30:00'
    UNION ALL SELECT 6, 110, 109, 'QUALITY', 4, 'Tư vấn cấu trúc truy vấn hợp lý cho màn hình tra cứu thuốc.', 308, 4, '2026-11-10 12:00:00'
    UNION ALL SELECT 6, 110, 109, 'PUNCTUALITY', 4, 'Tư vấn cấu trúc truy vấn hợp lý cho màn hình tra cứu thuốc.', 308, 4, '2026-11-10 12:00:00'
    UNION ALL SELECT 6, 110, 109, 'COOPERATION', 5, 'Tư vấn cấu trúc truy vấn hợp lý cho màn hình tra cứu thuốc.', 308, 4, '2026-11-10 12:00:00'
    UNION ALL SELECT 6, 113, 109, 'QUALITY', 4, 'Xử lý nhanh vấn đề chứng chỉ SSL trên môi trường kiểm thử.', 308, 3, '2026-11-10 15:00:00'
    UNION ALL SELECT 6, 113, 109, 'PUNCTUALITY', 5, 'Xử lý nhanh vấn đề chứng chỉ SSL trên môi trường kiểm thử.', 308, 3, '2026-11-10 15:00:00'
    UNION ALL SELECT 6, 113, 109, 'COOPERATION', 4, 'Xử lý nhanh vấn đề chứng chỉ SSL trên môi trường kiểm thử.', 308, 3, '2026-11-10 15:00:00'

    UNION ALL SELECT 6, 1,   110, 'QUALITY', 4, 'UI Portal tra cứu QR thân thiện trên điện thoại.', 307, 4, '2026-11-10 10:00:00'
    UNION ALL SELECT 6, 1,   110, 'PUNCTUALITY', 4, 'UI Portal tra cứu QR thân thiện trên điện thoại.', 307, 4, '2026-11-10 10:00:00'
    UNION ALL SELECT 6, 1,   110, 'COOPERATION', 5, 'UI Portal tra cứu QR thân thiện trên điện thoại.', 307, 4, '2026-11-10 10:00:00'
    UNION ALL SELECT 6, 109, 110, 'QUALITY', 4, 'Bố cục rõ ràng, dễ nhìn cho nhiều lứa tuổi bệnh nhân.', 307, 4, '2026-11-10 12:30:00'
    UNION ALL SELECT 6, 109, 110, 'PUNCTUALITY', 4, 'Bố cục rõ ràng, dễ nhìn cho nhiều lứa tuổi bệnh nhân.', 307, 4, '2026-11-10 12:30:00'
    UNION ALL SELECT 6, 109, 110, 'COOPERATION', 4, 'Bố cục rõ ràng, dễ nhìn cho nhiều lứa tuổi bệnh nhân.', 307, 4, '2026-11-10 12:30:00'
    UNION ALL SELECT 6, 113, 110, 'QUALITY', 5, 'Phối hợp chỉnh sửa nhanh kích thước font cảnh báo.', 307, 3, '2026-11-10 15:30:00'
    UNION ALL SELECT 6, 113, 110, 'PUNCTUALITY', 4, 'Phối hợp chỉnh sửa nhanh kích thước font cảnh báo.', 307, 3, '2026-11-10 15:30:00'
    UNION ALL SELECT 6, 113, 110, 'COOPERATION', 5, 'Phối hợp chỉnh sửa nhanh kích thước font cảnh báo.', 307, 3, '2026-11-10 15:30:00'

    UNION ALL SELECT 6, 1,   111, 'QUALITY', 5, 'Chuẩn hóa 5.000 hoạt chất theo Dược điển rất công phu và chuẩn xác.', 305, 6, '2026-11-10 10:30:00'
    UNION ALL SELECT 6, 1,   111, 'PUNCTUALITY', 4, 'Chuẩn hóa 5.000 hoạt chất theo Dược điển rất công phu và chuẩn xác.', 305, 6, '2026-11-10 10:30:00'
    UNION ALL SELECT 6, 1,   111, 'COOPERATION', 5, 'Chuẩn hóa 5.000 hoạt chất theo Dược điển rất công phu và chuẩn xác.', 305, 6, '2026-11-10 10:30:00'
    UNION ALL SELECT 6, 109, 111, 'QUALITY', 5, 'Schema phân cấp mã ATC tối ưu cho tìm kiếm toàn văn.', 305, 4, '2026-11-10 13:00:00'
    UNION ALL SELECT 6, 109, 111, 'PUNCTUALITY', 4, 'Schema phân cấp mã ATC tối ưu cho tìm kiếm toàn văn.', 305, 4, '2026-11-10 13:00:00'
    UNION ALL SELECT 6, 109, 111, 'COOPERATION', 5, 'Schema phân cấp mã ATC tối ưu cho tìm kiếm toàn văn.', 305, 4, '2026-11-10 13:00:00'
    UNION ALL SELECT 6, 113, 111, 'QUALITY', 4, 'Hỗ trợ kiểm tra đầy đủ các trường biệt dược ngoại nhập.', 305, 4, '2026-11-10 16:00:00'
    UNION ALL SELECT 6, 113, 111, 'PUNCTUALITY', 4, 'Hỗ trợ kiểm tra đầy đủ các trường biệt dược ngoại nhập.', 305, 4, '2026-11-10 16:00:00'
    UNION ALL SELECT 6, 113, 111, 'COOPERATION', 5, 'Hỗ trợ kiểm tra đầy đủ các trường biệt dược ngoại nhập.', 305, 4, '2026-11-10 16:00:00'

    UNION ALL SELECT 6, 1,   113, 'QUALITY', 5, 'Phát hiện lỗi làm tròn liều lượng nhi khoa trước khi lên production, rất đáng khen.', 304, 8, '2026-11-10 11:00:00'
    UNION ALL SELECT 6, 1,   113, 'PUNCTUALITY', 5, 'Phát hiện lỗi làm tròn liều lượng nhi khoa trước khi lên production, rất đáng khen.', 304, 8, '2026-11-10 11:00:00'
    UNION ALL SELECT 6, 1,   113, 'COOPERATION', 5, 'Phát hiện lỗi làm tròn liều lượng nhi khoa trước khi lên production, rất đáng khen.', 304, 8, '2026-11-10 11:00:00'
    UNION ALL SELECT 6, 109, 113, 'QUALITY', 5, 'Ma trận truy xuất kiểm thử đạt tiêu chuẩn nghiệm thu y tế.', 304, 5, '2026-11-10 13:30:00'
    UNION ALL SELECT 6, 109, 113, 'PUNCTUALITY', 5, 'Ma trận truy xuất kiểm thử đạt tiêu chuẩn nghiệm thu y tế.', 304, 5, '2026-11-10 13:30:00'
    UNION ALL SELECT 6, 109, 113, 'COOPERATION', 5, 'Ma trận truy xuất kiểm thử đạt tiêu chuẩn nghiệm thu y tế.', 304, 5, '2026-11-10 13:30:00'
    UNION ALL SELECT 6, 110, 113, 'QUALITY', 5, 'Góp ý UI chính xác, luôn theo sát luồng trải nghiệm người dùng.', 304, 5, '2026-11-10 16:30:00'
    UNION ALL SELECT 6, 110, 113, 'PUNCTUALITY', 5, 'Góp ý UI chính xác, luôn theo sát luồng trải nghiệm người dùng.', 304, 5, '2026-11-10 16:30:00'
    UNION ALL SELECT 6, 110, 113, 'COOPERATION', 5, 'Góp ý UI chính xác, luôn theo sát luồng trải nghiệm người dùng.', 304, 5, '2026-11-10 16:30:00'

    -- Round 7 (KINGSHA Sprint 2)
    UNION ALL SELECT 7, 109, 1,   'QUALITY', 5, 'Triển khai RBAC HIPAA và giám sát cảnh báo tồn kho rất chuẩn.', 2, 7, '2026-11-16 09:00:00'
    UNION ALL SELECT 7, 109, 1,   'PUNCTUALITY', 5, 'Triển khai RBAC HIPAA và giám sát cảnh báo tồn kho rất chuẩn.', 2, 7, '2026-11-16 09:00:00'
    UNION ALL SELECT 7, 109, 1,   'COOPERATION', 5, 'Triển khai RBAC HIPAA và giám sát cảnh báo tồn kho rất chuẩn.', 2, 7, '2026-11-16 09:00:00'
    UNION ALL SELECT 7, 110, 1,   'QUALITY', 5, 'Biểu đồ xuất nhập FIFO/FEFO giúp dược sĩ nắm nhanh lô sắp hết hạn.', 1, 6, '2026-11-16 11:30:00'
    UNION ALL SELECT 7, 110, 1,   'PUNCTUALITY', 5, 'Biểu đồ xuất nhập FIFO/FEFO giúp dược sĩ nắm nhanh lô sắp hết hạn.', 1, 6, '2026-11-16 11:30:00'
    UNION ALL SELECT 7, 110, 1,   'COOPERATION', 5, 'Biểu đồ xuất nhập FIFO/FEFO giúp dược sĩ nắm nhanh lô sắp hết hạn.', 1, 6, '2026-11-16 11:30:00'
    UNION ALL SELECT 7, 113, 1,   'QUALITY', 5, 'Phân quyền chặt chẽ, tất cả case truy cập trái phép đều bị chặn.', 2, 5, '2026-11-16 14:30:00'
    UNION ALL SELECT 7, 113, 1,   'PUNCTUALITY', 5, 'Phân quyền chặt chẽ, tất cả case truy cập trái phép đều bị chặn.', 2, 5, '2026-11-16 14:30:00'
    UNION ALL SELECT 7, 113, 1,   'COOPERATION', 5, 'Phân quyền chặt chẽ, tất cả case truy cập trái phép đều bị chặn.', 2, 5, '2026-11-16 14:30:00'

    UNION ALL SELECT 7, 1,   109, 'QUALITY', 5, 'Hệ thống sao lưu mã hóa AES-256 vận hành ổn định, khôi phục nhanh.', 302, 5, '2026-11-16 09:30:00'
    UNION ALL SELECT 7, 1,   109, 'PUNCTUALITY', 5, 'Hệ thống sao lưu mã hóa AES-256 vận hành ổn định, khôi phục nhanh.', 302, 5, '2026-11-16 09:30:00'
    UNION ALL SELECT 7, 1,   109, 'COOPERATION', 5, 'Hệ thống sao lưu mã hóa AES-256 vận hành ổn định, khôi phục nhanh.', 302, 5, '2026-11-16 09:30:00'
    UNION ALL SELECT 7, 111, 109, 'QUALITY', 4, 'Hỗ trợ giải quyết nhanh hiệu năng xuất PDF cho đơn nhiều trang.', 302, 4, '2026-11-16 12:00:00'
    UNION ALL SELECT 7, 111, 109, 'PUNCTUALITY', 4, 'Hỗ trợ giải quyết nhanh hiệu năng xuất PDF cho đơn nhiều trang.', 302, 4, '2026-11-16 12:00:00'
    UNION ALL SELECT 7, 111, 109, 'COOPERATION', 5, 'Hỗ trợ giải quyết nhanh hiệu năng xuất PDF cho đơn nhiều trang.', 302, 4, '2026-11-16 12:00:00'
    UNION ALL SELECT 7, 113, 109, 'QUALITY', 4, 'Cơ chế failover offline kho hoạt động tin cậy.', 302, 3, '2026-11-16 15:00:00'
    UNION ALL SELECT 7, 113, 109, 'PUNCTUALITY', 4, 'Cơ chế failover offline kho hoạt động tin cậy.', 302, 3, '2026-11-16 15:00:00'
    UNION ALL SELECT 7, 113, 109, 'COOPERATION', 5, 'Cơ chế failover offline kho hoạt động tin cậy.', 302, 3, '2026-11-16 15:00:00'

    UNION ALL SELECT 7, 1,   110, 'QUALITY', 5, 'Modal cảnh báo tương tác thuốc trình bày trực quan, dễ nhận biết mức độ.', 303, 6, '2026-11-16 10:00:00'
    UNION ALL SELECT 7, 1,   110, 'PUNCTUALITY', 4, 'Modal cảnh báo tương tác thuốc trình bày trực quan, dễ nhận biết mức độ.', 303, 6, '2026-11-16 10:00:00'
    UNION ALL SELECT 7, 1,   110, 'COOPERATION', 5, 'Modal cảnh báo tương tác thuốc trình bày trực quan, dễ nhận biết mức độ.', 303, 6, '2026-11-16 10:00:00'
    UNION ALL SELECT 7, 109, 110, 'QUALITY', 4, 'Tích hợp luồng kê đơn bác sĩ mượt, không giật lag.', 303, 4, '2026-11-16 12:30:00'
    UNION ALL SELECT 7, 109, 110, 'PUNCTUALITY', 4, 'Tích hợp luồng kê đơn bác sĩ mượt, không giật lag.', 303, 4, '2026-11-16 12:30:00'
    UNION ALL SELECT 7, 109, 110, 'COOPERATION', 5, 'Tích hợp luồng kê đơn bác sĩ mượt, không giật lag.', 303, 4, '2026-11-16 12:30:00'
    UNION ALL SELECT 7, 111, 110, 'QUALITY', 5, 'Phối hợp đồng bộ trạng thái cảnh báo rất ăn ý.', 303, 4, '2026-11-16 15:30:00'
    UNION ALL SELECT 7, 111, 110, 'PUNCTUALITY', 4, 'Phối hợp đồng bộ trạng thái cảnh báo rất ăn ý.', 303, 4, '2026-11-16 15:30:00'
    UNION ALL SELECT 7, 111, 110, 'COOPERATION', 5, 'Phối hợp đồng bộ trạng thái cảnh báo rất ăn ý.', 303, 4, '2026-11-16 15:30:00'

    UNION ALL SELECT 7, 1,   111, 'QUALITY', 4, 'API tra cứu tương tác < 25ms rất ấn tượng, phần đọc mã lô nhập ngoại cần hoàn thiện sớm.', 301, 5, '2026-11-16 10:30:00'
    UNION ALL SELECT 7, 1,   111, 'PUNCTUALITY', 3, 'API tra cứu tương tác < 25ms rất ấn tượng, phần đọc mã lô nhập ngoại cần hoàn thiện sớm.', 301, 5, '2026-11-16 10:30:00'
    UNION ALL SELECT 7, 1,   111, 'COOPERATION', 4, 'API tra cứu tương tác < 25ms rất ấn tượng, phần đọc mã lô nhập ngoại cần hoàn thiện sớm.', 301, 5, '2026-11-16 10:30:00'
    UNION ALL SELECT 7, 109, 111, 'QUALITY', 4, 'Xây dựng tốt cặp khóa đối chiếu hoạt chất xung đột.', 301, 4, '2026-11-16 13:00:00'
    UNION ALL SELECT 7, 109, 111, 'PUNCTUALITY', 4, 'Xây dựng tốt cặp khóa đối chiếu hoạt chất xung đột.', 301, 4, '2026-11-16 13:00:00'
    UNION ALL SELECT 7, 109, 111, 'COOPERATION', 4, 'Xây dựng tốt cặp khóa đối chiếu hoạt chất xung đột.', 301, 4, '2026-11-16 13:00:00'
    UNION ALL SELECT 7, 113, 111, 'QUALITY', 4, 'Tạo bộ test giả lập kê đơn đầy đủ cho QA nghiệm thu.', 301, 4, '2026-11-16 16:00:00'
    UNION ALL SELECT 7, 113, 111, 'PUNCTUALITY', 3, 'Tạo bộ test giả lập kê đơn đầy đủ cho QA nghiệm thu.', 301, 4, '2026-11-16 16:00:00'
    UNION ALL SELECT 7, 113, 111, 'COOPERATION', 5, 'Tạo bộ test giả lập kê đơn đầy đủ cho QA nghiệm thu.', 301, 4, '2026-11-16 16:00:00'

    UNION ALL SELECT 7, 1,   113, 'QUALITY', 5, 'Kiểm thử toàn diện 40 kịch bản y tế, chất lượng đầu ra rất an tâm.', 304, 7, '2026-11-16 11:00:00'
    UNION ALL SELECT 7, 1,   113, 'PUNCTUALITY', 5, 'Kiểm thử toàn diện 40 kịch bản y tế, chất lượng đầu ra rất an tâm.', 304, 7, '2026-11-16 11:00:00'
    UNION ALL SELECT 7, 1,   113, 'COOPERATION', 5, 'Kiểm thử toàn diện 40 kịch bản y tế, chất lượng đầu ra rất an tâm.', 304, 7, '2026-11-16 11:00:00'
    UNION ALL SELECT 7, 109, 113, 'QUALITY', 5, 'Báo cáo thẩm định phần mềm rõ ràng, theo sát phản hồi dược sĩ.', 304, 5, '2026-11-16 13:30:00'
    UNION ALL SELECT 7, 109, 113, 'PUNCTUALITY', 5, 'Báo cáo thẩm định phần mềm rõ ràng, theo sát phản hồi dược sĩ.', 304, 5, '2026-11-16 13:30:00'
    UNION ALL SELECT 7, 109, 113, 'COOPERATION', 5, 'Báo cáo thẩm định phần mềm rõ ràng, theo sát phản hồi dược sĩ.', 304, 5, '2026-11-16 13:30:00'
    UNION ALL SELECT 7, 110, 113, 'QUALITY', 5, 'Phối hợp chặt với FE kiểm tra mẫu đơn thuốc PDF đạt chuẩn.', 304, 5, '2026-11-16 16:30:00'
    UNION ALL SELECT 7, 110, 113, 'PUNCTUALITY', 5, 'Phối hợp chặt với FE kiểm tra mẫu đơn thuốc PDF đạt chuẩn.', 304, 5, '2026-11-16 16:30:00'
    UNION ALL SELECT 7, 110, 113, 'COOPERATION', 5, 'Phối hợp chặt với FE kiểm tra mẫu đơn thuốc PDF đạt chuẩn.', 304, 5, '2026-11-16 16:30:00'
) src
WHERE NOT EXISTS (
    SELECT 1 FROM review_submissions rs
    WHERE rs.review_round_id = src.round_id
      AND rs.reviewer_id = src.reviewer_id
      AND rs.reviewee_id = src.reviewee_id
      AND rs.criterion = src.criterion
);

-- -----------------------------------------------------------------------------
-- 8. Chi phí & Chia sẻ chi phí dự án (expenses + splits) & Cảnh báo (alerts)
-- -----------------------------------------------------------------------------
INSERT INTO expenses (team_id, paid_by_member_id, title, description, amount, currency, split_method, expense_date, created_at, updated_at)
SELECT src.team_id, tm.id, src.title, src.description, src.amount, 'VND', 'EQUAL', src.expense_date, NOW(), NOW()
FROM (
    SELECT 1 AS team_id, 1 AS user_id, 'Tên miền & Cloud VPS Staging EduConnect (Tháng 11)' AS title, 'Chi phí duy trì server MariaDB và frontend Nginx cho demo nhóm' AS description, 600000.00 AS amount, '2026-11-05' AS expense_date
    UNION ALL SELECT 1, 110, 'Tài nguyên Icon & Bộ Font Figma Pro EduConnect', 'Mua bản quyền icon pack và tài nguyên trình bày báo cáo UI/UX', 300000.00, '2026-11-10'
    UNION ALL SELECT 2, 1,   'Thuê GPU Cloud huấn luyện LightGCN (EKLA)', 'Phiên chạy T4 GPU trên Colab Pro / Cloud trong 2 tuần thực nghiệm', 500000.00, '2026-11-08'
    UNION ALL SELECT 2, 112, 'Lưu trữ Object Storage cho Artifact MLflow', 'Dung lượng bucket lưu model checkpoints & embeddings', 250000.00, '2026-11-14'
    UNION ALL SELECT 3, 1,   'In ấn tài liệu kiểm định & Hồ sơ nghiệm thu KINGSHA', 'In báo cáo UAT chuẩn y tế và tài liệu bàn giao đồ án', 400000.00, '2026-11-12'
    UNION ALL SELECT 3, 113, 'Bồi dưỡng phỏng vấn Dược sĩ kiểm thử thực tế', 'Chi phí thử nghiệm thực địa luồng kê đơn & cảnh báo tương tác', 500000.00, '2026-11-15'
) src
JOIN team_members tm ON tm.team_id = src.team_id AND tm.user_id = src.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM expenses e
    WHERE e.team_id = src.team_id AND e.title = src.title
);

-- Chia đều mỗi khoản chi cho toàn bộ thành viên trong team tương ứng
INSERT INTO splits (expense_id, team_member_id, amount, created_at, updated_at)
SELECT
    e.id,
    tm.id,
    ROUND(e.amount / cnt.member_cnt, 2),
    NOW(),
    NOW()
FROM expenses e
JOIN (
    SELECT team_id, COUNT(*) AS member_cnt
    FROM team_members
    GROUP BY team_id
) cnt ON cnt.team_id = e.team_id
JOIN team_members tm ON tm.team_id = e.team_id
WHERE NOT EXISTS (
    SELECT 1 FROM splits s
    WHERE s.expense_id = e.id AND s.team_member_id = tm.id
);

-- Bổ sung cảnh báo thực tế cho Team 2 & Team 3
INSERT INTO alerts (team_id, sprint_id, user_id, alert_type, severity, message, resolved, created_at, updated_at)
SELECT src.team_id, src.sprint_id, src.user_id, src.alert_type, src.severity, src.message, 0, NOW(), NOW()
FROM (
    SELECT 2 AS team_id, 5 AS sprint_id, 111 AS user_id, 'AVAILABILITY_ADJUSTED' AS alert_type, 'INFO' AS severity, 'Lê Quốc Bảo có giảm khả dụng a_i = 0.85 trong Sprint 5 (thi chứng chỉ AWS đã được duyệt).' AS message
    UNION ALL SELECT 2, 5, 112, 'OVERDUE_WARNING', 'WARNING', 'Thẻ "Thiết lập Grafana Dashboard" có 1 lượt mở lại (rework) và trễ nhẹ 1 ngày ở Sprint 1.'
    UNION ALL SELECT 3, 7, 1,   'MILESTONE_PROGRESS', 'INFO', 'Audit Trail chuẩn HIPAA và kiểm thử UAT đạt 100% tiêu chí an toàn dữ liệu.'
    UNION ALL SELECT 3, 7, 111, 'OVERDUE_WARNING', 'WARNING', 'Thẻ "Tích hợp máy quét mã vạch GS1-128" vừa được mở lại để bổ sung chuẩn lô nhập ngoại.'
) src
WHERE NOT EXISTS (
    SELECT 1 FROM alerts a
    WHERE a.team_id = src.team_id
      AND a.user_id = src.user_id
      AND a.alert_type = src.alert_type
      AND a.message = src.message
);

-- -----------------------------------------------------------------------------
-- 9. Xóa dòng điểm cũ lệch và chạy lại Stored Procedure tính điểm 4 tầng cho cả 7 Sprint
-- -----------------------------------------------------------------------------
DELETE FROM contribution_scores;

CALL sp_calculate_contribution_scores(1, 1);
CALL sp_calculate_contribution_scores(1, 2);
CALL sp_calculate_contribution_scores(1, 3);
CALL sp_calculate_contribution_scores(2, 4);
CALL sp_calculate_contribution_scores(2, 5);
CALL sp_calculate_contribution_scores(3, 6);
CALL sp_calculate_contribution_scores(3, 7);
