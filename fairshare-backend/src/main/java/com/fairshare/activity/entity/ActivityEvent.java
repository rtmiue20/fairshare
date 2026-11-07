package com.fairshare.activity.entity;

import com.fairshare.common.audit.BaseEntity;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.team.entity.Team;
import com.fairshare.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "activity_events")
public class ActivityEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ActivitySource source;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(columnDefinition = "TEXT")
    private String details;

    @JdbcTypeCode(SqlTypes.DECIMAL)
    @Column(name = "story_points")
    private Double storyPoints;

    @JdbcTypeCode(SqlTypes.TINYINT)
    @Column(name = "difficulty_level")
    private Integer difficultyLevel;

    @Column(name = "is_on_time")
    private Boolean isOnTime;

    @JdbcTypeCode(SqlTypes.DECIMAL)
    @Column(name = "delay_days")
    private Double delayDays;

    @Column(name = "is_helpful_comment")
    private Boolean isHelpfulComment;

    @Column(name = "is_support_mention")
    private Boolean isSupportMention;

    @Column(name = "is_review_for_others")
    private Boolean isReviewForOthers;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;
}
