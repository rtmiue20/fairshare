package com.fairshare.contribution.entity;

import com.fairshare.common.audit.BaseEntity;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.team.entity.Team;
import com.fairshare.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "contribution_scores")
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

    @Column(name = "score", precision = 5, scale = 2, nullable = false)
    private BigDecimal score;

    @Column(name = "percentage", precision = 5, scale = 2, nullable = false)
    private BigDecimal percentage;
}
