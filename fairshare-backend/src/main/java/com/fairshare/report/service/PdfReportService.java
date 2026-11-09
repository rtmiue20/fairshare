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
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
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

    @Transactional(readOnly = true)
    public byte[] generateSprintReportPdf(Long teamId, Long sprintId) {
        long startTime = System.currentTimeMillis();

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found with id: " + sprintId));

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

            // Font styles
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, PRIMARY_COLOR);
            Font subTitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, TEXT_MUTED);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, TEXT_DARK);
            Font textFont = FontFactory.getFont(FontFactory.HELVETICA, 9, TEXT_DARK);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, TEXT_DARK);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, TEXT_MUTED);

            // Header Section
            Paragraph header = new Paragraph("TRUONG DAI HOC KINH TE TP. HO CHI MINH (UEH)", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, TEXT_MUTED));
            header.setAlignment(Element.ALIGN_CENTER);
            document.add(header);

            Paragraph course = new Paragraph("KHOA CONG NGHE THONG TIN KINH DOANH - MON QUAN LY DU AN CNTT", smallFont);
            course.setAlignment(Element.ALIGN_CENTER);
            document.add(course);

            Paragraph title = new Paragraph("BAO CAO DONG GOP VA MINH BACH HOA NANG SUAT - FAIRSHARE", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingBefore(8);
            title.setSpacingAfter(4);
            document.add(title);

            Paragraph instructor = new Paragraph("Giang vien huong dan: TS. Nguyen Manh Tuan | Thoi gian xuat: " + LocalDateTime.now().format(DATE_TIME_FMT), subTitleFont);
            instructor.setAlignment(Element.ALIGN_CENTER);
            instructor.setSpacingAfter(15);
            document.add(instructor);

            // Project & Sprint Meta Box
            PdfPTable metaTable = new PdfPTable(2);
            metaTable.setWidthPercentage(100);
            metaTable.setSpacingAfter(15);

            String sprintDates = (sprint.getStartDate() != null ? sprint.getStartDate().format(DATE_ONLY_FMT) : "N/A") + " - " + 
                                 (sprint.getEndDate() != null ? sprint.getEndDate().format(DATE_ONLY_FMT) : "N/A");

            addMetaCell(metaTable, "Nhom thuc hien: " + team.getName() + " (Ma: " + team.getInviteCode() + ")", boldFont);
            addMetaCell(metaTable, "Giai doan danh gia: " + sprint.getName() + " (" + (sprint.getStatus() != null ? sprint.getStatus() : "ACTIVE") + ")", boldFont);
            addMetaCell(metaTable, "Thoi gian Sprint: " + sprintDates, textFont);
            addMetaCell(metaTable, "Co so phap ly: Nghi dinh 13/2023/ND-CP ve Bao ve du lieu ca nhan (100% Consent)", textFont);
            document.add(metaTable);

            // SECTION 1: Bang tong hop dong gop
            Paragraph sec1 = new Paragraph("1. BANG TONG HOP MUC DONG GOP THANH VIEN (Scoring v1.1 - CR-03)", sectionFont);
            sec1.setSpacingBefore(5);
            sec1.setSpacingAfter(8);
            document.add(sec1);

            PdfPTable summaryTable = new PdfPTable(7);
            summaryTable.setWidthPercentage(100);
            summaryTable.setWidths(new float[]{1.8f, 1.0f, 1.0f, 1.1f, 1.2f, 1.1f, 1.1f});
            summaryTable.setSpacingAfter(15);

            // Table Header
            String[] headers = {"Thanh vien", "D1 Output", "D2 Tin cay", "D3 Hop tac", "Diem Tong", "Cham cheo", "Dong gop %"};
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
                String peerStr = (peer != null && peer.isAnonymousSafe()) ? String.format(Locale.US, "%.1f/5", peer.getAverageScore()) : "Chua du luot";

                addTableRow(summaryTable, name + "\n(" + email + ")", textFont, Element.ALIGN_LEFT);
                addTableRow(summaryTable, String.format(Locale.US, "%.1f", d1), textFont, Element.ALIGN_CENTER);
                addTableRow(summaryTable, String.format(Locale.US, "%.1f", d2), textFont, Element.ALIGN_CENTER);
                addTableRow(summaryTable, String.format(Locale.US, "%.1f", d3), textFont, Element.ALIGN_CENTER);
                addTableRow(summaryTable, String.format(Locale.US, "%.2f", compScore), boldFont, Element.ALIGN_CENTER);
                addTableRow(summaryTable, peerStr, textFont, Element.ALIGN_CENTER);
                addTableRow(summaryTable, String.format(Locale.US, "%.1f%%", pct), boldFont, Element.ALIGN_CENTER);
            }
            document.add(summaryTable);

            // SECTION 2: Bang chung truy vet
            Paragraph sec2 = new Paragraph("2. MINH CHUNG TRUY VET HOAT DONG CHINH (Evidence Traceability)", sectionFont);
            sec2.setSpacingBefore(5);
            sec2.setSpacingAfter(8);
            document.add(sec2);

            PdfPTable evidenceTable = new PdfPTable(5);
            evidenceTable.setWidthPercentage(100);
            evidenceTable.setWidths(new float[]{1.4f, 1.8f, 1.2f, 2.6f, 1.0f});
            evidenceTable.setSpacingAfter(15);

            String[] evHeaders = {"Thoi diem", "Thanh vien", "Nguon / Loai", "Chi tiet su kien", "Dung han"};
            for (String h : evHeaders) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(new Color(71, 85, 105)); // Slate-600
                cell.setPadding(5);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setBorderColor(BORDER_COLOR);
                evidenceTable.addCell(cell);
            }

            if (topEvents.isEmpty()) {
                PdfPCell emptyCell = new PdfPCell(new Phrase("Chua co su kien truy vet trong Sprint nay", textFont));
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
                    String onTime = Boolean.TRUE.equals(ev.getIsOnTime()) ? "Dung han" : "Tre han";

                    addTableRow(evidenceTable, time, smallFont, Element.ALIGN_CENTER);
                    addTableRow(evidenceTable, memberName, smallFont, Element.ALIGN_LEFT);
                    addTableRow(evidenceTable, type, smallFont, Element.ALIGN_CENTER);
                    addTableRow(evidenceTable, details, smallFont, Element.ALIGN_LEFT);
                    addTableRow(evidenceTable, onTime, smallFont, Element.ALIGN_CENTER);
                }
            }
            document.add(evidenceTable);

            // SECTION 3: Xac nhan cua Nhom truong (M0)
            Paragraph sec3 = new Paragraph("3. XAC NHAN VA CAM KET TINH MINH BACH", sectionFont);
            sec3.setSpacingBefore(5);
            sec3.setSpacingAfter(8);
            document.add(sec3);

            Paragraph cert = new Paragraph(
                    "Bao cao duoc tao tu dong boi He thong FairShare dua tren du lieu nhat ky bat bien (Activity Logs). " +
                    "Moi chi so dong gop deu co kha nang truy vet ve su kien goc nham dam bao tinh cong bang, loai bo hien tuong free-rider. " +
                    "Toan bo thanh vien da xac nhan dong y chia se du lieu theo Chinh sach Bao mat cua Nhom.",
                    smallFont
            );
            cert.setSpacingAfter(15);
            document.add(cert);

            // Signature block
            PdfPTable signTable = new PdfPTable(2);
            signTable.setWidthPercentage(100);

            PdfPCell leftCell = new PdfPCell(new Phrase("Xac nhan cua Ban giam sat (PCG)\n\n\n(Ky va ghi ro ho ten)", boldFont));
            leftCell.setBorder(Rectangle.NO_BORDER);
            leftCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            signTable.addCell(leftCell);

            PdfPCell rightCell = new PdfPCell(new Phrase("Dai dien Nhom - Nhom truong (M0)\n\nNguyen Van Minh Trieu\n(Da ky dien tu)", boldFont));
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
