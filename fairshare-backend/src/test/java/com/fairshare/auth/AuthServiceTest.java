package com.fairshare.auth;

import com.fairshare.auth.dto.AuthResponse;
import com.fairshare.auth.dto.LoginRequest;
import com.fairshare.auth.dto.RegisterRequest;
import com.fairshare.auth.security.JwtService;
import com.fairshare.auth.service.AuthService;
import com.fairshare.common.exception.DuplicateResourceException;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test cho AuthService (M3 - Backend 1)")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private User sampleUser;
    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        sampleUser = new User();
        sampleUser.setId(1L);
        sampleUser.setEmail("ngotrongphuc@st.ueh.edu.vn");
        sampleUser.setPassword("$2a$10$encodedPasswordHashMock"); // ggignore
        sampleUser.setFullName("Ngô Trọng Phúc");

        registerRequest = RegisterRequest.builder()
                .email("ngotrongphuc@st.ueh.edu.vn")
                .password("Password@123") // ggignore
                .fullName("Ngô Trọng Phúc")
                .build();

        loginRequest = LoginRequest.builder()
                .email("ngotrongphuc@st.ueh.edu.vn")
                .password("Password@123") // ggignore
                .build();
    }

    @Nested
    @DisplayName("API Đăng ký (Register)")
    class RegisterTests {

        @Test
        @DisplayName("Đăng ký thành công -> mã hóa mật khẩu, lưu User và trả về JWT Token")
        void register_success() {
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
            when(passwordEncoder.encode("Password@123")).thenReturn("$2a$10$encodedPasswordHashMock"); // ggignore
            when(userRepository.save(any(User.class))).thenReturn(sampleUser);
            when(jwtService.generateToken("ngotrongphuc@st.ueh.edu.vn")).thenReturn("mocked.jwt.token");

            AuthResponse response = authService.register(registerRequest);

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("mocked.jwt.token");
            assertThat(response.getTokenType()).isEqualTo("Bearer");
            assertThat(response.getUser()).isNotNull();
            assertThat(response.getUser().getId()).isEqualTo(1L);
            assertThat(response.getUser().getEmail()).isEqualTo("ngotrongphuc@st.ueh.edu.vn");
            assertThat(response.getUser().getFullName()).isEqualTo("Ngô Trọng Phúc");

            ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
            verify(userRepository, times(1)).save(userCaptor.capture());
            User capturedUser = userCaptor.getValue();
            assertThat(capturedUser.getEmail()).isEqualTo("ngotrongphuc@st.ueh.edu.vn");
            assertThat(capturedUser.getPassword()).isEqualTo("$2a$10$encodedPasswordHashMock"); // ggignore
            assertThat(capturedUser.getFullName()).isEqualTo("Ngô Trọng Phúc");
        }

        @Test
        @DisplayName("Đăng ký trùng email -> ném DuplicateResourceException (409)")
        void register_duplicateEmail_throwsDuplicateResourceException() {
            when(userRepository.findByEmail("ngotrongphuc@st.ueh.edu.vn")).thenReturn(Optional.of(sampleUser));

            DuplicateResourceException exception = assertThrows(
                    DuplicateResourceException.class,
                    () -> authService.register(registerRequest)
            );

            assertThat(exception.getMessage()).contains("Email already registered");
            verify(userRepository, never()).save(any(User.class));
            verify(jwtService, never()).generateToken(anyString());
        }
    }

    @Nested
    @DisplayName("API Đăng nhập (Login)")
    class LoginTests {

        @Test
        @DisplayName("Đăng nhập đúng thông tin -> xác thực thành công và trả về JWT Token")
        void login_success() {
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));
            when(userRepository.findByEmail("ngotrongphuc@st.ueh.edu.vn")).thenReturn(Optional.of(sampleUser));
            when(jwtService.generateToken("ngotrongphuc@st.ueh.edu.vn")).thenReturn("mocked.jwt.token");

            AuthResponse response = authService.login(loginRequest);

            assertThat(response).isNotNull();
            assertThat(response.getAccessToken()).isEqualTo("mocked.jwt.token");
            assertThat(response.getTokenType()).isEqualTo("Bearer");
            assertThat(response.getUser().getEmail()).isEqualTo("ngotrongphuc@st.ueh.edu.vn");
            verify(authenticationManager, times(1)).authenticate(any(UsernamePasswordAuthenticationToken.class));
        }

        @Test
        @DisplayName("Đăng nhập sai mật khẩu -> ném BadCredentialsException (401)")
        void login_wrongPassword_throwsBadCredentialsException() {
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenThrow(new BadCredentialsException("Bad credentials"));

            BadCredentialsException exception = assertThrows(
                    BadCredentialsException.class,
                    () -> authService.login(loginRequest)
            );

            assertThat(exception.getMessage()).isEqualTo("Invalid email or password");
            verify(jwtService, never()).generateToken(anyString());
        }

        @Test
        @DisplayName("Đăng nhập email chưa đăng ký -> ném BadCredentialsException (401, không tiết lộ email)")
        void login_unknownEmail_throwsBadCredentialsException() {
            when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                    .thenReturn(new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));
            when(userRepository.findByEmail("ngotrongphuc@st.ueh.edu.vn")).thenReturn(Optional.empty());

            BadCredentialsException exception = assertThrows(
                    BadCredentialsException.class,
                    () -> authService.login(loginRequest)
            );

            assertThat(exception.getMessage()).isEqualTo("Invalid email or password");
            verify(jwtService, never()).generateToken(anyString());
        }
    }

    @Nested
    @DisplayName("API Đăng xuất (Logout)")
    class LogoutTests {

        @Test
        @DisplayName("Đăng xuất -> xóa SecurityContext")
        void logout_success() {
            authService.logout();
        }
    }
}
