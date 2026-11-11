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
        if (email == null || email.isBlank()) {
            throw new BusinessException("Email is required");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + normalizedEmail));
        if (fullName != null && !fullName.trim().isEmpty()) {
            user.setFullName(fullName.trim());
        }
        return toDto(userRepository.save(user));
    }

    private UserDto toDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .build();
    }
}
