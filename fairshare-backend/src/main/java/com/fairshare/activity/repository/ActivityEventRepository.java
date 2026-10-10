package com.fairshare.activity.repository;

import com.fairshare.activity.entity.ActivityEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityEventRepository extends JpaRepository<ActivityEvent, Long> {
    List<ActivityEvent> findByTeamId(Long teamId);
    List<ActivityEvent> findByTeamIdAndUserId(Long teamId, Long userId);
}
