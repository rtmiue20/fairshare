package com.fairshare.activity.repository;

import com.fairshare.activity.entity.ActivityEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityEventRepository extends JpaRepository<ActivityEvent, Long> {
    List<ActivityEvent> findByTeamId(Long teamId);
    List<ActivityEvent> findByTeamIdAndUserId(Long teamId, Long userId);
    List<ActivityEvent> findBySprintId(Long sprintId);
    List<ActivityEvent> findBySprintIdAndUserId(Long sprintId, Long userId);

    @Override
    default void deleteById(Long id) {
        throw new UnsupportedOperationException("ActivityEvent log is immutable and cannot be deleted");
    }

    @Override
    default void delete(ActivityEvent entity) {
        throw new UnsupportedOperationException("ActivityEvent log is immutable and cannot be deleted");
    }

    @Override
    default void deleteAllById(Iterable<? extends Long> ids) {
        throw new UnsupportedOperationException("ActivityEvent log is immutable and cannot be deleted");
    }

    @Override
    default void deleteAll(Iterable<? extends ActivityEvent> entities) {
        throw new UnsupportedOperationException("ActivityEvent log is immutable and cannot be deleted");
    }

    @Override
    default void deleteAll() {
        throw new UnsupportedOperationException("ActivityEvent log is immutable and cannot be deleted");
    }

    @Override
    default void deleteAllInBatch(Iterable<ActivityEvent> entities) {
        throw new UnsupportedOperationException("ActivityEvent log is immutable and cannot be deleted");
    }

    @Override
    default void deleteAllByIdInBatch(Iterable<Long> ids) {
        throw new UnsupportedOperationException("ActivityEvent log is immutable and cannot be deleted");
    }

    @Override
    default void deleteAllInBatch() {
        throw new UnsupportedOperationException("ActivityEvent log is immutable and cannot be deleted");
    }
}
