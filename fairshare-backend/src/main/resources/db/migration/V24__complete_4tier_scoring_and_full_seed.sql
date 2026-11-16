-- =============================================================================
-- V24: Hoàn thiện Stored Procedure Mô hình 4 tầng (D1-D4, Sigmoid, CI, Anomaly)
--      và Seed dữ liệu đầy đủ, chuẩn hóa cho Dự án Demo EduConnect (Team 1)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Nâng cấp sp_calculate_contribution_scores: tính đầy đủ D1, D2, D3, D4,
--    Composite Sigmoid, CI 95%, Khoảng cách tâm nhóm, Cờ ngờ vực & Bằng chứng
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

    -- Thống kê Median & MAD cho tầng 2 (Robust Z-Score)
    DECLARE v_med_sp DOUBLE DEFAULT 0.0;
    DECLARE v_mad_sp DOUBLE DEFAULT 0.0;
    DECLARE v_med_cards DOUBLE DEFAULT 0.0;
    DECLARE v_mad_cards DOUBLE DEFAULT 0.0;
    DECLARE v_med_manual DOUBLE DEFAULT 0.0;
    DECLARE v_mad_manual DOUBLE DEFAULT 0.0;
    DECLARE v_med_ontime DOUBLE DEFAULT 1.0;
    DECLARE v_mad_ontime DOUBLE DEFAULT 0.0;
    DECLARE v_med_rework DOUBLE DEFAULT 0.0;
    DECLARE v_mad_rework DOUBLE DEFAULT 0.0;
    DECLARE v_med_delay DOUBLE DEFAULT 0.0;
    DECLARE v_mad_delay DOUBLE DEFAULT 0.0;
    DECLARE v_med_collab DOUBLE DEFAULT 0.0;
    DECLARE v_mad_collab DOUBLE DEFAULT 0.0;
    DECLARE v_med_peer DOUBLE DEFAULT 0.0;
    DECLARE v_mad_peer DOUBLE DEFAULT 0.0;

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
            MAX(CASE WHEN 1 = 1 THEN rr.min_submissions_required ELSE 3 END) AS min_req,
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
            trello_score = VALUES(trello_score),
            manual_score = VALUES(manual_score),
            activity_pct = VALUES(activity_pct),
            peer_pct = VALUES(peer_pct),
            final_pct = VALUES(final_pct),
            d1_output = VALUES(d1_output),
            d2_reliability = VALUES(d2_reliability),
            d3_collaboration = VALUES(d3_collaboration),
            d4_peer = VALUES(d4_peer),
            composite_score = VALUES(composite_score),
            availability_factor = VALUES(availability_factor),
            confidence_interval_low = VALUES(confidence_interval_low),
            confidence_interval_high = VALUES(confidence_interval_high),
            distance_to_center = VALUES(distance_to_center),
            is_suspicious = VALUES(is_suspicious),
            has_sufficient_evidence = VALUES(has_sufficient_evidence),
            peer_included = VALUES(peer_included),
            has_sufficient_data = VALUES(has_sufficient_data),
            total_events_used = VALUES(total_events_used),
            calculated_at = NOW(),
            computed_at = NOW(),
            score = VALUES(score),
            percentage = VALUES(percentage);

        DROP TEMPORARY TABLE IF EXISTS tmp_member_scores;
        LEAVE proc_main;
    END IF;

    -- Bước 3: Tính Median và MAD cho từng đặc trưng (khi số thành viên > 1)
    IF v_member_count > 1 THEN
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

        SELECT AVG(val) INTO v_med_peer FROM (
            SELECT peer_avg AS val, ROW_NUMBER() OVER (ORDER BY peer_avg) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));
        SELECT AVG(dev) INTO v_mad_peer FROM (
            SELECT ABS(peer_avg - v_med_peer) AS dev, ROW_NUMBER() OVER (ORDER BY ABS(peer_avg - v_med_peer)) AS rn, COUNT(*) OVER () AS cnt FROM tmp_member_scores
        ) r WHERE rn IN (FLOOR((cnt + 1) / 2), CEIL((cnt + 1) / 2));

        -- Tính Robust Z-score kẹp biên [-3, 3] (đồng bộ với ScoringEngine.java)
        UPDATE tmp_member_scores
        SET z_sp     = GREATEST(-3.0, LEAST(3.0, (ln_sp - v_med_sp) / (1.4826 * COALESCE(v_mad_sp, 0.0) + v_eps))),
            z_cards  = GREATEST(-3.0, LEAST(3.0, (ln_cards - v_med_cards) / (1.4826 * COALESCE(v_mad_cards, 0.0) + v_eps))),
            z_manual = GREATEST(-3.0, LEAST(3.0, (ln_manual - v_med_manual) / (1.4826 * COALESCE(v_mad_manual, 0.0) + v_eps))),
            z_ontime = GREATEST(-3.0, LEAST(3.0, (on_time_rate - v_med_ontime) / (1.4826 * COALESCE(v_mad_ontime, 0.0) + v_eps))),
            z_rework = GREATEST(-3.0, LEAST(3.0, (ln_rework - v_med_rework) / (1.4826 * COALESCE(v_mad_rework, 0.0) + v_eps))),
            z_delay  = GREATEST(-3.0, LEAST(3.0, (ln_delay - v_med_delay) / (1.4826 * COALESCE(v_mad_delay, 0.0) + v_eps))),
            z_collab = GREATEST(-3.0, LEAST(3.0, (ln_collab - v_med_collab) / (1.4826 * COALESCE(v_mad_collab, 0.0) + v_eps))),
            z_peer   = GREATEST(-3.0, LEAST(3.0, (peer_avg - v_med_peer) / (1.4826 * COALESCE(v_mad_peer, 0.0) + v_eps)));
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
-- 2. Seed dữ liệu hoàn chỉnh & đồng bộ cho Dự án Demo EduConnect (Team 1)
-- -----------------------------------------------------------------------------

