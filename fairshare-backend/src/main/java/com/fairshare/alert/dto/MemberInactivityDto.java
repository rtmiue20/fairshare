package com.fairshare.alert.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberInactivityDto {
    private Long userId;
    private String userName;
    private Long daysInactive;
    private LocalDateTime lastActivity;
    private boolean exceeded;
}
