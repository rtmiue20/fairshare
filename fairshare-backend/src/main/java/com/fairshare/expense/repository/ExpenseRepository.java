package com.fairshare.expense.repository;

import com.fairshare.expense.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByTeamIdOrderByExpenseDateDesc(Long teamId);
}
