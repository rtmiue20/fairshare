-- Mẫu dữ liệu giả lập phục vụ môi trường dev/demo (không chứa thông tin cá nhân thật)

INSERT INTO users (id, email, password, full_name) VALUES
(1, 'leader@fairshare.local', '$2a$10$SampleHashedPasswordLeader', 'Nguyen Van A (Leader)'),
(2, 'member1@fairshare.local', '$2a$10$SampleHashedPasswordMem1', 'Tran Thi B (Dev)'),
(3, 'member2@fairshare.local', '$2a$10$SampleHashedPasswordMem2', 'Le Van C (Dev)'),
(4, 'member3@fairshare.local', '$2a$10$SampleHashedPasswordMem3', 'Pham Thi D (Tester)');
