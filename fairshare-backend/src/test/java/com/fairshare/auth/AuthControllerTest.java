package com.fairshare.auth;

import com.fairshare.auth.controller.AuthController;
import com.fairshare.auth.dto.AuthResponse;
import com.fairshare.auth.dto.LoginRequest;
import com.fairshare.auth.dto.RegisterRequest;
import com.fairshare.auth.service.AuthService;
import com.fairshare.common.exception.DuplicateResourceException;
import com.fairshare.common.exception.GlobalExceptionHandler;
import com.fairshare.user.dto.UserDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Test cho AuthController (M3 - Backend 1)")
class AuthControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private AuthResponse sampleAuthResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        sampleAuthResponse = AuthResponse.builder()
                .accessToken("mocked.jwt.token")
                .tokenType("Bearer")
                .user(UserDto.builder()
                        .id(1L)
                        .email("ngotrongphuc@st.ueh.edu.vn")
                        .fullName("Ngô Trọng Phúc")
                        .build())
                .build();
    }

    @Test
    @DisplayName("POST /api/auth/register hợp lệ -> 200 OK + JWT Token")
    void register_valid_returnsOk() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("ngotrongphuc@st.ueh.edu.vn")
                .password("Password@123") // ggignore
                .fullName("Ngô Trọng Phúc")
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(sampleAuthResponse);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mocked.jwt.token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.user.email").value("ngotrongphuc@st.ueh.edu.vn"));
    }

    @Test
    @DisplayName("POST /api/auth/register trùng email -> 409 Conflict")
    void register_duplicateEmail_returnsConflict() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("ngotrongphuc@st.ueh.edu.vn")
                .password("Password@123") // ggignore
                .fullName("Ngô Trọng Phúc")
                .build();

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new DuplicateResourceException("Email already registered"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/auth/register dữ liệu không hợp lệ -> 400 Bad Request")
    void register_invalidInput_returnsBadRequest() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .email("invalid-email")
                .password("")
                .fullName("")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/auth/login hợp lệ -> 200 OK + JWT Token")
    void login_valid_returnsOk() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("ngotrongphuc@st.ueh.edu.vn")
                .password("Password@123") // ggignore
                .build();

        when(authService.login(any(LoginRequest.class))).thenReturn(sampleAuthResponse);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mocked.jwt.token"));
    }

    @Test
    @DisplayName("POST /api/auth/login sai mật khẩu -> 401 Unauthorized")
    void login_wrongPassword_returnsUnauthorized() throws Exception {
        LoginRequest request = LoginRequest.builder()
                .email("ngotrongphuc@st.ueh.edu.vn")
                .password("WrongPassword") // ggignore
                .build();

        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid email or password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/auth/logout -> 200 OK")
    void logout_returnsOk() throws Exception {
        doNothing().when(authService).logout();

        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}

