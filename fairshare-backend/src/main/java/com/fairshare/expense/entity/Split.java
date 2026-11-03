package com.fairshare.expense.entity;

import com.fairshare.common.audit.BaseEntity;
import com.fairshare.team.entity.TeamMember;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "splits",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_splits_expense_member",
                columnNames = {"expense_id", "team_member_id"}),
        indexes = @Index(name = "idx_splits_member", columnList = "team_member_id"))
public class Split extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_member_id", nullable = false)
    private TeamMember teamMember;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;
}
