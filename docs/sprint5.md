# SPRINT 5 – Vai trò, báo cáo và tính năng nâng cao

**Thời gian:** Thứ 4, 11/11/2026 → Thứ 3, 17/11/2026 | **Tương ứng:** Sprint 5 trong kế hoạch mới | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
- Hoàn thiện quyền truy cập theo vai trò và kiểm soát nhóm.
- Xuất dashboard tổng quan về chi tiêu, nợ và báo cáo theo thời gian.
- Chuẩn bị kịch bản UAT và cập nhật các tính năng nâng cao để chuyển sang giai đoạn vận hành.

## PCCV theo vai trò
| Người | Vai trò | Công việc chính | Minh chứng | Deadline |
|---|---|---|---|---|
| M0 | Quản lý / PM | Chốt scope tính năng nâng cao, theo dõi risk, review dashboard và báo cáo sprint | Sprint report, quyết định scope | 17/11 |
| M1 | Frontend 1 | Dashboard summary, biểu đồ chi tiêu, report UI, setting vai trò nhóm | Màn hình dashboard & report | 16/11 |
| M2 | Frontend 2 | Notification/reminder UI, history actions, tìm kiếm/filter/sort | UI notification + filter | 16/11 |
| M3 | Backend 1 | API dashboard summary, report theo user/group, reminder API | API report, service reminder | 16/11 |
| M4 | Backend 2 | Phân quyền theo role, tối ưu query, cache, background job nhắc nợ | RBAC, query tối ưu | 16/11 |
| M5 | QA / DevOps | UAT test plan, performance check dashboard/report, defect log | Test report, defect log | 17/11 |

## Kế hoạch công việc theo ngày
### Thứ 4, 11/11 – Planning
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| Cả nhóm | Sprint planning và chốt scope sprint 5 | Sprint backlog | 11/11, 21:00 |
| M1 | Dashboard summary UI | Dashboard sơ bộ | 12/11, 12:00 |
| M3 | API dashboard tổng quan | API summary | 12/11, 17:00 |
| M4 | RBAC cơ bản | Quyền theo vai trò | 12/11, 21:00 |

### Thứ 5, 12/11 – Báo cáo & quyền
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1 | Biểu đồ chi tiêu và report | Dashboard hoàn chỉnh | 13/11, 12:00 |
| M2 | History + notification UI | UI hoạt động cơ bản | 13/11, 12:00 |
| M3 | Report API theo tháng / nhóm | Endpoints report | 13/11, 21:00 |
| M4 | Permission enforcement | API kiểm soát quyền | 13/11, 21:00 |

### Thứ 6, 13/11 – Reminder & search
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M2 | Search/filter/sort | Tính năng tìm kiếm | 14/11, 12:00 |
| M3 | Reminder API + background job | Reminder nhắc nợ | 14/11, 17:00 |
| M5 | Performance check report | Metrics thời gian truy vấn | 14/11, 21:00 |

### Thứ 7, 14/11 – Test report
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1/M2 | Fix UI theo feedback | UI polish | 15/11, 12:00 |
| M3/M4 | Fix lỗi backend | API + permission ổn định | 15/11, 17:00 |
| M5 | Regression & defect log | Defect log cập nhật | 15/11, 21:00 |

### Chủ nhật, 15/11 – UAT chuẩn bị
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M2 | Kịch bản UAT | UAT script | 16/11, 12:00 |
| M5 | Test plan + checklist | QA checklist | 16/11, 17:00 |
| M0 | Tổng hợp scope cần chốt | Scope sprint 6 | 16/11, 21:00 |

### Thứ 2, 16/11 – Final polish
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1/M2 | Demo flow chính | Demo sprint 5 | 16/11, 17:00 |
| M3/M4 | Final fix | Nhánh stable | 16/11, 21:00 |
| M5 | Full test pass | Kết quả test cuối | 16/11, 21:00 |

### Thứ 3, 17/11 – Review & Retro
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| Cả nhóm | Sprint review + retrospective | Biên bản họp | 17/11, 21:00 |
| M0 | Chuẩn bị sprint 6 | Backlog sprint 6 | 17/11, 22:00 |

## Tiêu chí hoàn thành (DoD)
- Dashboard summary và report hiển thị đúng dữ liệu chi tiêu, dư nợ, tổng hợp theo thời gian.
- Quyền truy cập theo role hoạt động đúng cho leader/member.
- Tính năng reminder, search/filter và history cơ bản đã có.
- Có kịch bản UAT và checklist QA rõ ràng.
- Sprint 5 có demo và sprint 6 backlog đã được chốt.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| Quyền truy cập sai | M4 kiểm tra role và M5 test độc lập |
| Báo cáo chậm/không ổn định | M3 + M1 làm thống nhất contract API trước khi dựng UI |
| UAT thiếu dữ liệu thử nghiệm | M2 + M5 chuẩn bị sớm kịch bản và user sample |

## Báo cáo cuối sprint
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 6: [ ]
- Bài học từ retro: [ ]

---