-- 2a. Ghi nhận Consent Nghị định 13 cho toàn bộ 5 thành viên (100% Consent)
INSERT INTO consents (team_id, user_id, agreed, agreed_at, created_at, updated_at) VALUES
(1, 109, 1, '2026-10-15 08:00:00', NOW(), NOW()),
(1, 110, 1, '2026-10-15 08:15:00', NOW(), NOW()),
(1, 111, 1, '2026-10-15 08:30:00', NOW(), NOW()),
(1, 112, 1, '2026-10-15 08:45:00', NOW(), NOW()),
(1, 113, 1, '2026-10-15 09:00:00', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    agreed    = 1,
    agreed_at = COALESCE(agreed_at, VALUES(agreed_at));

-- 2b. Bổ sung thẻ công việc cho cột To Do (1), In Progress (2), Review (3)
INSERT INTO cards (id, board_id, column_id, title, description, assignee_id, story_points, difficulty_level, position, due_date, created_at, updated_at) VALUES
(101, 1, 1, 'Tích hợp cổng thanh toán VNPay Sandbox', 'Kết nối API thanh toán học phí tài liệu và tạo webhook phản hồi IPN', 111, 3.0, 3, 0, '2026-11-19 18:00:00', NOW(), NOW()),
(102, 1, 1, 'Tối ưu hóa ảnh tài liệu với Cloudinary CDN', 'Nén ảnh bài viết tự động và phân phối qua CDN giảm tải server', 112, 2.0, 2, 1, '2026-11-20 18:00:00', NOW(), NOW()),
(103, 1, 2, 'Giao diện đọc tài liệu PDF và highlight nội dung', 'Xây dựng component viewer bằng PDF.js hỗ trợ đánh dấu trang và ghi chú', 110, 5.0, 3, 0, '2026-11-15 18:00:00', NOW(), NOW()),
(104, 1, 2, 'Cấu hình Redis Cache cho danh mục môn học', 'Lưu cache danh sách môn học và tài liệu thịnh hành TTL 15 phút', 112, 3.0, 2, 1, '2026-11-18 18:00:00', NOW(), NOW()),
(105, 1, 3, 'Đặc tả API phân quyền RBAC & middleware JWT', 'Hoàn tất phân quyền Leader, Member và viết unit tests cho Spring Security', 111, 3.0, 3, 0, '2026-11-16 20:00:00', NOW(), NOW()),
(106, 1, 3, 'Kiểm thử tự động luồng đăng ký & gia nhập nhóm', 'Viết test suite Playwright kiểm tra luồng tạo mã mời và tham gia dự án', 113, 2.0, 2, 1, '2026-11-17 22:00:00', NOW(), NOW())
ON DUPLICATE KEY UPDATE
    title            = VALUES(title),
    description      = VALUES(description),
    column_id        = VALUES(column_id),
    assignee_id      = VALUES(assignee_id),
    story_points     = VALUES(story_points),
    difficulty_level = VALUES(difficulty_level),
    due_date         = VALUES(due_date);

-- 2c. Nạp sự kiện hoạt động (activity_events) idempotent (không DELETE/UPDATE vì bảng bất biến)
--     Đủ >= 5 sự kiện cho mỗi thành viên ở Sprint 2 & Sprint 3 để phục vụ Radar 4D và Audit Trail
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
    -- Sprint 1 (CLOSED) - Dữ liệu lịch sử
    SELECT 1 AS team_id, 1 AS sprint_id, 109 AS user_id, 'BOARD' AS source, 'CARD_COMPLETED' AS event_type, 'Khởi tạo khung kiến trúc & phân quyền Spring Security' AS details, '2026-10-22 16:00:00' AS occurred_at, 5.00 AS calculated_score, 5.0 AS story_points, 3 AS difficulty_level, 0.0 AS delay_days, 1 AS is_on_time, 0 AS is_helpful_comment, 0 AS is_support_mention, 0 AS is_review_for_others
    UNION ALL SELECT 1, 1, 109, 'GIT', 'GIT_COMMIT', 'feat(auth): setup JWT provider and security filter chain', '2026-10-23 11:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 109, 'BOARD', 'REVIEW_CARD', 'Review thiết kế wireframe Figma cho Sprint 1', '2026-10-24 14:30:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 1, 109, 'BOARD', 'COMMENT_HELPFUL', 'Thống nhất API contract giữa Frontend và Backend', '2026-10-25 10:00:00', 1.00, 1.0, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 1, 109, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ giải quyết xung đột schema Flyway đầu kỳ', '2026-10-26 15:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 1, 1, 110, 'BOARD', 'CARD_COMPLETED', 'Thiết kế Design System & Color Token Dark/Light', '2026-10-22 17:00:00', 5.00, 5.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 110, 'GIT', 'GIT_COMMIT', 'feat(ui): scaffold Vite React TypeScript & Tailwind tokens', '2026-10-23 16:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 110, 'BOARD', 'COMMENT_HELPFUL', 'Góp ý luồng điều hướng TopNav tinh gọn', '2026-10-24 11:00:00', 1.00, 1.0, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 1, 110, 'BOARD', 'CARD_MOVED', 'Cập nhật prototype màn hình Đăng nhập & Dashboard', '2026-10-25 09:30:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 110, 'BOARD', 'REVIEW_CARD', 'Review tài liệu SRS phần giao diện người dùng', '2026-10-26 14:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 1

    UNION ALL SELECT 1, 1, 111, 'BOARD', 'CARD_COMPLETED', 'Thiết kế ERD 15 bảng MariaDB & Migration V1-V10', '2026-10-23 18:00:00', 5.00, 5.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 111, 'GIT', 'GIT_COMMIT', 'feat(db): create base entities and Flyway core scripts', '2026-10-24 10:20:00', 3.50, 3.5, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 111, 'BOARD', 'COMMENT_HELPFUL', 'Giải thích chuẩn hóa bảng trung gian team_members', '2026-10-25 13:00:00', 1.00, 1.0, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 1, 111, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ cấu hình MariaDB UTF8MB4 trên môi trường dev', '2026-10-26 09:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 1, 0
    UNION ALL SELECT 1, 1, 111, 'BOARD', 'CARD_MOVED', 'Hoàn thành kiểm thử truy vấn quan hệ JPA', '2026-10-27 11:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 0

    UNION ALL SELECT 1, 1, 112, 'BOARD', 'CARD_COMPLETED', 'Cấu hình Docker Compose & Healthcheck MariaDB', '2026-10-23 15:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 112, 'GIT', 'GIT_COMMIT', 'ci: add GitHub Actions workflow and Dockerfile', '2026-10-24 17:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 112, 'BOARD', 'CARD_MOVED', 'Kiểm tra port mapping backend 8080 và nginx 80', '2026-10-25 16:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 112, 'BOARD', 'COMMENT_HELPFUL', 'Chia sẻ script chạy CI nhanh trên Windows', '2026-10-26 10:30:00', 1.00, 1.0, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 1, 112, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ debug biến môi trường JWT_SECRET', '2026-10-27 14:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 1, 1, 113, 'BOARD', 'CARD_COMPLETED', 'Xây dựng tài liệu Project Charter & SRS v1.0', '2026-10-22 19:00:00', 4.00, 4.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 113, 'DOCS', 'DOC_EDIT', 'Chỉnh sửa mô hình BPMN & Use Case đặc tả M2', '2026-10-24 09:00:00', 2.50, 2.5, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 1, 113, 'BOARD', 'COMMENT_HELPFUL', 'Rà soát tiêu chí DoD cho từng phân hệ', '2026-10-25 14:00:00', 1.00, 1.0, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 1, 113, 'BOARD', 'REVIEW_CARD', 'Kiểm tra đối chiếu màn hình Login với đặc tả', '2026-10-26 16:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 1, 113, 'BOARD', 'CARD_MOVED', 'Hoàn thiện bộ test UAT đợt 1', '2026-10-27 17:00:00', 1.00, 1.0, 1, 0.0, 1, 0, 0, 0

    -- Sprint 2 (ACTIVE) - Sự kiện chi tiết cho tất cả 5 thành viên
    UNION ALL SELECT 1, 2, 109, 'BOARD', 'CARD_COMPLETED', 'Triển khai kiến trúc dịch vụ Backend Spring Boot 3', '2026-11-09 16:30:00', 5.00, 5.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 109, 'GIT', 'GIT_COMMIT', 'feat(core): setup multi-tier security filter chain and jwt interceptor', '2026-11-09 17:00:00', 4.00, 4.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 109, 'BOARD', 'COMMENT_HELPFUL', 'Code review và giải đáp thắc mắc API cho team', '2026-11-10 10:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 2, 109, 'BOARD', 'REVIEW_CARD', 'Review thẻ thiết kế CSDL & Stored Procedure của Quốc Bảo', '2026-11-10 15:20:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 2, 109, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ điều phối giải quyết xung đột merge branch', '2026-11-11 09:45:00', 1.50, 1.5, 1, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 1, 2, 110, 'BOARD', 'CARD_COMPLETED', 'Thiết kế wireframe Figma 12 màn hình người dùng', '2026-11-05 17:00:00', 5.00, 5.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 110, 'GIT', 'GIT_COMMIT', 'feat(ui): add PDF document reader component with high-contrast theme', '2026-11-08 14:00:00', 4.50, 4.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 110, 'BOARD', 'CARD_MOVED', 'Cập nhật tiến độ giao diện đọc tài liệu PDF', '2026-11-10 11:00:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 110, 'BOARD', 'COMMENT_HELPFUL', 'Chia sẻ bộ icon và CSS token đồng bộ Dark Mode', '2026-11-11 10:15:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 2, 110, 'BOARD', 'REVIEW_CARD', 'Review giao diện bảng Kanban & modal chi tiết thẻ', '2026-11-11 16:40:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 1

    UNION ALL SELECT 1, 2, 111, 'BOARD', 'CARD_COMPLETED', 'Thiết kế CSDL MariaDB & viết Flyway migrations', '2026-11-06 17:30:00', 5.00, 5.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 111, 'GIT', 'GIT_COMMIT', 'feat(db): add indexes on activity_events and scoring view procedures', '2026-11-07 15:00:00', 4.00, 4.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 111, 'BOARD', 'COMMENT_HELPFUL', 'Hướng dẫn team migrate cấu trúc bảng mới', '2026-11-09 09:30:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 2, 111, 'BOARD', 'CARD_REOPENED', 'Mở lại thẻ đặc tả RBAC để bổ sung kiểm tra quyền Leader', '2026-11-10 14:10:00', 0.00, 1.0, 2, 0.5, 0, 0, 0, 0
    UNION ALL SELECT 1, 2, 111, 'BOARD', 'SUPPORT_MENTION', 'Tối ưu truy vấn evidence traceability cho Dashboard', '2026-11-11 11:20:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 1, 2, 112, 'BOARD', 'CARD_COMPLETED', 'Khởi tạo pipeline CI/CD GitHub Actions', '2026-11-07 16:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 112, 'GIT', 'GIT_COMMIT', 'ci: configure automated vitest and maven test runners with cache', '2026-11-08 11:00:00', 3.50, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 112, 'BOARD', 'CARD_MOVED', 'Cấu hình xong cụm Redis Cache môi trường Staging', '2026-11-10 16:00:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 112, 'BOARD', 'SUPPORT_MENTION', 'Hỗ trợ thiết lập Docker Compose staging cho toàn nhóm', '2026-11-11 13:30:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0
    UNION ALL SELECT 1, 2, 112, 'BOARD', 'COMMENT_HELPFUL', 'Tài liệu hóa quy trình chạy CI local bằng PowerShell', '2026-11-12 09:00:00', 1.00, 1.0, 1, 0.0, 1, 1, 0, 0

    UNION ALL SELECT 1, 2, 113, 'BOARD', 'CARD_COMPLETED', 'Xây dựng tài liệu đặc tả yêu cầu phần mềm SRS v1.0', '2026-11-08 17:00:00', 3.00, 3.0, 1, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 113, 'GIT', 'GIT_COMMIT', 'test(e2e): implement automated registration and role access test suite', '2026-11-09 15:30:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 2, 113, 'BOARD', 'COMMENT_HELPFUL', 'Ghi chú kiểm thử chất lượng và báo cáo bug nhỏ', '2026-11-10 14:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 2, 113, 'BOARD', 'REVIEW_CARD', 'Review tiêu chí chấp nhận (Acceptance Criteria) các màn hình chính', '2026-11-11 10:45:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 2, 113, 'DOCS', 'DOC_EDIT', 'Cập nhật bảng kịch bản UAT M2 với 25 test case chuẩn', '2026-11-12 11:30:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 0

    -- Sprint 3 (ACTIVE - Hiện tại) - Đủ sự kiện đa chiều cho cả 5 thành viên
    UNION ALL SELECT 1, 3, 109, 'BOARD', 'CARD_COMPLETED', 'Hoàn thiện kiến trúc đồng bộ dữ liệu đa tầng & PDF Export', '2026-11-14 16:00:00', 5.00, 5.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 109, 'GIT', 'GIT_COMMIT', 'feat(scoring): finalize 4-tier normalization and bootstrap CI engine', '2026-11-14 18:20:00', 4.00, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 109, 'BOARD', 'REVIEW_CARD', 'Review PR module Chấm chéo ẩn danh của Thu Trang', '2026-11-15 10:00:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 3, 109, 'BOARD', 'COMMENT_HELPFUL', 'Hướng dẫn cân chỉnh trọng số D1-D4 theo CR-03', '2026-11-15 14:30:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 3, 109, 'BOARD', 'SUPPORT_MENTION', 'Phối hợp chốt cấu hình deploy production với Minh Đức', '2026-11-16 09:30:00', 1.50, 1.5, 1, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 1, 3, 110, 'BOARD', 'CARD_COMPLETED', 'Xây dựng module Chấm chéo đồng đội Peer Review đa chiều', '2026-11-14 17:30:00', 5.00, 5.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 110, 'GIT', 'GIT_COMMIT', 'feat(neuron): render interactive cosmic neural network and fan-out cards', '2026-11-15 11:00:00', 4.50, 4.5, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 110, 'BOARD', 'COMMENT_HELPFUL', 'Đồng bộ palette màu #1f1f23 Dark Mode cho toàn bộ các trang', '2026-11-15 16:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 3, 110, 'BOARD', 'REVIEW_CARD', 'Review giao diện Cảnh báo sớm CR-04 và Báo cáo PDF', '2026-11-16 10:15:00', 1.50, 1.5, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 3, 110, 'BOARD', 'CARD_MOVED', 'Cập nhật component TaskCalendar đồng bộ thời gian thực', '2026-11-16 15:00:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 0

    UNION ALL SELECT 1, 3, 111, 'BOARD', 'CARD_COMPLETED', 'Tối ưu hóa hiệu năng API và bảo vệ ẩn danh', '2026-11-15 16:00:00', 4.00, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 111, 'GIT', 'GIT_COMMIT', 'perf(db): upgrade sp_calculate_contribution_scores to full 4-tier routine', '2026-11-15 19:00:00', 4.00, 4.0, 3, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 111, 'BOARD', 'IMPEDIMENT_SCHEDULE', 'Trùng lịch thi cuối kỳ học phần CSDL phân tán (2 ngày)', '2026-11-14 08:30:00', 0.00, 0.0, 1, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 111, 'BOARD', 'COMMENT_HELPFUL', 'Hỗ trợ kiểm tra index truy vấn cho bảng manual_contributions', '2026-11-16 09:00:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 3, 111, 'BOARD', 'SUPPORT_MENTION', 'Phối hợp xử lý transaction boundary trong ContributionService', '2026-11-16 13:45:00', 1.50, 1.5, 2, 0.0, 1, 0, 1, 0

    UNION ALL SELECT 1, 3, 112, 'BOARD', 'CARD_COMPLETED', 'Thiết lập Docker Compose staging và giám sát container', '2026-11-14 18:00:00', 3.50, 3.5, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 112, 'GIT', 'GIT_COMMIT', 'ops(pool): tune HikariCP pool settings and MariaDB prepared statements', '2026-11-15 14:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 112, 'BOARD', 'CARD_MOVED', 'Đưa cấu hình Redis cache lên môi trường kiểm thử', '2026-11-15 17:20:00', 1.50, 1.5, 1, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 112, 'BOARD', 'SUPPORT_MENTION', 'Kiểm tra log CI/CD và tự động hóa script run-ci.ps1', '2026-11-16 11:00:00', 1.50, 1.5, 1, 0.0, 1, 0, 1, 0
    UNION ALL SELECT 1, 3, 112, 'BOARD', 'COMMENT_HELPFUL', 'Đề xuất tối ưu nginx gzip và static asset caching', '2026-11-16 14:20:00', 1.00, 1.0, 1, 0.0, 1, 1, 0, 0

    UNION ALL SELECT 1, 3, 113, 'BOARD', 'CARD_COMPLETED', 'Kiểm thử hồi quy toàn hệ thống & xác nhận 20 bộ test Vitest', '2026-11-15 15:00:00', 4.00, 4.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 113, 'GIT', 'GIT_COMMIT', 'test(uat): verify multidimensional scoring edge cases and PDF report', '2026-11-15 18:00:00', 3.00, 3.0, 2, 0.0, 1, 0, 0, 0
    UNION ALL SELECT 1, 3, 113, 'BOARD', 'REVIEW_CARD', 'Kiểm tra tính ẩn danh K-Anonymity cho đợt chấm chéo Sprint 3', '2026-11-16 09:40:00', 1.50, 1.5, 2, 0.0, 1, 0, 0, 1
    UNION ALL SELECT 1, 3, 113, 'BOARD', 'COMMENT_HELPFUL', 'Tổng hợp báo cáo kiểm thử và hướng dẫn sử dụng cuối kỳ', '2026-11-16 12:30:00', 1.50, 1.5, 1, 0.0, 1, 1, 0, 0
    UNION ALL SELECT 1, 3, 113, 'DOCS', 'DOC_EDIT', 'Hoàn thiện báo cáo nghiệm thu đồ án môn Quản lý dự án CNTT', '2026-11-16 16:00:00', 2.00, 2.0, 2, 0.0, 1, 0, 0, 0
) src
WHERE NOT EXISTS (
    SELECT 1 FROM activity_events ae
    WHERE ae.team_id = src.team_id
      AND ae.sprint_id = src.sprint_id
      AND ae.user_id = src.user_id
      AND ae.event_type = src.event_type
      AND ae.details = src.details
);

