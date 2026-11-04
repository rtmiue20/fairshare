package com.fairshare.user;

import com.fairshare.TestcontainersConfiguration;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Kiểm thử tầng dữ liệu User (nền của luồng đăng ký / đăng nhập).
 * Chạy trên MariaDB 10.11 thật (Testcontainers) với schema do Flyway tạo,
 * để bắt được lỗi ràng buộc mà H2/in-memory không bắt được.
 * Test case: TC-USR-01..05 trong docs/qa/test-cases-sprint3.md
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
@EnabledIf("isDockerAvailable")
class UserRepositoryTest {

    static boolean isDockerAvailable() {
        try {
            return org.testcontainers.DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }

    @Autowired
    private UserRepository userRepository;

    private static User newUser(String email) {
        User u = new User();
        u.setEmail(email);
        u.setPassword("$2a$10$hashedPasswordPlaceholderForTestOnly");
        u.setFullName("Sinh Vien Test");
        return u;
    }

    @Test
    @DisplayName("TC-USR-01: Lưu user mới thì sinh id và tự gán created_at/updated_at")
    void save_assignsIdAndAuditFields() {
        User saved = userRepository.saveAndFlush(newUser("an@st.ueh.edu.vn"));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("TC-USR-02: Email trùng bị từ chối bằng DataIntegrityViolationException")
    void save_duplicateEmail_isRejected() {
        userRepository.saveAndFlush(newUser("trung@st.ueh.edu.vn"));

        assertThatThrownBy(() -> userRepository.saveAndFlush(newUser("trung@st.ueh.edu.vn")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("TC-USR-03: Tìm theo email trả đúng user (case-sensitive theo collation)")
    void findByEmail_returnsMatchingUser() {
        User saved = userRepository.saveAndFlush(newUser("timkiem@st.ueh.edu.vn"));

        Optional<User> found = userRepository.findByEmail("timkiem@st.ueh.edu.vn");
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(saved.getId());
    }

    @Test
    @DisplayName("TC-USR-04: Email không tồn tại trả Optional.empty()")
    void findByEmail_whenMissing_returnsEmpty() {
        assertThat(userRepository.findByEmail("khongtontai@st.ueh.edu.vn")).isEmpty();
    }

    @Test
    @DisplayName("TC-USR-05: existsByEmail trả true khi có, false khi không")
    void existsByEmail_reflectsPresence() {
        userRepository.saveAndFlush(newUser("cotontai@st.ueh.edu.vn"));

        assertThat(userRepository.existsByEmail("cotontai@st.ueh.edu.vn")).isTrue();
        assertThat(userRepository.existsByEmail("khongheco@st.ueh.edu.vn")).isFalse();
    }
}
