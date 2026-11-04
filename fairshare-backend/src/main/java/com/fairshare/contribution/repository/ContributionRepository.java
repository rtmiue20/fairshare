package com.fairshare.contribution.repository;

import com.fairshare.contribution.entity.ContributionScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContributionRepository extends JpaRepository<ContributionScore, Long> {
    List<ContributionScore> findByTeamId(Long teamId);
    List<ContributionScore> findBySprintId(Long sprintId);
    List<ContributionScore> findByTeamIdAndSprintId(Long teamId, Long sprintId);
    Optional<ContributionScore> findBySprintIdAndUserId(Long sprintId, Long userId);
}
