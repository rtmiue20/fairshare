package com.fairshare.auth;

import com.fairshare.auth.dto.AuthResponse;
import com.fairshare.auth.dto.LoginRequest;
import com.fairshare.auth.dto.RegisterRequest;
import com.fairshare.user.dto.UserDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AuthTest {

    @Test
    @DisplayName("Kiểm tra khởi tạo DTO xác thực (AuthResponse, LoginRequest, RegisterRequest)")
    void authDtos_buildAndMapFieldsCorrectly() {
        RegisterRequest reg = RegisterRequest.builder()
                .email("sv@st.ueh.edu.vn")
                .password("Password@123")
                .fullName("Sinh Viên UEH")
                .build();
        assertThat(reg.getEmail()).isEqualTo("sv@st.ueh.edu.vn");
        assertThat(reg.getFullName()).isEqualTo("Sinh Viên UEH");

        LoginRequest login = LoginRequest.builder()
                .email("sv@st.ueh.edu.vn")
                .password("Password@123")
                .build();
        assertThat(login.getEmail()).isEqualTo("sv@st.ueh.edu.vn");

        AuthResponse resp = AuthResponse.builder()
                .accessToken("jwt.token.value")
                .tokenType("Bearer")
                .user(UserDto.builder().id(10L).email("sv@st.ueh.edu.vn").fullName("Sinh Viên UEH").build())
                .build();
        assertThat(resp.getAccessToken()).isEqualTo("jwt.token.value");
        assertThat(resp.getTokenType()).isEqualTo("Bearer");
        assertThat(resp.getUser().getId()).isEqualTo(10L);
    }
}
