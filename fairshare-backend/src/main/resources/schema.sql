-- =============================================================================
-- FairShare – Complete Database Schema
-- Mô hình 4 tầng đánh giá đóng góp thành viên (FairShare Scoring Engine)
-- Target: MySQL 8.0+
-- =============================================================================
-- Thứ tự tạo bảng tuân theo thứ tự phụ thuộc FK:
--   users → teams → team_members → consents
--   teams → sprints
--   teams + users → activity_events
--   sprints + team_members → sprint_availability
--   activity_events → raw_feature_vectors  (Tầng 1)
--   raw_feature_vectors → normalized_features (Tầng 2)
--   normalized_features → dimension_scores  (Tầng 3)
--   dimension_scores → contribution_scores  (Tầng 4)
--   sprints → review_rounds → review_submissions
--   review_submissions → peer_score_aggregates
--   contribution_scores → score_bootstrap_ci
--   contribution_scores → fraud_flags
--   teams → expenses → splits
--   teams + users → manual_contributions
--   teams + users → alerts
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- PHẦN I – NỀN TẢNG (Foundation)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users
(
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    email      VARCHAR(255) NOT NULL,
    password   VARCHAR(255) NOT NULL,
    full_name  VARCHAR(255),
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
);

-- -----------------------------------------------------------------------------
-- 2. teams
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams
(
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_teams PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- 3. team_members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members
(
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    team_id    BIGINT      NOT NULL,
    user_id    BIGINT      NOT NULL,
    role       VARCHAR(50) NOT NULL COMMENT 'LEADER | MEMBER',
    created_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_team_members PRIMARY KEY (id),
    CONSTRAINT fk_team_members_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_team_members_team_user UNIQUE (team_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 4. consents  – đồng ý sử dụng dữ liệu hoạt động
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consents
(
    id         BIGINT    NOT NULL AUTO_INCREMENT,
    team_id    BIGINT    NOT NULL,
    user_id    BIGINT    NOT NULL,
    agreed     BOOLEAN   NOT NULL DEFAULT FALSE,
    agreed_at  TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_consents PRIMARY KEY (id),
    CONSTRAINT fk_consents_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_consents_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uk_consents_team_user UNIQUE (team_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 5. sprints
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sprints
(
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    team_id      BIGINT       NOT NULL,
    name         VARCHAR(255) NOT NULL,
    start_date   DATE,
    end_date     DATE,
    total_days   INT AS (DATEDIFF(end_date, start_date) + 1) STORED
        COMMENT 'Tổng số ngày sprint – dùng tính hệ số khả dụng a_i',
    status       VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
        COMMENT 'ACTIVE | CLOSED | ARCHIVED',
    created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_sprints PRIMARY KEY (id),
    CONSTRAINT fk_sprints_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT chk_sprints_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_sprints_status CHECK (status IN ('ACTIVE', 'CLOSED', 'ARCHIVED')),

    INDEX idx_sprints_team_status (team_id, status)
);

-- =============================================================================
-- PHẦN II – THU THẬP SỰ KIỆN (ActivityEvent)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 6. activity_events  – mọi sự kiện thô từ Trello / Google Docs / Manual
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_events
(
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    team_id     BIGINT       NOT NULL,
    sprint_id   BIGINT       NULL
        COMMENT 'NULL nếu chưa gán sprint, gán sau khi đồng bộ',
    user_id     BIGINT       NOT NULL,
    source      VARCHAR(50)  NOT NULL COMMENT 'TRELLO | GOOGLE_DOCS | MANUAL',
    event_type  VARCHAR(100) NOT NULL
        COMMENT 'CARD_COMPLETED | CARD_REOPENED | COMMENT_ADDED | CHECKLIST_ITEM_DONE | CARD_REVIEWED | MENTION_SUPPORT | MANUAL_CONTRIBUTION | ...',
    -- Các trường đặc trưng thô trích từ event_type (Tầng 1)
    story_points      DECIMAL(5, 1) NULL COMMENT 'Story point của card (nếu có)',
    difficulty_level  TINYINT       NULL COMMENT '1=Dễ 2=Trung bình 3=Khó 4=Rất khó',
    is_on_time        BOOLEAN       NULL COMMENT 'TRUE = hoàn thành trước/đúng deadline',
    delay_days        DECIMAL(5, 1) NULL DEFAULT 0 COMMENT 'Số ngày trễ (dương = trễ)',
    is_helpful_comment BOOLEAN      NULL COMMENT 'Bình luận được đánh dấu hữu ích',
    is_support_mention BOOLEAN      NULL COMMENT 'Được gắn @ để hỗ trợ người khác',
    is_review_for_others BOOLEAN    NULL COMMENT 'Review card thay cho người khác',
    details     TEXT         NULL    COMMENT 'JSON payload gốc từ integration (Trello card id, Google doc id, ...)',
    occurred_at TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_activity_events PRIMARY KEY (id),
    CONSTRAINT fk_activity_events_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_activity_events_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE SET NULL,
    CONSTRAINT fk_activity_events_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT chk_ae_source CHECK (source IN ('TRELLO', 'GOOGLE_DOCS', 'MANUAL')),
    CONSTRAINT chk_ae_difficulty CHECK (difficulty_level IS NULL OR difficulty_level BETWEEN 1 AND 4),
    CONSTRAINT chk_ae_delay CHECK (delay_days >= 0),

    INDEX idx_ae_team_sprint_user (team_id, sprint_id, user_id),
    INDEX idx_ae_user_sprint      (user_id, sprint_id),
    INDEX idx_ae_occurred_at      (occurred_at)
);

-- =============================================================================
-- PHẦN III – HỆ SỐ KHẢ DỤNG (Sprint Availability)
-- Tầng 4 – a_i = ngày_có_mặt / tổng_ngày_sprint  ∈ [0.5, 1]
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 7. sprint_availability  – khai báo ngày khả dụng mỗi thành viên mỗi sprint
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sprint_availability
(
    id              BIGINT         NOT NULL AUTO_INCREMENT,
    sprint_id       BIGINT         NOT NULL,
    team_member_id  BIGINT         NOT NULL,
    available_days  INT            NOT NULL COMMENT 'Số ngày thành viên có thể làm việc trong sprint',
    reason          VARCHAR(255)   NULL     COMMENT 'Lý do giảm: thi cử, ốm, ...',
    -- a_i được tính động bằng VIEW hoặc Service, lưu cache để tránh tính lại
    availability_ratio DECIMAL(4, 3) NULL
        COMMENT 'a_i = available_days / sprint.total_days, đã clamp về [0.5, 1]',
    confirmed_by_leader BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_sprint_availability PRIMARY KEY (id),
    CONSTRAINT fk_sa_sprint      FOREIGN KEY (sprint_id)      REFERENCES sprints      (id) ON DELETE CASCADE,
    CONSTRAINT fk_sa_team_member FOREIGN KEY (team_member_id) REFERENCES team_members (id) ON DELETE CASCADE,
    CONSTRAINT uk_sa_sprint_member UNIQUE (sprint_id, team_member_id),
    CONSTRAINT chk_sa_available_days  CHECK (available_days >= 0),
    CONSTRAINT chk_sa_ratio CHECK (availability_ratio IS NULL
        OR (availability_ratio >= 0.5 AND availability_ratio <= 1.0)),

    INDEX idx_sa_sprint (sprint_id)
);

-- =============================================================================
-- PHẦN IV – TẦNG 1: VECTOR ĐẶC TRƯNG THÔ (Raw Feature Vectors)
-- x_i = (x1, x2, ..., xN) tổng hợp từ activity_events cho mỗi (user, sprint)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 8. raw_feature_vectors  – véc-tơ đặc trưng thô tổng hợp mỗi thành viên/sprint
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS raw_feature_vectors
(
    id             BIGINT NOT NULL AUTO_INCREMENT,
    sprint_id      BIGINT NOT NULL,
    user_id        BIGINT NOT NULL,
    team_id        BIGINT NOT NULL,

    -- Nhóm A: Sản lượng (Output)
    cards_completed       INT            NOT NULL DEFAULT 0  COMMENT 'Số card hoàn thành',
    total_story_points    DECIMAL(7, 1)  NOT NULL DEFAULT 0  COMMENT 'Tổng story point',
    avg_difficulty        DECIMAL(4, 2)  NOT NULL DEFAULT 0  COMMENT 'Độ khó trung bình (1–4)',
    checklist_items_done  INT            NOT NULL DEFAULT 0  COMMENT 'Checklist item hoàn thành',

    -- Nhóm B: Tin cậy (Reliability)
    on_time_rate          DECIMAL(5, 4)  NOT NULL DEFAULT 0  COMMENT 'Tỷ lệ đúng hạn [0,1]',
    median_delay_days     DECIMAL(5, 1)  NOT NULL DEFAULT 0  COMMENT 'Độ trễ trung vị (ngày)',
    rework_count          INT            NOT NULL DEFAULT 0  COMMENT 'Số lần card bị mở lại (rework)',

    -- Nhóm C: Phối hợp (Collaboration)
    helpful_comments      INT            NOT NULL DEFAULT 0  COMMENT 'Số bình luận hữu ích',
    cards_reviewed_others INT            NOT NULL DEFAULT 0  COMMENT 'Số card review hộ người khác',
    support_mentions      INT            NOT NULL DEFAULT 0  COMMENT 'Số lần được gắn @ để hỗ trợ',

    -- Nhóm D: Ngoài hệ thống (External / Manual)
    confirmed_manual_contributions INT   NOT NULL DEFAULT 0  COMMENT 'Đóng góp khai báo thủ công đã xác nhận',

    -- Siêu dữ liệu tính toán
    total_events          INT            NOT NULL DEFAULT 0  COMMENT 'Tổng số ActivityEvent dùng để tính',
    computed_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
        COMMENT 'Thời điểm tổng hợp lần cuối',
    created_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_raw_feature_vectors PRIMARY KEY (id),
    CONSTRAINT fk_rfv_sprint  FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_rfv_user    FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_rfv_team    FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT uk_rfv_sprint_user UNIQUE (sprint_id, user_id),
    CONSTRAINT chk_rfv_on_time_rate  CHECK (on_time_rate  BETWEEN 0 AND 1),
    CONSTRAINT chk_rfv_avg_diff      CHECK (avg_difficulty BETWEEN 0 AND 4),

    INDEX idx_rfv_team_sprint (team_id, sprint_id)
);

-- =============================================================================
-- PHẦN V – TẦNG 2: CHUẨN HÓA CHỐNG GIAN LẬN (Normalized Features)
-- x̃ = ln(1 + x)  →  z_ij = (x̃_ij − median_j) / (1.4826 · MAD_j + ε)
-- Cắt biên z về [−3, 3]
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 9. sprint_feature_stats  – median và MAD của nhóm cho mỗi sprint
--    (dùng để tính z-score robust; lưu lại để audit và tái sử dụng)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sprint_feature_stats
(
    id        BIGINT NOT NULL AUTO_INCREMENT,
    sprint_id BIGINT NOT NULL,
    team_id   BIGINT NOT NULL,

    -- median & MAD cho từng đặc trưng (sau ln-transform)
    -- Sản lượng
    median_ln_cards_completed    DECIMAL(10, 6) NULL,
    mad_ln_cards_completed       DECIMAL(10, 6) NULL,
    median_ln_story_points       DECIMAL(10, 6) NULL,
    mad_ln_story_points          DECIMAL(10, 6) NULL,
    median_ln_avg_difficulty     DECIMAL(10, 6) NULL,
    mad_ln_avg_difficulty        DECIMAL(10, 6) NULL,
    median_ln_checklist_done     DECIMAL(10, 6) NULL,
    mad_ln_checklist_done        DECIMAL(10, 6) NULL,

    -- Tin cậy
    median_ln_on_time_rate       DECIMAL(10, 6) NULL,
    mad_ln_on_time_rate          DECIMAL(10, 6) NULL,
    median_ln_median_delay       DECIMAL(10, 6) NULL,
    mad_ln_median_delay          DECIMAL(10, 6) NULL,
    median_ln_rework_count       DECIMAL(10, 6) NULL,
    mad_ln_rework_count          DECIMAL(10, 6) NULL,

    -- Phối hợp
    median_ln_helpful_comments   DECIMAL(10, 6) NULL,
    mad_ln_helpful_comments      DECIMAL(10, 6) NULL,
    median_ln_cards_reviewed     DECIMAL(10, 6) NULL,
    mad_ln_cards_reviewed        DECIMAL(10, 6) NULL,
    median_ln_support_mentions   DECIMAL(10, 6) NULL,
    mad_ln_support_mentions      DECIMAL(10, 6) NULL,

    -- Ngoài hệ thống
    median_ln_manual_contrib     DECIMAL(10, 6) NULL,
    mad_ln_manual_contrib        DECIMAL(10, 6) NULL,

    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_sprint_feature_stats PRIMARY KEY (id),
    CONSTRAINT fk_sfs_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_sfs_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT uk_sfs_sprint_team UNIQUE (sprint_id, team_id)
);

-- -----------------------------------------------------------------------------
-- 10. normalized_features  – z-score robust đã cắt biên [−3, 3] cho mỗi (user, sprint)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS normalized_features
(
    id        BIGINT NOT NULL AUTO_INCREMENT,
    sprint_id BIGINT NOT NULL,
    user_id   BIGINT NOT NULL,
    team_id   BIGINT NOT NULL,

    -- z-score sau ln-transform, cắt biên về [-3, 3]
    -- Sản lượng
    z_cards_completed    DECIMAL(6, 4) NULL COMMENT 'z ∈ [-3, 3]',
    z_story_points       DECIMAL(6, 4) NULL,
    z_avg_difficulty     DECIMAL(6, 4) NULL,
    z_checklist_done     DECIMAL(6, 4) NULL,

    -- Tin cậy (delay_days: chiều âm – delay cao → z thấp)
    z_on_time_rate       DECIMAL(6, 4) NULL,
    z_median_delay       DECIMAL(6, 4) NULL COMMENT 'Đảo dấu: delay thấp = đáng tin cao',
    z_rework_count       DECIMAL(6, 4) NULL COMMENT 'Đảo dấu: rework ít = đáng tin cao',

    -- Phối hợp
    z_helpful_comments   DECIMAL(6, 4) NULL,
    z_cards_reviewed     DECIMAL(6, 4) NULL,
    z_support_mentions   DECIMAL(6, 4) NULL,

    -- Ngoài hệ thống
    z_manual_contrib     DECIMAL(6, 4) NULL,

    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_normalized_features PRIMARY KEY (id),
    CONSTRAINT fk_nf_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_nf_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_nf_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT uk_nf_sprint_user UNIQUE (sprint_id, user_id),

    -- Đảm bảo biên [-3, 3]
    CONSTRAINT chk_nf_z_cards    CHECK (z_cards_completed  IS NULL OR z_cards_completed  BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_sp       CHECK (z_story_points     IS NULL OR z_story_points     BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_diff     CHECK (z_avg_difficulty   IS NULL OR z_avg_difficulty   BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_cl       CHECK (z_checklist_done   IS NULL OR z_checklist_done   BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_ot       CHECK (z_on_time_rate     IS NULL OR z_on_time_rate     BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_delay    CHECK (z_median_delay     IS NULL OR z_median_delay     BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_rework   CHECK (z_rework_count     IS NULL OR z_rework_count     BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_comment  CHECK (z_helpful_comments IS NULL OR z_helpful_comments BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_review   CHECK (z_cards_reviewed   IS NULL OR z_cards_reviewed   BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_support  CHECK (z_support_mentions IS NULL OR z_support_mentions BETWEEN -3 AND 3),
    CONSTRAINT chk_nf_z_manual   CHECK (z_manual_contrib   IS NULL OR z_manual_contrib   BETWEEN -3 AND 3),

    INDEX idx_nf_team_sprint (team_id, sprint_id)
);

-- =============================================================================
-- PHẦN VI – TẦNG 3: NÉN VỀ K CHIỀU CHÍNH (Dimension Scores)
-- d_ik = Σⱼ λ_kj · z_ij   với Σⱼ λ_kj = 1, λ_kj ≥ 0
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 11. dimension_loadings  – trọng số λ_kj có thể cấu hình theo nhóm/sprint
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dimension_loadings
(
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    team_id     BIGINT        NOT NULL,
    sprint_id   BIGINT        NULL COMMENT 'NULL = áp dụng mặc định cho mọi sprint của nhóm',
    dimension   VARCHAR(20)   NOT NULL COMMENT 'D1_OUTPUT | D2_RELIABILITY | D3_COLLABORATION | D4_PEER',

    -- Loading không âm cho từng feature trong chiều này (tổng = 1)
    -- D1_OUTPUT
    lam_cards_completed    DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_story_points       DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_avg_difficulty     DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_checklist_done     DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    -- D2_RELIABILITY
    lam_on_time_rate       DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_median_delay       DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_rework_count       DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    -- D3_COLLABORATION
    lam_helpful_comments   DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_cards_reviewed     DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    lam_support_mentions   DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    -- D4_PEER (không dùng loading riêng vì D4 lấy từ peer_score_aggregates)
    -- D_EXTERNAL (Ngoài hệ thống)
    lam_manual_contrib     DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,

    is_default  BOOLEAN       NOT NULL DEFAULT FALSE
        COMMENT 'TRUE = cấu hình mặc định dùng khi chưa có sprint-level config',
    created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_dimension_loadings PRIMARY KEY (id),
    CONSTRAINT fk_dl_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_dl_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE SET NULL,
    CONSTRAINT chk_dl_dimension CHECK (dimension IN ('D1_OUTPUT', 'D2_RELIABILITY', 'D3_COLLABORATION', 'D4_PEER')),

    INDEX idx_dl_team_sprint_dim (team_id, sprint_id, dimension)
);

-- -----------------------------------------------------------------------------
-- 12. dimension_scores  – D_ik sau khi nhân loading
-- d_ik = Σⱼ λ_kj · z_ij
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dimension_scores
(
    id        BIGINT NOT NULL AUTO_INCREMENT,
    sprint_id BIGINT NOT NULL,
    user_id   BIGINT NOT NULL,
    team_id   BIGINT NOT NULL,

    -- 4 chiều chính (trước hiệu chỉnh khả dụng)
    d1_output        DECIMAL(8, 5) NULL COMMENT 'D1: Làm được bao nhiêu, khó cỡ nào',
    d2_reliability   DECIMAL(8, 5) NULL COMMENT 'D2: Làm có đáng tin không',
    d3_collaboration DECIMAL(8, 5) NULL COMMENT 'D3: Giúp cả nhóm chạy',
    d4_peer          DECIMAL(8, 5) NULL COMMENT 'D4: Nhóm nhìn nhận ra sao (NULL nếu < 3 lượt chấm)',

    -- Sau hiệu chỉnh khả dụng: D'_ik = D_ik · (1 + β(1 − a_i))  với β ≈ 0.5
    d1_output_adj        DECIMAL(8, 5) NULL,
    d2_reliability_adj   DECIMAL(8, 5) NULL,
    d3_collaboration_adj DECIMAL(8, 5) NULL,
    d4_peer_adj          DECIMAL(8, 5) NULL,

    -- Hệ số khả dụng đã dùng
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

-- =============================================================================
-- PHẦN VII – CHẤM CHÉO (Peer Review)
-- D4: Điểm chấm chéo ẩn danh – chỉ có khi ≥ 3 lượt chấm
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 13. review_rounds  – vòng chấm chéo gắn với sprint
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_rounds
(
    id                      BIGINT       NOT NULL AUTO_INCREMENT,
    team_id                 BIGINT       NOT NULL,
    sprint_id               BIGINT       NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    start_date              TIMESTAMP    NULL,
    end_date                TIMESTAMP    NULL,
    min_submissions_required INT         NOT NULL DEFAULT 3
        COMMENT 'Ngưỡng tối thiểu để D4 được tính (≥ 3)',
    status                  VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
        COMMENT 'DRAFT | OPEN | CLOSED | AGGREGATED',
    created_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_review_rounds PRIMARY KEY (id),
    CONSTRAINT fk_rr_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT chk_rr_status CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED', 'AGGREGATED')),

    INDEX idx_rr_team_sprint (team_id, sprint_id)
);

-- -----------------------------------------------------------------------------
-- 14. review_submissions  – phiếu chấm chéo ẩn danh (reviewer → reviewee)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS review_submissions
(
    id              BIGINT      NOT NULL AUTO_INCREMENT,
    review_round_id BIGINT      NOT NULL,
    reviewer_id     BIGINT      NOT NULL,
    reviewee_id     BIGINT      NOT NULL,
    criterion       VARCHAR(50) NOT NULL
        COMMENT 'QUALITY | PUNCTUALITY | COOPERATION – tương ứng D1, D2, D3',
    score           TINYINT     NOT NULL COMMENT 'Thang điểm 1–5',
    feedback        TEXT        NULL,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_review_submissions PRIMARY KEY (id),
    CONSTRAINT fk_rs_round    FOREIGN KEY (review_round_id) REFERENCES review_rounds (id) ON DELETE CASCADE,
    CONSTRAINT fk_rs_reviewer FOREIGN KEY (reviewer_id)     REFERENCES users         (id) ON DELETE CASCADE,
    CONSTRAINT fk_rs_reviewee FOREIGN KEY (reviewee_id)     REFERENCES users         (id) ON DELETE CASCADE,
    CONSTRAINT chk_rs_criterion CHECK (criterion IN ('QUALITY', 'PUNCTUALITY', 'COOPERATION')),
    CONSTRAINT chk_rs_score     CHECK (score BETWEEN 1 AND 5),
    CONSTRAINT chk_rs_self_review CHECK (reviewer_id <> reviewee_id),

    INDEX idx_rs_round_reviewee  (review_round_id, reviewee_id),
    INDEX idx_rs_round_reviewer  (review_round_id, reviewer_id)
);

-- -----------------------------------------------------------------------------
-- 15. peer_score_aggregates  – điểm D4 tổng hợp ẩn danh (sau ≥ 3 lượt)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS peer_score_aggregates
(
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    review_round_id BIGINT        NOT NULL,
    sprint_id       BIGINT        NOT NULL,
    reviewee_id     BIGINT        NOT NULL,
    team_id         BIGINT        NOT NULL,

    submission_count INT          NOT NULL DEFAULT 0
        COMMENT 'Số lượt chấm nhận được; < 3 → không tính D4',
    avg_quality      DECIMAL(4, 2) NULL COMMENT 'Trung bình điểm QUALITY',
    avg_punctuality  DECIMAL(4, 2) NULL COMMENT 'Trung bình điểm PUNCTUALITY',
    avg_cooperation  DECIMAL(4, 2) NULL COMMENT 'Trung bình điểm COOPERATION',
    d4_score         DECIMAL(6, 4) NULL
        COMMENT 'Điểm D4 chuẩn hoá [0,1]; NULL khi submission_count < 3',
    is_sufficient    BOOLEAN       NOT NULL DEFAULT FALSE
        COMMENT 'TRUE khi submission_count >= min_submissions_required',
    computed_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_peer_score_aggregates PRIMARY KEY (id),
    CONSTRAINT fk_psa_round    FOREIGN KEY (review_round_id) REFERENCES review_rounds (id) ON DELETE CASCADE,
    CONSTRAINT fk_psa_sprint   FOREIGN KEY (sprint_id)       REFERENCES sprints       (id) ON DELETE CASCADE,
    CONSTRAINT fk_psa_reviewee FOREIGN KEY (reviewee_id)     REFERENCES users         (id) ON DELETE CASCADE,
    CONSTRAINT fk_psa_team     FOREIGN KEY (team_id)         REFERENCES teams         (id) ON DELETE CASCADE,
    CONSTRAINT uk_psa_round_reviewee UNIQUE (review_round_id, reviewee_id),

    INDEX idx_psa_sprint_team (sprint_id, team_id)
);

-- =============================================================================
-- PHẦN VIII – TẦNG 4: TỔNG HỢP VÀ TỶ LỆ ĐÓNG GÓP (Contribution Scores)
-- C_i = 100 · σ(Σₖ w_k · D'_ik)   với σ là hàm logistic
-- p_i = C_i / Σⱼ C_j
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 16. scoring_weights  – trọng số w_k có thể cấu hình (đề xuất: 0.40/0.20/0.15/0.25)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scoring_weights
(
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    team_id         BIGINT        NOT NULL,
    sprint_id       BIGINT        NULL COMMENT 'NULL = mặc định cho cả nhóm',
    w_output        DECIMAL(5, 4) NOT NULL DEFAULT 0.4000 COMMENT 'w1: D1 Output',
    w_reliability   DECIMAL(5, 4) NOT NULL DEFAULT 0.2000 COMMENT 'w2: D2 Reliability',
    w_collaboration DECIMAL(5, 4) NOT NULL DEFAULT 0.1500 COMMENT 'w3: D3 Collaboration',
    w_peer          DECIMAL(5, 4) NOT NULL DEFAULT 0.2500 COMMENT 'w4: D4 Peer (0 khi chưa đủ lượt)',
    -- Trọng số phân phối lại khi không có D4 (tổng 3 chiều còn lại = 1)
    w_output_no_peer        DECIMAL(5, 4) NULL DEFAULT 0.5333,
    w_reliability_no_peer   DECIMAL(5, 4) NULL DEFAULT 0.2667,
    w_collaboration_no_peer DECIMAL(5, 4) NULL DEFAULT 0.2000,

    is_default  BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_scoring_weights PRIMARY KEY (id),
    CONSTRAINT fk_sw_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_sw_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE SET NULL,
    -- Tổng trọng số 4 chiều = 1
    CONSTRAINT chk_sw_sum CHECK (
        ABS(w_output + w_reliability + w_collaboration + w_peer - 1.0) < 0.0001
    ),
    CONSTRAINT chk_sw_positive CHECK (
        w_output >= 0 AND w_reliability >= 0
        AND w_collaboration >= 0 AND w_peer >= 0
    )
);

-- -----------------------------------------------------------------------------
-- 17. contribution_scores  – điểm C_i và tỷ lệ p_i cuối cùng mỗi (user, sprint)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contribution_scores
(
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    team_id     BIGINT        NOT NULL,
    sprint_id   BIGINT        NULL,
    user_id     BIGINT        NOT NULL,

    -- Điểm raw trước logistic
    raw_weighted_sum  DECIMAL(10, 5) NULL
        COMMENT 'Σₖ w_k · D''_ik trước khi qua sigmoid',

    -- Điểm cuối sau sigmoid × 100
    score       DECIMAL(6, 2) NOT NULL COMMENT 'C_i = 100 · σ(raw_weighted_sum) ∈ (0, 100)',
    percentage  DECIMAL(6, 4) NOT NULL COMMENT 'p_i = C_i / Σⱼ C_j ∈ (0, 1)',

    -- Metadata tính toán
    peer_included       BOOLEAN   NOT NULL DEFAULT FALSE
        COMMENT 'TRUE nếu D4 được tính vào (đủ ≥ 3 lượt chấm)',
    has_sufficient_data BOOLEAN   NOT NULL DEFAULT TRUE
        COMMENT 'FALSE khi total_events < 5 → hiển thị "chưa đủ bằng chứng"',
    total_events_used   INT       NOT NULL DEFAULT 0,
    computed_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_contribution_scores PRIMARY KEY (id),
    CONSTRAINT fk_cs_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_cs_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE SET NULL,
    CONSTRAINT fk_cs_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT uk_cs_sprint_user UNIQUE (sprint_id, user_id),
    CONSTRAINT chk_cs_score      CHECK (score      >= 0 AND score      <= 100),
    CONSTRAINT chk_cs_percentage CHECK (percentage >= 0 AND percentage <= 1),

    INDEX idx_cs_team_sprint (team_id, sprint_id),
    INDEX idx_cs_user        (user_id)
);

-- =============================================================================
-- PHẦN IX – ĐỘ TIN CẬY (Bootstrap Confidence Interval)
-- Bootstrap resample ActivityEvent 1000 lần → CI cho p_i
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 18. score_bootstrap_ci  – khoảng tin cậy bootstrap kèm theo contribution_scores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS score_bootstrap_ci
(
    id                    BIGINT        NOT NULL AUTO_INCREMENT,
    contribution_score_id BIGINT        NOT NULL,
    sprint_id             BIGINT        NOT NULL,
    user_id               BIGINT        NOT NULL,

    bootstrap_iterations  INT           NOT NULL DEFAULT 1000,
    ci_lower_95           DECIMAL(6, 4) NULL COMMENT 'Cận dưới 95% CI của p_i',
    ci_upper_95           DECIMAL(6, 4) NULL COMMENT 'Cận trên 95% CI của p_i',
    ci_lower_80           DECIMAL(6, 4) NULL COMMENT 'Cận dưới 80% CI',
    ci_upper_80           DECIMAL(6, 4) NULL COMMENT 'Cận trên 80% CI',
    std_error             DECIMAL(6, 4) NULL COMMENT 'Độ lệch chuẩn bootstrap của p_i',
    is_reliable           BOOLEAN       NOT NULL DEFAULT FALSE
        COMMENT 'TRUE khi total_events >= 5; FALSE → "chưa đủ bằng chứng"',
    computed_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_score_bootstrap_ci PRIMARY KEY (id),
    CONSTRAINT fk_bci_contribution FOREIGN KEY (contribution_score_id)
        REFERENCES contribution_scores (id) ON DELETE CASCADE,
    CONSTRAINT fk_bci_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_bci_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT uk_bci_contribution UNIQUE (contribution_score_id),

    INDEX idx_bci_sprint_user (sprint_id, user_id)
);

-- =============================================================================
-- PHẦN X – PHÁT HIỆN GIAN LẬN VÀ MẤT CÂN BẰNG (Fraud Flags)
-- Khoảng cách Mahalanobis / Euclidean chuẩn hóa tới tâm nhóm
-- Cờ: D1 cao bất thường + D4 thấp đáng kể → gắn cờ để đối chiếu thủ công
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 19. fraud_flags  – cờ nghi vấn gian lận hoặc mất cân bằng
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fraud_flags
(
    id                  BIGINT        NOT NULL AUTO_INCREMENT,
    sprint_id           BIGINT        NOT NULL,
    user_id             BIGINT        NOT NULL,
    team_id             BIGINT        NOT NULL,

    -- Khoảng cách Euclidean chuẩn hóa tới tâm nhóm δ_i
    distance_to_centroid DECIMAL(8, 4) NULL
        COMMENT 'δ_i = sqrt(Σ (D_ik - D̄_k)² / var_k) – Euclidean chuẩn hoá',

    -- Điểm ngờ vực tổng hợp
    suspicion_score      DECIMAL(5, 2) NULL COMMENT 'Điểm ngờ vực [0, 100]',
    flag_reason          VARCHAR(255)  NULL
        COMMENT 'Ví dụ: "D1_HIGH_D4_LOW" | "OUTLIER_DISTANCE" | "REWORK_SPIKE"',
    flag_type            VARCHAR(50)   NOT NULL
        COMMENT 'FREE_RIDER | IMBALANCED_PROFILE | OUTLIER | GAMING_SUSPICION',
    severity             VARCHAR(20)   NOT NULL DEFAULT 'LOW'
        COMMENT 'LOW | MEDIUM | HIGH',

    -- Xử lý
    is_resolved          BOOLEAN       NOT NULL DEFAULT FALSE,
    resolved_by          BIGINT        NULL COMMENT 'user_id của leader xử lý',
    resolved_at          TIMESTAMP     NULL,
    resolution_note      TEXT          NULL,
    created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_fraud_flags PRIMARY KEY (id),
    CONSTRAINT fk_ff_sprint      FOREIGN KEY (sprint_id)    REFERENCES sprints (id) ON DELETE CASCADE,
    CONSTRAINT fk_ff_user        FOREIGN KEY (user_id)      REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_ff_team        FOREIGN KEY (team_id)      REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_ff_resolved_by FOREIGN KEY (resolved_by)  REFERENCES users   (id) ON DELETE SET NULL,
    CONSTRAINT chk_ff_severity   CHECK (severity  IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT chk_ff_flag_type  CHECK (flag_type IN (
        'FREE_RIDER', 'IMBALANCED_PROFILE', 'OUTLIER', 'GAMING_SUSPICION'
    )),

    INDEX idx_ff_team_sprint      (team_id, sprint_id),
    INDEX idx_ff_unresolved       (team_id, is_resolved),
    INDEX idx_ff_user_sprint      (user_id, sprint_id)
);

-- =============================================================================
-- PHẦN XI – ĐÓNG GÓP NGOÀI HỆ THỐNG (Manual Contributions)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 20. manual_contributions  – khai báo thủ công + xác nhận của leader
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manual_contributions
(
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    team_id      BIGINT       NOT NULL,
    sprint_id    BIGINT       NULL COMMENT 'NULL nếu không gán sprint cụ thể',
    user_id      BIGINT       NOT NULL,
    task_name    VARCHAR(255) NULL COMMENT 'Tên công việc đóng góp ngoài board',
    evidence_link VARCHAR(500) NULL COMMENT 'Đường dẫn minh chứng ngoài (Docs, Figma, v.v.)',
    title        VARCHAR(255) NULL,
    description  TEXT         NULL,
    -- Giá trị đóng góp (quy đổi về đơn vị story point tương đương)
    story_points DECIMAL(10, 2) NULL DEFAULT 0.00 COMMENT 'Story points của đóng góp thủ công',
    equivalent_story_points DECIMAL(5, 1) NULL DEFAULT 0
        COMMENT 'Leader ước lượng story point tương đương để đưa vào Tầng 1',
    status       VARCHAR(50)  NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | APPROVED | REJECTED',
    confirmed    BOOLEAN      NOT NULL DEFAULT FALSE,
    reviewer_id  BIGINT       NULL COMMENT 'user_id của người duyệt/từ chối',
    confirmed_by BIGINT       NULL COMMENT 'user_id của leader xác nhận',
    confirmed_at TIMESTAMP    NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_manual_contributions PRIMARY KEY (id),
    CONSTRAINT fk_mc_team         FOREIGN KEY (team_id)      REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_mc_sprint       FOREIGN KEY (sprint_id)    REFERENCES sprints (id) ON DELETE SET NULL,
    CONSTRAINT fk_mc_user         FOREIGN KEY (user_id)      REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT fk_mc_reviewer     FOREIGN KEY (reviewer_id)  REFERENCES users   (id) ON DELETE SET NULL,
    CONSTRAINT fk_mc_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users   (id) ON DELETE SET NULL,

    INDEX idx_mc_team_sprint (team_id, sprint_id),
    INDEX idx_mc_user        (user_id)
);

-- =============================================================================
-- PHẦN XII – CHI PHÍ VÀ PHÂN CHIA (Expense & Split)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 21. expenses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses
(
    id                 BIGINT       NOT NULL AUTO_INCREMENT,
    team_id            BIGINT       NOT NULL,
    paid_by_member_id  BIGINT       NOT NULL,
    title              VARCHAR(255) NOT NULL,
    description        TEXT,
    amount             DECIMAL(19, 2) NOT NULL,
    currency           VARCHAR(3)   NOT NULL DEFAULT 'VND',
    split_method       VARCHAR(20)  NOT NULL COMMENT 'EQUAL | CUSTOM | PERCENT | CONTRIBUTION',
    expense_date       DATE         NOT NULL,
    -- Nếu split_method = CONTRIBUTION, dùng contribution_scores của sprint này
    linked_sprint_id   BIGINT       NULL
        COMMENT 'Khi chia theo tỷ lệ đóng góp: tham chiếu sprint nào',
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_expenses PRIMARY KEY (id),
    CONSTRAINT fk_expenses_team         FOREIGN KEY (team_id)           REFERENCES teams        (id) ON DELETE CASCADE,
    CONSTRAINT fk_expenses_payer        FOREIGN KEY (paid_by_member_id) REFERENCES team_members (id) ON DELETE RESTRICT,
    CONSTRAINT fk_expenses_linked_sprint FOREIGN KEY (linked_sprint_id) REFERENCES sprints      (id) ON DELETE SET NULL,
    CONSTRAINT chk_expenses_amount       CHECK (amount > 0),
    CONSTRAINT chk_expenses_split_method CHECK (split_method IN ('EQUAL', 'CUSTOM', 'PERCENT', 'CONTRIBUTION')),

    INDEX idx_expenses_team_date (team_id, expense_date),
    INDEX idx_expenses_payer     (paid_by_member_id)
);

-- -----------------------------------------------------------------------------
-- 22. splits
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS splits
(
    id             BIGINT         NOT NULL AUTO_INCREMENT,
    expense_id     BIGINT         NOT NULL,
    team_member_id BIGINT         NOT NULL,
    amount         DECIMAL(19, 2) NOT NULL,
    -- Ghi lại tỷ lệ p_i đã dùng khi split_method = CONTRIBUTION
    contribution_ratio DECIMAL(6, 4) NULL
        COMMENT 'p_i tại thời điểm tính split; NULL nếu không dùng mode CONTRIBUTION',
    created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_splits PRIMARY KEY (id),
    CONSTRAINT fk_splits_expense FOREIGN KEY (expense_id)     REFERENCES expenses     (id) ON DELETE CASCADE,
    CONSTRAINT fk_splits_member  FOREIGN KEY (team_member_id) REFERENCES team_members (id) ON DELETE RESTRICT,
    CONSTRAINT uk_splits_expense_member UNIQUE (expense_id, team_member_id),
    CONSTRAINT chk_splits_amount_positive CHECK (amount > 0),

    INDEX idx_splits_member (team_member_id)
);

-- =============================================================================
-- PHẦN XIII – CẢNH BÁO (Alerts)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 23. alerts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts
(
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    team_id    BIGINT      NOT NULL,
    sprint_id  BIGINT      NULL,
    user_id    BIGINT      NOT NULL,
    alert_type VARCHAR(50) NOT NULL
        COMMENT 'INACTIVITY | FRAUD_SUSPICION | FREE_RIDER | IMBALANCE | INSUFFICIENT_DATA',
    message    TEXT,
    severity   VARCHAR(20) NOT NULL DEFAULT 'INFO' COMMENT 'INFO | WARNING | CRITICAL',
    resolved   BOOLEAN     NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP  NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_alerts PRIMARY KEY (id),
    CONSTRAINT fk_alerts_team   FOREIGN KEY (team_id)   REFERENCES teams   (id) ON DELETE CASCADE,
    CONSTRAINT fk_alerts_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE SET NULL,
    CONSTRAINT fk_alerts_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE,
    CONSTRAINT chk_alerts_severity CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),

    INDEX idx_alerts_team_unresolved (team_id, resolved),
    INDEX idx_alerts_user            (user_id)
);

-- =============================================================================
-- PHẦN XIV – VIEWS HỖ TRỢ (Analytical Views)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- V1: Tóm tắt điểm + CI mỗi thành viên trong một sprint
-- -----------------------------------------------------------------------------
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
    -- Tầng 4 output
    cs.score                        AS contribution_score,
    cs.percentage                   AS contribution_ratio,
    cs.peer_included,
    cs.has_sufficient_data,
    cs.total_events_used,
    -- Tầng 3 chiều chính (sau hiệu chỉnh)
    ds.d1_output_adj,
    ds.d2_reliability_adj,
    ds.d3_collaboration_adj,
    ds.d4_peer_adj,
    ds.availability_ratio,
    -- Khoảng tin cậy
    bci.ci_lower_95,
    bci.ci_upper_95,
    bci.is_reliable                 AS ci_is_reliable,
    -- Cờ gian lận
    ff.flag_type,
    ff.severity                     AS fraud_severity,
    ff.is_resolved                  AS fraud_resolved
FROM contribution_scores cs
    JOIN users    u   ON u.id   = cs.user_id
    JOIN sprints  s   ON s.id   = cs.sprint_id
    LEFT JOIN dimension_scores     ds  ON ds.sprint_id = cs.sprint_id  AND ds.user_id  = cs.user_id
    LEFT JOIN score_bootstrap_ci   bci ON bci.contribution_score_id = cs.id
    LEFT JOIN fraud_flags          ff  ON ff.sprint_id = cs.sprint_id  AND ff.user_id  = cs.user_id
                                      AND ff.is_resolved = FALSE;

-- -----------------------------------------------------------------------------
-- V2: Hồ sơ radar – giá trị các chiều chính của từng thành viên trong sprint
-- -----------------------------------------------------------------------------
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
    -- Chuẩn hoá sang [0,1] để vẽ radar dễ hơn (sigmoid scale)
    ROUND(1 / (1 + EXP(-ds.d1_output_adj)),        4) AS d1_normalized,
    ROUND(1 / (1 + EXP(-ds.d2_reliability_adj)),   4) AS d2_normalized,
    ROUND(1 / (1 + EXP(-ds.d3_collaboration_adj)), 4) AS d3_normalized,
    ROUND(1 / (1 + EXP(-COALESCE(ds.d4_peer_adj, 0))), 4) AS d4_normalized
FROM dimension_scores ds
    JOIN users u ON u.id = ds.user_id;

-- -----------------------------------------------------------------------------
-- V3: Toàn bộ đặc trưng thô + z-score trong một sprint (audit trail)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_feature_audit AS
SELECT
    rfv.sprint_id,
    rfv.team_id,
    rfv.user_id,
    u.full_name,
    -- Tầng 1 – Raw
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
    -- Tầng 2 – Normalized
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
    JOIN users              u  ON u.id  = rfv.user_id
    LEFT JOIN normalized_features nf ON nf.sprint_id = rfv.sprint_id
                                     AND nf.user_id   = rfv.user_id;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- PHẦN XV – DỮ LIỆU MẪU MẶC ĐỊNH (Default Scoring Configuration)
-- =============================================================================

-- Trọng số mặc định đề xuất: w = (0.40, 0.20, 0.15, 0.25)
-- (Được chèn sau khi team được tạo; đây là template)
-- Lưu ý: Phần seed thực tế nằm trong seed/sample_data.sql

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
