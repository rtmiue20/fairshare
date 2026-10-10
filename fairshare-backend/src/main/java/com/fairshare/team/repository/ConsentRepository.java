package com.fairshare.team.repository;

import com.fairshare.team.entity.Consent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConsentRepository extends JpaRepository<Consent, Long> {
    Optional<Consent> findByTeamIdAndUserId(Long teamId, Long userId);
}