-- 2d. Nạp đóng góp thủ công (manual_contributions) cả APPROVED và PENDING
INSERT INTO manual_contributions (
    team_id, sprint_id, user_id, title, task_name, description, evidence_link,
    story_points, equivalent_story_points, status, confirmed, confirmed_by, reviewer_id, confirmed_at, created_at, updated_at
)
SELECT
    src.team_id, src.sprint_id, src.user_id, src.task_name, src.task_name, src.description, src.evidence_link,
    src.story_points, src.story_points, src.status, src.confirmed, src.reviewer_id, src.reviewer_id,
    CASE WHEN src.confirmed = 1 THEN NOW() ELSE NULL END, NOW(), NOW()
FROM (
    SELECT 1 AS team_id, 2 AS sprint_id, 110 AS user_id, 'Thiết kế bộ UI Kit & Design System Figma cho phân hệ Dashboard' AS task_name, 'Thiết kế đồng bộ Dark/Light mode trên 12 màn hình chính' AS description, 'https://figma.com/file/educonnect-ui-system' AS evidence_link, 3.00 AS story_points, 'PENDING' AS status, 0 AS confirmed, NULL AS reviewer_id
    UNION ALL SELECT 1, 2, 111, 'Xây dựng tài liệu kiến trúc CSDL & sơ đồ ERD mở rộng', 'Mô tả chi tiết 15 bảng và khóa ngoại chuẩn hóa 3NF', 'https://docs.google.com/document/d/educonnect-erd-specs', 2.50, 'PENDING', 0, NULL
    UNION ALL SELECT 1, 2, 109, 'Tổ chức họp Sprint Planning & Review khách hàng (Giảng viên)', 'Điều phối buổi họp nghiệm thu tuần và tổng hợp biên bản', 'https://docs.google.com/document/d/educonnect-meeting-notes-s2', 3.00, 'APPROVED', 1, 110
    UNION ALL SELECT 1, 3, 113, 'Soạn thảo Slide thuyết trình bảo vệ đồ án & kịch bản Demo', 'Chuẩn bị bộ slide tổng kết 4 tầng công thức và demo luồng thực tế', 'https://docs.google.com/presentation/d/educonnect-final-deck', 3.50, 'APPROVED', 1, 109
    UNION ALL SELECT 1, 3, 112, 'Thiết lập tài liệu hướng dẫn triển khai Docker & Backup MariaDB', 'Viết runbook vận hành staging và phục hồi dữ liệu tự động', 'https://github.com/educonnect/docs/blob/main/DEPLOY.md', 2.00, 'PENDING', 0, NULL
) src
WHERE NOT EXISTS (
    SELECT 1 FROM manual_contributions mc
    WHERE mc.team_id = src.team_id
      AND mc.sprint_id = src.sprint_id
      AND mc.user_id = src.user_id
      AND COALESCE(mc.task_name, mc.title) = src.task_name
);

