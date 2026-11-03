# SPRINT 4 – Tạo khoản chi, chia tiền và thanh toán

**Thời gian:** Thứ 4, 04/11/2026 → Thứ 3, 10/11/2026 | **Tương ứng:** Sprint 4 trong kế hoạch mới | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
- Hoàn thành flow chính tạo khoản chi, chia tiền, và tổng hợp số dư giữa các thành viên.
- Làm rõ logic split: equal/custom/percent.
- Xây dựng màn hình chi tiết khoản chi và lịch sử thanh toán theo nhóm.

## PCCV theo vai trò
| Người | Vai trò | Công việc chính | Minh chứng | Deadline |
|---|---|---|---|---|
| M0 | Quản lý / PM | Chốt business rules split, ưu tiên các phương thức tính tiền, theo dõi rủi ro | Sprint report, quyết định business rule | 10/11 |
| M1 | Frontend 1 | Màn hình tạo expense, form nhập tiền, chọn người tham gia, preview split | UI + validation | 09/11 |
| M2 | Frontend 2 | Màn hình chi tiết expense, list lịch sử chi tiêu, trạng thái đã thanh toán/chưa thanh toán | UI màn hình thực tế | 09/11 |
| M3 | Backend 1 | API create/update/delete expense, API split logic, validation nghiệp vụ | API + test script | 09/11 |
| M4 | Backend 2 | Tính balance/debt/settlement, service gợi ý thanh toán, tối ưu database query | Service + report | 09/11 |
| M5 | QA / DevOps | Kiểm thử edge case, test logic split, chạy regression, quản lý defect log | Test results, defect log | 10/11 |

## Kế hoạch công việc theo ngày
### Thứ 4, 04/11 – Planning
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| Cả nhóm | Sprint planning và chốt business rules | Sprint backlog | 04/11, 21:00 |
| M1 | Form tạo khoản chi | Form UI đầu tiên | 05/11, 12:00 |
| M3 | API expense cơ bản | Create/update/delete expense | 05/11, 17:00 |
| M4 | Model balance/debt | Logic dữ liệu balance | 05/11, 21:00 |

### Thứ 5, 05/11 – Split logic
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1 | Preview split UI | Tính trước tiền chia | 06/11, 12:00 |
| M2 | Màn hình danh sách chi tiêu | List expense | 06/11, 12:00 |
| M3 | Split method equal/custom/percent | Logic split chính xác | 06/11, 21:00 |
| M4 | Settlement recommendation | Gợi ý thanh toán | 06/11, 21:00 |

### Thứ 6, 06/11 – Dashboard chi tiêu
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1 | Validation form và error state | Form có xử lý lỗi | 07/11, 12:00 |
| M2 | Detail screen | Màn hình chi tiết expense | 07/11, 12:00 |
| M3 | API history và group expense | Expense history API | 07/11, 21:00 |
| M4 | Report tổng hợp theo nhóm | Dashboard summary | 07/11, 21:00 |

### Thứ 7, 07/11 – Kiểm thử logic chi tiêu
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M5 | Test split logic | Test cases cho equal/custom/percent | 08/11, 12:00 |
| M1/M2 | Fix giao diện | UI hoàn thiện | 08/11, 17:00 |
| M3/M4 | Sửa lỗi logic | API ổn định | 08/11, 21:00 |

### Chủ nhật, 08/11 – Bảng bằng chứng và thanh toán
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M2 | Màn hình lịch sử thanh toán | History + trạng thái | 09/11, 12:00 |
| M4 | Tính toán số dư real-time | Balance chính xác | 09/11, 17:00 |
| M5 | Regression test | Kết quả test | 09/11, 21:00 |

### Thứ 2, 09/11 – Chốt flow
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1/M2 | Demo flow tạo chi tiêu | Demo sprint 4 | 09/11, 17:00 |
| M3/M4 | Review và final fix | API cuối | 09/11, 21:00 |
| M0 | Review sprint, chốt sprint 5 | Backlog sprint 5 | 10/11, 12:00 |

### Thứ 3, 10/11 – Review & Retro
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| Cả nhóm | Sprint review + retrospective | Biên bản họp | 10/11, 21:00 |
| M5 | Defect log cuối | Defect log đã cập nhật | 10/11, 21:00 |

## Tiêu chí hoàn thành (DoD)
- User có thể tạo chi tiêu, chọn thành viên, chọn phương thức chia tiền.
- Tổng số dư và đề xuất thanh toán tính đúng với dữ liệu thử nghiệm.
- UI hiển thị lịch sử chi tiêu và trạng thái thanh toán rõ ràng.
- API và UI đã chạy trên cùng dữ liệu test.
- Sprint 4 có demo tính năng core chính và backlog sprint 5 rõ.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| Logic chia tiền sai | M3 + M4 test nhiều trường hợp: equal/custom/percent |
| Tính balance không đồng bộ | M4 kiểm tra dữ liệu lịch sử và cập nhật số dư |
| UI phức tạp | M1/M2 cắt scope theo priority và demo từng flow |

## Báo cáo cuối sprint
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 5: [ ]
- Bài học từ retro: [ ]

---
