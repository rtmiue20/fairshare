package com.fairshare.board.repository;

import com.fairshare.board.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CardRepository extends JpaRepository<Card, Long> {
    List<Card> findByColumnIdOrderByPositionAsc(Long columnId);
    List<Card> findByBoardIdOrderByPositionAsc(Long boardId);

    @Query("SELECT c FROM Card c JOIN FETCH c.column JOIN FETCH c.board b LEFT JOIN FETCH c.assignee WHERE b.team.id = :teamId")
    List<Card> findByBoardTeamId(@Param("teamId") Long teamId);
}
