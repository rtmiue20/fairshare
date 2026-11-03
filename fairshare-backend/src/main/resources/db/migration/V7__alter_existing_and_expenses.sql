-- =============================================================================
-- V7: Alter existing tables + create expenses & splits
-- Đồng bộ DB hiện tại với mô hình 4 tầng FairShare Scoring Engine
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. sprints – thêm cột status (ACTIVE / CLOSED / ARCHIVED)
-- -----------------------------------------------------------------------------
ALTER TABLE sprints
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        COMMENT 'ACTIVE | CLOSED | ARCHIVED',
    ADD CONSTRAINT chk_sprints_status CHECK (status IN ('ACTIVE', 'CLOSED', 'ARCHIVED')),
    ADD INDEX idx_sprints_team_status (team_id, status);

-- -----------------------------------------------------------------------------
-- 2. activity_events – thêm sprint_id + 7 cột đặc trưng thô (Tầng 1)
-- -----------------------------------------------------------------------------
ALTER TABLE activity_events
    ADD COLUMN IF NOT EXISTS sprint_id BIGINT NULL
        COMMENT 'NULL nếu chưa gán sprint; gán sau khi đồng bộ',
    ADD COLUMN IF NOT EXISTS story_points DECIMAL(5, 1) NULL
        COMMENT 'Story point của card (nếu có)',
    ADD COLUMN IF NOT EXISTS difficulty_level TINYINT NULL
        COMMENT '1=Dễ 2=Trung bình 3=Khó 4=Rất khó',
    ADD COLUMN IF NOT EXISTS is_on_time BOOLEAN NULL
        COMMENT 'TRUE = hoàn thành trước/đúng deadline',
    ADD COLUMN IF NOT EXISTS delay_days DECIMAL(5, 1) NULL DEFAULT 0
        COMMENT 'Số ngày trễ (dương = trễ)',
    ADD COLUMN IF NOT EXISTS is_helpful_comment BOOLEAN NULL
        COMMENT 'Bình luận được đánh dấu hữu ích',
    ADD COLUMN IF NOT EXISTS is_support_mention BOOLEAN NULL
        COMMENT 'Được gắn @ để hỗ trợ người khác',
    ADD COLUMN IF NOT EXISTS is_review_for_others BOOLEAN NULL
        COMMENT 'Review card thay cho người khác',
    ADD CONSTRAINT fk_activity_events_sprint
        FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE SET NULL,
    ADD CONSTRAINT chk_ae_difficulty
        CHECK (difficulty_level IS NULL OR difficulty_level BETWEEN 1 AND 4),
    ADD CONSTRAINT chk_ae_delay
        CHECK (delay_days IS NULL OR delay_days >= 0),
    ADD INDEX idx_ae_team_sprint_user (team_id, sprint_id, user_id),
    ADD INDEX idx_ae_user_sprint      (user_id, sprint_id),
    ADD INDEX idx_ae_occurred_at      (occurred_at);

-- -----------------------------------------------------------------------------
-- 3. contribution_scores – thêm các cột Tầng 4 còn thiếu
-- -----------------------------------------------------------------------------
ALTER TABLE contribution_scores
    ADD COLUMN IF NOT EXISTS raw_weighted_sum DECIMAL(10, 5) NULL
        COMMENT 'Σₖ w_k · D''_ik trước khi qua sigmoid',
    ADD COLUMN IF NOT EXISTS peer_included BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT 'TRUE nếu D4 được tính vào (đủ ≥ 3 lượt chấm)',
    ADD COLUMN IF NOT EXISTS has_sufficient_data BOOLEAN NOT NULL DEFAULT TRUE
        COMMENT 'FALSE khi total_events < 5 → hiển thị "chưa đủ bằng chứng"',
    ADD COLUMN IF NOT EXISTS total_events_used INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD CONSTRAINT uk_cs_sprint_user UNIQUE (sprint_id, user_id),
    ADD CONSTRAINT chk_cs_score      CHECK (score      >= 0 AND score      <= 100),
    ADD CONSTRAINT chk_cs_percentage CHECK (percentage >= 0 AND percentage <= 1),
    ADD INDEX idx_cs_team_sprint (team_id, sprint_id),
    ADD INDEX idx_cs_user        (user_id);

