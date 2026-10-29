-- V3: Contribution Schema

CREATE TABLE IF NOT EXISTS manual_contributions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    sprint_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    evidence_url VARCHAR(500) NULL,
    story_points DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    work_date DATE NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_manual_contributions_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_manual_contributions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_manual_contributions_sprint FOREIGN KEY (sprint_id) REFERENCES sprints (id) ON DELETE CASCADE
);
