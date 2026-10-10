package com.fairshare.contribution.repository;

import com.fairshare.contribution.entity.ContributionScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContributionRepository extends JpaRepository<ContributionScore, Long> {
    List<ContributionScore> findByTeamId(Long teamId);
    List<ContributionScore> findByTeamIdAndSprintId(Long teamId, Long sprintId);
}
