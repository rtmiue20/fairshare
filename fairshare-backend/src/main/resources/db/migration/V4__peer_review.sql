-- V4: Peer Review Schema

CREATE TABLE IF NOT EXISTS review_rounds (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    sprint_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMP NULL,
    end_date TIMESTAMP NULL,
    min_submissions_required INT NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_rounds_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_rounds_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_submissions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    review_round_id BIGINT NOT NULL,
    reviewer_id BIGINT NOT NULL,
    reviewee_id BIGINT NOT NULL,
    criterion VARCHAR(50) NOT NULL,
    score INT NOT NULL,
    feedback TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_review_submissions_round FOREIGN KEY (review_round_id) REFERENCES review_rounds (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_submissions_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_review_submissions_reviewee FOREIGN KEY (reviewee_id) REFERENCES users (id) ON DELETE CASCADE
);
