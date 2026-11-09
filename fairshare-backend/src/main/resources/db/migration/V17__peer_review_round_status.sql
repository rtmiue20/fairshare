ALTER TABLE review_rounds
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    ADD CONSTRAINT chk_review_rounds_status CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED'));
