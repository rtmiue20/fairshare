package com.fairshare.activity.dto;

import com.fairshare.activity.entity.ActivitySource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityEventDto {
    private Long id;
    private Long teamId;
    private Long userId;
    private Long sprintId;
    private ActivitySource source;
    private String eventType;
    private String details;
    private Double storyPoints;
    private Integer difficultyLevel;
    private Boolean isOnTime;
    private Double delayDays;
    private String completionStatus;
    private LocalDateTime occurredAt;
}
