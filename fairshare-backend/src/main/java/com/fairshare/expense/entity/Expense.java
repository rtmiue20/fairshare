package com.fairshare.expense.entity;

import com.fairshare.common.audit.BaseEntity;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "expenses", indexes = {
        @Index(name = "idx_expenses_team_date", columnList = "team_id, expense_date"),
        @Index(name = "idx_expenses_payer", columnList = "paid_by_member_id")
})
public class Expense extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paid_by_member_id", nullable = false)
    private TeamMember paidBy;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "split_method", nullable = false, length = 20)
    private SplitMethod splitMethod;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;
}
