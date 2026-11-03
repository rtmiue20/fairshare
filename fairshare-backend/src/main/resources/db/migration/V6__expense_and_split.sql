ALTER TABLE team_members
    ADD CONSTRAINT uk_team_members_team_user UNIQUE (team_id, user_id);

CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    team_id BIGINT NOT NULL,
    paid_by_member_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount DECIMAL(19, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'VND',
    split_method VARCHAR(20) NOT NULL,
    expense_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_expenses_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
    CONSTRAINT fk_expenses_payer FOREIGN KEY (paid_by_member_id) REFERENCES team_members (id) ON DELETE RESTRICT,
    CONSTRAINT chk_expenses_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_expenses_split_method CHECK (split_method IN ('EQUAL', 'CUSTOM', 'PERCENT')),
    INDEX idx_expenses_team_date (team_id, expense_date),
    INDEX idx_expenses_payer (paid_by_member_id)
);

CREATE TABLE IF NOT EXISTS splits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    expense_id BIGINT NOT NULL,
    team_member_id BIGINT NOT NULL,
    amount DECIMAL(19, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_splits_expense FOREIGN KEY (expense_id) REFERENCES expenses (id) ON DELETE CASCADE,
    CONSTRAINT fk_splits_member FOREIGN KEY (team_member_id) REFERENCES team_members (id) ON DELETE RESTRICT,
    CONSTRAINT uk_splits_expense_member UNIQUE (expense_id, team_member_id),
    CONSTRAINT chk_splits_amount_positive CHECK (amount > 0),
    INDEX idx_splits_member (team_member_id)
);
