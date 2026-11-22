package com.fairshare.alert.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.alert.dto.AlertDto;
import com.fairshare.alert.dto.CreateAlertRequest;
import com.fairshare.alert.dto.MemberInactivityDto;
import com.fairshare.alert.entity.Alert;
import com.fairshare.alert.repository.AlertRepository;
import com.fairshare.board.entity.Board;
import com.fairshare.board.entity.BoardColumn;
import com.fairshare.board.entity.Card;
import com.fairshare.board.repository.BoardColumnRepository;
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
    private BoardColumnRepository boardColumnRepository;

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

    private static final Set<String> TASK_RULE_ALERT_TYPES = Set.of(
            "OVERDUE_TASK", "DUE_SOON_TASK", "TASK_TODO"
    );

    private static final Set<String> LEGACY_SAMPLE_ALERT_TYPES = Set.of(
            "MILESTONE_PROGRESS", "ON_TIME_COMPLETION", "AVAILABILITY_ADJUSTED",
            "OVERDUE_WARNING", "SPRINT_CLOSED", "PEER_REVIEW_SUFFICIENT"
    );

    @Transactional
    public void scanRuleBasedAlerts(Long teamId, int thresholdDays) {
        Team team = teamRepository.findById(teamId).orElse(null);
        if (team == null) return;

        LocalDate today = LocalDate.now();
        List<Alert> existingAlerts = new ArrayList<>();
        try {
            List<Alert> loaded = alertRepository.findByTeamId(teamId);
            if (loaded != null) {
                existingAlerts.addAll(loaded);
            }
        } catch (Exception e) {
            log.debug("Could not load existing alerts for cleanup: {}", e.getMessage());
        }

        // Xóa các cảnh báo mẫu (sample/seed) hoặc trùng lặp từ trigger cũ
        Iterator<Alert> sampleIt = existingAlerts.iterator();
        while (sampleIt.hasNext()) {
            Alert a = sampleIt.next();
            String type = a.getAlertType() != null ? a.getAlertType().trim().toUpperCase() : "";
            if (LEGACY_SAMPLE_ALERT_TYPES.contains(type)) {
                alertRepository.delete(a);
                sampleIt.remove();
            }
        }

        // Rule 1, 2, 3: Tự động quét và đồng bộ công việc thực tế từ Kanban Board (OVERDUE_TASK, DUE_SOON_TASK, TASK_TODO)
        try {
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            List<Card> teamCards = cardRepository.findByBoardTeamId(teamId);
            Set<Long> matchedUnresolvedTaskAlertIds = new HashSet<>();
            Set<String> doneCardTitles = new HashSet<>();

            for (Card c : teamCards) {
                String colName = c.getColumn() != null && c.getColumn().getName() != null
                        ? c.getColumn().getName().trim()
                        : "";
                boolean isDone = colName.equalsIgnoreCase("Done")
                        || colName.equalsIgnoreCase("Hoàn thành")
                        || colName.equalsIgnoreCase("Completed");
                if (isDone) {
                    if (c.getTitle() != null && !c.getTitle().isBlank()) {
                        doneCardTitles.add(c.getTitle().trim());
                    }
                    continue;
                }
                if (c.getAssignee() == null || c.getTitle() == null || c.getTitle().isBlank()) {
                    continue;
                }

                String expectedType = null;
                String expectedSeverity = null;
                String expectedMessage = null;

                boolean triggeredDeadlineRule = false;
                if (c.getDueDate() != null) {
                    LocalDate dueLocal = c.getDueDate().toLocalDate();
                    if (dueLocal.isBefore(today)) {
                        long daysOverdue = ChronoUnit.DAYS.between(dueLocal, today);
                        if (daysOverdue >= 1) {
                            triggeredDeadlineRule = true;
                            expectedType = "OVERDUE_TASK";
                            expectedSeverity = "CRITICAL";
                            expectedMessage = String.format("Công việc \"%s\" do %s phụ trách đã quá hạn chót %d ngày (Hạn: %s) nhưng chưa hoàn thành.",
                                    c.getTitle(),
                                    c.getAssignee().getFullName(),
                                    daysOverdue,
                                    c.getDueDate().format(fmt));
                        }
                    } else {
                        long daysUntilDue = ChronoUnit.DAYS.between(today, dueLocal);
                        if (daysUntilDue >= 0 && daysUntilDue <= 3) {
                            triggeredDeadlineRule = true;
                            String timeHint = daysUntilDue == 0 ? "hôm nay" : "còn " + daysUntilDue + " ngày";
                            expectedType = "DUE_SOON_TASK";
                            expectedSeverity = "WARNING";
                            expectedMessage = String.format("Công việc \"%s\" (%s) do %s phụ trách sắp đến hạn chót (%s — %s). Hệ thống đã tự động gửi cảnh báo.",
                                    c.getTitle(),
                                    colName.isEmpty() ? "Đang mở" : colName,
                                    c.getAssignee().getFullName(),
                                    timeHint,
                                    c.getDueDate().format(fmt));
                        }
                    }
                }

                // Rule 3: Thẻ đang ở cột To Do / Backlog cần bắt đầu thực hiện (INFO)
                boolean isTodoColumn = colName.equalsIgnoreCase("To Do")
                        || colName.equalsIgnoreCase("Backlog")
                        || colName.equalsIgnoreCase("Cần làm");
                if (!triggeredDeadlineRule && isTodoColumn) {
                    String dueSuffix = c.getDueDate() != null
                            ? " (Hạn chót: " + c.getDueDate().format(fmt) + ")"
                            : "";
                    expectedType = "TASK_TODO";
                    expectedSeverity = "INFO";
                    expectedMessage = String.format("Công việc \"%s\" đang ở cột %s cần %s bắt đầu thực hiện%s.",
                            c.getTitle(),
                            colName,
                            c.getAssignee().getFullName(),
                            dueSuffix);
                }

                if (expectedType != null) {
                    String quotedTitle = "\"" + c.getTitle() + "\"";
                    Alert matchedUnresolved = null;
                    Alert matchedStaleResolved = null;
                    boolean alreadyResolvedToday = false;

                    for (Alert existing : existingAlerts) {
                        String exType = existing.getAlertType() != null ? existing.getAlertType().trim().toUpperCase() : "";
                        if (!TASK_RULE_ALERT_TYPES.contains(exType)) continue;
                        String exMsg = existing.getMessage() != null ? existing.getMessage() : "";
                        if (exMsg.contains(quotedTitle)) {
                            if (existing.isResolved()) {
                                if (existing.getResolvedAt() != null && existing.getResolvedAt().toLocalDate().equals(today)) {
                                    alreadyResolvedToday = true;
                                } else {
                                    matchedStaleResolved = existing;
                                }
                            } else if (matchedUnresolved == null) {
                                matchedUnresolved = existing;
                            }
                        }
                    }

                    if (alreadyResolvedToday) {
                        continue;
                    }

                    if (matchedUnresolved != null) {
                        if (matchedUnresolved.getId() != null) {
                            matchedUnresolvedTaskAlertIds.add(matchedUnresolved.getId());
                        }
                        boolean changed = !expectedType.equalsIgnoreCase(matchedUnresolved.getAlertType())
                                || !expectedSeverity.equalsIgnoreCase(matchedUnresolved.getSeverity())
                                || !expectedMessage.equals(matchedUnresolved.getMessage())
                                || (matchedUnresolved.getUser() == null || !Objects.equals(matchedUnresolved.getUser().getId(), c.getAssignee().getId()));
                        if (changed) {
                            matchedUnresolved.setUser(c.getAssignee());
                            matchedUnresolved.setAlertType(expectedType);
                            matchedUnresolved.setSeverity(expectedSeverity);
                            matchedUnresolved.setMessage(expectedMessage);
                            alertRepository.save(matchedUnresolved);
                        }
                    } else if (matchedStaleResolved != null) {
                        matchedStaleResolved.setResolved(false);
                        matchedStaleResolved.setResolvedAt(null);
                        matchedStaleResolved.setUser(c.getAssignee());
                        matchedStaleResolved.setAlertType(expectedType);
                        matchedStaleResolved.setSeverity(expectedSeverity);
                        matchedStaleResolved.setMessage(expectedMessage);
                        alertRepository.save(matchedStaleResolved);
                        if (matchedStaleResolved.getId() != null) {
                            matchedUnresolvedTaskAlertIds.add(matchedStaleResolved.getId());
                        }
                        log.info("CR-04 Re-activated task alert {} for card: {} (still not completed)", matchedStaleResolved.getId(), c.getId());
                    } else {
                        Alert alert = new Alert();
                        alert.setTeam(team);
                        alert.setUser(c.getAssignee());
                        alert.setAlertType(expectedType);
                        alert.setSeverity(expectedSeverity);
                        alert.setMessage(expectedMessage);
                        alert.setResolved(false);
                        Alert saved = alertRepository.save(alert);
                        if (saved != null) {
                            existingAlerts.add(saved);
                            if (saved.getId() != null) {
                                matchedUnresolvedTaskAlertIds.add(saved.getId());
                            }
                        }
                        log.info("CR-04 Created {} alert for user: {} on card: {}", expectedType, c.getAssignee().getId(), c.getId());
                    }
                }
            }

            // Dọn dẹp các cảnh báo task cũ không còn khớp với trạng thái thực tế trên Kanban Board
            if (!existingAlerts.isEmpty()) {
                Iterator<Alert> it = existingAlerts.iterator();
                while (it.hasNext()) {
                    Alert existing = it.next();
                    if (existing.isResolved()) continue;
                    String exType = existing.getAlertType() != null ? existing.getAlertType().trim().toUpperCase() : "";
                    String exMsg = existing.getMessage() != null ? existing.getMessage() : "";

                    if (TASK_RULE_ALERT_TYPES.contains(exType)) {
                        if (existing.getId() == null || !matchedUnresolvedTaskAlertIds.contains(existing.getId())) {
                            alertRepository.delete(existing);
                            it.remove();
                        }
                    } else if (exType.startsWith("CUSTOM_")) {
                        for (String doneTitle : doneCardTitles) {
                            if (exMsg.contains("Công việc: " + doneTitle) || exMsg.contains("\"" + doneTitle + "\"")) {
                                alertRepository.delete(existing);
                                it.remove();
                                break;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Error scanning overdue/due-soon/todo tasks: {}", e.getMessage());
        }

        // Rule 4: Thành viên không hoạt động nhiều ngày liên tiếp (CR-04 Mức Vàng / Warning)
        try {
            List<TeamMember> members = teamMemberRepository.findByTeamIdWithUser(teamId);
            Set<Long> activeMemberIds = new HashSet<>();

            for (TeamMember tm : members) {
                User u = tm.getUser();
                if (u == null) continue;
                activeMemberIds.add(u.getId());

                List<ActivityEvent> events = activityEventRepository.findByTeamIdAndUserId(teamId, u.getId());
                LocalDateTime lastAct = null;
                if (events != null) {
                    for (ActivityEvent ae : events) {
                        LocalDateTime dt = ae.getOccurredAt() != null ? ae.getOccurredAt() : ae.getCreatedAt();
                        if (dt != null && (lastAct == null || dt.isAfter(lastAct))) {
                            lastAct = dt;
                        }
                    }
                }

                // Tài khoản / thành viên mới tạo chưa có phát sinh sự kiện hoạt động sẽ tính 0 ngày (không gán giả định 7 ngày)
                long daysInactive = lastAct != null
                        ? Math.max(0, ChronoUnit.DAYS.between(lastAct.toLocalDate(), today))
                        : 0L;

                List<Alert> memberInactivityAlerts = existingAlerts.stream()
                        .filter(a -> "INACTIVITY_WARNING".equalsIgnoreCase(a.getAlertType())
                                && a.getUser() != null
                                && Objects.equals(a.getUser().getId(), u.getId()))
                        .toList();

                if (daysInactive >= thresholdDays) {
                    String expectedMsg = String.format(
                            "Thành viên %s không có hoạt động trong %d ngày liên tiếp (vượt ngưỡng %d ngày cảnh báo theo CR-04).",
                            u.getFullName(),
                            daysInactive,
                            thresholdDays
                    );

                    List<Alert> unresolvedForMember = memberInactivityAlerts.stream()
                            .filter(a -> !a.isResolved())
                            .toList();

                    if (!unresolvedForMember.isEmpty()) {
                        Alert primary = unresolvedForMember.get(0);
                        if (!expectedMsg.equals(primary.getMessage())) {
                            primary.setMessage(expectedMsg);
                            alertRepository.save(primary);
                        }
                        for (int i = 1; i < unresolvedForMember.size(); i++) {
                            alertRepository.delete(unresolvedForMember.get(i));
                        }
                    } else {
                        boolean resolvedToday = memberInactivityAlerts.stream()
                                .anyMatch(a -> a.isResolved()
                                        && a.getResolvedAt() != null
                                        && a.getResolvedAt().toLocalDate().equals(today));
                        if (!resolvedToday) {
                            boolean exists = alertRepository.existsByTeamIdAndUserIdAndAlertTypeAndResolvedFalse(
                                    teamId, u.getId(), "INACTIVITY_WARNING"
                            );
                            if (!exists) {
                                Alert alert = new Alert();
                                alert.setTeam(team);
                                alert.setUser(u);
                                alert.setAlertType("INACTIVITY_WARNING");
                                alert.setSeverity("WARNING");
                                alert.setMessage(expectedMsg);
                                alert.setResolved(false);
                                alertRepository.save(alert);
                                log.info("CR-04 Created INACTIVITY_WARNING alert for user: {} ({} days inactive)", u.getId(), daysInactive);
                            }
                        }
                    }
                } else {
                    // Khi thành viên không vượt ngưỡng (hoặc người dùng chỉnh tăng ngưỡng cảnh báo), xóa các cảnh báo im lặng cũ còn dính lại
                    for (Alert staleInact : memberInactivityAlerts) {
                        if (!staleInact.isResolved()) {
                            alertRepository.delete(staleInact);
                        }
                    }
                }
            }

            // Xóa cảnh báo inactivity của user không còn trong nhóm
            for (Alert a : existingAlerts) {
                if (!a.isResolved() && "INACTIVITY_WARNING".equalsIgnoreCase(a.getAlertType())) {
                    Long uid = a.getUser() != null ? a.getUser().getId() : null;
                    if (uid == null || !activeMemberIds.contains(uid)) {
                        alertRepository.delete(a);
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
            if (events != null) {
                for (ActivityEvent ae : events) {
                    LocalDateTime dt = ae.getOccurredAt() != null ? ae.getOccurredAt() : ae.getCreatedAt();
                    if (dt != null && (lastAct == null || dt.isAfter(lastAct))) {
                        lastAct = dt;
                    }
                }
            }

            long daysInactive = lastAct != null
                    ? Math.max(0, ChronoUnit.DAYS.between(lastAct.toLocalDate(), today))
                    : 0L;

            LocalDateTime displayLastActivity = lastAct != null
                    ? lastAct
                    : (tm.getCreatedAt() != null ? tm.getCreatedAt() : u.getCreatedAt());

            list.add(MemberInactivityDto.builder()
                    .userId(u.getId())
                    .userName(u.getFullName())
                    .daysInactive(daysInactive)
                    .lastActivity(displayLastActivity)
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
        Alert saved = alertRepository.save(alert);

        // Khi đánh dấu hoàn thành / giải quyết cảnh báo công việc:
        // Cập nhật thẻ công việc (Card) tương ứng sang cột Done để đồng bộ thực tế và database
        try {
            completeAssociatedCardIfPresent(saved);
        } catch (Exception e) {
            log.warn("Could not auto-complete card for alert {}: {}", alertId, e.getMessage());
        }

        return AlertDto.from(saved);
    }

    private void completeAssociatedCardIfPresent(Alert alert) {
        if (alert == null || alert.getTeam() == null) return;
        String taskTitle = extractCardTitleFromAlert(alert);
        if (taskTitle == null || taskTitle.isBlank()) return;

        Long teamId = alert.getTeam().getId();
        List<Card> teamCards = cardRepository.findByBoardTeamId(teamId);
        if (teamCards == null || teamCards.isEmpty()) return;

        Card targetCard = null;
        for (Card c : teamCards) {
            if (c.getTitle() != null && c.getTitle().trim().equalsIgnoreCase(taskTitle)) {
                targetCard = c;
                break;
            }
        }
        if (targetCard == null) return;

        Board board = targetCard.getBoard();
        if (board == null) return;

        List<BoardColumn> cols = null;
        if (boardColumnRepository != null) {
            cols = boardColumnRepository.findByBoardIdOrderByPositionAsc(board.getId());
        }
        if (cols == null || cols.isEmpty()) {
            cols = board.getColumns();
        }
        if (cols == null || cols.isEmpty()) return;

        BoardColumn doneCol = null;
        for (BoardColumn col : cols) {
            String name = col.getName() != null ? col.getName().trim() : "";
            if (name.equalsIgnoreCase("Done") || name.equalsIgnoreCase("Hoàn thành") || name.equalsIgnoreCase("Completed")) {
                doneCol = col;
                break;
            }
        }
        if (doneCol == null) return;

        // Nếu thẻ chưa ở cột Done, chuyển sang Done
        if (targetCard.getColumn() == null || !Objects.equals(targetCard.getColumn().getId(), doneCol.getId())) {
            targetCard.setColumn(doneCol);
            targetCard.setUpdatedAt(LocalDateTime.now());
            cardRepository.save(targetCard);
            log.info("CR-04 Auto-completed card {} (\"{}\") to column '{}' on alert {} resolution",
                    targetCard.getId(), targetCard.getTitle(), doneCol.getName(), alert.getId());

            if (activityEventRepository != null) {
                ActivityEvent event = new ActivityEvent();
                event.setTeam(alert.getTeam());
                event.setUser(alert.getUser() != null ? alert.getUser() : targetCard.getAssignee());
                event.setSource(ActivitySource.BOARD);
                event.setEventType("CARD_COMPLETED");
                event.setDetails("Hoàn thành công việc: " + targetCard.getTitle());
                event.setOccurredAt(LocalDateTime.now());
                event.setStoryPoints(targetCard.getStoryPoints() != null ? targetCard.getStoryPoints() : 2.0);
                event.setDifficultyLevel(targetCard.getDifficultyLevel() != null ? targetCard.getDifficultyLevel() : 2);
                event.setDelayDays(0.0);
                event.setIsOnTime(true);
                activityEventRepository.save(event);
            }
        }
    }

    private String extractCardTitleFromAlert(Alert alert) {
        if (alert == null || alert.getMessage() == null) return null;
        String msg = alert.getMessage();
        // 1. Quoted title: Công việc "..." do ...
        java.util.regex.Matcher mQuote = java.util.regex.Pattern.compile("\"([^\"]+)\"").matcher(msg);
        if (mQuote.find()) {
            return mQuote.group(1).trim();
        }
        // 2. Formatted title: ... | Công việc: ...
        int idx = msg.indexOf("Công việc: ");
        if (idx >= 0) {
            String rest = msg.substring(idx + 11).trim();
            int pipeIdx = rest.indexOf(" | ");
            return (pipeIdx >= 0 ? rest.substring(0, pipeIdx) : rest).trim();
        }
        return null;
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
