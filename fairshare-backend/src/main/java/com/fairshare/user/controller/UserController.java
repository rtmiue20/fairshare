package com.fairshare.user.controller;

import com.fairshare.common.dto.ApiResponse;
import com.fairshare.user.dto.UserDto;
import com.fairshare.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("USER_UNAUTHENTICATED", "Chưa đăng nhập"));
        }
        UserDto userDto = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Thông tin người dùng hiện tại", userDto));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable Long id) {
        UserDto userDto = userService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok("Thông tin người dùng", userDto));
    }
}
