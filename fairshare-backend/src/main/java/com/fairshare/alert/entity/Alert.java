package com.fairshare.alert.entity;

import com.fairshare.common.audit.BaseEntity;
import com.fairshare.team.entity.Team;
import com.fairshare.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "alerts")
public class Alert extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "alert_type", nullable = false)
    private String alertType;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private boolean resolved;
}
