package com.fairshare.peerreview.repository;

import com.fairshare.peerreview.entity.ReviewRound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRoundRepository extends JpaRepository<ReviewRound, Long> {
    List<ReviewRound> findByTeamId(Long teamId);
    List<ReviewRound> findBySprintId(Long sprintId);
}
