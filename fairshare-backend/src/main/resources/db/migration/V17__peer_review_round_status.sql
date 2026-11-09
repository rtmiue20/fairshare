ALTER TABLE review_rounds
    DROP CONSTRAINT chk_rr_status,
    ALTER COLUMN status SET DEFAULT 'DRAFT',
    ADD CONSTRAINT chk_rr_status CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED', 'AGGREGATED'));
