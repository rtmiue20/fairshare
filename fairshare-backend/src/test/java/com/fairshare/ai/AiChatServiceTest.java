package com.fairshare.ai;

import com.fairshare.ai.dto.AiChatMessageDto;
import com.fairshare.ai.dto.AiChatRequest;
import com.fairshare.ai.dto.AiChatResponse;
import com.fairshare.ai.service.AiChatService;
import com.fairshare.alert.entity.Alert;
import com.fairshare.alert.repository.AlertRepository;
import com.fairshare.board.entity.Board;
import com.fairshare.board.entity.BoardColumn;
import com.fairshare.board.entity.Card;
import com.fairshare.board.repository.CardRepository;
import com.fairshare.config.AppProperties;
import com.fairshare.contribution.dto.ContributionDto;
import com.fairshare.contribution.dto.MultidimensionalNetworkDto;
import com.fairshare.contribution.service.ContributionService;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test cho AiChatService (TCREI + Gemini Integration)")
class AiChatServiceTest {

    @Mock
    private AppProperties appProperties;
    @Mock
    private TeamRepository teamRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;
    @Mock
    private SprintRepository sprintRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CardRepository cardRepository;
    @Mock
    private AlertRepository alertRepository;
    @Mock
    private ContributionService contributionService;

    @InjectMocks
    private AiChatService aiChatService;

    private Team mockTeam;
    private Sprint mockSprint;
    private User currentUser;
    private User teammate;

