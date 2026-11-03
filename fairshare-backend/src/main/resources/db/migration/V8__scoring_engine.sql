-- =============================================================================
-- V8: Scoring Engine – 10 bảng mới cho mô hình 4 tầng FairShare
-- Tầng 1: raw_feature_vectors
-- Tầng 2: sprint_feature_stats, normalized_features
-- Tầng 3: dimension_loadings, dimension_scores
-- Tầng 4: scoring_weights
-- Hỗ trợ: sprint_availability, peer_score_aggregates,
--          score_bootstrap_ci, fraud_flags
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. sprint_availability – hệ số khả dụng a_i ∈ [0.5, 1]
-- a_i = available_days / sprint.total_days
-- D'_ik = D_ik · (1 + β(1 − a_i))
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sprint_availability
(
    id                   BIGINT        NOT NULL AUTO_INCREMENT,
    sprint_id            BIGINT        NOT NULL,
    team_member_id       BIGINT        NOT NULL,
    available_days       INT           NOT NULL COMMENT 'Số ngày thành viên có thể làm việc trong sprint',
    reason               VARCHAR(255)  NULL     COMMENT 'Lý do giảm: thi cử, ốm, ...',
    availability_ratio   DECIMAL(4, 3) NULL
        COMMENT 'a_i = available_days / sprint.total_days, clamp về [0.5, 1]',
    confirmed_by_leader  BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_sprint_availability PRIMARY KEY (id),
    CONSTRAINT fk_sa_sprint      FOREIGN KEY (sprint_id)      REFERENCES sprints      (id) ON DELETE CASCADE,
    CONSTRAINT fk_sa_team_member FOREIGN KEY (team_member_id) REFERENCES team_members (id) ON DELETE CASCADE,
    CONSTRAINT uk_sa_sprint_member UNIQUE (sprint_id, team_member_id),
    CONSTRAINT chk_sa_available_days CHECK (available_days >= 0),
    CONSTRAINT chk_sa_ratio CHECK (availability_ratio IS NULL
        OR (availability_ratio >= 0.5 AND availability_ratio <= 1.0)),

    INDEX idx_sa_sprint (sprint_id)
);

-- -----------------------------------------------------------------------------
-- 2. raw_feature_vectors – Tầng 1
-- x_i = (x1, x2, ..., xN) tổng hợp từ activity_events cho mỗi (user, sprint)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_feature_vectors
(
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    sprint_id     BIGINT        NOT NULL,
    user_id       BIGINT        NOT NULL,
    team_id       BIGINT        NOT NULL,

    -- Nhóm A: Sản lượng (Output)
    cards_completed      INT           NOT NULL DEFAULT 0  COMMENT 'Số card hoàn thành',
    total_story_points   DECIMAL(7, 1) NOT NULL DEFAULT 0  COMMENT 'Tổng story point',
    avg_difficulty       DECIMAL(4, 2) NOT NULL DEFAULT 0  COMMENT 'Độ khó trung bình (1–4)',
    checklist_items_done INT           NOT NULL DEFAULT 0  COMMENT 'Checklist item hoàn thành',

    -- Nhóm B: Tin cậy (Reliability)
    on_time_rate     DECIMAL(5, 4) NOT NULL DEFAULT 0  COMMENT 'Tỷ lệ đúng hạn [0,1]',
    median_delay_days DECIMAL(5, 1) NOT NULL DEFAULT 0 COMMENT 'Độ trễ trung vị (ngày)',
    rework_count     INT           NOT NULL DEFAULT 0  COMMENT 'Số lần card bị mở lại',

    -- Nhóm C: Phối hợp (Collaboration)
    helpful_comments      INT NOT NULL DEFAULT 0 COMMENT 'Số bình luận hữu ích',
    cards_reviewed_others INT NOT NULL DEFAULT 0 COMMENT 'Số card review hộ người khác',
    support_mentions      INT NOT NULL DEFAULT 0 COMMENT 'Số lần được gắn @ để hỗ trợ',

    -- Nhóm D: Ngoài hệ thống (External / Manual)
    confirmed_manual_contributions INT NOT NULL DEFAULT 0
        COMMENT 'Đóng góp khai báo thủ công đã xác nhận',

    -- Siêu dữ liệu
    total_events INT       NOT NULL DEFAULT 0 COMMENT 'Tổng số ActivityEvent đã dùng',
    computed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_raw_feature_vectors PRIMARY KEY (id),
    CONSTRAINT fk_rfv_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_rfv_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_rfv_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT uk_rfv_sprint_user UNIQUE (sprint_id, user_id),
    CONSTRAINT chk_rfv_on_time_rate CHECK (on_time_rate  BETWEEN 0 AND 1),
    CONSTRAINT chk_rfv_avg_diff     CHECK (avg_difficulty BETWEEN 0 AND 4),

    INDEX idx_rfv_team_sprint (team_id, sprint_id)
);

