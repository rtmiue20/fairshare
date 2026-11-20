package com.fairshare.user.controller;

import com.fairshare.common.dto.ApiResponse;
import com.fairshare.upload.dto.FileUploadResponse;
import com.fairshare.upload.service.FileUploadService;
import com.fairshare.user.dto.UserDto;
import com.fairshare.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final FileUploadService fileUploadService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("USER_UNAUTHENTICATED", "Chưa đăng nhập"));
        }
        UserDto userDto = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Thông tin người dùng hiện tại", userDto));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> updateCurrentUser(
            @RequestBody UserDto request,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("USER_UNAUTHENTICATED", "Chưa đăng nhập"));
        }
        UserDto updated = userService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật hồ sơ thành công", updated));
    }

    /** Tải ảnh đại diện: lưu vào uploads/avatars, cập nhật users.avatar_url. */
    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserDto>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("USER_UNAUTHENTICATED", "Chưa đăng nhập"));
        }
        FileUploadResponse stored = fileUploadService.uploadAvatar(file);
        String oldUrl = userService.updateAvatar(authentication.getName(), stored.getUrl());
        fileUploadService.deleteAvatar(oldUrl);
        UserDto updated = userService.getByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật ảnh đại diện thành công", updated));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable Long id) {
        UserDto userDto = userService.getById(id);
        return ResponseEntity.ok(ApiResponse.ok("Thông tin người dùng", userDto));
    }
}
