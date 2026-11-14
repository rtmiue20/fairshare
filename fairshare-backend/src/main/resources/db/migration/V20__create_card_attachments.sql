CREATE TABLE IF NOT EXISTS card_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    card_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT NULL,
    content_type VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_card_attachments_card FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_card_attachments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_card_attachments_card_id ON card_attachments(card_id);
