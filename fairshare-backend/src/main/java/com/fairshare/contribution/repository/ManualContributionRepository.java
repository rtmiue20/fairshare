package com.fairshare.contribution.repository;

import com.fairshare.contribution.entity.ManualContribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ManualContributionRepository extends JpaRepository<ManualContribution, Long> {

    List<ManualContribution> findByTeamIdAndSprintIdAndStatus(Long teamId, Long sprintId, String status);

    List<ManualContribution> findByTeamIdAndSprintIdAndStatusOrderByCreatedAtDesc(Long teamId, Long sprintId, String status);

    List<ManualContribution> findByTeamIdAndStatusOrderByCreatedAtDesc(Long teamId, String status);

    List<ManualContribution> findByTeamIdAndSprintId(Long teamId, Long sprintId);

    List<ManualContribution> findByTeamIdAndUserId(Long teamId, Long userId);

    List<ManualContribution> findByTeamIdAndSprintIdAndUserId(Long teamId, Long sprintId, Long userId);
}

