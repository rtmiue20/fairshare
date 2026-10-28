-- V4: Peer Review Schema (Phương án A - Đảm bảo tính ẩn danh)

CREATE TABLE IF NOT EXISTS review_rounds (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    sprint_id BIGINT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    min_submissions_required INT NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_rounds_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_rounds_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE
);

-- Bảng 1: review_submissions (Theo dõi ai đã nộp phiếu, không lưu điểm)
CREATE TABLE IF NOT EXISTS review_submissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    review_round_id BIGINT NOT NULL,
    reviewer_id BIGINT NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_submissions_round FOREIGN KEY (review_round_id) REFERENCES review_rounds (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_submissions_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT uq_round_reviewer UNIQUE (review_round_id, reviewer_id)
);

-- Bảng 2: peer_reviews (Lưu điểm và nhận xét ẩn danh, không có reviewer_id)
CREATE TABLE IF NOT EXISTS peer_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    review_round_id BIGINT NOT NULL,
    reviewee_id BIGINT NOT NULL,
    criterion VARCHAR(50) NOT NULL,
    score INT NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_peer_reviews_round FOREIGN KEY (review_round_id) REFERENCES review_rounds (id) ON DELETE CASCADE,
    CONSTRAINT fk_peer_reviews_reviewee FOREIGN KEY (reviewee_id) REFERENCES users (id) ON DELETE CASCADE
);
