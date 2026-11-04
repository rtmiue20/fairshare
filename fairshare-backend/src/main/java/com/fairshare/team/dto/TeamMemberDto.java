package com.fairshare.team.dto;

import com.fairshare.team.entity.MemberRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamMemberDto {
    private Long id;
    private Long userId;
    private String email;
    private String fullName;
    private MemberRole role;
    private boolean hasConsented;
    private LocalDateTime joinedAt;
}
