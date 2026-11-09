package com.fairshare.peerreview;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.peerreview.dto.ReviewSubmissionDto;
import com.fairshare.peerreview.entity.ReviewCriterion;
import com.fairshare.peerreview.entity.ReviewRound;
import com.fairshare.peerreview.entity.ReviewRoundStatus;
import com.fairshare.peerreview.entity.ReviewSubmission;
import com.fairshare.peerreview.repository.ReviewRoundRepository;
import com.fairshare.peerreview.repository.ReviewSubmissionRepository;
import com.fairshare.peerreview.service.AnonymityAggregator;
import com.fairshare.peerreview.service.PeerReviewService;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PeerReviewServiceTest {

    @Mock
    private ReviewRoundRepository reviewRoundRepository;
    @Mock
    private ReviewSubmissionRepository reviewSubmissionRepository;
    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AnonymityAggregator anonymityAggregator;

    @InjectMocks
    private PeerReviewService peerReviewService;

    private ReviewRound round;

    @BeforeEach
    void setUp() {
        Team team = new Team();
        team.setId(7L);
        round = new ReviewRound();
        round.setId(12L);
        round.setTeam(team);
        round.setStatus(ReviewRoundStatus.DRAFT);
    }

    @Test
    void openRound_changesDraftToOpenForTeamLeader() {
        when(reviewRoundRepository.findById(12L)).thenReturn(Optional.of(round));
        when(teamMemberRepository.findByTeamIdAndUserId(7L, 3L))
                .thenReturn(Optional.of(member(MemberRole.LEADER)));
        when(reviewRoundRepository.save(round)).thenReturn(round);

        ReviewRound result = peerReviewService.openRound(12L, 3L);

        assertThat(result.getStatus()).isEqualTo(ReviewRoundStatus.OPEN);
        verify(reviewRoundRepository).save(round);
    }

    @Test
    void openRound_rejectsRoundThatIsAlreadyOpen() {
        round.setStatus(ReviewRoundStatus.OPEN);
        when(reviewRoundRepository.findById(12L)).thenReturn(Optional.of(round));
        when(teamMemberRepository.findByTeamIdAndUserId(7L, 3L))
                .thenReturn(Optional.of(member(MemberRole.LEADER)));

        assertThatThrownBy(() -> peerReviewService.openRound(12L, 3L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("draft");
        verify(reviewRoundRepository, never()).save(round);
    }

    @Test
    void closeRound_changesOpenToClosedForTeamLeader() {
        round.setStatus(ReviewRoundStatus.OPEN);
        when(reviewRoundRepository.findById(12L)).thenReturn(Optional.of(round));
        when(teamMemberRepository.findByTeamIdAndUserId(7L, 3L))
                .thenReturn(Optional.of(member(MemberRole.LEADER)));
        when(reviewRoundRepository.save(round)).thenReturn(round);

        ReviewRound result = peerReviewService.closeRound(12L, 3L);

        assertThat(result.getStatus()).isEqualTo(ReviewRoundStatus.CLOSED);
        verify(reviewRoundRepository).save(round);
    }

    @Test
    void memberCannotOpenReviewRound() {
        when(reviewRoundRepository.findById(12L)).thenReturn(Optional.of(round));
        when(teamMemberRepository.findByTeamIdAndUserId(7L, 3L))
                .thenReturn(Optional.of(member(MemberRole.MEMBER)));

        assertThatThrownBy(() -> peerReviewService.openRound(12L, 3L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("team leader");
        verify(reviewRoundRepository, never()).save(round);
    }

    @Test
    void submitReview_savesAllValidCriteriaForAnOpenRound() {
        round.setStatus(ReviewRoundStatus.OPEN);
        User reviewer = user(3L);
        User reviewee = user(4L);
        ReviewSubmissionDto request = request(4L, score(ReviewCriterion.QUALITY, 5),
                score(ReviewCriterion.PUNCTUALITY, 4), score(ReviewCriterion.COOPERATION, 3));
        when(reviewRoundRepository.findById(12L)).thenReturn(Optional.of(round));
        when(userRepository.findById(3L)).thenReturn(Optional.of(reviewer));
        when(userRepository.findById(4L)).thenReturn(Optional.of(reviewee));
        when(teamMemberRepository.existsByTeamIdAndUserId(7L, 3L)).thenReturn(true);
        when(teamMemberRepository.existsByTeamIdAndUserId(7L, 4L)).thenReturn(true);
        when(reviewSubmissionRepository.existsByReviewRoundIdAndReviewerIdAndRevieweeIdAndCriterion(
                eq(12L), eq(3L), eq(4L), any())).thenReturn(false);
        when(reviewSubmissionRepository.saveAll(anyList()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        List<ReviewSubmission> saved = peerReviewService.submitReview(12L, 3L, request);

        assertThat(saved).hasSize(3);
        assertThat(saved).extracting(ReviewSubmission::getCriterion)
                .containsExactly(ReviewCriterion.QUALITY, ReviewCriterion.PUNCTUALITY, ReviewCriterion.COOPERATION);
        assertThat(saved).extracting(ReviewSubmission::getScore).containsExactly(5, 4, 3);
        verify(reviewSubmissionRepository).saveAll(saved);
    }

    @Test
    void submitReview_rejectsClosedRound() {
        round.setStatus(ReviewRoundStatus.CLOSED);
        when(reviewRoundRepository.findById(12L)).thenReturn(Optional.of(round));

        assertThatThrownBy(() -> peerReviewService.submitReview(12L, 3L,
                request(4L, score(ReviewCriterion.QUALITY, 5))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("open review round");
        verify(reviewSubmissionRepository, never()).saveAll(anyList());
    }

    @Test
    void submitReview_rejectsDuplicateCriterionInRequest() {
        round.setStatus(ReviewRoundStatus.OPEN);
        when(reviewRoundRepository.findById(12L)).thenReturn(Optional.of(round));
        when(userRepository.findById(3L)).thenReturn(Optional.of(user(3L)));
        when(userRepository.findById(4L)).thenReturn(Optional.of(user(4L)));
        when(teamMemberRepository.existsByTeamIdAndUserId(7L, 3L)).thenReturn(true);
        when(teamMemberRepository.existsByTeamIdAndUserId(7L, 4L)).thenReturn(true);

        assertThatThrownBy(() -> peerReviewService.submitReview(12L, 3L,
                request(4L, score(ReviewCriterion.QUALITY, 5), score(ReviewCriterion.QUALITY, 4))))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("only be submitted once");
        verify(reviewSubmissionRepository, never()).saveAll(anyList());
    }

    private static ReviewSubmissionDto request(Long revieweeId, ReviewSubmissionDto.CriterionScore... scores) {
        ReviewSubmissionDto dto = new ReviewSubmissionDto();
        dto.setRevieweeId(revieweeId);
        dto.setScores(List.of(scores));
        dto.setFeedback("Good teamwork");
        return dto;
    }

    private static ReviewSubmissionDto.CriterionScore score(ReviewCriterion criterion, int value) {
        ReviewSubmissionDto.CriterionScore score = new ReviewSubmissionDto.CriterionScore();
        score.setCriterion(criterion);
        score.setScore(value);
        return score;
    }

    private static User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    private static TeamMember member(MemberRole role) {
        TeamMember member = new TeamMember();
        member.setRole(role);
        return member;
    }
}