-- -----------------------------------------------------------------------------
-- 3. sprint_feature_stats – Tầng 2 (median & MAD của nhóm sau ln-transform)
-- Dùng để tính z-score robust: z_ij = (x̃_ij − median_j) / (1.4826 · MAD_j + ε)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sprint_feature_stats
(
    id        BIGINT NOT NULL AUTO_INCREMENT,
    sprint_id BIGINT NOT NULL,
    team_id   BIGINT NOT NULL,

    -- Sản lượng
    median_ln_cards_completed DECIMAL(10, 6) NULL,
    mad_ln_cards_completed    DECIMAL(10, 6) NULL,
    median_ln_story_points    DECIMAL(10, 6) NULL,
    mad_ln_story_points       DECIMAL(10, 6) NULL,
    median_ln_avg_difficulty  DECIMAL(10, 6) NULL,
    mad_ln_avg_difficulty     DECIMAL(10, 6) NULL,
    median_ln_checklist_done  DECIMAL(10, 6) NULL,
    mad_ln_checklist_done     DECIMAL(10, 6) NULL,

    -- Tin cậy
    median_ln_on_time_rate    DECIMAL(10, 6) NULL,
    mad_ln_on_time_rate       DECIMAL(10, 6) NULL,
    median_ln_median_delay    DECIMAL(10, 6) NULL,
    mad_ln_median_delay       DECIMAL(10, 6) NULL,
    median_ln_rework_count    DECIMAL(10, 6) NULL,
    mad_ln_rework_count       DECIMAL(10, 6) NULL,

    -- Phối hợp
    median_ln_helpful_comments DECIMAL(10, 6) NULL,
    mad_ln_helpful_comments    DECIMAL(10, 6) NULL,
    median_ln_cards_reviewed   DECIMAL(10, 6) NULL,
    mad_ln_cards_reviewed      DECIMAL(10, 6) NULL,
    median_ln_support_mentions DECIMAL(10, 6) NULL,
    mad_ln_support_mentions    DECIMAL(10, 6) NULL,

    -- Ngoài hệ thống
    median_ln_manual_contrib  DECIMAL(10, 6) NULL,
    mad_ln_manual_contrib     DECIMAL(10, 6) NULL,

    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_sprint_feature_stats PRIMARY KEY (id),
    CONSTRAINT fk_sfs_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_sfs_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT uk_sfs_sprint_team UNIQUE (sprint_id, team_id)
);