-- 2e. Bổ sung đánh giá chéo đầy đủ (>= 3 lượt cho mỗi thành viên ở Đợt 1, Đợt 2, Đợt 3)
--     để đảm bảo K-Anonymity (>= 3 reviewers) và tính chính xác trục D4
INSERT INTO review_submissions (
    review_round_id, reviewer_id, reviewee_id, criterion, score, feedback, card_id, likes_count, created_at, updated_at
)
SELECT
    src.round_id, src.reviewer_id, src.reviewee_id, src.criterion, src.score, src.feedback, src.card_id, src.likes_count, src.created_at, NOW()
FROM (
    -- Đợt 1 (CLOSED) - 3 lượt cho mỗi thành viên (109, 110, 111, 112, 113)
    SELECT 1 AS round_id, 110 AS reviewer_id, 109 AS reviewee_id, 'QUALITY' AS criterion, 5 AS score, 'Khởi tạo khung kiến trúc Sprint 1 bài bản, phân công rõ ràng.' AS feedback, 111 AS card_id, 4 AS likes_count, '2026-10-26 10:00:00' AS created_at
    UNION ALL SELECT 1, 110, 109, 'PUNCTUALITY', 5, 'Khởi tạo khung kiến trúc Sprint 1 bài bản, phân công rõ ràng.', 111, 4, '2026-10-26 10:00:00'
    UNION ALL SELECT 1, 110, 109, 'COOPERATION', 5, 'Khởi tạo khung kiến trúc Sprint 1 bài bản, phân công rõ ràng.', 111, 4, '2026-10-26 10:00:00'
    UNION ALL SELECT 1, 111, 109, 'QUALITY', 5, 'Hỗ trợ thống nhất API Contract nhanh chóng ngay từ đầu.', 111, 3, '2026-10-26 11:00:00'
    UNION ALL SELECT 1, 111, 109, 'PUNCTUALITY', 4, 'Hỗ trợ thống nhất API Contract nhanh chóng ngay từ đầu.', 111, 3, '2026-10-26 11:00:00'
    UNION ALL SELECT 1, 111, 109, 'COOPERATION', 5, 'Hỗ trợ thống nhất API Contract nhanh chóng ngay từ đầu.', 111, 3, '2026-10-26 11:00:00'
    UNION ALL SELECT 1, 112, 109, 'QUALITY', 5, 'Điều phối tốt việc dựng môi trường Docker và repository.', 109, 5, '2026-10-26 14:00:00'
    UNION ALL SELECT 1, 112, 109, 'PUNCTUALITY', 5, 'Điều phối tốt việc dựng môi trường Docker và repository.', 109, 5, '2026-10-26 14:00:00'
    UNION ALL SELECT 1, 112, 109, 'COOPERATION', 5, 'Điều phối tốt việc dựng môi trường Docker và repository.', 109, 5, '2026-10-26 14:00:00'

    UNION ALL SELECT 1, 109, 110, 'QUALITY', 5, 'UI Kit và Wireframe Figma trình bày rất chuyên nghiệp.', 107, 6, '2026-10-26 10:30:00'
    UNION ALL SELECT 1, 109, 110, 'PUNCTUALITY', 5, 'UI Kit và Wireframe Figma trình bày rất chuyên nghiệp.', 107, 6, '2026-10-26 10:30:00'
    UNION ALL SELECT 1, 109, 110, 'COOPERATION', 5, 'UI Kit và Wireframe Figma trình bày rất chuyên nghiệp.', 107, 6, '2026-10-26 10:30:00'
    UNION ALL SELECT 1, 111, 110, 'QUALITY', 4, 'Thiết kế màn hình đồng bộ với cấu trúc dữ liệu API.', 107, 4, '2026-10-26 12:00:00'
    UNION ALL SELECT 1, 111, 110, 'PUNCTUALITY', 5, 'Thiết kế màn hình đồng bộ với cấu trúc dữ liệu API.', 107, 4, '2026-10-26 12:00:00'
    UNION ALL SELECT 1, 111, 110, 'COOPERATION', 5, 'Thiết kế màn hình đồng bộ với cấu trúc dữ liệu API.', 107, 4, '2026-10-26 12:00:00'
    UNION ALL SELECT 1, 113, 110, 'QUALITY', 5, 'Hỗ trợ QA đối chiếu luồng giao diện rất nhiệt tình.', 107, 3, '2026-10-26 15:00:00'
    UNION ALL SELECT 1, 113, 110, 'PUNCTUALITY', 4, 'Hỗ trợ QA đối chiếu luồng giao diện rất nhiệt tình.', 107, 3, '2026-10-26 15:00:00'
    UNION ALL SELECT 1, 113, 110, 'COOPERATION', 5, 'Hỗ trợ QA đối chiếu luồng giao diện rất nhiệt tình.', 107, 3, '2026-10-26 15:00:00'

    UNION ALL SELECT 1, 109, 111, 'QUALITY', 5, 'Cấu trúc bảng và Flyway migrations chuẩn xác, không lỗi.', 108, 5, '2026-10-26 10:45:00'
    UNION ALL SELECT 1, 109, 111, 'PUNCTUALITY', 5, 'Cấu trúc bảng và Flyway migrations chuẩn xác, không lỗi.', 108, 5, '2026-10-26 10:45:00'
    UNION ALL SELECT 1, 109, 111, 'COOPERATION', 5, 'Cấu trúc bảng và Flyway migrations chuẩn xác, không lỗi.', 108, 5, '2026-10-26 10:45:00'
    UNION ALL SELECT 1, 110, 111, 'QUALITY', 4, 'Tài liệu schema dễ hiểu, hỗ trợ FE map model nhanh.', 108, 4, '2026-10-26 13:00:00'
    UNION ALL SELECT 1, 110, 111, 'PUNCTUALITY', 4, 'Tài liệu schema dễ hiểu, hỗ trợ FE map model nhanh.', 108, 4, '2026-10-26 13:00:00'
    UNION ALL SELECT 1, 110, 111, 'COOPERATION', 5, 'Tài liệu schema dễ hiểu, hỗ trợ FE map model nhanh.', 108, 4, '2026-10-26 13:00:00'
    UNION ALL SELECT 1, 112, 111, 'QUALITY', 5, 'Tối ưu cấu hình kết nối DB trong Docker ổn định.', 108, 3, '2026-10-26 16:00:00'
    UNION ALL SELECT 1, 112, 111, 'PUNCTUALITY', 5, 'Tối ưu cấu hình kết nối DB trong Docker ổn định.', 108, 3, '2026-10-26 16:00:00'
    UNION ALL SELECT 1, 112, 111, 'COOPERATION', 4, 'Tối ưu cấu hình kết nối DB trong Docker ổn định.', 108, 3, '2026-10-26 16:00:00'

    UNION ALL SELECT 1, 109, 112, 'QUALITY', 4, 'Dựng CI/CD và Docker rất nhanh, giúp cả nhóm test thuận tiện.', 109, 4, '2026-10-26 11:15:00'
    UNION ALL SELECT 1, 109, 112, 'PUNCTUALITY', 5, 'Dựng CI/CD và Docker rất nhanh, giúp cả nhóm test thuận tiện.', 109, 4, '2026-10-26 11:15:00'
    UNION ALL SELECT 1, 109, 112, 'COOPERATION', 5, 'Dựng CI/CD và Docker rất nhanh, giúp cả nhóm test thuận tiện.', 109, 4, '2026-10-26 11:15:00'
    UNION ALL SELECT 1, 110, 112, 'QUALITY', 4, 'Hỗ trợ cấu hình build Vite nginx sạch sẽ.', 109, 3, '2026-10-26 13:30:00'
    UNION ALL SELECT 1, 110, 112, 'PUNCTUALITY', 4, 'Hỗ trợ cấu hình build Vite nginx sạch sẽ.', 109, 3, '2026-10-26 13:30:00'
    UNION ALL SELECT 1, 110, 112, 'COOPERATION', 5, 'Hỗ trợ cấu hình build Vite nginx sạch sẽ.', 109, 3, '2026-10-26 13:30:00'
    UNION ALL SELECT 1, 111, 112, 'QUALITY', 5, 'Healthcheck MariaDB chạy ổn định không bị race condition.', 109, 4, '2026-10-26 17:00:00'
    UNION ALL SELECT 1, 111, 112, 'PUNCTUALITY', 4, 'Healthcheck MariaDB chạy ổn định không bị race condition.', 109, 4, '2026-10-26 17:00:00'
    UNION ALL SELECT 1, 111, 112, 'COOPERATION', 5, 'Healthcheck MariaDB chạy ổn định không bị race condition.', 109, 4, '2026-10-26 17:00:00'

    UNION ALL SELECT 1, 109, 113, 'QUALITY', 5, 'Đặc tả SRS & Project Charter trình bày rõ ràng, chuẩn mực.', 110, 5, '2026-10-26 11:30:00'
    UNION ALL SELECT 1, 109, 113, 'PUNCTUALITY', 5, 'Đặc tả SRS & Project Charter trình bày rõ ràng, chuẩn mực.', 110, 5, '2026-10-26 11:30:00'
    UNION ALL SELECT 1, 109, 113, 'COOPERATION', 5, 'Đặc tả SRS & Project Charter trình bày rõ ràng, chuẩn mực.', 110, 5, '2026-10-26 11:30:00'
    UNION ALL SELECT 1, 110, 113, 'QUALITY', 4, 'Tiêu chí kiểm thử giúp FE bắt sớm nhiều lỗi nhỏ.', 110, 3, '2026-10-26 14:30:00'
    UNION ALL SELECT 1, 110, 113, 'PUNCTUALITY', 5, 'Tiêu chí kiểm thử giúp FE bắt sớm nhiều lỗi nhỏ.', 110, 3, '2026-10-26 14:30:00'
    UNION ALL SELECT 1, 110, 113, 'COOPERATION', 5, 'Tiêu chí kiểm thử giúp FE bắt sớm nhiều lỗi nhỏ.', 110, 3, '2026-10-26 14:30:00'
    UNION ALL SELECT 1, 111, 113, 'QUALITY', 5, 'Viết kịch bản UAT kỹ lưỡng và theo dõi tiến độ sát sao.', 110, 4, '2026-10-26 17:30:00'
    UNION ALL SELECT 1, 111, 113, 'PUNCTUALITY', 4, 'Viết kịch bản UAT kỹ lưỡng và theo dõi tiến độ sát sao.', 110, 4, '2026-10-26 17:30:00'
    UNION ALL SELECT 1, 111, 113, 'COOPERATION', 5, 'Viết kịch bản UAT kỹ lưỡng và theo dõi tiến độ sát sao.', 110, 4, '2026-10-26 17:30:00'

    -- Đợt 2 (OPEN) - Bổ sung để 110, 111, 112, 113 đều đạt >= 3 lượt đánh giá ẩn danh
    UNION ALL SELECT 2, 112, 110, 'QUALITY', 5, 'UI/UX đạt độ hoàn thiện cao, animation mượt mà và dễ dùng.', 107, 7, '2026-11-12 10:15:00'
    UNION ALL SELECT 2, 112, 110, 'PUNCTUALITY', 5, 'UI/UX đạt độ hoàn thiện cao, animation mượt mà và dễ dùng.', 107, 7, '2026-11-12 10:15:00'
    UNION ALL SELECT 2, 112, 110, 'COOPERATION', 5, 'UI/UX đạt độ hoàn thiện cao, animation mượt mà và dễ dùng.', 107, 7, '2026-11-12 10:15:00'

    UNION ALL SELECT 2, 112, 111, 'QUALITY', 4, 'API ổn định, migration và indexing chuẩn cho môi trường staging.', 108, 4, '2026-11-12 11:00:00'
    UNION ALL SELECT 2, 112, 111, 'PUNCTUALITY', 4, 'API ổn định, migration và indexing chuẩn cho môi trường staging.', 108, 4, '2026-11-12 11:00:00'
    UNION ALL SELECT 2, 112, 111, 'COOPERATION', 5, 'API ổn định, migration và indexing chuẩn cho môi trường staging.', 108, 4, '2026-11-12 11:00:00'

    UNION ALL SELECT 2, 109, 112, 'QUALITY', 5, 'Pipeline CI/CD tự động hóa test rất hiệu quả.', 109, 6, '2026-11-11 10:00:00'
    UNION ALL SELECT 2, 109, 112, 'PUNCTUALITY', 5, 'Pipeline CI/CD tự động hóa test rất hiệu quả.', 109, 6, '2026-11-11 10:00:00'
    UNION ALL SELECT 2, 109, 112, 'COOPERATION', 5, 'Pipeline CI/CD tự động hóa test rất hiệu quả.', 109, 6, '2026-11-11 10:00:00'
    UNION ALL SELECT 2, 110, 112, 'QUALITY', 4, 'Hỗ trợ deploy frontend test rất nhanh.', 109, 4, '2026-11-11 15:00:00'
    UNION ALL SELECT 2, 110, 112, 'PUNCTUALITY', 4, 'Hỗ trợ deploy frontend test rất nhanh.', 109, 4, '2026-11-11 15:00:00'
    UNION ALL SELECT 2, 110, 112, 'COOPERATION', 5, 'Hỗ trợ deploy frontend test rất nhanh.', 109, 4, '2026-11-11 15:00:00'
    UNION ALL SELECT 2, 111, 112, 'QUALITY', 5, 'Phối hợp tối ưu Docker build cache và MariaDB rất tốt.', 109, 5, '2026-11-12 09:00:00'
    UNION ALL SELECT 2, 111, 112, 'PUNCTUALITY', 5, 'Phối hợp tối ưu Docker build cache và MariaDB rất tốt.', 109, 5, '2026-11-12 09:00:00'
    UNION ALL SELECT 2, 111, 112, 'COOPERATION', 4, 'Phối hợp tối ưu Docker build cache và MariaDB rất tốt.', 109, 5, '2026-11-12 09:00:00'

    UNION ALL SELECT 2, 109, 113, 'QUALITY', 5, 'Báo cáo bug chi tiết, giúp nhóm fix triệt để trước khi demo.', 110, 5, '2026-11-11 11:00:00'
    UNION ALL SELECT 2, 109, 113, 'PUNCTUALITY', 5, 'Báo cáo bug chi tiết, giúp nhóm fix triệt để trước khi demo.', 110, 5, '2026-11-11 11:00:00'
    UNION ALL SELECT 2, 109, 113, 'COOPERATION', 5, 'Báo cáo bug chi tiết, giúp nhóm fix triệt để trước khi demo.', 110, 5, '2026-11-11 11:00:00'
    UNION ALL SELECT 2, 110, 113, 'QUALITY', 5, 'Test kỹ responsive và luồng toast thông báo trên mọi trang.', 110, 6, '2026-11-11 16:30:00'
    UNION ALL SELECT 2, 110, 113, 'PUNCTUALITY', 4, 'Test kỹ responsive và luồng toast thông báo trên mọi trang.', 110, 6, '2026-11-11 16:30:00'
    UNION ALL SELECT 2, 110, 113, 'COOPERATION', 5, 'Test kỹ responsive và luồng toast thông báo trên mọi trang.', 110, 6, '2026-11-11 16:30:00'
    UNION ALL SELECT 2, 111, 113, 'QUALITY', 4, 'Phối hợp kiểm thử API phân quyền chính xác.', 110, 4, '2026-11-12 13:00:00'
    UNION ALL SELECT 2, 111, 113, 'PUNCTUALITY', 5, 'Phối hợp kiểm thử API phân quyền chính xác.', 110, 4, '2026-11-12 13:00:00'
    UNION ALL SELECT 2, 111, 113, 'COOPERATION', 5, 'Phối hợp kiểm thử API phân quyền chính xác.', 110, 4, '2026-11-12 13:00:00'

    -- Đợt 3 (OPEN) - Đảm bảo cả 5 thành viên có >= 3 đánh giá trong Sprint 3
    UNION ALL SELECT 3, 112, 109, 'QUALITY', 5, 'Trưởng nhóm kiểm soát chất lượng tổng thể và tiến độ rất sát.', 111, 5, '2026-11-15 09:00:00'
    UNION ALL SELECT 3, 112, 109, 'PUNCTUALITY', 5, 'Trưởng nhóm kiểm soát chất lượng tổng thể và tiến độ rất sát.', 111, 5, '2026-11-15 09:00:00'
    UNION ALL SELECT 3, 112, 109, 'COOPERATION', 5, 'Trưởng nhóm kiểm soát chất lượng tổng thể và tiến độ rất sát.', 111, 5, '2026-11-15 09:00:00'

    UNION ALL SELECT 3, 109, 110, 'QUALITY', 5, 'Hiệu ứng đồ thị Neuron và fan-out cards hoàn thiện xuất sắc.', 112, 9, '2026-11-15 10:00:00'
    UNION ALL SELECT 3, 109, 110, 'PUNCTUALITY', 5, 'Hiệu ứng đồ thị Neuron và fan-out cards hoàn thiện xuất sắc.', 112, 9, '2026-11-15 10:00:00'
    UNION ALL SELECT 3, 109, 110, 'COOPERATION', 5, 'Hiệu ứng đồ thị Neuron và fan-out cards hoàn thiện xuất sắc.', 112, 9, '2026-11-15 10:00:00'
    UNION ALL SELECT 3, 111, 110, 'QUALITY', 5, 'Tích hợp API mạng lưới đa chiều và chấm chéo cực mượt.', 112, 6, '2026-11-15 14:00:00'
    UNION ALL SELECT 3, 111, 110, 'PUNCTUALITY', 5, 'Tích hợp API mạng lưới đa chiều và chấm chéo cực mượt.', 112, 6, '2026-11-15 14:00:00'
    UNION ALL SELECT 3, 111, 110, 'COOPERATION', 5, 'Tích hợp API mạng lưới đa chiều và chấm chéo cực mượt.', 112, 6, '2026-11-15 14:00:00'
    UNION ALL SELECT 3, 113, 110, 'QUALITY', 5, 'Giao diện thống nhất hoàn toàn Light & Dark Mode.', 112, 5, '2026-11-16 09:30:00'
    UNION ALL SELECT 3, 113, 110, 'PUNCTUALITY', 4, 'Giao diện thống nhất hoàn toàn Light & Dark Mode.', 112, 5, '2026-11-16 09:30:00'
    UNION ALL SELECT 3, 113, 110, 'COOPERATION', 5, 'Giao diện thống nhất hoàn toàn Light & Dark Mode.', 112, 5, '2026-11-16 09:30:00'

    UNION ALL SELECT 3, 109, 111, 'QUALITY', 5, 'Nâng cấp stored procedure tính điểm 4 tầng nhanh và chính xác.', 113, 7, '2026-11-15 11:00:00'
    UNION ALL SELECT 3, 109, 111, 'PUNCTUALITY', 4, 'Nâng cấp stored procedure tính điểm 4 tầng nhanh và chính xác.', 113, 7, '2026-11-15 11:00:00'
    UNION ALL SELECT 3, 109, 111, 'COOPERATION', 5, 'Nâng cấp stored procedure tính điểm 4 tầng nhanh và chính xác.', 113, 7, '2026-11-15 11:00:00'
    UNION ALL SELECT 3, 110, 111, 'QUALITY', 4, 'Phối hợp chuẩn hóa JSON response cho đồ thị và báo cáo.', 113, 4, '2026-11-15 15:30:00'
    UNION ALL SELECT 3, 110, 111, 'PUNCTUALITY', 4, 'Phối hợp chuẩn hóa JSON response cho đồ thị và báo cáo.', 113, 4, '2026-11-15 15:30:00'
    UNION ALL SELECT 3, 110, 111, 'COOPERATION', 5, 'Phối hợp chuẩn hóa JSON response cho đồ thị và báo cáo.', 113, 4, '2026-11-15 15:30:00'
    UNION ALL SELECT 3, 112, 111, 'QUALITY', 5, 'Tối ưu index và HikariCP giúp truy vấn dashboard dưới 5ms.', 113, 5, '2026-11-16 10:00:00'
    UNION ALL SELECT 3, 112, 111, 'PUNCTUALITY', 4, 'Tối ưu index và HikariCP giúp truy vấn dashboard dưới 5ms.', 113, 5, '2026-11-16 10:00:00'
    UNION ALL SELECT 3, 112, 111, 'COOPERATION', 5, 'Tối ưu index và HikariCP giúp truy vấn dashboard dưới 5ms.', 113, 5, '2026-11-16 10:00:00'

    UNION ALL SELECT 3, 109, 112, 'QUALITY', 5, 'Hoàn thiện cấu hình CI/CD và staging environment trơn tru.', 109, 5, '2026-11-15 11:30:00'
    UNION ALL SELECT 3, 109, 112, 'PUNCTUALITY', 5, 'Hoàn thiện cấu hình CI/CD và staging environment trơn tru.', 109, 5, '2026-11-15 11:30:00'
    UNION ALL SELECT 3, 109, 112, 'COOPERATION', 5, 'Hoàn thiện cấu hình CI/CD và staging environment trơn tru.', 109, 5, '2026-11-15 11:30:00'
    UNION ALL SELECT 3, 110, 112, 'QUALITY', 4, 'Hỗ trợ kiểm tra build production không warning.', 109, 3, '2026-11-16 09:00:00'
    UNION ALL SELECT 3, 110, 112, 'PUNCTUALITY', 5, 'Hỗ trợ kiểm tra build production không warning.', 109, 3, '2026-11-16 09:00:00'
    UNION ALL SELECT 3, 110, 112, 'COOPERATION', 5, 'Hỗ trợ kiểm tra build production không warning.', 109, 3, '2026-11-16 09:00:00'
    UNION ALL SELECT 3, 113, 112, 'QUALITY', 5, 'Script chạy kiểm thử tự động dễ sử dụng và ổn định.', 109, 4, '2026-11-16 11:00:00'
    UNION ALL SELECT 3, 113, 112, 'PUNCTUALITY', 4, 'Script chạy kiểm thử tự động dễ sử dụng và ổn định.', 109, 4, '2026-11-16 11:00:00'
    UNION ALL SELECT 3, 113, 112, 'COOPERATION', 5, 'Script chạy kiểm thử tự động dễ sử dụng và ổn định.', 109, 4, '2026-11-16 11:00:00'

    UNION ALL SELECT 3, 109, 113, 'QUALITY', 5, 'Kiểm thử bao phủ đầy đủ 86 unit test frontend & toàn bộ API.', 110, 6, '2026-11-15 13:00:00'
    UNION ALL SELECT 3, 109, 113, 'PUNCTUALITY', 5, 'Kiểm thử bao phủ đầy đủ 86 unit test frontend & toàn bộ API.', 110, 6, '2026-11-15 13:00:00'
    UNION ALL SELECT 3, 109, 113, 'COOPERATION', 5, 'Kiểm thử bao phủ đầy đủ 86 unit test frontend & toàn bộ API.', 110, 6, '2026-11-15 13:00:00'
    UNION ALL SELECT 3, 110, 113, 'QUALITY', 5, 'Kiểm tra kỹ độ tương phản màu sắc và khả năng truy cập UI.', 110, 5, '2026-11-16 10:30:00'
    UNION ALL SELECT 3, 110, 113, 'PUNCTUALITY', 5, 'Kiểm tra kỹ độ tương phản màu sắc và khả năng truy cập UI.', 110, 5, '2026-11-16 10:30:00'
    UNION ALL SELECT 3, 110, 113, 'COOPERATION', 5, 'Kiểm tra kỹ độ tương phản màu sắc và khả năng truy cập UI.', 110, 5, '2026-11-16 10:30:00'
    UNION ALL SELECT 3, 111, 113, 'QUALITY', 4, 'Đối soát số liệu báo cáo PDF chính xác với DB.', 110, 4, '2026-11-16 14:00:00'
    UNION ALL SELECT 3, 111, 113, 'PUNCTUALITY', 5, 'Đối soát số liệu báo cáo PDF chính xác với DB.', 110, 4, '2026-11-16 14:00:00'
    UNION ALL SELECT 3, 111, 113, 'COOPERATION', 5, 'Đối soát số liệu báo cáo PDF chính xác với DB.', 110, 4, '2026-11-16 14:00:00'
) src
WHERE NOT EXISTS (
    SELECT 1 FROM review_submissions rs
    WHERE rs.review_round_id = src.round_id
      AND rs.reviewer_id = src.reviewer_id
      AND rs.reviewee_id = src.reviewee_id
      AND rs.criterion = src.criterion
);

