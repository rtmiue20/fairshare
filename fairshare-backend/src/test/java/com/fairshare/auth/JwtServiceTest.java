package com.fairshare.auth;

import com.fairshare.auth.security.JwtService;
import com.fairshare.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Unit Test cho JwtService (M3 - Backend 1)")
class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        AppProperties appProperties = new AppProperties();
        appProperties.getJwt().setSecret("fairshare-dev-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256"); // ggignore
        appProperties.getJwt().setExpirationMs(3600000L); // 1 hour
        jwtService = new JwtService(appProperties);
    }

    @Test
    @DisplayName("Tạo JWT Token và giải mã trích xuất email đúng")
    void generateToken_and_extractUsername() {
        String email = "ngotrongphuc@st.ueh.edu.vn";
        String token = jwtService.generateToken(email);

        assertThat(token).isNotBlank();
        String extractedUsername = jwtService.extractUsername(token);
        assertThat(extractedUsername).isEqualTo(email);
    }

    @Test
    @DisplayName("Xác thực Token hợp lệ với UserDetails thành công")
    void validateToken_valid_returnsTrue() {
        String email = "ngotrongphuc@st.ueh.edu.vn";
        UserDetails userDetails = new User(email, "password", Collections.emptyList());

        String token = jwtService.generateToken(userDetails);
        boolean isValid = jwtService.validateToken(token, userDetails);

        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Xác thực Token không hợp lệ / giả mạo -> trả về false")
    void validateToken_invalid_returnsFalse() {
        boolean isValid = jwtService.validateToken("forged.fake.token");
        assertThat(isValid).isFalse();
    }
}
