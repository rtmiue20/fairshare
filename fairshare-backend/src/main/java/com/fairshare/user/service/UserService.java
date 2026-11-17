package com.fairshare.user.service;

import com.fairshare.common.exception.BusinessException;
import com.fairshare.common.exception.ResourceNotFoundException;
import com.fairshare.user.dto.UserDto;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@RequiredArgsConstructor
@Service
public class UserService {

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public UserDto getById(Long id) {
        if (id == null) {
            throw new BusinessException("User id is required");
        }
        return toDto(userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id)));
    }

    @Transactional(readOnly = true)
    public UserDto getByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BusinessException("Email is required");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        return toDto(userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + normalizedEmail)));
    }

    @Transactional
    public UserDto updateProfile(String email, String fullName) {
        return updateProfile(email, UserDto.builder().fullName(fullName).build());
    }

    /**
     * Cập nhật hồ sơ cá nhân. Trường nào null thì giữ nguyên giá trị cũ,
     * chuỗi rỗng ("") nghĩa là xóa giá trị (trừ họ tên - không cho phép rỗng).
     */
    @Transactional
    public UserDto updateProfile(String email, UserDto request) {
        if (email == null || email.isBlank()) {
            throw new BusinessException("Email is required");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + normalizedEmail));
        if (request == null) {
            return toDto(user);
        }
        String fullName = request.getFullName();
        if (fullName != null && !fullName.trim().isEmpty()) {
            user.setFullName(limit(fullName.trim(), 255));
        }
        if (request.getStudentId() != null) {
            user.setStudentId(normalize(request.getStudentId(), 50));
        }
        if (request.getPhone() != null) {
            String phone = normalize(request.getPhone(), 30);
            if (phone != null && !phone.matches("^[0-9+()\\s.-]{6,30}$")) {
                throw new BusinessException("Số điện thoại không hợp lệ");
            }
            user.setPhone(phone);
        }
        if (request.getMajor() != null) {
            user.setMajor(normalize(request.getMajor(), 255));
        }
        if (request.getTeamRole() != null) {
            user.setTeamRole(normalize(request.getTeamRole(), 255));
        }
        if (request.getBio() != null) {
            user.setBio(normalize(request.getBio(), 1000));
        }
        if (request.getGithubUsername() != null) {
            user.setGithubUsername(normalize(request.getGithubUsername(), 100));
        }
        return toDto(userRepository.save(user));
    }

    private static String normalize(String value, int max) {
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : limit(trimmed, max);
    }

    private static String limit(String value, int max) {
        return value.length() > max ? value.substring(0, max) : value;
    }

    private UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .studentId(user.getStudentId())
                .phone(user.getPhone())
                .major(user.getMajor())
                .teamRole(user.getTeamRole())
                .bio(user.getBio())
                .githubUsername(user.getGithubUsername())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
