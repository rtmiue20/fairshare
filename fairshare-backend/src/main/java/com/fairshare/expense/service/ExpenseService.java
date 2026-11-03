package com.fairshare.expense.service;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.expense.entity.Expense;
import com.fairshare.expense.entity.SplitMethod;
import com.fairshare.expense.repository.ExpenseRepository;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@RequiredArgsConstructor
@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    @Transactional
    public Expense createExpense(
            Long teamId,
            Long paidByMemberId,
            String title,
            String description,
            BigDecimal amount,
            String currency,
            SplitMethod splitMethod,
            LocalDate expenseDate) {
        if (teamId == null || paidByMemberId == null) {
            throw new BusinessException("Expense team and payer are required");
        }
        if (title == null || title.isBlank() || title.trim().length() > 255) {
            throw new BusinessException("Expense title is required and must be at most 255 characters");
        }
        if (amount == null || amount.signum() <= 0 || amount.stripTrailingZeros().scale() > 2) {
            throw new BusinessException("Expense amount must be positive with at most 2 decimal places");
        }
        if (currency == null || !currency.trim().matches("(?i)[a-z]{3}")) {
            throw new BusinessException("Currency must be a 3-letter code");
        }
        if (splitMethod == null) {
            throw new BusinessException("Split method is required");
        }
        if (expenseDate == null) {
            throw new BusinessException("Expense date is required");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        TeamMember paidBy = teamMemberRepository.findById(paidByMemberId)
                .orElseThrow(() -> new ResourceNotFoundException("Team member not found: " + paidByMemberId));
        if (!paidBy.getTeam().getId().equals(teamId)) {
            throw new BusinessException("Payer must belong to the expense team");
        }

        Expense expense = new Expense();
        expense.setTeam(team);
        expense.setPaidBy(paidBy);
        expense.setTitle(title.trim());
        expense.setDescription(description == null || description.isBlank() ? null : description.trim());
        expense.setAmount(amount.setScale(2));
        expense.setCurrency(currency.trim().toUpperCase(Locale.ROOT));
        expense.setSplitMethod(splitMethod);
        expense.setExpenseDate(expenseDate);
        return expenseRepository.save(expense);
    }

    @Transactional(readOnly = true)
    public List<Expense> getTeamExpenses(Long teamId) {
        if (teamId == null) {
            throw new BusinessException("Team id is required");
        }
        if (!teamRepository.existsById(teamId)) {
            throw new ResourceNotFoundException("Team not found: " + teamId);
        }
        return expenseRepository.findByTeamIdOrderByExpenseDateDesc(teamId);
    }
}
