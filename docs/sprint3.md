# SPRINT 3 – Nền tảng và cơ chế nghiệp vụ cơ bản

**Thời gian:** Thứ 4, 28/10/2026 → Thứ 3, 03/11/2026  | **Tương ứng:** Sprint 3 trong kế hoạch mới | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
- Hoàn thiện nền tảng ứng dụng: layout chung, routing, trạng thái đăng nhập, xử lý lỗi.
- Xây dựng cơ chế người dùng, nhóm và dữ liệu cơ sở cho FairShare.
- Bắt đầu các flow chính để các sprint sau xây tiếp mà không bị chậm vì nền tảng.

## PCCV theo vai trò
| Người | Vai trò | Công việc chính | Minh chứng | Deadline |
|---|---|---|---|---|
| M0 | Quản lý / PM | Chốt backlog sprint 3, xác nhận acceptance criteria, theo dõi tiến độ, demo đầu sprint và review cuối sprint | Backlog sprint, biên bản họp, sprint report | 03/11 |
| M1 | Frontend 1 | Làm màn hình đăng nhập, đăng ký, layout dashboard, header/sidebar, routing cơ bản | GitHub PR, màn hình chạy được | 02/11 |
| M2 | Frontend 2 | Làm UI profile/settings, màn hình nhóm, màn hình danh sách thành viên, tích hợp API sơ bộ | Màn hình demo, API mock/real tích hợp | 02/11 |
| M3 | Backend 1 | Xây dựng API auth: register/login/logout, JWT, phân quyền cơ bản, xác thực session | API, Postman collection, unit test | 02/11 |
| M4 | Backend 2 | Thiết kế DB: user, group, member, expense, split; migration, repository, entity và service cơ bản | Migration, ERD, repository code | 02/11 |
| M5 | QA / DevOps | Chuẩn bị CI cơ bản, test case cho auth và user flow, kiểm tra build đầu tiên | CI config, test report | 02/11 |

## Kế hoạch công việc theo ngày
### Thứ 4, 28/10 – Planning & dựng nền tảng
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| Cả nhóm | Sprint planning và chốt backlog | Backlog sprint 3 | 28/10, 21:00 |
| M1 | Layout và routing | Layout chung, route mặc định | 29/10, 12:00 |
| M3 | Auth API khung | Login/register API skeleton | 29/10, 12:00 |
| M4 | Schema DB khởi tạo | Migration cơ sở dữ liệu | 29/10, 12:00 |
| M5 | Setup CI và test env | CI nhánh dev chạy build | 29/10, 21:00 |

### Thứ 5, 29/10 – Tích hợp và cấu trúc dữ liệu
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1 | Màn hình login/sign up | UI đăng nhập/đăng ký | 30/10, 12:00 |
| M2 | Profile/settings UI | Form tài khoản | 30/10, 12:00 |
| M3 | JWT + authorize | Token và kiểm tra quyền | 30/10, 17:00 |
| M4 | Group/member model | Entity group + member | 30/10, 17:00 |
| M5 | Test case auth | Test case auth | 30/10, 21:00 |

### Thứ 6, 30/10 – Mốc nền tảng
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1 | Dashboard chính | Dashboard cơ bản | 31/10, 12:00 |
| M2 | Màn hình quản lý nhóm | UI group list/detail | 31/10, 12:00 |
| M3 | API user info + session | API profile/session | 31/10, 17:00 |
| M4 | Service group + member | CRUD nhóm và thành viên | 31/10, 17:00 |
| M5 | Regression check auth | Test đầu tiên | 31/10, 21:00 |

### Thứ 7, 31/10 – Kết nối đầu sprint
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1 | Kết nối UI với auth API | Login/register hoạt động | 01/11, 12:00 |
| M2 | Demo nhóm + settings | Flow group chạy | 01/11, 12:00 |
| M3 | Fix lỗi auth | Auth ổn định | 01/11, 17:00 |
| M4 | Test DB và migration | Migration chạy sạch | 01/11, 21:00 |
| M5 | QA cho user flow | Checklist sprint 3 | 01/11, 21:00 |

### Chủ nhật, 01/11 – Chuẩn bị demo
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M0 | Tổng hợp tiến độ | Sprint report nháp | 02/11, 12:00 |
| M1/M2 | Dọn UI / polish | UI nền tảng đẹp hơn | 02/11, 17:00 |
| M3/M4 | Review API và DB | Chốt base flow | 02/11, 17:00 |
| M5 | Test full flow | Test log | 02/11, 21:00 |

### Thứ 2, 02/11 – Review và chốt
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| Cả nhóm | Sprint review | Biên bản sprint 3 | 02/11, 21:00 |
| M0 | Chuẩn bị sprint 4 | Backlog sprint 4 | 03/11, 12:00 |

## Tiêu chí hoàn thành (DoD)
- Người dùng có thể đăng nhập/đăng ký và duy trì session.
- Có CRUD nhóm và thành viên cơ bản trên API và UI.
- Dữ liệu của user/group/member/expense đã có schema rõ ràng.
- CI chạy build/test cơ bản thành công.
- Sprint 3 đã có demo và backlog sprint 4 rõ ràng.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| Auth/permission chậm | M3 + M1 làm song song, M0 hỗ trợ quyết định scope |
| UI không kịp với API | M1 và M2 gắn API sớm hơn chuẩn bị demo |
| DB schema thay đổi nhiều | M4 giữ migration vững và cập nhật chung trước khi merge |

## Báo cáo cuối sprint
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 4: [ ]
- Bài học từ retro: [ ]

---
