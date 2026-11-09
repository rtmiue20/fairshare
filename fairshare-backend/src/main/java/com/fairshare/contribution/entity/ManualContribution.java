package com.fairshare.contribution.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity biểu diễn đóng góp thủ công (ngoài task board) của thành viên.
 * Khớp bảng manual_contributions (Card 8 - M3 Sprint 5).
 */
@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "manual_contributions")
public class ManualContribution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "sprint_id")
    private Long sprintId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "task_name")
    private String taskName;

    @Column(name = "evidence_link", length = 500)
    private String evidenceLink;

    @Column(name = "story_points", precision = 10, scale = 2)
    private BigDecimal storyPoints;

    @Builder.Default
    @Column(name = "status", length = 50, nullable = false)
    private String status = "PENDING";

    @Column(name = "reviewer_id")
    private Long reviewerId;

    // Các trường tương thích ngược với schema cũ và Stored Procedure
    @Column(name = "title")
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Column(name = "confirmed", nullable = false)
    private boolean confirmed = false;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "equivalent_story_points", precision = 5, scale = 1)
    private BigDecimal equivalentStoryPoints;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (status == null || status.isBlank()) {
            status = "PENDING";
        }
        syncLegacyFields();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        syncLegacyFields();
    }

    private void syncLegacyFields() {
        if (title == null && taskName != null) {
            title = taskName;
        }
        if (taskName == null && title != null) {
            taskName = title;
        }
        if (reviewerId != null && confirmedBy == null) {
            confirmedBy = reviewerId;
        }
        if (confirmedBy != null && reviewerId == null) {
            reviewerId = confirmedBy;
        }
        if ("APPROVED".equalsIgnoreCase(status)) {
            confirmed = true;
            if (confirmedAt == null) {
                confirmedAt = LocalDateTime.now();
            }
        } else {
            confirmed = false;
        }
        if (equivalentStoryPoints == null && storyPoints != null) {
            equivalentStoryPoints = storyPoints;
        }
    }
}
