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
}
