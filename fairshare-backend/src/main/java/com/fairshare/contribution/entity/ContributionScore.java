package com.fairshare.contribution.entity;

import com.fairshare.common.audit.BaseEntity;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.team.entity.Team;
import com.fairshare.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "contribution_scores", uniqueConstraints = {
        @UniqueConstraint(name = "uk_cs_team_sprint_user", columnNames = {"team_id", "sprint_id", "user_id"})
})
public class ContributionScore extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "trello_score", precision = 10, scale = 2)
    private BigDecimal trelloScore;

    @Column(name = "manual_score", precision = 10, scale = 2)
    private BigDecimal manualScore;

    @Column(name = "activity_pct", precision = 5, scale = 2)
    private BigDecimal activityPct;

    @Column(name = "peer_pct", precision = 5, scale = 2)
    private BigDecimal peerPct;

    @Column(name = "final_pct", precision = 5, scale = 2)
    private BigDecimal finalPct;

    @Column(name = "calculated_at")
    private LocalDateTime calculatedAt;

    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "percentage", precision = 5, scale = 2)
    private BigDecimal percentage;

    // =========================================================================
    // Multi-Dimensional 4-Tier Scoring Model (Sprint 4 - CR-03)
    // =========================================================================

    @Column(name = "d1_output", precision = 10, scale = 4)
    private BigDecimal d1Output;

    @Column(name = "d2_reliability", precision = 10, scale = 4)
    private BigDecimal d2Reliability;

    @Column(name = "d3_collaboration", precision = 10, scale = 4)
    private BigDecimal d3Collaboration;

    @Column(name = "d4_peer", precision = 10, scale = 4)
    private BigDecimal d4Peer;

    @Column(name = "composite_score", precision = 10, scale = 4)
    private BigDecimal compositeScore;

    @Column(name = "availability_factor", precision = 5, scale = 2)
    private BigDecimal availabilityFactor;

    @Column(name = "confidence_interval_low", precision = 5, scale = 2)
    private BigDecimal confidenceIntervalLow;

    @Column(name = "confidence_interval_high", precision = 5, scale = 2)
    private BigDecimal confidenceIntervalHigh;

    @Column(name = "distance_to_center", precision = 10, scale = 4)
    private BigDecimal distanceToCenter;

    @Column(name = "is_suspicious")
    private Boolean isSuspicious;

    @Column(name = "has_sufficient_evidence")
    private Boolean hasSufficientEvidence;
}
