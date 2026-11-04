package com.fairshare.team.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamDto {
    private Long id;
    private String name;
    private String courseName;
    private String description;
    private String inviteCode;
    private String currentRole;
    private List<TeamMemberDto> members;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
