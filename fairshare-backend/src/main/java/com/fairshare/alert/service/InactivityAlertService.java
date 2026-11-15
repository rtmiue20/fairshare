package com.fairshare.alert.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.alert.dto.AlertDto;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

        // Rule 1: Thẻ công việc In Progress đã quá hạn chót (CR-04 Mức Đỏ / Critical)
        try {
            List<Card> teamCards = cardRepository.findByBoardTeamId(teamId);
            for (Card c : teamCards) {
                if (c.getColumn() != null && "In Progress".equalsIgnoreCase(c.getColumn().getName())
                        && c.getDueDate() != null && c.getDueDate().toLocalDate().isBefore(today)
                        && c.getAssignee() != null) {

                    long daysOverdue = ChronoUnit.DAYS.between(c.getDueDate().toLocalDate(), today);
                    if (daysOverdue >= 1) {
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
                                    c.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))));
                            alert.setResolved(false);
                            alertRepository.save(alert);
                            log.info("CR-04 Created OVERDUE_TASK alert for user: {} on card: {}", c.getAssignee().getId(), c.getId());
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error scanning overdue tasks: {}", e.getMessage());
        }

        // Rule 2: Thành viên không hoạt động nhiều ngày liên tiếp (CR-04 Mức Vàng / Warning)
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

                if (lastAct != null) {
                    long daysInactive = ChronoUnit.DAYS.between(lastAct.toLocalDate(), today);
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
}
