-- =============================================================================
-- V15: Enforce Immutability on activity_events (Append-only Audit Log)
-- Task: M1 (Backend / Activity Event) - Log chỉ thêm, không cho sửa/xóa
-- Target: MariaDB 10.6+ / MySQL 8.0+
-- =============================================================================

DROP TRIGGER IF EXISTS trg_before_activity_events_update;
DROP TRIGGER IF EXISTS trg_before_activity_events_delete;

DELIMITER //

CREATE TRIGGER trg_before_activity_events_update
BEFORE UPDATE ON activity_events
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ActivityEvent log is immutable: UPDATE is not allowed on activity_events';
END //

CREATE TRIGGER trg_before_activity_events_delete
BEFORE DELETE ON activity_events
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'ActivityEvent log is immutable: DELETE is not allowed on activity_events';
END //

DELIMITER ;