    @BeforeEach
    void setUp() {
        AppProperties.Gemini geminiCfg = new AppProperties.Gemini();
        geminiCfg.setApiKey("");
        geminiCfg.setModel("gemini-3.8-flash");
        lenient().when(appProperties.getGemini()).thenReturn(geminiCfg);

        mockTeam = new Team();
        mockTeam.setId(1L);
        mockTeam.setName("EduConnect");
        mockTeam.setCourseName("Quản lý dự án CNTT");

        mockSprint = new Sprint();
        mockSprint.setId(3L);
        mockSprint.setTeam(mockTeam);
        mockSprint.setName("Sprint 3 - Hoàn thiện MVP & Đánh giá Đa chiều");
        mockSprint.setStatus("ACTIVE");

        currentUser = new User();
        currentUser.setId(1L);
        currentUser.setFullName("Minh Triều (Product Owner)");
        currentUser.setEmail("trieu@ueh.edu.vn");

        teammate = new User();
        teammate.setId(2L);
        teammate.setFullName("Trần Thu Trang (Frontend Dev)");
        teammate.setEmail("trang@ueh.edu.vn");

        TeamMember tm1 = new TeamMember();
        tm1.setTeam(mockTeam);
        tm1.setUser(currentUser);
        tm1.setRole(MemberRole.LEADER);

        TeamMember tm2 = new TeamMember();
        tm2.setTeam(mockTeam);
        tm2.setUser(teammate);
        tm2.setRole(MemberRole.MEMBER);

        when(userRepository.findByEmail("trieu@ueh.edu.vn")).thenReturn(Optional.of(currentUser));
        when(teamRepository.findById(1L)).thenReturn(Optional.of(mockTeam));
        when(teamMemberRepository.findByTeamIdWithUser(1L)).thenReturn(List.of(tm1, tm2));
        when(sprintRepository.findByTeamId(1L)).thenReturn(List.of(mockSprint));

        MultidimensionalNetworkDto networkDto = MultidimensionalNetworkDto.builder()
                .teamId(1L)
                .sprintId(3L)
                .sprintName(mockSprint.getName())
                .focusedUserId(1L)
                .focusedUserName(currentUser.getFullName())
                .finalPct(new BigDecimal("0.3200"))
                .score(new BigDecimal("32.00"))
                .d1Output(1.45)
                .d2Reliability(0.88)
                .d3Collaboration(1.12)
                .d4Peer(0.95)
                .compositeScore(82.0)
                .availabilityFactor(1.0)
                .confidenceIntervalLow(29.5)
                .confidenceIntervalHigh(34.5)
                .distanceToCenter(2.16)
                .isSuspicious(false)
                .hasSufficientEvidence(true)
                .totalEventsCount(18)
                .build();

        when(contributionService.getMultidimensionalNetwork(1L, 3L, 1L)).thenReturn(networkDto);

        ContributionDto score1 = ContributionDto.builder()
                .userId(1L)
                .userName(currentUser.getFullName())
                .percentage(new BigDecimal("0.3200"))
                .score(new BigDecimal("32.00"))
                .compositeScore(82.0)
                .d1Output(1.45)
                .d2Reliability(0.88)
                .d3Collaboration(1.12)
                .d4Peer(0.95)
                .availabilityFactor(1.0)
                .cardsCompleted(5)
                .totalStoryPoints(14.0)
                .build();

        ContributionDto score2 = ContributionDto.builder()
                .userId(2L)
                .userName(teammate.getFullName())
                .percentage(new BigDecimal("0.2200"))
                .score(new BigDecimal("22.00"))
                .compositeScore(64.5)
                .d1Output(0.92)
                .d2Reliability(0.55)
                .d3Collaboration(0.60)
                .d4Peer(0.45)
                .availabilityFactor(0.95)
                .cardsCompleted(4)
                .totalStoryPoints(10.0)
                .build();

        when(contributionService.getSprintScores(3L)).thenReturn(List.of(score1, score2));

        Board board = new Board();
        board.setId(1L);
        board.setTeam(mockTeam);

        BoardColumn doneCol = new BoardColumn();
        doneCol.setId(4L);
        doneCol.setName("Done");

        BoardColumn inProgressCol = new BoardColumn();
        inProgressCol.setId(2L);
        inProgressCol.setName("In Progress");

        Card c1 = new Card();
        c1.setId(101L);
        c1.setBoard(board);
        c1.setColumn(doneCol);
        c1.setTitle("Thiết kế mô hình Vector đa chiều 4 tầng");
        c1.setAssignee(currentUser);
        c1.setStoryPoints(5.0);
        c1.setDifficultyLevel(3);
        c1.setDueDate(LocalDateTime.now().plusDays(2));

        Card c2 = new Card();
        c2.setId(102L);
        c2.setBoard(board);
        c2.setColumn(inProgressCol);
        c2.setTitle("Tối ưu hóa ảnh tài liệu với Cloudinary CDN");
        c2.setAssignee(currentUser);
        c2.setStoryPoints(3.0);
        c2.setDifficultyLevel(2);
        c2.setDueDate(LocalDateTime.now().plusDays(3));

        when(cardRepository.findByBoardTeamId(1L)).thenReturn(List.of(c1, c2));

        Alert alert = new Alert();
        alert.setId(84L);
        alert.setSeverity("HIGH");
        alert.setMessage("Công việc \"Tối ưu hóa ảnh tài liệu với Cloudinary CDN\" cần kiểm tra tiến độ");
        when(alertRepository.findByTeamIdAndResolvedFalse(1L)).thenReturn(List.of(alert));
    }

    @Test
    @DisplayName("TCREI Prompt Breakdown chứa đủ 5 bước Task, Context, Reference, Evaluate, Iterate và dữ liệu thật")
    void testTcreiBreakdownAndPersonalScoreQuery() {
        AiChatRequest req = AiChatRequest.builder()
                .teamId(1L)
                .sprintId(3L)
                .focusedUserId(1L)
                .question("Điểm số hiện tại của tôi thế nào?")
                .history(List.of(
                        AiChatMessageDto.builder().role("user").content("Chào AI").build(),
                        AiChatMessageDto.builder().role("assistant").content("Xin chào!").build()
                ))
                .build();

        AiChatResponse res = aiChatService.chat(req, "trieu@ueh.edu.vn");

        assertNotNull(res);
        assertFalse(res.isLiveGeminiUsed());
        assertNotNull(res.getTcrei());
        assertTrue(res.getTcrei().getTask().contains("[T - TASK"));
        assertTrue(res.getTcrei().getContext().contains("EduConnect"));
        assertTrue(res.getTcrei().getContext().contains("82.0"));
        assertTrue(res.getTcrei().getReference().contains("Sigmoid"));
        assertTrue(res.getTcrei().getEvaluate().contains("[E - EVALUATE"));
        assertTrue(res.getTcrei().getIterate().contains("Chào AI"));

        assertTrue(res.getAnswer().contains("32.0%"));
        assertTrue(res.getAnswer().contains("82.0"));
        assertFalse(res.getSuggestedFollowUps().isEmpty());
    }

