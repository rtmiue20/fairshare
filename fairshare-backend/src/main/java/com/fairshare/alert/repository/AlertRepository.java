package com.fairshare.alert.repository;

import com.fairshare.alert.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    @Query("SELECT a FROM Alert a LEFT JOIN FETCH a.user LEFT JOIN FETCH a.team WHERE a.team.id = :teamId")
    List<Alert> findByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT a FROM Alert a LEFT JOIN FETCH a.user LEFT JOIN FETCH a.team WHERE a.team.id = :teamId AND a.resolved = false")
    List<Alert> findByTeamIdAndResolvedFalse(@Param("teamId") Long teamId);

    List<Alert> findByTeamIdAndResolvedFalseOrderByCreatedAtDesc(Long teamId);
    boolean existsByTeamIdAndUserIdAndAlertTypeAndResolvedFalse(Long teamId, Long userId, String alertType);
}
