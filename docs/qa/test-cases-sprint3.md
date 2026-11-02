# Test case Sprint 3 – Auth & User flow

| Thông tin | |
|---|---|
| Dự án | FairShare – Môn Quản lý dự án CNTT (UEH) |
| Người soạn | M5 – Khiếu Hoàng Nam Anh (QA / DevOps) |
| Phạm vi | Đăng ký, đăng nhập, bảo vệ route/API, lưu phiên đăng nhập phía frontend, tầng dữ liệu `users` |
| Căn cứ | `docs/sprint3.md` (PCCV M5, hạn 02/11), `docs/M2-API-Contract.md` (nhánh `thien`), `frontend/src/api/auth.api.ts` |
| Ngày | 02/11/2026 |

**Quy ước trạng thái**
- **Pass**: đã chạy, đạt.
- **Pending**: test đã viết sẵn nhưng đang `@Disabled` vì tính năng chưa được code. Bật lại khi module auth backend xong.
- **Manual**: kiểm tra thủ công, chưa tự động hoá.

**Cách chạy**
- Backend: `cd fairshare-backend && mvn -B verify` (cần Docker cho Testcontainers MariaDB 10.11).
- Frontend: `cd frontend && npm run test:ci`.

---

## 1. Backend – tầng dữ liệu User
File: `fairshare-backend/src/test/java/com/fairshare/user/UserRepositoryTest.java` (MariaDB thật qua Testcontainers, schema do Flyway tạo)

| ID | Mô tả | Tiền điều kiện | Bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| TC-USR-01 | Lưu user mới | DB rỗng | `saveAndFlush(user)` | Có `id`, `created_at`, `updated_at` | Đúng như mong đợi | Pass |
| TC-USR-02 | Tìm user theo email | Đã có user `binh@…` | `findByEmail("binh@…")` | Trả về user đúng | Đúng như mong đợi | Pass |
| TC-USR-03 | Tìm email chưa đăng ký | – | `findByEmail("khongton@…")` | `Optional.empty()` | Đúng như mong đợi | Pass |
| TC-USR-04 | Chặn trùng email | Đã có `trung@…` | Lưu user thứ 2 cùng email | `DataIntegrityViolationException` | Đúng như mong đợi | Pass |
| TC-USR-05 | Trùng email khác hoa/thường | Đã có `hoa@…` | Tìm và lưu `HOA@…` | Tìm thấy; lưu bị chặn | Đúng như mong đợi (collation MariaDB không phân biệt hoa thường) | Pass |

## 2. Backend – API xác thực
File: `fairshare-backend/src/test/java/com/fairshare/auth/AuthApiTest.java` (full Spring context + MockMvc)

| ID | Mô tả | Tiền điều kiện | Bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| TC-AUTH-01 | API nghiệp vụ không cho truy cập ẩn danh | Không có token | `GET` 7 endpoint: `/api/users`, `/teams`, `/sprints`, `/contributions`, `/activities`, `/review-rounds`, `/reports` | 401 cho cả 7 | 401 cho cả 7 | Pass |
| TC-AUTH-02 | Token giả mạo bị từ chối | – | `GET /api/teams` với `Authorization: Bearer khong.phai.jwt` | 401 | 401 | Pass |
| TC-AUTH-03 | Đăng ký hợp lệ | Email chưa tồn tại | `POST /api/auth/register` `{email,password,fullName}` | 2xx; `data.accessToken` có giá trị; `data.tokenType = "Bearer"`; `data.user.email` đúng; **không** trả `password` | Endpoint chưa có (401) | Pending |
| TC-AUTH-04 | Đăng ký trùng email | Email đã đăng ký | Đăng ký lại cùng email | 409 Conflict | Endpoint chưa có | Pending |
| TC-AUTH-05 | Đăng ký dữ liệu sai | – | 4 trường hợp: email sai định dạng, email rỗng, mật khẩu rỗng, họ tên rỗng | 400 (`VALIDATION_FAILED`) cho cả 4 | Endpoint chưa có | Pending |
| TC-AUTH-06 | Đăng nhập đúng | Đã đăng ký | `POST /api/auth/login` | 200 + `data.accessToken` | Endpoint chưa có | Pending |
| TC-AUTH-07 | Sai mật khẩu | Đã đăng ký | Login với mật khẩu sai | 401 | Endpoint chưa có | Pending |
| TC-AUTH-08 | Email chưa đăng ký | – | Login với email lạ | 401 (giống sai mật khẩu, không lộ email có tồn tại) | Endpoint chưa có | Pending |
| TC-AUTH-09 | Token thật dùng được | Đăng ký lấy token | `GET /api/teams` kèm `Bearer <token>` | 200 | Endpoint chưa có | Pending |
| TC-AUTH-10 | Mật khẩu được băm | Đã đăng ký 1 user | Vào DB: `SELECT password FROM users WHERE email=…` | Giá trị dạng BCrypt (`$2a$…`/`$2b$…`), không phải mật khẩu gốc | Chưa kiểm được | Manual |

