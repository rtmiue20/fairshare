# Test report Sprint 3 – CI, Auth & User flow, build đầu tiên

| Thông tin | |
|---|---|
| Người thực hiện | M5 – Khiếu Hoàng Nam Anh (QA / DevOps) |
| Công việc (theo `docs/sprint3.md`) | Chuẩn bị CI cơ bản, test case cho auth và user flow, kiểm tra build đầu tiên |
| Minh chứng | CI config (`.github/workflows/`), test case (`docs/qa/test-cases-sprint3.md`), báo cáo này |
| Ngày chạy | 02/11/2026 |
| Commit được kiểm thử | `master` @ `3b1086f` + các test mới trên nhánh `nam-anh` |
| Môi trường | Java 21, Maven 3.9, Node 20/22, MariaDB 10.11 (Testcontainers), Docker 29 |

## 1. Tóm tắt

| Hạng mục | Kết quả |
|---|---|
| Build backend (`mvn -B verify`) | ✅ BUILD SUCCESS |
| Build frontend (`tsc -b && vite build`) | ✅ Thành công |
| Lint frontend (`eslint`) | ✅ 0 lỗi, 1 cảnh báo (không thuộc auth) |
| Test backend | 26 test: **19 pass, 0 fail, 7 pending** (chờ code auth) |
| Test frontend | 17 test: **17 pass, 0 fail** |
| Docker Compose | `docker compose config` hợp lệ; build image chưa xác nhận được tại máy kiểm thử (xem mục 4) |
| Defect mới | 7 (2 High, 1 Medium, 4 Low) – xem mục 5 |

**Kết luận:** CI, test và build đã sẵn sàng. Luồng auth phía frontend hoạt động đúng với API giả lập. **Auth backend chưa được hiện thực** nên luồng đăng ký/đăng nhập thật chưa chạy được end-to-end; bộ test chấp nhận cho backend đã viết sẵn, chỉ cần bật lại khi module auth xong.

## 2. CI (GitHub Actions)

| Workflow | Kích hoạt | Nội dung | Thay đổi sprint này |
|---|---|---|---|
| `backend-ci.yml` | push mọi nhánh / PR, khi đổi `fairshare-backend/**` | `mvn -B verify` (unit + integration với MariaDB Testcontainers), upload surefire report, bảng tóm tắt pass/fail | Không đổi |
| `frontend-ci.yml` | push mọi nhánh / PR, khi đổi `frontend/**` | `npm ci` → lint → test → build | **Thêm** xuất JUnit XML (`npm run test:ci`), upload artifact `frontend-test-reports`, bảng tóm tắt trên trang Summary |
| `docker-ci.yml` | PR vào `master`/`develop`, push `master`, chạy tay | Build 3 image, `compose up`, chờ DB healthy, kiểm tra Flyway, backend và Nginx | Không đổi. Có thể bấm *Run workflow* trên nhánh `nam-anh` để kiểm tra |

## 3. Kết quả test chi tiết

### 3.1 Backend
| Lớp test | Số test | Pass | Pending | Ghi chú |
|---|---|---|---|---|
| `UserRepositoryTest` (mới) | 5 | 5 | 0 | TC-USR-01..05, MariaDB thật |
| `AuthApiTest` › ProtectedEndpoints (mới) | 8 | 8 | 0 | TC-AUTH-01..02 |
| `AuthApiTest` › AuthContract (mới) | 7 | 0 | 7 | TC-AUTH-03..09, `@Disabled` chờ DEF-01. Khi bật thử: 10/10 lần chạy fail đúng dự đoán |
| `FairShareApplicationTests` (có sẵn) | 1 | 1 | 0 | Context + toàn bộ Flyway migration chạy được |
| `AuthTest`, `ScoringEngineTest`, `PdfReportServiceTest`, `TrelloClientTest`, `AnonymityAggregatorTest` (có sẵn) | 5 | 5 | 0 | **Placeholder `assertTrue(true)`**, không kiểm tra gì (DEF-07) |
| **Tổng** | **26** | **19** | **7** | |

Số test backend có giá trị kiểm thử thật: **14** (13 mới + `contextLoads`).

### 3.2 Frontend
| File | Số test | Pass |
|---|---|---|
| `tests/auth/authStore.test.ts` | 3 | 3 |
| `tests/auth/LoginPage.test.tsx` | 4 | 4 |
| `tests/auth/RegisterPage.test.tsx` | 3 | 3 |
| `tests/auth/ProtectedRoute.test.tsx` | 3 | 3 |
| `tests/auth/apiClient.test.ts` | 3 | 3 |
| `tests/ContributionDashboard.test.tsx` (có sẵn) | 1 | 1 |
| **Tổng** | **17** | **17** |

## 4. Kiểm tra build đầu tiên

