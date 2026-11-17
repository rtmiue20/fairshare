package com.fairshare.alert.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateAlertRequest {
    private Long userId;
    private String userName;
    private String alertType;
    private String severity;
    private String templateType;
    private String title;
    private String message;
    private String taskTitle;
    private String senderName;
    private String senderRole;
}
