package com.fairshare.activity.entity;

import com.fairshare.common.audit.BaseEntity;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.team.entity.Team;
import com.fairshare.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Immutable
@Table(name = "activity_events")
@AttributeOverride(name = "updatedAt", column = @Column(name = "updated_at", nullable = false, updatable = false))
public class ActivityEvent extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", updatable = false, nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false, updatable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sprint_id", updatable = false)
    private Sprint sprint;

    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, updatable = false)
    private ActivitySource source;

    @Column(name = "event_type", nullable = false, updatable = false)
    private String eventType;

    @Column(name = "details", columnDefinition = "TEXT", updatable = false)
    private String details;

    @JdbcTypeCode(SqlTypes.DECIMAL)
    @Column(name = "story_points", updatable = false)
    private Double storyPoints;

    @JdbcTypeCode(SqlTypes.TINYINT)
    @Column(name = "difficulty_level", updatable = false)
    private Integer difficultyLevel;

    @Column(name = "is_on_time", updatable = false)
    private Boolean isOnTime;

    @JdbcTypeCode(SqlTypes.DECIMAL)
    @Column(name = "delay_days", updatable = false)
    private Double delayDays;

    @Column(name = "is_helpful_comment", updatable = false)
    private Boolean isHelpfulComment;

    @Column(name = "is_support_mention", updatable = false)
    private Boolean isSupportMention;

    @Column(name = "is_review_for_others", updatable = false)
    private Boolean isReviewForOthers;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private LocalDateTime occurredAt;

    @Transient
    public String getCompletionStatus() {
        if (isOnTime == null) {
            return null;
        }
        return Boolean.TRUE.equals(isOnTime) ? "ON_TIME" : "LATE";
    }

    @Override
    @PreUpdate
    protected void onUpdate() {
        throw new UnsupportedOperationException("ActivityEvent log is immutable and cannot be updated");
    }

    @PreRemove
    public void onRemove() {
        throw new UnsupportedOperationException("ActivityEvent log is immutable and cannot be deleted");
    }
}
