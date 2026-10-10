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
    private ActivitySource source;
    private String eventType;
    private String details;
    private LocalDateTime occurredAt;
}