    @Test
    @DisplayName("Trả lời đúng cách tính điểm theo Mô hình 4 tầng gắn với số liệu của thành viên")
    void testScoringFormulaQuery() {
        AiChatRequest req = AiChatRequest.builder()
                .teamId(1L)
                .sprintId(3L)
                .focusedUserId(1L)
                .question("Giải thích cách tính điểm 4 tầng cho tôi")
                .build();

        AiChatResponse res = aiChatService.chat(req, "trieu@ueh.edu.vn");

        assertTrue(res.getAnswer().contains("Tầng 1"));
        assertTrue(res.getAnswer().contains("Tầng 2"));
        assertTrue(res.getAnswer().contains("Tầng 3"));
        assertTrue(res.getAnswer().contains("Tầng 4"));
        assertTrue(res.getAnswer().contains("1.45"));
        assertTrue(res.getAnswer().contains("82.0"));
    }

    @Test
    @DisplayName("Trả lời chính xác câu hỏi về Tổng quát nhóm và Công việc dự án đang đảm nhận")
    void testTeamOverviewAndProjectTasksQueries() {
        AiChatRequest overviewReq = AiChatRequest.builder()
                .teamId(1L)
                .sprintId(3L)
                .focusedUserId(1L)
                .question("Tổng quát bảng điểm cả nhóm?")
                .build();
        AiChatResponse overviewRes = aiChatService.chat(overviewReq, "trieu@ueh.edu.vn");

        assertTrue(overviewRes.getAnswer().contains("EduConnect"));
        assertTrue(overviewRes.getAnswer().contains("Minh Triều"));
        assertTrue(overviewRes.getAnswer().contains("Trần Thu Trang"));

        AiChatRequest tasksReq = AiChatRequest.builder()
                .teamId(1L)
                .sprintId(3L)
                .focusedUserId(1L)
                .question("Các công việc dự án tôi đang đảm nhận?")
                .build();
        AiChatResponse tasksRes = aiChatService.chat(tasksReq, "trieu@ueh.edu.vn");

        assertTrue(tasksRes.getAnswer().contains("EduConnect"));
        assertTrue(tasksRes.getAnswer().contains("Thiết kế mô hình Vector đa chiều 4 tầng"));
        assertTrue(tasksRes.getAnswer().contains("Tối ưu hóa ảnh tài liệu với Cloudinary CDN"));
    }

    @Test
    @DisplayName("AI Tự nhận xét nhóm tổng hợp phân bố, 4 trục đa chiều, tiến độ Kanban và khả dụng thực tế")
    void testTeamAiReviewInsight() {
        AiChatRequest reviewReq = AiChatRequest.builder()
                .teamId(1L)
                .sprintId(3L)
                .focusedUserId(1L)
                .question("Hãy nhận xét và đánh giá tổng thể tình hình nhóm, phân bố đóng góp các thành viên, tiến độ công việc, hệ số khả dụng và đề xuất cải thiện trong Sprint hiện tại.")
                .build();

        AiChatResponse reviewRes = aiChatService.chat(reviewReq, "trieu@ueh.edu.vn");

        assertNotNull(reviewRes);
        assertTrue(reviewRes.getAnswer().contains("Nhận xét tổng thể EduConnect"));
        assertTrue(reviewRes.getAnswer().contains("Phân bố đóng góp & Cân bằng nhóm"));
        assertTrue(reviewRes.getAnswer().contains("1/2 thẻ"));
        assertTrue(reviewRes.getAnswer().contains("Trần Thu Trang"));
        assertTrue(reviewRes.getAnswer().contains("95%"));
    }
}
