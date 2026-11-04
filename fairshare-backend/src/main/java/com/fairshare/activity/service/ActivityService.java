package com.fairshare.activity.service;

import com.fairshare.activity.entity.ActivityEvent;
import com.fairshare.activity.entity.ActivitySource;
import com.fairshare.activity.repository.ActivityEventRepository;
import com.fairshare.sprint.entity.Sprint;
import com.fairshare.team.entity.Team;
import com.fairshare.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityService {

    private final ActivityEventRepository activityEventRepository;

    @Transactional
    public ActivityEvent logActivity(Team team, User user, ActivitySource source, String eventType,
                                     String details, LocalDateTime occurredAt, Sprint sprint,
                                     Double storyPoints, Boolean isOnTime) {
        ActivityEvent event = new ActivityEvent();
        event.setTeam(team);
        event.setUser(user);
        event.setSource(source);
        event.setEventType(eventType);
        event.setDetails(details);
        event.setOccurredAt(occurredAt != null ? occurredAt : LocalDateTime.now());
        event.setSprint(sprint);
        event.setStoryPoints(storyPoints != null ? storyPoints : 0.0);
        event.setIsOnTime(isOnTime);
        return activityEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public List<ActivityEvent> getEventsByTeam(Long teamId) {
        return activityEventRepository.findByTeamId(teamId);
    }

    @Transactional(readOnly = true)
    public List<ActivityEvent> getEventsBySprint(Long sprintId) {
        return activityEventRepository.findBySprintId(sprintId);
    }

    @Transactional(readOnly = true)
    public List<ActivityEvent> getEventsByTeamAndUser(Long teamId, Long userId) {
        return activityEventRepository.findByTeamIdAndUserId(teamId, userId);
    }
}
