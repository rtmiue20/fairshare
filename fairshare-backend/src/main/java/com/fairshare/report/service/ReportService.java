package com.fairshare.report.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.contribution.entity.ContributionScore;
import com.fairshare.contribution.repository.ContributionScoreRepository;
import com.fairshare.report.dto.IndividualReportDto;
import com.fairshare.report.dto.OverviewReportDto;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.sprint.repository.SprintRepository;
import com.fairshare.team.entity.MemberRole;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportService {

    private final ContributionScoreRepository contributionScoreRepository;
    private final SprintRepository sprintRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ActivityEventRepository activityEventRepository;
    private final EmailService emailService;

    // -------------------------------------------------------------------------
    // Overview Report
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public OverviewReportDto getOverviewReport(Long teamId, Long sprintId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found: " + sprintId));

        List<TeamMember> members = teamMemberRepository.findByTeamIdWithUser(teamId);
        List<ContributionScore> scores = contributionScoreRepository.findByTeamIdAndSprintId(teamId, sprintId);
        List<ActivityEvent> events = activityEventRepository.findBySprintId(sprintId);

        Map<Long, ContributionScore> scoreMap = scores.stream()
                .filter(s -> s.getUser() != null)
                .collect(Collectors.toMap(s -> s.getUser().getId(), s -> s, (a, b) -> a));

        // Leader info
        String leaderName = members.stream()
                .filter(m -> MemberRole.LEADER.equals(m.getRole()))
                .map(m -> m.getUser().getFullName())
                .findFirst().orElse("");

        // Gini coefficient
        List<Double> finalPcts = scores.stream()
                .map(s -> s.getFinalPct() != null ? s.getFinalPct().doubleValue() : 0.0)
                .filter(v -> v > 0)
                .sorted()
                .toList();
        double gini = calculateGini(finalPcts);
        String giniLabel = giniLabel(gini);

        // Build member DTOs
        List<OverviewReportDto.MemberReportDto> memberDtos = new ArrayList<>();
        for (TeamMember tm : members) {
            User u = tm.getUser();
            ContributionScore cs = scoreMap.get(u.getId());

            long tasksDone = events.stream()
                    .filter(e -> e.getUser() != null && e.getUser().getId().equals(u.getId()))
                    .filter(e -> e.getEventType() != null && e.getEventType().toUpperCase().contains("COMPLETED"))
                    .count();

            memberDtos.add(OverviewReportDto.MemberReportDto.builder()
                    .userId(u.getId())
                    .userName(u.getFullName())
                    .email(u.getEmail())
                    .role(tm.getRole().name())
                    .isLeader(MemberRole.LEADER.equals(tm.getRole()))
                    .finalPct(cs != null && cs.getFinalPct() != null ? cs.getFinalPct().doubleValue() : 0.0)
                    .d1Output(cs != null && cs.getD1Output() != null ? cs.getD1Output().doubleValue() : 0.0)
                    .d2Reliability(cs != null && cs.getD2Reliability() != null ? cs.getD2Reliability().doubleValue() : 0.0)
                    .d3Collaboration(cs != null && cs.getD3Collaboration() != null ? cs.getD3Collaboration().doubleValue() : 0.0)
                    .d4Peer(cs != null && cs.getD4Peer() != null ? cs.getD4Peer().doubleValue() : 0.0)
                    .compositeScore(cs != null && cs.getCompositeScore() != null ? cs.getCompositeScore().doubleValue() : 0.0)
                    .availabilityFactor(cs != null && cs.getAvailabilityFactor() != null ? cs.getAvailabilityFactor().doubleValue() : 1.0)
                    .isSuspicious(cs != null && Boolean.TRUE.equals(cs.getIsSuspicious()))
                    .hasSufficientEvidence(cs == null || cs.getHasSufficientEvidence() == null || Boolean.TRUE.equals(cs.getHasSufficientEvidence()))
                    .tasksCompleted((int) tasksDone)
                    .confidenceIntervalLow(cs != null && cs.getConfidenceIntervalLow() != null ? cs.getConfidenceIntervalLow().doubleValue() : 0.0)
                    .confidenceIntervalHigh(cs != null && cs.getConfidenceIntervalHigh() != null ? cs.getConfidenceIntervalHigh().doubleValue() : 0.0)
                    .evidenceStatus(cs != null && Boolean.TRUE.equals(cs.getHasSufficientEvidence()) ? "SUFFICIENT" : "INSUFFICIENT_EVIDENCE")
                    .build());
        }

        return OverviewReportDto.builder()
                .teamId(teamId)
                .teamName(team.getName())
                .sprintId(sprintId)
                .sprintName(sprint.getName())
                .startDate(sprint.getStartDate() != null ? sprint.getStartDate().toString() : "")
                .endDate(sprint.getEndDate() != null ? sprint.getEndDate().toString() : "")
                .totalMembers(members.size())
                .totalTasks((int) events.stream().filter(e -> e.getEventType() != null && e.getEventType().toUpperCase().contains("COMPLETED")).count())
                .totalEvents(events.size())
                .giniCoefficient(gini)
                .giniLabel(giniLabel)
                .consentRate(0.0) // placeholder – consent repo not injected here
                .leaderName(leaderName)
                .inviteCode(team.getInviteCode())
                .members(memberDtos)
                .build();
    }

    // -------------------------------------------------------------------------
    // Individual Report
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public IndividualReportDto getIndividualReport(Long teamId, Long sprintId, Long userId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));
        Sprint sprint = sprintRepository.findById(sprintId)
                .orElseThrow(() -> new ResourceNotFoundException("Sprint not found: " + sprintId));

        TeamMember tm = teamMemberRepository.findByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found in team"));
        User user = tm.getUser();

        ContributionScore cs = contributionScoreRepository.findBySprintIdAndUserId(sprintId, userId)
                .orElse(null);

        List<ActivityEvent> memberEvents = activityEventRepository.findBySprintIdAndUserId(sprintId, userId);
        if (memberEvents.isEmpty()) {
            memberEvents = activityEventRepository.findByTeamIdAndUserId(teamId, userId);
        }

        List<IndividualReportDto.EvidenceSummary> evidenceList = memberEvents.stream()
                .map(e -> IndividualReportDto.EvidenceSummary.builder()
                        .taskName(e.getDetails() != null ? truncate(e.getDetails(), 80) : "")
                        .storyPoints(e.getStoryPoints() != null ? e.getStoryPoints().intValue() : 0)
                        .earnedScore(e.getStoryPoints() != null ? e.getStoryPoints() : 0.0)
                        .eventTime(e.getOccurredAt() != null ? e.getOccurredAt().toString() : "")
                        .status(e.getEventType() != null ? e.getEventType() : "")
                        .build())
                .toList();

        return IndividualReportDto.builder()
                .userId(user.getId())
                .userName(user.getFullName())
                .email(user.getEmail())
                .role(tm.getRole().name())
                .teamId(teamId)
                .teamName(team.getName())
                .sprintId(sprintId)
                .sprintName(sprint.getName())
                .startDate(sprint.getStartDate() != null ? sprint.getStartDate().toString() : "")
                .endDate(sprint.getEndDate() != null ? sprint.getEndDate().toString() : "")
                .finalPct(cs != null && cs.getFinalPct() != null ? cs.getFinalPct().doubleValue() : 0.0)
                .d1Output(cs != null && cs.getD1Output() != null ? cs.getD1Output().doubleValue() : 0.0)
                .d2Reliability(cs != null && cs.getD2Reliability() != null ? cs.getD2Reliability().doubleValue() : 0.0)
                .d3Collaboration(cs != null && cs.getD3Collaboration() != null ? cs.getD3Collaboration().doubleValue() : 0.0)
                .d4Peer(cs != null && cs.getD4Peer() != null ? cs.getD4Peer().doubleValue() : 0.0)
                .compositeScore(cs != null && cs.getCompositeScore() != null ? cs.getCompositeScore().doubleValue() : 0.0)
                .availabilityFactor(cs != null && cs.getAvailabilityFactor() != null ? cs.getAvailabilityFactor().doubleValue() : 1.0)
                .confidenceIntervalLow(cs != null && cs.getConfidenceIntervalLow() != null ? cs.getConfidenceIntervalLow().doubleValue() : 0.0)
                .confidenceIntervalHigh(cs != null && cs.getConfidenceIntervalHigh() != null ? cs.getConfidenceIntervalHigh().doubleValue() : 0.0)
                .isSuspicious(cs != null && Boolean.TRUE.equals(cs.getIsSuspicious()))
                .hasSufficientEvidence(cs == null || cs.getHasSufficientEvidence() == null || Boolean.TRUE.equals(cs.getHasSufficientEvidence()))
                .evidenceList(evidenceList)
                .build();
    }

    // -------------------------------------------------------------------------
    // Email sending
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public void sendIndividualEmail(Long teamId, Long sprintId, Long userId) {
        IndividualReportDto report = getIndividualReport(teamId, sprintId, userId);
        String html = buildIndividualHtmlEmail(report);
        String subject = "[FairShare] Báo cáo đóng góp cá nhân – " + report.getSprintName();
        emailService.sendHtmlEmail(report.getEmail(), subject, html);
    }

    @Transactional(readOnly = true)
    public void sendAllEmails(Long teamId, Long sprintId) {
        List<TeamMember> members = teamMemberRepository.findByTeamIdWithUser(teamId);
        for (TeamMember tm : members) {
            try {
                sendIndividualEmail(teamId, sprintId, tm.getUser().getId());
            } catch (Exception e) {
                log.error("Failed to send email to user {}: {}", tm.getUser().getId(), e.getMessage());
            }
        }
    }

    // -------------------------------------------------------------------------
    // HTML email builder
    // -------------------------------------------------------------------------

    private String buildIndividualHtmlEmail(IndividualReportDto r) {
        String suspiciousWarning = r.isSuspicious()
                ? "<div style=\"background:#7f1d1d;border-left:4px solid #ef4444;padding:12px 16px;border-radius:8px;margin-bottom:16px;\">" +
                  "<span style=\"color:#fca5a5;font-weight:600;\">⚠️ Cờ ngờ vực được kích hoạt</span>" +
                  "<p style=\"color:#fca5a5;margin:4px 0 0;font-size:13px;\">Điểm đóng góp có dấu hiệu bất thường và đang được xem xét bởi nhóm.</p></div>"
                : "";

        String evidenceStatus = r.isHasSufficientEvidence()
                ? "<span style=\"background:#065f46;color:#6ee7b7;padding:3px 10px;border-radius:12px;font-size:12px;\">✓ Đủ bằng chứng</span>"
                : "<span style=\"background:#78350f;color:#fcd34d;padding:3px 10px;border-radius:12px;font-size:12px;\">⚠ Thiếu bằng chứng</span>";

        StringBuilder evidenceRows = new StringBuilder();
        if (r.getEvidenceList() != null && !r.getEvidenceList().isEmpty()) {
            for (IndividualReportDto.EvidenceSummary ev : r.getEvidenceList()) {
                evidenceRows.append(String.format(
                    "<tr>" +
                    "<td style=\"padding:8px 12px;color:#e2e8f0;border-bottom:1px solid #1e293b;\">%s</td>" +
                    "<td style=\"padding:8px 12px;text-align:center;color:#818cf8;border-bottom:1px solid #1e293b;\">%d SP</td>" +
                    "<td style=\"padding:8px 12px;text-align:center;color:#34d399;border-bottom:1px solid #1e293b;\">%.1f</td>" +
                    "<td style=\"padding:8px 12px;color:#94a3b8;font-size:12px;border-bottom:1px solid #1e293b;\">%s</td>" +
                    "</tr>",
                    htmlEscape(ev.getTaskName()), ev.getStoryPoints(), ev.getEarnedScore(),
                    ev.getEventTime().length() > 16 ? ev.getEventTime().substring(0, 16) : ev.getEventTime()
                ));
            }
        } else {
            evidenceRows.append("<tr><td colspan=\"4\" style=\"padding:12px;text-align:center;color:#64748b;\">Chưa có bằng chứng được ghi nhận</td></tr>");
        }

        return "<!DOCTYPE html>" +
            "<html><head><meta charset=\"UTF-8\"/></head>" +
            "<body style=\"font-family:Inter,Arial,sans-serif;background:#0a0a0f;color:#e2e8f0;margin:0;padding:24px 0\">" +
            "<div style=\"max-width:600px;margin:0 auto;background:#12131a;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5)\">" +

            // Header
            "<div style=\"background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:36px 32px;text-align:center\">" +
            "<div style=\"font-size:26px;font-weight:800;color:#fff;letter-spacing:2px\">FAIRSHARE</div>" +
            "<div style=\"font-size:13px;color:rgba(255,255,255,0.75);margin-top:6px\">Hệ thống đo lường đóng góp nhóm</div>" +
            "</div>" +

            // Body
            "<div style=\"padding:32px\">" +
            "<h2 style=\"color:#818cf8;margin:0 0 6px;font-size:20px\">Báo cáo cá nhân – " + htmlEscape(r.getSprintName()) + "</h2>" +
            "<p style=\"color:#94a3b8;margin:0 0 24px;font-size:14px\">Xin chào <strong style=\"color:#e2e8f0\">" + htmlEscape(r.getUserName()) + "</strong>, đây là báo cáo đóng góp của bạn.</p>" +

            // Team / Sprint info
            "<div style=\"background:#1e293b;border-radius:10px;padding:16px 20px;margin-bottom:20px;font-size:13px;color:#94a3b8\">" +
            "<span style=\"margin-right:24px\">📌 Nhóm: <strong style=\"color:#e2e8f0\">" + htmlEscape(r.getTeamName()) + "</strong></span>" +
            "<span>🗓 Sprint: <strong style=\"color:#e2e8f0\">" + htmlEscape(r.getSprintName()) + "</strong></span>" +
            (r.getStartDate() != null && !r.getStartDate().isEmpty() ? "<span style=\"margin-left:24px\">📅 " + r.getStartDate() + " → " + r.getEndDate() + "</span>" : "") +
            "</div>" +

            suspiciousWarning +

            // Final PCT highlight
            "<div style=\"background:linear-gradient(135deg,#1e1b4b,#2d1b69);border-radius:12px;padding:20px 24px;margin-bottom:20px;text-align:center\">" +
            "<div style=\"font-size:12px;color:#a5b4fc;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px\">Tỉ lệ đóng góp cuối cùng</div>" +
            "<div style=\"font-size:48px;font-weight:800;color:#ffffff\">" + String.format("%.1f", r.getFinalPct()) + "<span style=\"font-size:28px\">%</span></div>" +
            "<div style=\"margin-top:8px\">" + evidenceStatus + "</div>" +
            "<div style=\"font-size:12px;color:#818cf8;margin-top:8px\">CI: [" + String.format("%.1f", r.getConfidenceIntervalLow()) + "% – " + String.format("%.1f", r.getConfidenceIntervalHigh()) + "%]</div>" +
            "</div>" +

            // 4D Scores
            "<h3 style=\"color:#c4b5fd;margin:0 0 12px;font-size:15px\">📊 Chỉ số 4 chiều</h3>" +
            "<table style=\"width:100%;border-collapse:collapse;margin-bottom:20px\">" +
            "<tr style=\"background:#1e293b\">" +
            "<th style=\"padding:10px 14px;text-align:left;color:#94a3b8;font-size:12px;font-weight:600;border-radius:8px 0 0 0\">Chiều</th>" +
            "<th style=\"padding:10px 14px;text-align:right;color:#94a3b8;font-size:12px;font-weight:600;border-radius:0 8px 0 0\">Điểm</th>" +
            "</tr>" +
            scoreRow("D1 – Sản lượng (Output)", r.getD1Output(), "#10b981") +
            scoreRow("D2 – Độ tin cậy (Reliability)", r.getD2Reliability(), "#06b6d4") +
            scoreRow("D3 – Phối hợp (Collaboration)", r.getD3Collaboration(), "#8b5cf6") +
            scoreRow("D4 – Đánh giá đồng cấp (Peer)", r.getD4Peer(), "#ec4899") +
            "<tr style=\"background:#1e293b\">" +
            "<td style=\"padding:10px 14px;color:#a5b4fc;font-weight:700\">Composite Score</td>" +
            "<td style=\"padding:10px 14px;text-align:right;color:#a5b4fc;font-weight:700\">" + String.format("%.2f", r.getCompositeScore()) + "</td>" +
            "</tr>" +
            "</table>" +

            // Availability
            "<div style=\"background:#1e293b;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px\">" +
            "<span style=\"color:#94a3b8\">Hệ số khả dụng (a_i): </span>" +
            "<strong style=\"color:#fbbf24\">" + String.format("%.2f", r.getAvailabilityFactor()) + "</strong>" +
            "</div>" +

            // Evidence table
            "<h3 style=\"color:#c4b5fd;margin:0 0 12px;font-size:15px\">📋 Bằng chứng đóng góp</h3>" +
            "<table style=\"width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px\">" +
            "<tr style=\"background:#1e293b\">" +
            "<th style=\"padding:9px 12px;text-align:left;color:#94a3b8;font-weight:600\">Nhiệm vụ</th>" +
            "<th style=\"padding:9px 12px;text-align:center;color:#94a3b8;font-weight:600\">SP</th>" +
            "<th style=\"padding:9px 12px;text-align:center;color:#94a3b8;font-weight:600\">Điểm</th>" +
            "<th style=\"padding:9px 12px;color:#94a3b8;font-weight:600\">Thời gian</th>" +
            "</tr>" +
            evidenceRows.toString() +
            "</table>" +

            // Footer note
            "<p style=\"color:#475569;font-size:12px;text-align:center;margin:0\">Báo cáo được tạo tự động bởi hệ thống FairShare. Vui lòng không trả lời email này.</p>" +
            "</div>" +

            // Footer bar
            "<div style=\"background:#0f0f1a;padding:16px 32px;text-align:center\">" +
            "<p style=\"color:#334155;font-size:12px;margin:0\">FairShare © 2025 – Hệ thống đo lường đóng góp nhóm học tập</p>" +
            "</div>" +
            "</div>" +
            "</body></html>";
    }

    private String scoreRow(String label, double value, String color) {
        return "<tr style=\"border-bottom:1px solid #1e293b\">" +
               "<td style=\"padding:10px 14px;color:#cbd5e1;font-size:13px\">" + label + "</td>" +
               "<td style=\"padding:10px 14px;text-align:right;color:" + color + ";font-weight:600;font-size:14px\">" + String.format("%.3f", value) + "</td>" +
               "</tr>";
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------

    private double calculateGini(List<Double> sortedValues) {
        if (sortedValues == null || sortedValues.isEmpty()) return 0.0;
        int n = sortedValues.size();
        double sum = sortedValues.stream().mapToDouble(Double::doubleValue).sum();
        if (sum == 0) return 0.0;
        double weightedSum = 0;
        for (int i = 0; i < n; i++) {
            weightedSum += (2.0 * (i + 1) - n - 1) * sortedValues.get(i);
        }
        return weightedSum / (n * sum);
    }

    private String giniLabel(double gini) {
        if (gini < 0.2) return "Rất công bằng";
        if (gini < 0.35) return "Tương đối công bằng";
        if (gini < 0.5) return "Có chênh lệch";
        return "Chênh lệch cao";
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    private String htmlEscape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