-- 2f. Bổ sung cảnh báo mẫu idempotent cho Team 1
INSERT INTO alerts (team_id, sprint_id, user_id, alert_type, severity, message, resolved, created_at, updated_at)
SELECT src.team_id, src.sprint_id, src.user_id, src.alert_type, src.severity, src.message, 0, NOW(), NOW()
FROM (
    SELECT 1 AS team_id, 2 AS sprint_id, 109 AS user_id, 'MILESTONE_PROGRESS' AS alert_type, 'INFO' AS severity, 'Tiến độ Sprint 2 đạt 85%, các thẻ lõi Backend & UI đã hoàn thành đúng hạn.' AS message
    UNION ALL SELECT 1, 3, 109, 'ON_TIME_COMPLETION', 'INFO', '100% các thẻ Done trong Sprint 3 đều hoàn thành đúng thời hạn cam kết.'
) src
WHERE NOT EXISTS (
    SELECT 1 FROM alerts a
    WHERE a.team_id = src.team_id
      AND a.user_id = src.user_id
      AND a.alert_type = src.alert_type
      AND a.message = src.message
);

-- 2g. Chạy ngay Stored Procedure tính điểm 4 tầng cho Sprint 1, 2, 3 của Team 1
CALL sp_calculate_contribution_scores(1, 1);
CALL sp_calculate_contribution_scores(1, 2);
CALL sp_calculate_contribution_scores(1, 3);
