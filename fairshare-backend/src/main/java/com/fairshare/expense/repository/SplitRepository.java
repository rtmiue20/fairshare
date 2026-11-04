package com.fairshare.expense.repository;

import com.fairshare.expense.entity.Split;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SplitRepository extends JpaRepository<Split, Long> {
    List<Split> findByExpenseId(Long expenseId);
    List<Split> findByExpenseIdOrderById(Long expenseId);
    List<Split> findByTeamMemberId(Long teamMemberId);
    void deleteByExpenseId(Long expenseId);
}
