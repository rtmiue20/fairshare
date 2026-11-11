package com.fairshare.report.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.contribution.dto.ContributionSummaryResponse;
import com.fairshare.contribution.service.ContributionService;
import com.fairshare.peerreview.entity.ReviewRound;
import com.fairshare.peerreview.entity.ReviewSubmission;
import com.fairshare.peerreview.repository.ReviewRoundRepository;
import com.fairshare.peerreview.repository.ReviewSubmissionRepository;
import com.fairshare.peerreview.service.AnonymityAggregator;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PdfReportService {

    private final TeamRepository teamRepository;
    private final SprintRepository sprintRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ContributionService contributionService;
    private final ReviewRoundRepository reviewRoundRepository;
    private final ReviewSubmissionRepository reviewSubmissionRepository;
    private final AnonymityAggregator anonymityAggregator;
    private final ActivityEventRepository activityEventRepository;

    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_ONLY_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Color PRIMARY_COLOR = new Color(26, 86, 219);     // Blue #1a56db
    private static final Color HEADER_BG = new Color(241, 245, 249);       // Slate-100 #f1f5f9
    private static final Color TEXT_DARK = new Color(30, 41, 59);          // Slate-800 #1e293b
    private static final Color TEXT_MUTED = new Color(100, 116, 139);      // Slate-500 #64748b
    private static final Color BORDER_COLOR = new Color(226, 232, 240);    // Slate-200 #e2e8f0

    private byte[] regularFontBytes;
    private byte[] boldFontBytes;

    @PostConstruct
    public void initFonts() {
        try (InputStream is = getClass().getResourceAsStream("/fonts/Arial.ttf")) {
            if (is != null) {
                regularFontBytes = is.readAllBytes();
            }
        } catch (Exception e) {
            log.warn("Could not load regular font from classpath: {}", e.getMessage());
        }

        try (InputStream is = getClass().getResourceAsStream("/fonts/Arial-Bold.ttf")) {
            if (is != null) {
                boldFontBytes = is.readAllBytes();
            }
        } catch (Exception e) {
            log.warn("Could not load bold font from classpath: {}", e.getMessage());
        }
    }

    private BaseFont getRegularBaseFont() {
        try {
            if (regularFontBytes != null) {
                return BaseFont.createFont("Arial.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, regularFontBytes, null);
            }
        } catch (Exception e) {
            log.warn("Could not create Unicode regular BaseFont, falling back to Helvetica: {}", e.getMessage());
        }
        try {
            return BaseFont.createFont(BaseFont.HELVETICA, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize fallback font", e);
        }
    }

    private BaseFont getBoldBaseFont() {
        try {
            if (boldFontBytes != null) {
                return BaseFont.createFont("Arial-Bold.ttf", BaseFont.IDENTITY_H, BaseFont.EMBEDDED, true, boldFontBytes, null);
            }
        } catch (Exception e) {
            log.warn("Could not create Unicode bold BaseFont, falling back to Helvetica-Bold: {}", e.getMessage());
        }
        try {
            return BaseFont.createFont(BaseFont.HELVETICA_BOLD, BaseFont.WINANSI, BaseFont.NOT_EMBEDDED);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize fallback bold font", e);
        }
    }

    @Transactional
    public byte[] generateSprintReportPdf(Long teamId, Long sprintId) {
        return generateSprintReportPdf(teamId, sprintId, null);
    }

    @Transactional
    public byte[] generateSprintReportPdf(Long teamId, Long sprintId, Long requesterId) {
        if (requesterId != null) {
            TeamMember member = teamMemberRepository.findByTeamIdAndUserId(teamId, requesterId)
                    .orElseThrow(() -> new com.fairshare.common.exception.ForbiddenException("Bạn không phải là thành viên của nhóm này"));
            if (member.getRole() != MemberRole.LEADER) {
                throw new com.fairshare.common.exception.ForbiddenException("Chỉ nhóm trưởng (Leader) mới có quyền xuất báo cáo Sprint PDF");
            }
        }

        long startTime = System.currentTimeMillis();

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found with id: " + sprintId));

        if (sprint.getTeam() == null || !sprint.getTeam().getId().equals(teamId)) {
            throw new ResourceNotFoundException("Sprint id " + sprintId + " does not belong to team " + teamId);
        }

        // 1. Lấy dữ liệu đóng góp thành viên từ ContributionService (M3)
        List<ContributionSummaryResponse> contributions = Collections.emptyList();
        try {
            contributions = contributionService.getContributionSummary(teamId, sprintId);
        } catch (Exception e) {
            log.warn("Could not calculate dynamic contribution summary via procedure: {}", e.getMessage());
        }

        // 2. Lấy danh sách thành viên nhóm
        List<TeamMember> teamMembers = teamMemberRepository.findByTeamId(teamId);

        // 3. Lấy dữ liệu điểm chấm chéo ẩn danh (M4)
        Map<Long, AnonymityAggregator.AggregatedResult> peerReviewMap = new HashMap<>();
        List<ReviewRound> rounds = reviewRoundRepository.findBySprintId(sprintId);
        if (rounds.isEmpty()) {
            rounds = reviewRoundRepository.findByTeamId(teamId);
        }
        if (!rounds.isEmpty()) {
            ReviewRound round = rounds.get(0);
            for (TeamMember m : teamMembers) {
                Long uid = m.getUser().getId();
                List<ReviewSubmission> subs = reviewSubmissionRepository.findByReviewRoundIdAndRevieweeId(round.getId(), uid);
                AnonymityAggregator.AggregatedResult agg = anonymityAggregator.aggregateForReviewee(uid, subs, 3);
                peerReviewMap.put(uid, agg);
            }
        }

        // 4. Lấy sự kiện gốc / minh chứng truy vết (Evidence Traceability)
        List<ActivityEvent> events = activityEventRepository.findBySprintId(sprintId);
        if (events.isEmpty()) {
            events = activityEventRepository.findByTeamId(teamId);
        }
        // Giới hạn top 15 sự kiện quan trọng nhất cho báo cáo
        List<ActivityEvent> topEvents = events.stream()
                .sorted(Comparator.comparing(ActivityEvent::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(15)
                .toList();

        // 5. Khởi tạo Document OpenPDF
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 40, 40);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Font styles Unicode (Arial)
            BaseFont regularBf = getRegularBaseFont();
            BaseFont boldBf = getBoldBaseFont();

            Font titleFont = new Font(boldBf, 15, Font.NORMAL, PRIMARY_COLOR);
            Font subTitleFont = new Font(regularBf, 9, Font.NORMAL, TEXT_MUTED);
            Font orgFont = new Font(boldBf, 10, Font.NORMAL, TEXT_MUTED);
            Font sectionFont = new Font(boldBf, 11, Font.NORMAL, TEXT_DARK);
            Font textFont = new Font(regularBf, 9, Font.NORMAL, TEXT_DARK);
            Font boldFont = new Font(boldBf, 9, Font.NORMAL, TEXT_DARK);
            Font headerFont = new Font(boldBf, 9, Font.NORMAL, Color.WHITE);
            Font smallFont = new Font(regularBf, 8, Font.NORMAL, TEXT_MUTED);

            // Header Section
            Paragraph header = new Paragraph("TRƯỜNG ĐẠI HỌC KINH TẾ TP. HỒ CHÍ MINH (UEH)", orgFont);
            header.setAlignment(Element.ALIGN_CENTER);
            document.add(header);

            Paragraph course = new Paragraph("KHOA CÔNG NGHỆ THÔNG TIN KINH DOANH - MÔN QUẢN LÝ DỰ ÁN CNTT", smallFont);
            course.setAlignment(Element.ALIGN_CENTER);
            document.add(course);

            Paragraph title = new Paragraph("BÁO CÁO ĐÓNG GÓP VÀ MINH BẠCH HOÁ NĂNG SUẤT - FAIRSHARE", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingBefore(8);
            title.setSpacingAfter(4);
            document.add(title);

            Paragraph instructor = new Paragraph("Giảng viên hướng dẫn: TS. Nguyễn Mạnh Tuấn | Thời gian xuất: " + LocalDateTime.now().format(DATE_TIME_FMT), subTitleFont);
            instructor.setAlignment(Element.ALIGN_CENTER);
            instructor.setSpacingAfter(15);
            document.add(instructor);

            // Project & Sprint Meta Box
            PdfPTable metaTable = new PdfPTable(2);
            metaTable.setWidthPercentage(100);
            metaTable.setSpacingAfter(15);

            String sprintDates = (sprint.getStartDate() != null ? sprint.getStartDate().format(DATE_ONLY_FMT) : "N/A") + " - " + 
                                 (sprint.getEndDate() != null ? sprint.getEndDate().format(DATE_ONLY_FMT) : "N/A");

            addMetaCell(metaTable, "Nhóm thực hiện: " + team.getName() + " (Mã: " + team.getInviteCode() + ")", boldFont);
            addMetaCell(metaTable, "Giai đoạn đánh giá: " + sprint.getName() + " (" + (sprint.getStatus() != null ? sprint.getStatus() : "ACTIVE") + ")", boldFont);
            addMetaCell(metaTable, "Thời gian Sprint: " + sprintDates, textFont);
            addMetaCell(metaTable, "Cơ sở pháp lý: Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân (100% Consent)", textFont);
            document.add(metaTable);

            // SECTION 1: Bảng tổng hợp đóng góp
            Paragraph sec1 = new Paragraph("1. BẢNG TỔNG HỢP MỨC ĐÓNG GÓP THÀNH VIÊN (Scoring v1.1 - CR-03)", sectionFont);
            sec1.setSpacingBefore(5);
            sec1.setSpacingAfter(8);
            document.add(sec1);

            PdfPTable summaryTable = new PdfPTable(7);
            summaryTable.setWidthPercentage(100);
            summaryTable.setWidths(new float[]{1.8f, 1.0f, 1.0f, 1.1f, 1.2f, 1.1f, 1.1f});
            summaryTable.setSpacingAfter(15);

            // Table Header
            String[] headers = {"Thành viên", "D1 Output", "D2 Tin cậy", "D3 Hợp tác", "Điểm Tổng", "Chấm chéo", "Đóng góp %"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(PRIMARY_COLOR);
                cell.setPadding(6);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                cell.setBorderColor(BORDER_COLOR);
                summaryTable.addCell(cell);
            }

            // Fill rows
            Map<Long, ContributionSummaryResponse> contribMap = new HashMap<>();
            for (ContributionSummaryResponse cs : contributions) {
                contribMap.put(cs.getUserId(), cs);
            }

            for (TeamMember m : teamMembers) {
                Long uid = m.getUser().getId();
                String name = m.getUser().getFullName() != null ? m.getUser().getFullName() : "User #" + uid;
                String email = m.getUser().getEmail();
                ContributionSummaryResponse c = contribMap.get(uid);

                double d1 = c != null && c.getD1Output() != null ? c.getD1Output().doubleValue() : 0.0;
                double d2 = c != null && c.getD2Reliability() != null ? c.getD2Reliability().doubleValue() : 0.0;
                double d3 = c != null && c.getD3Collaboration() != null ? c.getD3Collaboration().doubleValue() : 0.0;
                double compScore = c != null && c.getCompositeScore() != null ? c.getCompositeScore().doubleValue() : 0.0;
                double pct = c != null && c.getFinalPct() != null ? c.getFinalPct().doubleValue() : 0.0;

                AnonymityAggregator.AggregatedResult peer = peerReviewMap.get(uid);
                String peerStr = (peer != null && peer.isAnonymousSafe()) ? String.format(Locale.US, "%.1f/5", peer.getAverageScore()) : "Chưa đủ lượt";

                addTableRow(summaryTable, name + "\n(" + email + ")", textFont, Element.ALIGN_LEFT);
                addTableRow(summaryTable, String.format(Locale.US, "%.1f", d1), textFont, Element.ALIGN_CENTER);
                addTableRow(summaryTable, String.format(Locale.US, "%.1f", d2), textFont, Element.ALIGN_CENTER);
                addTableRow(summaryTable, String.format(Locale.US, "%.1f", d3), textFont, Element.ALIGN_CENTER);
                addTableRow(summaryTable, String.format(Locale.US, "%.2f", compScore), boldFont, Element.ALIGN_CENTER);
                addTableRow(summaryTable, peerStr, textFont, Element.ALIGN_CENTER);
                addTableRow(summaryTable, String.format(Locale.US, "%.1f%%", pct), boldFont, Element.ALIGN_CENTER);
            }
            document.add(summaryTable);

            // SECTION 2: Bằng chứng truy vết
            Paragraph sec2 = new Paragraph("2. MINH CHỨNG TRUY VẾT HOẠT ĐỘNG CHÍNH (Evidence Traceability)", sectionFont);
            sec2.setSpacingBefore(5);
            sec2.setSpacingAfter(8);
            document.add(sec2);

            PdfPTable evidenceTable = new PdfPTable(5);
            evidenceTable.setWidthPercentage(100);
            evidenceTable.setWidths(new float[]{1.4f, 1.8f, 1.2f, 2.6f, 1.0f});
            evidenceTable.setSpacingAfter(15);

            String[] evHeaders = {"Thời điểm", "Thành viên", "Nguồn / Loại", "Chi tiết sự kiện", "Đúng hạn"};
            for (String h : evHeaders) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(new Color(71, 85, 105)); // Slate-600
                cell.setPadding(5);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setBorderColor(BORDER_COLOR);
                evidenceTable.addCell(cell);
            }

            if (topEvents.isEmpty()) {
                PdfPCell emptyCell = new PdfPCell(new Phrase("Chưa có sự kiện truy vết trong Sprint này", textFont));
                emptyCell.setColspan(5);
                emptyCell.setPadding(8);
                emptyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                evidenceTable.addCell(emptyCell);
            } else {
                for (ActivityEvent ev : topEvents) {
                    String time = ev.getCreatedAt() != null ? ev.getCreatedAt().format(DATE_TIME_FMT) : "N/A";
                    String memberName = ev.getUser() != null && ev.getUser().getFullName() != null ? ev.getUser().getFullName() : "User";
                    String type = (ev.getSource() != null ? ev.getSource().name() : "") + " / " + (ev.getEventType() != null ? ev.getEventType() : "");
                    String details = ev.getDetails() != null ? ev.getDetails() : "Event ID #" + ev.getId();
                    String onTime = Boolean.TRUE.equals(ev.getIsOnTime()) ? "Đúng hạn" : "Trễ hạn";

                    addTableRow(evidenceTable, time, smallFont, Element.ALIGN_CENTER);
                    addTableRow(evidenceTable, memberName, smallFont, Element.ALIGN_LEFT);
                    addTableRow(evidenceTable, type, smallFont, Element.ALIGN_CENTER);
                    addTableRow(evidenceTable, details, smallFont, Element.ALIGN_LEFT);
                    addTableRow(evidenceTable, onTime, smallFont, Element.ALIGN_CENTER);
                }
            }
            document.add(evidenceTable);

            // SECTION 3: Xác nhận của Nhóm trưởng (M0)
            Paragraph sec3 = new Paragraph("3. XÁC NHẬN VÀ CAM KẾT TÍNH MINH BẠCH", sectionFont);
            sec3.setSpacingBefore(5);
            sec3.setSpacingAfter(8);
            document.add(sec3);

            Paragraph cert = new Paragraph(
                    "Báo cáo được tạo tự động bởi Hệ thống FairShare dựa trên dữ liệu nhật ký bất biến (Activity Logs). " +
                    "Mọi chỉ số đóng góp đều có khả năng truy vết về sự kiện gốc nhằm đảm bảo tính công bằng, loại bỏ hiện tượng free-rider. " +
                    "Toàn bộ thành viên đã xác nhận đồng ý chia sẻ dữ liệu theo Chính sách Bảo mật của Nhóm.",
                    smallFont
            );
            cert.setSpacingAfter(15);
            document.add(cert);

            // Signature block
            PdfPTable signTable = new PdfPTable(2);
            signTable.setWidthPercentage(100);

            PdfPCell leftCell = new PdfPCell(new Phrase("Xác nhận của Ban giám sát (PCG)\n\n\n(Ký và ghi rõ họ tên)", boldFont));
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            signTable.addCell(leftCell);

            String leaderName = teamMembers.stream()
                    .filter(m -> m.getRole() == MemberRole.LEADER && m.getUser() != null)
                    .map(m -> m.getUser().getFullName())
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElse("Nguyễn Văn Minh Triều");

            PdfPCell rightCell = new PdfPCell(new Phrase("Đại diện Nhóm - Nhóm trưởng (M0)\n\n" + leaderName + "\n(Đã ký điện tử)", boldFont));
            rightCell.setBorder(Rectangle.NO_BORDER);
            rightCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            signTable.addCell(rightCell);

            document.add(signTable);

            document.close();
            long executionTime = System.currentTimeMillis() - startTime;
            log.info("Successfully generated PDF report for team {} sprint {} in {} ms", teamId, sprintId, executionTime);

            return out.toByteArray();
        } catch (DocumentException e) {
            log.error("Failed to generate PDF report: {}", e.getMessage(), e);
            throw new RuntimeException("Error while creating PDF report", e);
        }
    }

    private void addMetaCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(HEADER_BG);
        cell.setPadding(6);
        cell.setBorderColor(BORDER_COLOR);
        table.addCell(cell);
    }

    private void addTableRow(PdfPTable table, String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setBorderColor(BORDER_COLOR);
        table.addCell(cell);
    }
}
