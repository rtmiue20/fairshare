-- Fix trg_after_review_submission to prevent duplicate alerts
DROP TRIGGER IF EXISTS trg_after_review_submission;

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

    -- Nếu vừa đủ ngưỡng và chưa tồn tại alert cho (team, sprint, user, type) -> chỉ tạo 1 alert duy nhất
    IF v_count = v_min_sub AND NOT EXISTS (
        SELECT 1 FROM alerts
        WHERE team_id = v_team
          AND sprint_id = v_sprint
          AND user_id = NEW.reviewee_id
          AND alert_type = 'PEER_REVIEW_SUFFICIENT'
    ) THEN
        INSERT INTO alerts (team_id, sprint_id, user_id, alert_type, message, severity)
        VALUES (v_team, v_sprint, NEW.reviewee_id,
                'PEER_REVIEW_SUFFICIENT',
                'Đủ lượt chấm chéo (≥ 3). D4 sẽ được tính trong pipeline tiếp theo.',
                'INFO');
    END IF;
END;
