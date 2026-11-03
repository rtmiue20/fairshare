package com.fairshare.expense;

import com.fairshare.TestcontainersConfiguration;
import com.fairshare.expense.entity.Expense;
import com.fairshare.expense.entity.Split;
import com.fairshare.expense.entity.SplitMethod;
import com.fairshare.expense.repository.ExpenseRepository;
import com.fairshare.expense.repository.SplitRepository;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class ExpenseRepositoryTest {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private TeamRepository teamRepository;
    @Autowired
    private TeamMemberRepository teamMemberRepository;
    @Autowired
    private ExpenseRepository expenseRepository;
    @Autowired
    private SplitRepository splitRepository;

    @Test
    void savesExpenseAndSplitsUsingTeamMembershipRelations() {
        TeamMember member = createMember("expense-member@fairshare.local");
        Expense expense = createExpense(member);
        Expense savedExpense = expenseRepository.saveAndFlush(expense);

        Split split = new Split();
        split.setExpense(savedExpense);
        split.setTeamMember(member);
        split.setAmount(new BigDecimal("125000.00"));
        splitRepository.saveAndFlush(split);

        assertThat(expenseRepository.findByTeamIdOrderByExpenseDateDesc(member.getTeam().getId()))
                .extracting(Expense::getId)
                .containsExactly(savedExpense.getId());
        assertThat(splitRepository.findByExpenseIdOrderById(savedExpense.getId()))
                .singleElement()
                .extracting(Split::getAmount)
                .isEqualTo(new BigDecimal("125000.00"));
    }

    @Test
    void rejectsDuplicateMembershipForTheSameTeamAndUser() {
        TeamMember member = createMember("duplicate-member@fairshare.local");
        TeamMember duplicate = new TeamMember();
        duplicate.setTeam(member.getTeam());
        duplicate.setUser(member.getUser());
        duplicate.setRole(MemberRole.MEMBER);

        assertThatThrownBy(() -> teamMemberRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsDuplicateSplitForTheSameExpenseAndMember() {
        TeamMember member = createMember("duplicate-split@fairshare.local");
        Expense expense = expenseRepository.saveAndFlush(createExpense(member));

        Split first = new Split();
        first.setExpense(expense);
        first.setTeamMember(member);
        first.setAmount(new BigDecimal("62500.00"));
        splitRepository.saveAndFlush(first);

        Split duplicate = new Split();
        duplicate.setExpense(expense);
        duplicate.setTeamMember(member);
        duplicate.setAmount(new BigDecimal("62500.00"));

        assertThatThrownBy(() -> splitRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private TeamMember createMember(String email) {
        User user = new User();
        user.setEmail(email);
        user.setPassword("test-password-hash");
        user.setFullName("Test member");
        user = userRepository.saveAndFlush(user);

        Team team = new Team();
        team.setName("Test team");
        team = teamRepository.saveAndFlush(team);

        TeamMember member = new TeamMember();
        member.setUser(user);
        member.setTeam(team);
        member.setRole(MemberRole.LEADER);
        return teamMemberRepository.saveAndFlush(member);
    }

    private Expense createExpense(TeamMember payer) {
        Expense expense = new Expense();
        expense.setTeam(payer.getTeam());
        expense.setPaidBy(payer);
        expense.setTitle("Shared dinner");
        expense.setAmount(new BigDecimal("125000.00"));
        expense.setCurrency("VND");
        expense.setSplitMethod(SplitMethod.EQUAL);
        expense.setExpenseDate(LocalDate.of(2026, 11, 3));
        return expense;
    }
}