> TC-AUTH-03..09 đã được bật thử trên code hiện tại: cả 10 lần chạy (tính cả 4 biến thể của TC-AUTH-05) đều **fail** như dự đoán, chứng tỏ test thực sự kiểm tra hành vi chứ không pass "cho có".
> Mã lỗi 400/401/409 lấy theo bảng mã lỗi trong `M2-API-Contract.md`. Hợp đồng chưa mô tả riêng endpoint auth, nên mã trả về của `/register` (200 hay 201) để linh hoạt `2xx`. Người làm auth cần xác nhận lại.

## 3. Frontend – User flow đăng ký / đăng nhập
Thư mục: `frontend/src/tests/auth/` (Vitest + Testing Library, API được mock)

| ID | Mô tả | Tiền điều kiện | Bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| TC-FE-AUTH-01 | Lưu phiên khi đăng nhập | Store rỗng | `authStore.login(token, user)` | Token vào `localStorage`, `isAuthenticated = true` | Đúng | Pass |
| TC-FE-AUTH-02 | Đăng xuất | Đang đăng nhập | `authStore.logout()` | Xoá token + user | Đúng | Pass |
| TC-FE-AUTH-03 | Trạng thái ban đầu | Không có token | Mở app | Chưa đăng nhập | Đúng | Pass |
| TC-FE-AUTH-04 | Form đăng nhập | – | Mở `/login` | Có ô email, mật khẩu (bắt buộc), nút "Đăng nhập" | Đúng | Pass |
| TC-FE-AUTH-05 | Đăng nhập thành công | API trả token | Nhập email/mật khẩu, bấm Đăng nhập | Gọi API đúng payload, lưu token, chuyển `/dashboard` | Đúng | Pass |
| TC-FE-AUTH-06 | Đăng nhập thất bại | API báo lỗi | Như trên | Hiện thông báo lỗi, ở lại trang, không lưu token, nút bấm lại được | Đúng (với lỗi mock). Với lỗi 401 thật xem DEF-03 | Pass |
| TC-FE-AUTH-07 | Link sang đăng ký | – | Bấm "Đăng ký ngay" | Sang `/register` | Đúng | Pass |
| TC-FE-AUTH-08 | Đăng ký thành công | API trả token | Nhập họ tên/email/mật khẩu, bấm Đăng ký | Gửi đủ 3 trường, đăng nhập luôn, vào `/dashboard` | Đúng | Pass |
| TC-FE-AUTH-09 | Đăng ký thất bại | API báo lỗi | Như trên | Hiện lỗi, không chuyển trang, chưa đăng nhập | Đúng | Pass |
| TC-FE-AUTH-10 | Trường bắt buộc khi đăng ký | – | Mở `/register` | Cả 3 ô đều `required` | Đúng | Pass |
| TC-FE-AUTH-11 | Chặn trang khi chưa đăng nhập | Chưa đăng nhập | Vào `/dashboard`, `/teams` | Chuyển về `/login` | Đúng | Pass |
| TC-FE-AUTH-12 | Vào trang khi đã đăng nhập | Đã đăng nhập | Vào `/teams` | Hiện trang | Đúng | Pass |
| TC-FE-AUTH-13 | Gắn token vào request | Có token | Gọi API bất kỳ | Header `Authorization: Bearer <token>` | Đúng | Pass |
| TC-FE-AUTH-14 | Không gắn header khi chưa đăng nhập | Không có token | Gọi API | Không có header `Authorization` | Đúng | Pass |
| TC-FE-AUTH-15 | Hết hạn phiên | Có token | Server trả 401 | Xoá token đã lưu | Đúng (kèm chuyển trang cứng, xem DEF-03) | Pass |

## 4. Checklist thủ công khi auth backend hoàn thành (E2E)
Chạy trên `docker compose up -d --build`, mở `http://localhost`.

| ID | Bước | Kết quả mong đợi |
|---|---|---|
| TC-E2E-01 | Đăng ký tài khoản mới qua giao diện | Vào được Dashboard, sidebar hiện tên người dùng |
| TC-E2E-02 | Đăng xuất rồi đăng nhập lại | Vào lại Dashboard |
| TC-E2E-03 | Đăng nhập sai mật khẩu | Hiện thông báo lỗi dễ hiểu, không reload trang |
| TC-E2E-04 | F5 khi đang ở Dashboard | Vẫn đăng nhập, vẫn hiện tên người dùng |
| TC-E2E-05 | Xoá token trong DevTools rồi vào `/teams` | Bị chuyển về `/login` |
| TC-AUTH-10 | Kiểm tra cột `password` trong bảng `users` | Là chuỗi BCrypt |
