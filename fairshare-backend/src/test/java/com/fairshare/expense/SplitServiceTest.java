package com.fairshare.expense;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.expense.entity.Expense;
import com.fairshare.expense.entity.Split;
import com.fairshare.expense.repository.ExpenseRepository;
import com.fairshare.expense.repository.SplitRepository;
import com.fairshare.expense.service.SplitAllocation;
import com.fairshare.expense.service.SplitService;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SplitServiceTest {

    @Mock
    private ExpenseRepository expenseRepository;
    @Mock
    private SplitRepository splitRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;

    @InjectMocks
    private SplitService splitService;

    private Expense expense;
    private TeamMember firstMember;
    private TeamMember secondMember;

    @BeforeEach
    void setUp() {
        Team team = new Team();
        team.setId(5L);

        expense = new Expense();
        expense.setId(10L);
        expense.setTeam(team);
        expense.setAmount(new BigDecimal("100.00"));

        firstMember = member(21L, team);
        secondMember = member(22L, team);

        when(expenseRepository.findById(10L)).thenReturn(Optional.of(expense));
    }

    @Test
    void replaceSplits_savesAllocationsThatExactlyMatchExpenseAmount() {
        when(teamMemberRepository.findById(21L)).thenReturn(Optional.of(firstMember));
        when(teamMemberRepository.findById(22L)).thenReturn(Optional.of(secondMember));
        when(splitRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        List<Split> result = splitService.replaceSplits(10L, List.of(
                new SplitAllocation(21L, new BigDecimal("40.00")),
                new SplitAllocation(22L, new BigDecimal("60.00"))));

        assertThat(result).hasSize(2);
        assertThat(result).extracting(Split::getAmount)
                .containsExactly(new BigDecimal("40.00"), new BigDecimal("60.00"));
        verify(splitRepository).deleteByExpenseId(10L);
        verify(splitRepository).saveAll(result);
    }

    @Test
    void replaceSplits_rejectsIncorrectTotalWithoutReplacingExistingData() {
        when(teamMemberRepository.findById(21L)).thenReturn(Optional.of(firstMember));
        when(teamMemberRepository.findById(22L)).thenReturn(Optional.of(secondMember));

        assertThatThrownBy(() -> splitService.replaceSplits(10L, List.of(
                new SplitAllocation(21L, new BigDecimal("40.00")),
                new SplitAllocation(22L, new BigDecimal("50.00")))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("add up");

        verify(splitRepository, never()).deleteByExpenseId(10L);
        verify(splitRepository, never()).saveAll(anyList());
    }

    @Test
    void replaceSplits_rejectsDuplicateMember() {
        when(teamMemberRepository.findById(21L)).thenReturn(Optional.of(firstMember));

        assertThatThrownBy(() -> splitService.replaceSplits(10L, List.of(
                new SplitAllocation(21L, new BigDecimal("40.00")),
                new SplitAllocation(21L, new BigDecimal("60.00")))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("only be listed once");

        verify(splitRepository, never()).deleteByExpenseId(10L);
    }

    @Test
    void replaceSplits_rejectsMemberFromAnotherTeam() {
        Team otherTeam = new Team();
        otherTeam.setId(6L);
        TeamMember outsider = member(23L, otherTeam);
        when(teamMemberRepository.findById(23L)).thenReturn(Optional.of(outsider));

        assertThatThrownBy(() -> splitService.replaceSplits(10L, List.of(
                new SplitAllocation(23L, new BigDecimal("100.00")))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("expense team");

        verify(splitRepository, never()).deleteByExpenseId(10L);
    }

    private static TeamMember member(Long id, Team team) {
        TeamMember member = new TeamMember();
        member.setId(id);
        member.setTeam(team);
        return member;
    }
}
