package com.fairshare.user;

import com.fairshare.TestcontainersConfiguration;
import com.fairshare.user.entity.User;
import com.fairshare.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;
import java.util.UUID;

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
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    private static User newUser(String email) {
        User u = new User();
        u.setEmail(email);
        u.setPassword("hash-" + UUID.randomUUID()); // giá trị giả, sinh lúc chạy
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
    @DisplayName("TC-USR-02: findByEmail trả về đúng user đã lưu")
    void findByEmail_existing_returnsUser() {
        userRepository.saveAndFlush(newUser("binh@st.ueh.edu.vn"));

        Optional<User> found = userRepository.findByEmail("binh@st.ueh.edu.vn");

        assertThat(found).isPresent();
        assertThat(found.get().getFullName()).isEqualTo("Sinh Vien Test");
    }

    @Test
    @DisplayName("TC-USR-03: findByEmail với email chưa đăng ký trả về rỗng")
    void findByEmail_unknown_returnsEmpty() {
        assertThat(userRepository.findByEmail("khongton@st.ueh.edu.vn")).isEmpty();
    }

    @Test
    @DisplayName("TC-USR-04: Không cho 2 tài khoản trùng email (ràng buộc UNIQUE)")
    void save_duplicateEmail_isRejected() {
        userRepository.saveAndFlush(newUser("trung@st.ueh.edu.vn"));

        assertThatThrownBy(() -> userRepository.saveAndFlush(newUser("trung@st.ueh.edu.vn")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("TC-USR-05: Email khác hoa/thường vẫn bị coi là trùng (collation MariaDB không phân biệt hoa thường)")
    void save_duplicateEmailDifferentCase_isRejected() {
        userRepository.saveAndFlush(newUser("hoa@st.ueh.edu.vn"));

        assertThat(userRepository.findByEmail("HOA@st.ueh.edu.vn")).isPresent();
        assertThatThrownBy(() -> userRepository.saveAndFlush(newUser("HOA@st.ueh.edu.vn")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
