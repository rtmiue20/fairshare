package com.fairshare.team.dto;

import com.fairshare.team.entity.MemberRole;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMemberRoleRequest {

    @NotNull(message = "Vai trò thành viên không được để trống")
    private MemberRole role;
}