-- -----------------------------------------------------------------------------
-- 4. manual_contributions – thêm sprint_id + equivalent_story_points + confirmed_by
-- -----------------------------------------------------------------------------
ALTER TABLE manual_contributions
    ADD COLUMN IF NOT EXISTS sprint_id BIGINT NULL
        COMMENT 'NULL nếu không gán sprint cụ thể',
    ADD COLUMN IF NOT EXISTS equivalent_story_points DECIMAL(5, 1) NULL DEFAULT 0
        COMMENT 'Leader ước lượng story point tương đương để đưa vào Tầng 1',
    ADD COLUMN IF NOT EXISTS confirmed_by BIGINT NULL
        COMMENT 'user_id của leader xác nhận',
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP NULL,
    ADD CONSTRAINT fk_mc_sprint        FOREIGN KEY (sprint_id)    REFERENCES sprints (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_mc_confirmed_by  FOREIGN KEY (confirmed_by) REFERENCES users   (id) ON DELETE SET NULL,
    ADD INDEX idx_mc_team_sprint (team_id, sprint_id),
    ADD INDEX idx_mc_user        (user_id);

-- -----------------------------------------------------------------------------
-- 5. review_rounds – thêm status
-- -----------------------------------------------------------------------------
ALTER TABLE review_rounds
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
        COMMENT 'OPEN | CLOSED | AGGREGATED',
    ADD CONSTRAINT chk_rr_status CHECK (status IN ('OPEN', 'CLOSED', 'AGGREGATED')),
    ADD INDEX idx_rr_team_sprint (team_id, sprint_id);

-- -----------------------------------------------------------------------------
-- 6. review_submissions – thêm CHECK score 1–5 + self-review guard
--    (MariaDB: ADD CONSTRAINT chỉ dùng được nếu chưa tồn tại)
-- -----------------------------------------------------------------------------
ALTER TABLE review_submissions
    ADD CONSTRAINT chk_rs_score     CHECK (score BETWEEN 1 AND 5),
    ADD CONSTRAINT chk_rs_self_review CHECK (reviewer_id <> reviewee_id),
    ADD INDEX idx_rs_round_reviewee (review_round_id, reviewee_id),
    ADD INDEX idx_rs_round_reviewer (review_round_id, reviewer_id);

-- -----------------------------------------------------------------------------
-- 7. alerts – thêm sprint_id + severity
-- -----------------------------------------------------------------------------
ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS sprint_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'INFO'
        COMMENT 'INFO | WARNING | CRITICAL',
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP NULL,
    ADD CONSTRAINT fk_alerts_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE SET NULL,
    ADD CONSTRAINT chk_alerts_severity CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    ADD INDEX idx_alerts_team_unresolved (team_id, resolved),
    ADD INDEX idx_alerts_user            (user_id);

-- -----------------------------------------------------------------------------
-- 8. consents – thêm UNIQUE constraint (team_id, user_id)
-- -----------------------------------------------------------------------------
ALTER TABLE consents
    ADD CONSTRAINT uk_consents_team_user UNIQUE (team_id, user_id);

-- =============================================================================
-- V6 chưa chạy: tạo expenses + splits
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 9. expenses (nếu chưa có – V6 bị skip)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses
(
    id                 BIGINT         NOT NULL AUTO_INCREMENT,
    team_id            BIGINT         NOT NULL,
    paid_by_member_id  BIGINT         NOT NULL,
    title              VARCHAR(255)   NOT NULL,
    description        TEXT,
    amount             DECIMAL(19, 2) NOT NULL,
    currency           VARCHAR(3)     NOT NULL DEFAULT 'VND',
    split_method       VARCHAR(20)    NOT NULL
        COMMENT 'EQUAL | CUSTOM | PERCENT | CONTRIBUTION',
    expense_date       DATE           NOT NULL,
    linked_sprint_id   BIGINT         NULL
        COMMENT 'Khi chia theo tỷ lệ đóng góp: tham chiếu sprint nào',
    created_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_expenses PRIMARY KEY (id),
    CONSTRAINT fk_expenses_team          FOREIGN KEY (team_id)           REFERENCES teams        (id) ON DELETE CASCADE,
    CONSTRAINT fk_expenses_payer         FOREIGN KEY (paid_by_member_id) REFERENCES team_members (id) ON DELETE RESTRICT,
    CONSTRAINT fk_expenses_linked_sprint FOREIGN KEY (linked_sprint_id)  REFERENCES sprints      (id) ON DELETE SET NULL,
    CONSTRAINT chk_expenses_amount       CHECK (amount > 0),
    CONSTRAINT chk_expenses_split_method CHECK (split_method IN ('EQUAL', 'CUSTOM', 'PERCENT', 'CONTRIBUTION')),

    INDEX idx_expenses_team_date (team_id, expense_date),
    INDEX idx_expenses_payer     (paid_by_member_id)
);

-- -----------------------------------------------------------------------------
-- 10. splits
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS splits
(
    id                 BIGINT         NOT NULL AUTO_INCREMENT,
    expense_id         BIGINT         NOT NULL,
    team_member_id     BIGINT         NOT NULL,
    amount             DECIMAL(19, 2) NOT NULL,
    contribution_ratio DECIMAL(6, 4)  NULL
        COMMENT 'p_i tại thời điểm tính split; NULL nếu không dùng mode CONTRIBUTION',
    created_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_splits PRIMARY KEY (id),
    CONSTRAINT fk_splits_expense FOREIGN KEY (expense_id)     REFERENCES expenses     (id) ON DELETE CASCADE,
    CONSTRAINT fk_splits_member  FOREIGN KEY (team_member_id) REFERENCES team_members (id) ON DELETE RESTRICT,
    CONSTRAINT uk_splits_expense_member UNIQUE (expense_id, team_member_id),
    CONSTRAINT chk_splits_amount_positive CHECK (amount > 0),

    INDEX idx_splits_member (team_member_id)
);
