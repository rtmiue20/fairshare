package com.fairshare.alert.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.alert.dto.AlertDto;
import com.fairshare.alert.dto.CreateAlertRequest;
import com.fairshare.alert.dto.MemberInactivityDto;
import com.fairshare.alert.entity.Alert;
import com.fairshare.alert.repository.AlertRepository;
import com.fairshare.board.entity.Card;
import com.fairshare.board.repository.CardRepository;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.team.entity.Team;
import com.fairshare.team.entity.TeamMember;
import com.fairshare.team.repository.TeamMemberRepository;
import com.fairshare.team.repository.TeamRepository;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class InactivityAlertService {

    private final AlertRepository alertRepository;
    private final CardRepository cardRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final ActivityEventRepository activityEventRepository;

    @Autowired(required = false)
    private UserRepository userRepository;

    @Transactional
    public List<AlertDto> getAlertsByTeam(Long teamId, boolean includeResolved, int thresholdDays) {
        // 1. Tự động quét và phát hiện cảnh báo theo luật CR-04
        scanRuleBasedAlerts(teamId, thresholdDays);

        // 2. Lấy danh sách alert
        List<Alert> alerts = includeResolved
                ? alertRepository.findByTeamId(teamId)
                : alertRepository.findByTeamIdAndResolvedFalse(teamId);

        // Sắp xếp ưu tiên: CRITICAL -> WARNING -> INFO, và theo ngày giảm dần
        return alerts.stream()
                .sorted((a1, a2) -> {
                    int p1 = getSeverityPriority(a1.getSeverity());
                    int p2 = getSeverityPriority(a2.getSeverity());
                    if (p1 != p2) return Integer.compare(p1, p2);
                    if (a1.getCreatedAt() != null && a2.getCreatedAt() != null) {
                        return a2.getCreatedAt().compareTo(a1.getCreatedAt());
                    }
                    return 0;
                })
                .map(AlertDto::from)
                .toList();
    }

    private int getSeverityPriority(String severity) {
        if ("CRITICAL".equalsIgnoreCase(severity)) return 1;
        if ("WARNING".equalsIgnoreCase(severity)) return 2;
        return 3;
    }

    @Transactional
    public void scanRuleBasedAlerts(Long teamId, int thresholdDays) {
        Team team = teamRepository.findById(teamId).orElse(null);
        if (team == null) return;

        LocalDate today = LocalDate.now();

        // Rule 1, 2, 3: Tự động quét công việc quá hạn (OVERDUE_TASK), sắp trễ (DUE_SOON_TASK) và cần thực hiện (TASK_TODO)
        try {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            List<Card> teamCards = cardRepository.findByBoardTeamId(teamId);
            for (Card c : teamCards) {
                if (c.getAssignee() == null) {
                    continue;
                }
                String colName = c.getColumn() != null && c.getColumn().getName() != null
                        ? c.getColumn().getName().trim()
                        : "";
                boolean isDone = colName.equalsIgnoreCase("Done")
                        || colName.equalsIgnoreCase("Hoàn thành")
                        || colName.equalsIgnoreCase("Completed");
                if (isDone) {
                    continue;
                }

                boolean triggeredDeadlineRule = false;
                if (c.getDueDate() != null) {
                    LocalDate dueLocal = c.getDueDate().toLocalDate();
                    if (dueLocal.isBefore(today)) {
                        long daysOverdue = ChronoUnit.DAYS.between(dueLocal, today);
                        if (daysOverdue >= 1) {
                            triggeredDeadlineRule = true;
                            boolean exists = alertRepository.existsByTeamIdAndUserIdAndAlertTypeAndResolvedFalse(
                                    teamId, c.getAssignee().getId(), "OVERDUE_TASK"
                            );
                            if (!exists) {
                                Alert alert = new Alert();
                                alert.setTeam(team);
                                alert.setUser(c.getAssignee());
                                alert.setAlertType("OVERDUE_TASK");
                                alert.setSeverity("CRITICAL");
                                alert.setMessage(String.format("Công việc \"%s\" do %s phụ trách đã quá hạn chót %d ngày (Hạn: %s) nhưng chưa hoàn thành.",
                                        c.getTitle(),
                                        c.getAssignee().getFullName(),
                                        daysOverdue,
                                        c.getDueDate().format(fmt)));
                                alert.setResolved(false);
                                alertRepository.save(alert);
                                log.info("CR-04 Created OVERDUE_TASK alert for user: {} on card: {}", c.getAssignee().getId(), c.getId());
                            }
                        }
                    } else {
                        long daysUntilDue = ChronoUnit.DAYS.between(today, dueLocal);
                        if (daysUntilDue >= 0 && daysUntilDue <= 3) {
                            triggeredDeadlineRule = true;
                            boolean exists = alertRepository.existsByTeamIdAndUserIdAndAlertTypeAndResolvedFalse(
                                    teamId, c.getAssignee().getId(), "DUE_SOON_TASK"
                            );
                            if (!exists) {
                                String timeHint = daysUntilDue == 0 ? "hôm nay" : "còn " + daysUntilDue + " ngày";
                                Alert alert = new Alert();
                                alert.setTeam(team);
                                alert.setUser(c.getAssignee());
                                alert.setAlertType("DUE_SOON_TASK");
                                alert.setSeverity("WARNING");
                                alert.setMessage(String.format("Công việc \"%s\" (%s) do %s phụ trách sắp đến hạn chót (%s — %s). Hệ thống đã tự động gửi cảnh báo.",
                                        c.getTitle(),
                                        colName.isEmpty() ? "Đang mở" : colName,
                                        c.getAssignee().getFullName(),
                                        timeHint,
                                        c.getDueDate().format(fmt)));
                                alert.setResolved(false);
                                alertRepository.save(alert);
                                log.info("CR-04 Created DUE_SOON_TASK alert for user: {} on card: {}", c.getAssignee().getId(), c.getId());
                            }
                        }
                    }
                }

                // Rule 3: Thẻ đang ở cột To Do / Backlog cần bắt đầu thực hiện (INFO)
                boolean isTodoColumn = colName.equalsIgnoreCase("To Do")
                        || colName.equalsIgnoreCase("Backlog")
                        || colName.equalsIgnoreCase("Cần làm");
                if (!triggeredDeadlineRule && isTodoColumn) {
                    boolean exists = alertRepository.existsByTeamIdAndUserIdAndAlertTypeAndResolvedFalse(
                            teamId, c.getAssignee().getId(), "TASK_TODO"
                    );
                    if (!exists) {
                        String dueSuffix = c.getDueDate() != null
                                ? " (Hạn chót: " + c.getDueDate().format(fmt) + ")"
                                : "";
                        Alert alert = new Alert();
                        alert.setTeam(team);
                        alert.setUser(c.getAssignee());
                        alert.setAlertType("TASK_TODO");
                        alert.setSeverity("INFO");
                        alert.setMessage(String.format("Công việc \"%s\" đang ở cột %s cần %s bắt đầu thực hiện%s.",
                                c.getTitle(),
                                colName,
                                c.getAssignee().getFullName(),
                                dueSuffix));
                        alert.setResolved(false);
                        alertRepository.save(alert);
                        log.info("CR-04 Created TASK_TODO alert for user: {} on card: {}", c.getAssignee().getId(), c.getId());
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error scanning overdue/due-soon/todo tasks: {}", e.getMessage());
        }

        // Rule 4: Thành viên không hoạt động nhiều ngày liên tiếp (CR-04 Mức Vàng / Warning)
        try {
            List<TeamMember> members = teamMemberRepository.findByTeamIdWithUser(teamId);
            for (TeamMember tm : members) {
                User u = tm.getUser();
                if (u == null) continue;

                List<ActivityEvent> events = activityEventRepository.findByTeamIdAndUserId(teamId, u.getId());
                LocalDateTime lastAct = null;
                for (ActivityEvent ae : events) {
                    LocalDateTime dt = ae.getOccurredAt() != null ? ae.getOccurredAt() : ae.getCreatedAt();
                    if (dt != null && (lastAct == null || dt.isAfter(lastAct))) {
                        lastAct = dt;
                    }
                }

                long daysInactive = lastAct != null
                        ? Math.max(0, ChronoUnit.DAYS.between(lastAct.toLocalDate(), today))
                        : 7L;
                if (daysInactive >= thresholdDays) {
                    boolean exists = alertRepository.existsByTeamIdAndUserIdAndAlertTypeAndResolvedFalse(
                            teamId, u.getId(), "INACTIVITY_WARNING"
                    );
                    if (!exists) {
                        Alert alert = new Alert();
                        alert.setTeam(team);
                        alert.setUser(u);
                        alert.setAlertType("INACTIVITY_WARNING");
                        alert.setSeverity("WARNING");
                        alert.setMessage(String.format("Thành viên %s không có hoạt động trong %d ngày liên tiếp (vượt ngưỡng %d ngày cảnh báo theo CR-04).",
                                u.getFullName(),
                                daysInactive,
                                thresholdDays));
                        alert.setResolved(false);
                        alertRepository.save(alert);
                        log.info("CR-04 Created INACTIVITY_WARNING alert for user: {} ({} days inactive)", u.getId(), daysInactive);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error scanning inactivity: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<MemberInactivityDto> getMemberInactivity(Long teamId, int thresholdDays) {
        List<TeamMember> members = teamMemberRepository.findByTeamIdWithUser(teamId);
        LocalDate today = LocalDate.now();
        List<MemberInactivityDto> list = new ArrayList<>();

        for (TeamMember tm : members) {
            User u = tm.getUser();
            if (u == null) continue;

            List<ActivityEvent> events = activityEventRepository.findByTeamIdAndUserId(teamId, u.getId());
            LocalDateTime lastAct = null;
            for (ActivityEvent ae : events) {
                LocalDateTime dt = ae.getOccurredAt() != null ? ae.getOccurredAt() : ae.getCreatedAt();
                if (dt != null && (lastAct == null || dt.isAfter(lastAct))) {
                    lastAct = dt;
                }
            }

            long daysInactive = lastAct != null
                    ? Math.max(0, ChronoUnit.DAYS.between(lastAct.toLocalDate(), today))
                    : 7L;

            list.add(MemberInactivityDto.builder()
                    .userId(u.getId())
                    .userName(u.getFullName())
                    .daysInactive(daysInactive)
                    .lastActivity(lastAct)
                    .exceeded(daysInactive >= thresholdDays)
                    .build());
        }

        // Sắp xếp người có số ngày im lặng nhiều nhất lên đầu
        list.sort((m1, m2) -> Long.compare(m2.getDaysInactive(), m1.getDaysInactive()));
        return list;
    }

    @Transactional
    public AlertDto resolveAlert(Long alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));
        alert.setResolved(true);
        alert.setResolvedAt(LocalDateTime.now());
        return AlertDto.from(alertRepository.save(alert));
    }

    @Transactional(readOnly = true)
    public String remindMember(Long alertId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + alertId));
        String userName = alert.getUser() != null ? alert.getUser().getFullName() : "thành viên";
        log.info("Reminder sent to member: {} for alert: {}", userName, alertId);
        return "Đã gửi thông báo nhắc nhở đến " + userName;
    }

    @Transactional
    public AlertDto createManualAlert(Long teamId, CreateAlertRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found: " + teamId));

        List<TeamMember> members = teamMemberRepository.findByTeamIdWithUser(teamId);
        User targetUser = resolveTargetUser(members, request);
        if (targetUser == null) {
            throw new ResourceNotFoundException("Target member not found for team: " + teamId);
        }

        String template = resolveTemplateType(request);
        String dbSeverity = mapTemplateToDbSeverity(template, request != null ? request.getSeverity() : null);

        String alertType = (request != null && request.getAlertType() != null && !request.getAlertType().isBlank())
                ? request.getAlertType().trim().toUpperCase()
                : "CUSTOM_" + template;

        String formattedMessage = buildFormattedAlertMessage(request);

        Alert alert = new Alert();
        alert.setTeam(team);
        alert.setUser(targetUser);
        alert.setAlertType(alertType);
        alert.setSeverity(dbSeverity);
        alert.setMessage(formattedMessage);
        alert.setResolved(false);

        Alert saved = alertRepository.save(alert);
        log.info("Manual alert ({}) created for user {} in team {}", alertType, targetUser.getId(), teamId);
        return AlertDto.from(saved);
    }

    private User resolveTargetUser(List<TeamMember> members, CreateAlertRequest request) {
        if (request != null && request.getUserId() != null) {
            for (TeamMember tm : members) {
                if (tm.getUser() != null && request.getUserId().equals(tm.getUser().getId())) {
                    return tm.getUser();
                }
            }
            if (userRepository != null) {
                User found = userRepository.findById(request.getUserId()).orElse(null);
                if (found != null) {
                    return found;
                }
            }
        }

        if (request != null && request.getUserName() != null && !request.getUserName().isBlank()) {
            String targetName = request.getUserName().trim().toLowerCase();
            for (TeamMember tm : members) {
                User u = tm.getUser();
                if (u != null && u.getFullName() != null && u.getFullName().toLowerCase().contains(targetName)) {
                    return u;
                }
            }
        }

        for (TeamMember tm : members) {
            if (tm.getUser() != null) {
                return tm.getUser();
            }
        }
        return null;
    }

    private String resolveTemplateType(CreateAlertRequest request) {
        if (request == null) {
            return "INFO";
        }
        String t = request.getTemplateType() != null ? request.getTemplateType().trim().toUpperCase() : "";
        if ("INFO".equals(t) || "WARNING".equals(t) || "SUCCESS".equals(t) || "ERROR".equals(t)) {
            return t;
        }
        String sev = request.getSeverity() != null ? request.getSeverity().trim().toUpperCase() : "";
        if ("CRITICAL".equals(sev) || "ERROR".equals(sev)) {
            return "ERROR";
        }
        if ("WARNING".equals(sev) || "WARN".equals(sev)) {
            return "WARNING";
        }
        if ("SUCCESS".equals(sev)) {
            return "SUCCESS";
        }
        return "INFO";
    }

    private String mapTemplateToDbSeverity(String template, String requestedSeverity) {
        if ("ERROR".equals(template) || "CRITICAL".equalsIgnoreCase(requestedSeverity)) {
            return "CRITICAL";
        }
        if ("WARNING".equals(template) || "WARNING".equalsIgnoreCase(requestedSeverity)) {
            return "WARNING";
        }
        // MariaDB chk_alerts_severity allows ('INFO', 'WARNING', 'CRITICAL')
        return "INFO";
    }

    private String buildFormattedAlertMessage(CreateAlertRequest request) {
        if (request == null) {
            return "Thông báo cảnh báo tiến độ từ thành viên nhóm.";
        }
        String title = request.getTitle() != null ? request.getTitle().trim() : "";
        String body = request.getMessage() != null ? request.getMessage().trim() : "";
        String taskTitle = request.getTaskTitle() != null ? request.getTaskTitle().trim() : "";
        String senderName = request.getSenderName() != null ? request.getSenderName().trim() : "";
        String senderRole = request.getSenderRole() != null ? request.getSenderRole().trim() : "";

        StringBuilder sb = new StringBuilder();
        if (!title.isEmpty()) {
            sb.append("[").append(title).append("] ");
        }
        if (!body.isEmpty()) {
            sb.append(body);
        } else {
            sb.append("Cảnh báo tiến độ cần được kiểm tra và phản hồi sớm.");
        }
        if (!taskTitle.isEmpty()) {
            sb.append(" | Công việc: ").append(taskTitle);
        }
        if (!senderName.isEmpty() || !senderRole.isEmpty()) {
            sb.append(" | Người báo: ");
            if (!senderRole.isEmpty()) {
                sb.append(senderRole);
                if (!senderName.isEmpty()) {
                    sb.append(" (").append(senderName).append(")");
                }
            } else {
                sb.append(senderName);
            }
        }
        return sb.toString();
    }
}
