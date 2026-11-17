package com.fairshare.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String email;
    private String fullName;
    private String studentId;
    private String phone;
    private String major;
    private String teamRole;
    private String bio;
    private String githubUsername;
    private java.time.LocalDateTime createdAt;
}
