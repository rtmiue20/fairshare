package com.fairshare.alert.repository;

import com.fairshare.alert.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByTeamId(Long teamId);
    List<Alert> findByTeamIdAndResolvedFalse(Long teamId);
}
