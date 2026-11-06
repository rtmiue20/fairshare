package com.fairshare.team.repository;

import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.TeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamMemberRepository extends JpaRepository<TeamMember, Long> {
    List<TeamMember> findByTeamId(Long teamId);
    List<TeamMember> findByUserId(Long userId);
    boolean existsByTeamIdAndUserId(Long teamId, Long userId);
    Optional<TeamMember> findByTeamIdAndUserId(Long teamId, Long userId);
    long countByTeamIdAndRole(Long teamId, MemberRole role);
}
