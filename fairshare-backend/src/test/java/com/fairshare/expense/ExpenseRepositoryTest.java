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
import org.junit.jupiter.api.condition.EnabledIf;
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
@EnabledIf("isDockerAvailable")
class ExpenseRepositoryTest {

    static boolean isDockerAvailable() {
        try {
            return org.testcontainers.DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }

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
        split.setAmount(new BigDecimal("120.00"));
        Split savedSplit = splitRepository.saveAndFlush(split);

        assertThat(savedExpense.getId()).isNotNull();
        assertThat(savedSplit.getId()).isNotNull();
        assertThat(splitRepository.findByExpenseId(savedExpense.getId())).hasSize(1);
    }

    @Test
    void rejectsDuplicateSplitForSameMemberAndExpense() {
        TeamMember member = createMember("duplicate-split@fairshare.local");
        Expense expense = expenseRepository.saveAndFlush(createExpense(member));

        Split firstSplit = new Split();
        firstSplit.setExpense(expense);
        firstSplit.setTeamMember(member);
        firstSplit.setAmount(new BigDecimal("60.00"));
        splitRepository.saveAndFlush(firstSplit);

        Split duplicateSplit = new Split();
        duplicateSplit.setExpense(expense);
        duplicateSplit.setTeamMember(member);
        duplicateSplit.setAmount(new BigDecimal("60.00"));

        assertThatThrownBy(() -> splitRepository.saveAndFlush(duplicateSplit))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Expense createExpense(TeamMember member) {
        Expense expense = new Expense();
        expense.setTeam(member.getTeam());
        expense.setPaidBy(member);
        expense.setTitle("Team Dinner");
        expense.setAmount(new BigDecimal("120.00"));
        expense.setCurrency("VND");
        expense.setSplitMethod(SplitMethod.EQUAL);
        expense.setExpenseDate(LocalDate.now());
        return expense;
    }

    private TeamMember createMember(String email) {
        User user = new User();
        user.setEmail(email);
        user.setPassword("secret");
        user.setFullName("Member User");
        User savedUser = userRepository.saveAndFlush(user);

        Team team = new Team();
        team.setName("Test Team");
        team.setDescription("Team for testing");
        Team savedTeam = teamRepository.saveAndFlush(team);

        TeamMember member = new TeamMember();
        member.setUser(savedUser);
        member.setTeam(savedTeam);
        member.setRole(MemberRole.MEMBER);
        return teamMemberRepository.saveAndFlush(member);
    }
}
