package com.fairshare.peerreview.repository;

import com.fairshare.peerreview.entity.ReviewRound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRoundRepository extends JpaRepository<ReviewRound, Long> {

    @Query("SELECT r FROM ReviewRound r JOIN FETCH r.team JOIN FETCH r.sprint WHERE r.team.id = :teamId")
    List<ReviewRound> findByTeamId(@Param("teamId") Long teamId);

    @Query("SELECT r FROM ReviewRound r JOIN FETCH r.team JOIN FETCH r.sprint WHERE r.sprint.id = :sprintId")
    List<ReviewRound> findBySprintId(@Param("sprintId") Long sprintId);
}