-- -----------------------------------------------------------------------------
-- 4. normalized_features – Tầng 2 (z-score đã cắt biên [-3, 3])
-- x̃ = ln(1 + x) → z_ij = (x̃_ij − median_j) / (1.4826 · MAD_j + ε), cắt [-3,3]
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS normalized_features
(
    id        BIGINT NOT NULL AUTO_INCREMENT,
    sprint_id BIGINT NOT NULL,
    user_id   BIGINT NOT NULL,
    team_id   BIGINT NOT NULL,

    -- z ∈ [-3, 3] cho từng đặc trưng
    z_cards_completed DECIMAL(6, 4) NULL,
    z_story_points    DECIMAL(6, 4) NULL,
    z_avg_difficulty  DECIMAL(6, 4) NULL,
    z_checklist_done  DECIMAL(6, 4) NULL,

    -- Reliability (delay & rework đảo dấu: thấp = tốt)
    z_on_time_rate    DECIMAL(6, 4) NULL,
    z_median_delay    DECIMAL(6, 4) NULL COMMENT 'Đảo dấu: delay thấp → z cao',
    z_rework_count    DECIMAL(6, 4) NULL COMMENT 'Đảo dấu: rework ít → z cao',

    -- Collaboration
    z_helpful_comments DECIMAL(6, 4) NULL,
    z_cards_reviewed   DECIMAL(6, 4) NULL,
    z_support_mentions DECIMAL(6, 4) NULL,

    -- External
    z_manual_contrib  DECIMAL(6, 4) NULL,

    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_normalized_features PRIMARY KEY (id),
    CONSTRAINT fk_nf_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_nf_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_nf_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT uk_nf_sprint_user UNIQUE (sprint_id, user_id),
    CONSTRAINT chk_nf_z_cards   CHECK (z_cards_completed  IS NULL OR z_cards_completed  BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_sp      CHECK (z_story_points     IS NULL OR z_story_points     BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_diff    CHECK (z_avg_difficulty   IS NULL OR z_avg_difficulty   BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_cl      CHECK (z_checklist_done   IS NULL OR z_checklist_done   BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_ot      CHECK (z_on_time_rate     IS NULL OR z_on_time_rate     BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_delay   CHECK (z_median_delay     IS NULL OR z_median_delay     BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_rework  CHECK (z_rework_count     IS NULL OR z_rework_count     BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_comment CHECK (z_helpful_comments IS NULL OR z_helpful_comments BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_review  CHECK (z_cards_reviewed   IS NULL OR z_cards_reviewed   BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_support CHECK (z_support_mentions IS NULL OR z_support_mentions BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_manual  CHECK (z_manual_contrib   IS NULL OR z_manual_contrib   BETWEEN -3 AND 3),

    INDEX idx_nf_team_sprint (team_id, sprint_id)
);

-- -----------------------------------------------------------------------------
-- 5. dimension_loadings – Tầng 3 (trọng số λ_kj ≥ 0, Σλ = 1)
-- d_ik = Σⱼ λ_kj · z_ij
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dimension_loadings
(
    id        BIGINT      NOT NULL AUTO_INCREMENT,
    team_id   BIGINT      NOT NULL,
    sprint_id BIGINT      NULL COMMENT 'NULL = áp dụng mặc định cho mọi sprint của nhóm',
    dimension VARCHAR(20) NOT NULL COMMENT 'D1_OUTPUT | D2_RELIABILITY | D3_COLLABORATION | D4_PEER',

    lam_cards_completed DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_story_points    DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_avg_difficulty  DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_checklist_done  DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_on_time_rate    DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_median_delay    DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_rework_count    DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_helpful_comments DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_cards_reviewed  DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_support_mentions DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_manual_contrib  DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    is_default BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_dimension_loadings PRIMARY KEY (id),
    CONSTRAINT fk_dl_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_dl_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE SET NULL,
    CONSTRAINT chk_dl_dimension CHECK (dimension IN ('D1_OUTPUT', 'D2_RELIABILITY', 'D3_COLLABORATION', 'D4_PEER')),

    INDEX idx_dl_team_sprint_dim (team_id, sprint_id, dimension)
);

-- -----------------------------------------------------------------------------
-- 6. dimension_scores – Tầng 3 (D_ik trước & sau hiệu chỉnh khả dụng)
-- D'_ik = D_ik · (1 + β(1 − a_i))  với β ≈ 0.5
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dimension_scores
(
    id        BIGINT NOT NULL AUTO_INCREMENT,
    sprint_id BIGINT NOT NULL,
    user_id   BIGINT NOT NULL,
    team_id   BIGINT NOT NULL,

    -- Trước hiệu chỉnh
    d1_output        DECIMAL(8, 5) NULL COMMENT 'D1: Làm được bao nhiêu, khó cỡ nào',
    d2_reliability   DECIMAL(8, 5) NULL COMMENT 'D2: Làm có đáng tin không',
    d3_collaboration DECIMAL(8, 5) NULL COMMENT 'D3: Giúp cả nhóm chạy',
    d4_peer          DECIMAL(8, 5) NULL COMMENT 'D4: Nhóm nhìn nhận ra sao (NULL nếu < 3 lượt)',

    -- Sau hiệu chỉnh khả dụng
    d1_output_adj        DECIMAL(8, 5) NULL,
    d2_reliability_adj   DECIMAL(8, 5) NULL,
    d3_collaboration_adj DECIMAL(8, 5) NULL,
    d4_peer_adj          DECIMAL(8, 5) NULL,

    availability_ratio DECIMAL(4, 3) NULL COMMENT 'a_i ∈ [0.5, 1]',
    beta_used          DECIMAL(4, 3) NOT NULL DEFAULT 0.500 COMMENT 'β ≈ 0.5',

    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_dimension_scores PRIMARY KEY (id),
    CONSTRAINT fk_ds_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_ds_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_ds_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT uk_ds_sprint_user UNIQUE (sprint_id, user_id),
    CONSTRAINT chk_ds_avail CHECK (availability_ratio IS NULL
        OR (availability_ratio >= 0.5 AND availability_ratio <= 1.0)),

    INDEX idx_ds_team_sprint (team_id, sprint_id)
);

-- -----------------------------------------------------------------------------
-- 7. peer_score_aggregates – D4 tổng hợp ẩn danh (≥ 3 lượt chấm)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS peer_score_aggregates
(
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    review_round_id BIGINT        NOT NULL,
    sprint_id       BIGINT        NOT NULL,
    reviewee_id     BIGINT        NOT NULL,
    team_id         BIGINT        NOT NULL,

    submission_count INT          NOT NULL DEFAULT 0,
    avg_quality      DECIMAL(4, 2) NULL,
    avg_punctuality  DECIMAL(4, 2) NULL,
    avg_cooperation  DECIMAL(4, 2) NULL,
    d4_score         DECIMAL(6, 4) NULL
        COMMENT 'Điểm D4 chuẩn hoá [0,1]; NULL khi submission_count < 3',
    is_sufficient    BOOLEAN       NOT NULL DEFAULT FALSE
        COMMENT 'TRUE khi submission_count >= min_submissions_required',

    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_peer_score_aggregates PRIMARY KEY (id),
    CONSTRAINT fk_psa_round    FOREIGN KEY (review_round_id) REFERENCES review_rounds (id) ON DELETE CASCADE,
    CONSTRAINT fk_psa_sprint   FOREIGN KEY (sprint_id)       REFERENCES sprints       (id) ON DELETE CASCADE,
    CONSTRAINT fk_psa_reviewee FOREIGN KEY (reviewee_id)     REFERENCES users         (id) ON DELETE CASCADE,
    CONSTRAINT fk_psa_team     FOREIGN KEY (team_id)         REFERENCES teams         (id) ON DELETE CASCADE,
    CONSTRAINT uk_psa_round_reviewee UNIQUE (review_round_id, reviewee_id),

    INDEX idx_psa_sprint_team (sprint_id, team_id)
);

-- -----------------------------------------------------------------------------
-- 8. scoring_weights – Tầng 4 (w = 0.40 / 0.20 / 0.15 / 0.25)
-- C_i = 100 · σ(Σₖ w_k · D'_ik)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scoring_weights
(
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    team_id         BIGINT        NOT NULL,
    sprint_id       BIGINT        NULL,
    -- Trọng số khi có D4
    w_output        DECIMAL(5, 4) NOT NULL DEFAULT 0.4000,
    w_reliability   DECIMAL(5, 4) NOT NULL DEFAULT 0.2000,
    w_collaboration DECIMAL(5, 4) NOT NULL DEFAULT 0.1500,
    w_peer          DECIMAL(5, 4) NOT NULL DEFAULT 0.2500,
    -- Trọng số phân phối lại khi không đủ D4 (tổng = 1)
    w_output_no_peer        DECIMAL(5, 4) NULL DEFAULT 0.5333,
    w_reliability_no_peer   DECIMAL(5, 4) NULL DEFAULT 0.2667,
    w_collaboration_no_peer DECIMAL(5, 4) NULL DEFAULT 0.2000,

    is_default BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_scoring_weights PRIMARY KEY (id),
    CONSTRAINT fk_sw_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_sw_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE SET NULL,
    CONSTRAINT chk_sw_sum CHECK (
        ABS(w_output + w_reliability + w_collaboration + w_peer - 1.0) < 0.0001
    ),
    CONSTRAINT chk_sw_positive CHECK (
        w_output >= 0 AND w_reliability >= 0
        AND w_collaboration >= 0 AND w_peer >= 0
    )
);

-- -----------------------------------------------------------------------------
-- 9. score_bootstrap_ci – Độ tin cậy bootstrap (1000 lần resample)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS score_bootstrap_ci
(
    id                    BIGINT        NOT NULL AUTO_INCREMENT,
    contribution_score_id BIGINT        NOT NULL,
    sprint_id             BIGINT        NOT NULL,
    user_id               BIGINT        NOT NULL,

    bootstrap_iterations INT           NOT NULL DEFAULT 1000,
    ci_lower_95          DECIMAL(6, 4) NULL COMMENT 'Cận dưới 95% CI của p_i',
    ci_upper_95          DECIMAL(6, 4) NULL COMMENT 'Cận trên 95% CI của p_i',
    ci_lower_80          DECIMAL(6, 4) NULL,
    ci_upper_80          DECIMAL(6, 4) NULL,
    std_error            DECIMAL(6, 4) NULL,
    is_reliable          BOOLEAN       NOT NULL DEFAULT FALSE
        COMMENT 'FALSE khi total_events < 5 → hiển thị "chưa đủ bằng chứng"',

    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_score_bootstrap_ci PRIMARY KEY (id),
    CONSTRAINT fk_bci_contribution FOREIGN KEY (contribution_score_id)
        REFERENCES contribution_scores (id) ON DELETE CASCADE,
    CONSTRAINT fk_bci_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_bci_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT uk_bci_contribution UNIQUE (contribution_score_id),

    INDEX idx_bci_sprint_user (sprint_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 10. fraud_flags – Phát hiện gian lận và mất cân bằng
-- δ_i = sqrt(Σ (D_ik − D̄_k)² / var_k) – Euclidean chuẩn hoá
-- Cờ: D1 cao bất thường + D4 thấp đáng kể → GAMING_SUSPICION
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fraud_flags
(
    id                   BIGINT        NOT NULL AUTO_INCREMENT,
    sprint_id            BIGINT        NOT NULL,
    user_id              BIGINT        NOT NULL,
    team_id              BIGINT        NOT NULL,

    distance_to_centroid DECIMAL(8, 4) NULL
        COMMENT 'δ_i = sqrt(Σ (D_ik − D̄_k)² / var_k)',
    suspicion_score      DECIMAL(5, 2) NULL COMMENT 'Điểm ngờ vực [0, 100]',
    flag_reason          VARCHAR(255)  NULL
        COMMENT '"D1_HIGH_D4_LOW" | "OUTLIER_DISTANCE" | "REWORK_SPIKE"',
    flag_type            VARCHAR(50)   NOT NULL
        COMMENT 'FREE_RIDER | IMBALANCED_PROFILE | OUTLIER | GAMING_SUSPICION',
    severity             VARCHAR(20)   NOT NULL DEFAULT 'LOW'
        COMMENT 'LOW | MEDIUM | HIGH',

    is_resolved    BOOLEAN   NOT NULL DEFAULT FALSE,
    resolved_by    BIGINT    NULL,
    resolved_at    TIMESTAMP NULL,
    resolution_note TEXT     NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_fraud_flags PRIMARY KEY (id),
    CONSTRAINT fk_ff_sprint      FOREIGN KEY (sprint_id)   REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_ff_user        FOREIGN KEY (user_id)     REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_ff_team        FOREIGN KEY (team_id)     REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_ff_resolved_by FOREIGN KEY (resolved_by) REFERENCES users   (id) ON DELETE SET NULL,
    CONSTRAINT chk_ff_severity  CHECK (severity  IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT chk_ff_flag_type CHECK (flag_type IN (
        'FREE_RIDER', 'IMBALANCED_PROFILE', 'OUTLIER', 'GAMING_SUSPICION'
    )),

    INDEX idx_ff_team_sprint (team_id, sprint_id),
    INDEX idx_ff_unresolved  (team_id, is_resolved),
    INDEX idx_ff_user_sprint (user_id, sprint_id)
);

-- =============================================================================
-- Views phân tích
-- =============================================================================

CREATE OR REPLACE VIEW v_sprint_member_summary AS
SELECT
    cs.sprint_id,
    cs.team_id,
    cs.user_id,
    u.full_name,
    u.email,
    s.name                          AS sprint_name,
    s.start_date,
    s.end_date,
    cs.score                        AS contribution_score,
    cs.percentage                   AS contribution_ratio,
    cs.peer_included,
    cs.has_sufficient_data,
    cs.total_events_used,
    ds.d1_output_adj,
    ds.d2_reliability_adj,
    ds.d3_collaboration_adj,
    ds.d4_peer_adj,
    ds.availability_ratio,
    bci.ci_lower_95,
    bci.ci_upper_95,
    bci.is_reliable                 AS ci_is_reliable,
    ff.flag_type,
    ff.severity                     AS fraud_severity,
    ff.is_resolved                  AS fraud_resolved
FROM contribution_scores cs
    JOIN users   u  ON u.id  = cs.user_id
    JOIN sprints s  ON s.id  = cs.sprint_id
    LEFT JOIN dimension_scores   ds  ON ds.sprint_id = cs.sprint_id AND ds.user_id = cs.user_id
    LEFT JOIN score_bootstrap_ci bci ON bci.contribution_score_id  = cs.id
    LEFT JOIN fraud_flags        ff  ON ff.sprint_id = cs.sprint_id AND ff.user_id = cs.user_id
                                    AND ff.is_resolved = FALSE;

CREATE OR REPLACE VIEW v_radar_profile AS
SELECT
    ds.sprint_id,
    ds.team_id,
    ds.user_id,
    u.full_name,
    ROUND(ds.d1_output_adj,        4) AS d1_output,
    ROUND(ds.d2_reliability_adj,   4) AS d2_reliability,
    ROUND(ds.d3_collaboration_adj, 4) AS d3_collaboration,
    ROUND(ds.d4_peer_adj,          4) AS d4_peer,
    ds.availability_ratio,
    ROUND(1 / (1 + EXP(-ds.d1_output_adj)),                        4) AS d1_normalized,
    ROUND(1 / (1 + EXP(-ds.d2_reliability_adj)),                   4) AS d2_normalized,
    ROUND(1 / (1 + EXP(-ds.d3_collaboration_adj)),                  4) AS d3_normalized,
    ROUND(1 / (1 + EXP(-COALESCE(ds.d4_peer_adj, 0))),             4) AS d4_normalized
FROM dimension_scores ds
    JOIN users u ON u.id = ds.user_id;

CREATE OR REPLACE VIEW v_feature_audit AS
SELECT
    rfv.sprint_id,
    rfv.team_id,
    rfv.user_id,
    u.full_name,
    rfv.cards_completed,
    rfv.total_story_points,
    rfv.avg_difficulty,
    rfv.checklist_items_done,
    rfv.on_time_rate,
    rfv.median_delay_days,
    rfv.rework_count,
    rfv.helpful_comments,
    rfv.cards_reviewed_others,
    rfv.support_mentions,
    rfv.confirmed_manual_contributions,
    rfv.total_events,
    nf.z_cards_completed,
    nf.z_story_points,
    nf.z_avg_difficulty,
    nf.z_checklist_done,
    nf.z_on_time_rate,
    nf.z_median_delay,
    nf.z_rework_count,
    nf.z_helpful_comments,
    nf.z_cards_reviewed,
    nf.z_support_mentions,
    nf.z_manual_contrib
FROM raw_feature_vectors rfv
    JOIN users u ON u.id = rfv.user_id
    LEFT JOIN normalized_features nf
        ON nf.sprint_id = rfv.sprint_id AND nf.user_id = rfv.user_id;
