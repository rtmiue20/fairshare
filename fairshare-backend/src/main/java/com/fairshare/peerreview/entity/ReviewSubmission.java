package com.fairshare.peerreview.entity;

import com.fairshare.common.audit.BaseEntity;
import com.fairshare.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "review_submissions")
public class ReviewSubmission extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "review_round_id", nullable = false)
    private ReviewRound reviewRound;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewee_id", nullable = false)
    private User reviewee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReviewCriterion criterion;

    @Column(nullable = false)
    private int score;

    @Column(columnDefinition = "TEXT")
    private String feedback;
}
