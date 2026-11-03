package com.fairshare.expense.service;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.expense.entity.Expense;
import com.fairshare.expense.entity.Split;
import com.fairshare.expense.repository.ExpenseRepository;
import com.fairshare.expense.repository.SplitRepository;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@RequiredArgsConstructor
@Service
public class SplitService {

    private final ExpenseRepository expenseRepository;
    private final SplitRepository splitRepository;
    private final TeamMemberRepository teamMemberRepository;

    @Transactional
    public List<Split> replaceSplits(Long expenseId, List<SplitAllocation> allocations) {
        if (expenseId == null) {
            throw new BusinessException("Expense id is required");
        }
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found: " + expenseId));
        if (allocations == null || allocations.isEmpty()) {
            throw new BusinessException("At least one split allocation is required");
        }

        Set<Long> assignedMembers = new HashSet<>();
        BigDecimal total = BigDecimal.ZERO;
        List<Split> splits = new ArrayList<>();
        for (SplitAllocation allocation : allocations) {
            if (allocation == null || allocation.teamMemberId() == null
                    || allocation.amount() == null || allocation.amount().signum() <= 0
                    || allocation.amount().stripTrailingZeros().scale() > 2) {
                throw new BusinessException("Each split must have a member and a positive amount with at most 2 decimal places");
            }
            if (!assignedMembers.add(allocation.teamMemberId())) {
                throw new BusinessException("A team member can only be listed once per expense");
            }

            TeamMember member = teamMemberRepository.findById(allocation.teamMemberId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Team member not found: " + allocation.teamMemberId()));
            if (!member.getTeam().getId().equals(expense.getTeam().getId())) {
                throw new BusinessException("Split members must belong to the expense team");
            }

            Split split = new Split();
            split.setExpense(expense);
            split.setTeamMember(member);
            split.setAmount(allocation.amount().setScale(2));
            splits.add(split);
            total = total.add(allocation.amount());
        }
        if (total.compareTo(expense.getAmount()) != 0) {
            throw new BusinessException("Split amounts must add up to the expense amount");
        }

        splitRepository.deleteByExpenseId(expenseId);
        return splitRepository.saveAll(splits);
    }

    @Transactional(readOnly = true)
    public List<Split> getExpenseSplits(Long expenseId) {
        if (expenseId == null) {
            throw new BusinessException("Expense id is required");
        }
        if (!expenseRepository.existsById(expenseId)) {
            throw new ResourceNotFoundException("Expense not found: " + expenseId);
        }
        return splitRepository.findByExpenseIdOrderById(expenseId);
    }
}