| Bước | Lệnh | Kết quả |
|---|---|---|
| Backend | `mvn -B -ntp verify` | ✅ BUILD SUCCESS (gồm khởi động MariaDB bằng Testcontainers) |
| Frontend | `npm ci && npm run lint && npm run test:ci && npm run build` | ✅ Thành công. Vite cảnh báo bundle > 500 kB (gợi ý code-split, không chặn) |
| Compose | `docker compose config --quiet` | ✅ Hợp lệ |
| Compose | `docker compose build` | ⚠️ Không xác nhận được: máy kiểm thử bị Docker Hub giới hạn lượt tải (HTTP 429) khi kéo `nginx:alpine` và `eclipse-temurin:21-jre-alpine`. Đây là giới hạn môi trường, không phải lỗi Dockerfile. Cần xác nhận lại bằng `docker-ci.yml` (Run workflow) hoặc chạy trên máy cá nhân |

## 5. Defect log

| ID | Mức độ | Mô tả | Bằng chứng | Đề xuất | Giao cho | Trạng thái |
|---|---|---|---|---|---|---|
| DEF-01 | High | Module auth backend chưa hiện thực: `AuthController`, `AuthService`, `JwtService`, `JwtAuthenticationFilter`, `SecurityConfig`, `UserService`, `UserController` đều là class rỗng. Mọi request (kể cả `/api/auth/login`) bị Spring Security mặc định trả 401 → frontend không đăng ký/đăng nhập được | TC-AUTH-03..09 fail khi bật | Hiện thực auth, cho phép `/api/auth/**`, rồi xoá `@Disabled` trong `AuthApiTest` | Người làm API auth (M3 theo `sprint3.md`) | Open |
| DEF-02 | High | Lệch hợp đồng API: `AuthResponse` backend chỉ có `accessToken`, `tokenType`; frontend (`auth.api.ts`) đọc `data.user` và mong response bọc trong `ApiResponse`. Nếu giữ nguyên, `useAuth` sẽ lưu `user = undefined` | So sánh `AuthResponse.java` với `AuthResponseData` | Thêm `user` (id, email, fullName) vào `AuthResponse` và bọc `ApiResponse<AuthResponse>` | Backend auth + Frontend 1 | Open |
| DEF-03 | Medium | Khi đăng nhập sai mật khẩu, server trả 401 → interceptor `client.ts` xoá token và `window.location.href = '/login'` (reload cứng) → thông báo lỗi trên trang đăng nhập bị mất. Ngoài ra `useAuth` hiển thị `err.message` của axios ("Request failed with status code 401") thay vì thông báo của server | TC-FE-AUTH-15; đọc code `client.ts`, `useAuth.ts` | Bỏ qua redirect cho request `/auth/*`; lấy `error.response.data.message` để hiển thị | Frontend 1 | Open |
| DEF-04 | Low | Nhãn "Email", "Mật khẩu", "Họ và tên" trên form đăng nhập/đăng ký không gắn với ô nhập (thiếu `htmlFor`/`id`) → trình đọc màn hình không đọc được, bấm vào nhãn không focus ô | Test phải chọn input theo `type` | Thêm `id` cho input và `htmlFor` cho label | Frontend 1 | Open |
| DEF-05 | Low | `authStore` chỉ lưu token. Sau khi F5, `isAuthenticated = true` nhưng `user = null` → header/sidebar mất thông tin người dùng | Đọc code `authStore.ts` | Lưu thêm user hoặc gọi `GET /api/users/me` khi khởi động | Frontend 1 + Backend auth | Open |
| DEF-06 | Low | `RegisterRequest`/`LoginRequest` chưa có ràng buộc `@Email`, `@NotBlank` (dù đã có `spring-boot-starter-validation`) → TC-AUTH-05 sẽ fail | Đọc code DTO | Thêm annotation + `@Valid` ở controller | Backend auth | Open |
| DEF-07 | Low | 5 test có sẵn là placeholder `assertTrue(true)` (`AuthTest`, `ScoringEngineTest`, `PdfReportServiceTest`, `TrelloClientTest`, `AnonymityAggregatorTest`), làm số test "pass" trên CI cao hơn thực tế | Đọc code test | Thay bằng test thật khi module tương ứng có logic; đến lúc đó nên gắn `@Disabled` để báo cáo trung thực | Chủ từng module | Open |

**Ghi chú khác (không tính defect):** ESLint cảnh báo `react-hooks/exhaustive-deps` ở `TeamDetailPage.tsx:30`; React Router in cảnh báo future flag v7 khi chạy test.

## 6. Việc tiếp theo của M5
1. Khi DEF-01 đóng: xoá `@Disabled` trong `AuthApiTest`, chạy lại CI, cập nhật trạng thái TC-AUTH-03..09 trong `test-cases-sprint3.md`.
2. Chạy checklist E2E (mục 4 của file test case) trên `docker compose up`.
3. Chạy `docker-ci.yml` để xác nhận build image.
4. Chuyển các defect trên vào Defect Log chung của nhóm.
