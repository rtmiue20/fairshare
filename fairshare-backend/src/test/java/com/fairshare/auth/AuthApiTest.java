package com.fairshare.auth;

import com.fairshare.TestcontainersConfiguration;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Kiểm thử API xác thực ở mức HTTP (full Spring context + MariaDB Testcontainers).
 *
 * - {@link ProtectedEndpoints}: chạy ngay. Bảo đảm API nghiệp vụ không bị lộ khi
 *   chưa đăng nhập. Phải tiếp tục pass sau khi gắn JWT (regression).
 * - {@link AuthContract}: đang @Disabled vì AuthController/AuthService/JwtService
 *   trên master mới là class rỗng. Khi module auth xong, xoá @Disabled để dùng
 *   làm acceptance test. Mã HTTP lấy theo docs/M2-API-Contract.md (400/401/409);
 *   đường dẫn /api/auth/register|login khớp frontend/src/api/auth.api.ts.
 *
 * Test case: TC-AUTH-01..09 (TC-AUTH-10 kiểm tra thủ công) trong docs/qa/test-cases-sprint3.md
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthApiTest {

    @Autowired
    private MockMvc mvc;

    private static String uniqueEmail() {
        return "sv-" + UUID.randomUUID().toString().substring(0, 8) + "@st.ueh.edu.vn";
    }

    private static String registerJson(String email, String password, String fullName) {
        return """
                {"email":"%s","password":"%s","fullName":"%s"}""".formatted(email, password, fullName);
    }

    private static String loginJson(String email, String password) {
        return """
                {"email":"%s","password":"%s"}""".formatted(email, password);
    }

    @Nested
    @DisplayName("Endpoint nghiệp vụ phải yêu cầu đăng nhập")
    class ProtectedEndpoints {

        @ParameterizedTest(name = "TC-AUTH-01: GET {0} không có token -> 401")
        @ValueSource(strings = {
                "/api/users", "/api/teams", "/api/sprints", "/api/contributions",
                "/api/activities", "/api/review-rounds", "/api/reports"
        })
        void getWithoutToken_isUnauthorized(String path) throws Exception {
            mvc.perform(get(path).accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-AUTH-02: Token giả mạo -> 401")
        void getWithForgedToken_isUnauthorized() throws Exception {
            mvc.perform(get("/api/teams")
                            .header("Authorization", "Bearer khong.phai.jwt")
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @Disabled("Chờ module auth (AuthController/AuthService/JwtService/SecurityConfig) được hiện thực – xem DEF-01")
    @DisplayName("Hợp đồng API /api/auth (acceptance test cho module auth)")
    class AuthContract {

        @Test
        @DisplayName("TC-AUTH-03: Đăng ký hợp lệ -> 2xx, trả accessToken + thông tin user")
        void register_valid_returnsToken() throws Exception {
            String email = uniqueEmail();
            mvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson(email, "Matkhau@123", "Nguyen Van A")))
                    .andExpect(status().is2xxSuccessful())
                    .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                    .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                    .andExpect(jsonPath("$.data.user.email").value(email))
                    .andExpect(jsonPath("$.data.user.password").doesNotExist());
        }

        @Test
        @DisplayName("TC-AUTH-04: Đăng ký trùng email -> 409")
        void register_duplicateEmail_conflict() throws Exception {
            String email = uniqueEmail();
            mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                    .content(registerJson(email, "Matkhau@123", "A")));

            mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson(email, "Matkhau@123", "B")))
                    .andExpect(status().isConflict());
        }

        @ParameterizedTest(name = "TC-AUTH-05: Đăng ký dữ liệu sai ({0}) -> 400")
        @ValueSource(strings = {
                "{\"email\":\"khong-phai-email\",\"password\":\"Matkhau@123\",\"fullName\":\"A\"}",
                "{\"email\":\"\",\"password\":\"Matkhau@123\",\"fullName\":\"A\"}",
                "{\"email\":\"a@st.ueh.edu.vn\",\"password\":\"\",\"fullName\":\"A\"}",
                "{\"email\":\"a@st.ueh.edu.vn\",\"password\":\"Matkhau@123\",\"fullName\":\"\"}"
        })
        void register_invalidInput_badRequest(String body) throws Exception {
            mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("TC-AUTH-06: Đăng nhập đúng -> 200 + accessToken")
        void login_valid_returnsToken() throws Exception {
            String email = uniqueEmail();
            mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                    .content(registerJson(email, "Matkhau@123", "A")));

            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson(email, "Matkhau@123")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
        }

        @Test
        @DisplayName("TC-AUTH-07: Sai mật khẩu -> 401")
        void login_wrongPassword_unauthorized() throws Exception {
            String email = uniqueEmail();
            mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                    .content(registerJson(email, "Matkhau@123", "A")));

            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson(email, "SaiMatKhau")))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-AUTH-08: Email chưa đăng ký -> 401 (không tiết lộ email có tồn tại hay không)")
        void login_unknownEmail_unauthorized() throws Exception {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content(loginJson(uniqueEmail(), "Matkhau@123")))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @DisplayName("TC-AUTH-09: Token hợp lệ được truy cập API nghiệp vụ")
        void validToken_canAccessProtectedEndpoint() throws Exception {
            String email = uniqueEmail();
            MvcResult res = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                            .content(registerJson(email, "Matkhau@123", "A")))
                    .andReturn();
            String body = res.getResponse().getContentAsString();
            String token = body.replaceAll("(?s).*\"accessToken\"\\s*:\\s*\"([^\"]+)\".*", "$1");
            assertThat(token).isNotBlank().doesNotContain("{");

            mvc.perform(get("/api/teams").header("Authorization", "Bearer " + token)
                            .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk());
        }
    }
}
