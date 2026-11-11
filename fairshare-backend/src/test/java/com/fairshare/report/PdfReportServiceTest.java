package com.fairshare.report;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.common.exception.BusinessException;
import com.fairshare.contribution.dto.ContributionSummaryResponse;
import com.fairshare.contribution.service.ContributionService;
import com.fairshare.peerreview.entity.ReviewRound;
import com.fairshare.peerreview.repository.ReviewRoundRepository;
import com.fairshare.peerreview.repository.ReviewSubmissionRepository;
import com.fairshare.peerreview.service.AnonymityAggregator;
import com.fairshare.report.service.PdfReportService;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class PdfReportServiceTest {

    @Mock
    private TeamRepository teamRepository;
    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;
    @Mock
    private ContributionService contributionService;
    @Mock
    private ReviewRoundRepository reviewRoundRepository;
    @Mock
    private ReviewSubmissionRepository reviewSubmissionRepository;
    @Mock
    private AnonymityAggregator anonymityAggregator;
    @Mock
    private ActivityEventRepository activityEventRepository;

    @InjectMocks
    private PdfReportService pdfReportService;

    private Team mockTeam;
    private Sprint mockSprint;
    private User mockUser1;
    private User mockUser2;

    @BeforeEach
    void setUp() {
        pdfReportService.initFonts();

        mockTeam = new Team();
        mockTeam.setId(1L);
        mockTeam.setName("Nhom 07 - FairShare");
        mockTeam.setInviteCode("FS-2026-TEAM07");

        mockSprint = new Sprint();
        mockSprint.setId(10L);
        mockSprint.setName("Sprint 4 - Bang dong gop");
        mockSprint.setTeam(mockTeam);
        mockSprint.setStartDate(LocalDate.of(2026, 11, 4));
        mockSprint.setEndDate(LocalDate.of(2026, 11, 10));

        mockUser1 = new User();
        mockUser1.setId(101L);
        mockUser1.setFullName("Nguyen Van Minh Trieu");
        mockUser1.setEmail("trieu.31241027455@st.ueh.edu.vn");

        mockUser2 = new User();
        mockUser2.setId(102L);
        mockUser2.setFullName("Nguyen Phuc Vuong");
        mockUser2.setEmail("vuong.31241025017@st.ueh.edu.vn");
    }

    @Test
    @DisplayName("G4 & WP0: Tao thanh cong file PDF bao cao Sprint hop le trong < 10 giay")
    void testGenerateSprintReportPdf_Success() {
        // Arrange
        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));
        when(sprintRepository.findById(10L)).thenReturn(Optional.of(mockSprint));

        TeamMember tm1 = new TeamMember();
        tm1.setUser(mockUser1);
        tm1.setTeam(mockTeam);
        tm1.setRole(MemberRole.LEADER);

        TeamMember tm2 = new TeamMember();
        tm2.setUser(mockUser2);
        tm2.setTeam(mockTeam);
        tm2.setRole(MemberRole.MEMBER);

        when(teamMemberRepository.findByTeamId(1L)).thenReturn(List.of(tm1, tm2));

        ContributionSummaryResponse c1 = ContributionSummaryResponse.builder()
                .userId(101L)
                .userName("Nguyen Van Minh Trieu")
                .d1Output(BigDecimal.valueOf(9.0))
                .d2Reliability(BigDecimal.valueOf(9.5))
                .d3Collaboration(BigDecimal.valueOf(8.5))
                .compositeScore(BigDecimal.valueOf(9.1))
                .finalPct(BigDecimal.valueOf(55.0))
                .build();

        ContributionSummaryResponse c2 = ContributionSummaryResponse.builder()
                .userId(102L)
                .userName("Nguyen Phuc Vuong")
                .d1Output(BigDecimal.valueOf(8.0))
                .d2Reliability(BigDecimal.valueOf(8.5))
                .d3Collaboration(BigDecimal.valueOf(8.0))
                .compositeScore(BigDecimal.valueOf(8.2))
                .finalPct(BigDecimal.valueOf(45.0))
                .build();

        when(contributionService.getContributionSummary(1L, 10L)).thenReturn(List.of(c1, c2));

        ReviewRound round = new ReviewRound();
        round.setId(1001L);
        round.setSprint(mockSprint);
        when(reviewRoundRepository.findBySprintId(10L)).thenReturn(List.of(round));

        AnonymityAggregator.AggregatedResult agg1 = AnonymityAggregator.AggregatedResult.builder()
                .revieweeId(101L)
                .averageScore(4.5)
                .submissionCount(4)
                .isAnonymousSafe(true)
                .build();
        when(anonymityAggregator.aggregateForReviewee(eq(101L), any(), anyInt())).thenReturn(agg1);

        ActivityEvent event = new ActivityEvent();
        event.setId(501L);
        event.setUser(mockUser1);
        event.setTeam(mockTeam);
        event.setSource(ActivitySource.BOARD);
        event.setEventType("CARD_COMPLETED");
        event.setDetails("Hoan thanh card: Tich hop Kanban UI");
        event.setIsOnTime(true);
        event.setCreatedAt(LocalDateTime.of(2026, 11, 8, 14, 30));

        when(activityEventRepository.findBySprintId(10L)).thenReturn(List.of(event));

        // Act
        long start = System.currentTimeMillis();
        byte[] pdfBytes = pdfReportService.generateSprintReportPdf(1L, 10L);
        long duration = System.currentTimeMillis() - start;

        // Assert
        assertNotNull(pdfBytes, "PDF bytes khong duoc null");
        assertTrue(pdfBytes.length > 1000, "PDF bytes phai co noi dung day du");

        // Verify PDF Header magic number (%PDF-)
        String header = new String(pdfBytes, 0, Math.min(pdfBytes.length, 10), StandardCharsets.US_ASCII);
        assertTrue(header.startsWith("%PDF-"), "File xuat ra phai co dinh dang PDF hop le (%PDF-)");

        // Verify performance (G4: < 10 giay, thuc te < 1000ms tren local)
        assertTrue(duration < 10000, "Thoi gian xuat bao cao phai duoi 10 giay (tieu chi G4)");
    }

    @Test
    @DisplayName("Leader xuat bao cao PDF -> Thanh cong")
    void testGenerateSprintReportPdf_Leader_Success() {
        TeamMember leaderMember = new TeamMember();
        leaderMember.setUser(mockUser1);
        leaderMember.setTeam(mockTeam);
        leaderMember.setRole(MemberRole.LEADER);

        when(teamMemberRepository.findByTeamIdAndUserId(1L, 101L)).thenReturn(Optional.of(leaderMember));
        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));
        when(sprintRepository.findById(10L)).thenReturn(Optional.of(mockSprint));
        when(teamMemberRepository.findByTeamId(1L)).thenReturn(List.of(leaderMember));
        when(contributionService.getContributionSummary(1L, 10L)).thenReturn(Collections.emptyList());
        when(reviewRoundRepository.findBySprintId(10L)).thenReturn(Collections.emptyList());
        when(activityEventRepository.findBySprintId(10L)).thenReturn(Collections.emptyList());

        byte[] pdfBytes = pdfReportService.generateSprintReportPdf(1L, 10L, 101L);
        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500);
    }

    @Test
    @DisplayName("Thanh vien thuong (Member) xuat bao cao PDF -> Bi chan voi BusinessException")
    void testGenerateSprintReportPdf_Member_Forbidden() {
        TeamMember normalMember = new TeamMember();
        normalMember.setUser(mockUser2);
        normalMember.setTeam(mockTeam);
        normalMember.setRole(MemberRole.MEMBER);

        when(teamMemberRepository.findByTeamIdAndUserId(1L, 102L)).thenReturn(Optional.of(normalMember));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> pdfReportService.generateSprintReportPdf(1L, 10L, 102L));
        assertTrue(ex.getMessage().contains("Chỉ nhóm trưởng (Leader) mới có quyền xuất báo cáo Sprint PDF"));
    }

    @Test
    @DisplayName("Nguoi ngoai khong thuoc nhom xuat bao cao PDF -> Bi chan")
    void testGenerateSprintReportPdf_NonMember_Forbidden() {
        when(teamMemberRepository.findByTeamIdAndUserId(1L, 999L)).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class,
                () -> pdfReportService.generateSprintReportPdf(1L, 10L, 999L));
        assertTrue(ex.getMessage().contains("Bạn không phải là thành viên của nhóm này"));
    }

    @Test
    @DisplayName("DEF-21 (PDF-05): Tên tiếng Việt có đầy đủ dấu hiển thị và trích xuất đúng trong PDF")
    void testGenerateSprintReportPdf_VietnameseDiacritics_Success() throws Exception {
        // Arrange
        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));
        when(sprintRepository.findById(10L)).thenReturn(Optional.of(mockSprint));

        List<String> vnNames = List.of(
                "Nguyễn Văn Ánh (Leader)",
                "Trần Thị Bích",
                "Lê Hoàng Cường",
                "Phạm Đức Dũng",
                "Võ Thị Én",
                "Đặng Quốc Phú"
        );

        List<TeamMember> members = new java.util.ArrayList<>();
        for (int i = 0; i < vnNames.size(); i++) {
            User u = new User();
            u.setId((long) (100 + i));
            u.setFullName(vnNames.get(i));
            u.setEmail("member" + i + "@fairshare.local");

            TeamMember tm = new TeamMember();
            tm.setUser(u);
            tm.setTeam(mockTeam);
            tm.setRole(i == 0 ? MemberRole.LEADER : MemberRole.MEMBER);
            members.add(tm);
        }

        when(teamMemberRepository.findByTeamId(1L)).thenReturn(members);
        when(contributionService.getContributionSummary(1L, 10L)).thenReturn(Collections.emptyList());
        when(reviewRoundRepository.findBySprintId(10L)).thenReturn(Collections.emptyList());
        when(activityEventRepository.findBySprintId(10L)).thenReturn(Collections.emptyList());

        // Act
        byte[] pdfBytes = pdfReportService.generateSprintReportPdf(1L, 10L);

        // Assert text contains all 6 Vietnamese names with diacritics
        assertNotNull(pdfBytes);
        PdfReader reader = new PdfReader(pdfBytes);
        PdfTextExtractor extractor = new PdfTextExtractor(reader);
        String fullText = extractor.getTextFromPage(1);

        for (String vnName : vnNames) {
            assertTrue(fullText.contains(vnName), "Chưa hiển thị đúng tên tiếng Việt: " + vnName);
        }
    }

    @Test
    @DisplayName("DEF-26 (PDF-08): Ghép team 1 với sprint của nhóm khác -> Ném ResourceNotFoundException (404)")
    void testGenerateSprintReportPdf_SprintBelongsToOtherTeam_ThrowsNotFound() {
        Team otherTeam = new Team();
        otherTeam.setId(2L);
        otherTeam.setName("Team 2");

        Sprint otherSprint = new Sprint();
        otherSprint.setId(99L);
        otherSprint.setName("Sprint Team 2");
        otherSprint.setTeam(otherTeam);

        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));
        when(sprintRepository.findById(99L)).thenReturn(Optional.of(otherSprint));

        assertThrows(com.fairshare.common.exception.ResourceNotFoundException.class,
                () -> pdfReportService.generateSprintReportPdf(1L, 99L));
    }
}
