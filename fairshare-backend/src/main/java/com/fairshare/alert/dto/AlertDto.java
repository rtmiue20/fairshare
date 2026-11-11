package com.fairshare.alert.dto;

import com.fairshare.alert.entity.Alert;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertDto {
    private Long id;
    private Long teamId;
    private Long userId;
    private String userName;
    private String alertType;
    private String message;
    private boolean resolved;
    private LocalDateTime createdAt;

    public static AlertDto from(Alert alert) {
        return AlertDto.builder()
                .id(alert.getId())
                .teamId(alert.getTeam() != null ? alert.getTeam().getId() : null)
                .userId(alert.getUser() != null ? alert.getUser().getId() : null)
                .userName(alert.getUser() != null ? alert.getUser().getFullName() : null)
                .alertType(alert.getAlertType())
                .message(alert.getMessage())
                .resolved(alert.isResolved())
                .createdAt(alert.getCreatedAt())
                .build();
    }
}

