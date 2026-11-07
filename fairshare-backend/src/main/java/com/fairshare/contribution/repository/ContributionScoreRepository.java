package com.fairshare.contribution.repository;

import com.fairshare.contribution.dto.EvidenceItemDto;
import com.fairshare.contribution.entity.ContributionScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContributionScoreRepository extends JpaRepository<ContributionScore, Long> {

    @Modifying(clearAutomatically = true)
    @Query(value = "CALL sp_calculate_contribution_scores(:teamId, :sprintId)", nativeQuery = true)
    void calculateContributionScores(@Param("teamId") Long teamId, @Param("sprintId") Long sprintId);

    List<ContributionScore> findByTeamIdAndSprintId(Long teamId, Long sprintId);

    List<ContributionScore> findByTeamId(Long teamId);

    List<ContributionScore> findBySprintId(Long sprintId);

    Optional<ContributionScore> findBySprintIdAndUserId(Long sprintId, Long userId);

    /**
     * Kích hoạt Stored Procedure {@code sp_get_evidence_traceability} để lấy danh sách sự kiện gốc
     * (từ activity_events và manual_contributions) tạo nên điểm đóng góp của thành viên.
     */
    @Query(value = "CALL sp_get_evidence_traceability(:teamId, :sprintId, :userId)", nativeQuery = true)
    List<EvidenceItemDto> getEvidenceTraceability(
            @Param("teamId") Long teamId,
            @Param("sprintId") Long sprintId,
            @Param("userId") Long userId
    );
}
