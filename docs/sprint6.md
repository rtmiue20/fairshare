# SPRINT 6 – Bảo mật, hiệu năng, vận hành và triển khai

**Thời gian:** Thứ 4, 18/11/2026 → Thứ 3, 24/11/2026 | **Tương ứng:** Sprint 6 trong kế hoạch mới | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
- Nâng cấp hệ thống về bảo mật, hiệu năng và vận hành để sẵn sàng cho UAT và demo prod/staging.
- Hoàn thiện các lỗi còn tồn đọng, khóa phạm vi và chuẩn bị release candidate.
- Chạy UAT với người dùng thực, tổng hợp phản hồi và chốt release.

## PCCV theo vai trò
| Người | Vai trò | Công việc chính | Minh chứng | Deadline |
|---|---|---|---|---|
| M0 | Quản lý / PM | Khóa phạm vi, quản lý defect log, review release checklist, báo cáo sprint | Release checklist, report | 24/11 |
| M1 | Frontend 1 | Settings tài khoản, sửa lỗi UI từ UAT, cải thiện màn hình chính theo feedback | UI fixes, demo | 23/11 |
| M2 | Frontend 2 | Tìm kiếm/filter/sort, mobile UX, hỗ trợ onboarding/UAT | UX fixes, UAT guide | 23/11 |
| M3 | Backend 1 | Fix lỗi nghiệp vụ và bảo mật, audit log, kiểm tra quyền truy cập API | Commit, security test | 23/11 |
| M4 | Backend 2 | Backup DB, caching, performance tuning, monitoring task, tối ưu query | Logs, benchmark | 23/11 |
| M5 | QA / DevOps | Chuẩn bị staging/prod, chạy UAT, triễn khai demo, monitoring, user guide | Release URL/video, UAT report | 23/11 |

## Kế hoạch công việc theo ngày
### Thứ 4, 18/11 – Planning & chuẩn bị UAT
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| Cả nhóm | Sprint planning và phân lỗi theo module | Sprint backlog | 18/11, 21:00 |
| M5 | Chuẩn bị staging / demo env | Bản demo chạy được | 19/11, 12:00 |
| M2 | Gửi lời mời UAT | Danh sách người thử | 19/11, 12:00 |
| M3/M4 | Fix lỗi ưu tiên cao | Bug fix blockers | 19/11, 21:00 |

### Thứ 5, 19/11 – Bắt đầu UAT
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M2 | Hướng dẫn người thử và thu feedback | Số phiếu UAT | 19/11, 21:00 |
| M5 | Ghi defect log từ UAT | Defect log cập nhật | 19/11, 21:00 |
| M0 | Theo dõi risk và tiến độ | Risk tracker | 19/11, 21:00 |

### Thứ 6, 20/11 – Sửa lỗi lượt 1
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1/M2 | Fix lỗi UI | Commit fix UI | 20/11, 21:00 |
| M3/M4 | Fix lỗi backend/performance | Commit fix backend | 21/11, 12:00 |
| M5 | Cấu hình demo và tài khoản demo | Demo environment ready | 21/11, 12:00 |

### Thứ 7, 21/11 – Hướng dẫn & tài liệu
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M5 | User guide | Hướng dẫn sử dụng | 22/11, 12:00 |
| M2 | Tiếp tục UAT | Feedback từ người thử | 22/11, 12:00 |
| M1 | Sửa lỗi từ feedback | UI stable | 22/11, 21:00 |

### Chủ nhật, 22/11 – Kết thúc UAT
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M2 | Tổng hợp UAT | Kết quả UAT cuối | 22/11, 17:00 |
| M5 | Video demo dự phòng | Video demo | 22/11, 21:00 |
| M0 | Đánh giá mức độ hoàn thành | Release readiness | 22/11, 21:00 |

### Thứ 2, 23/11 – Khóa phạm vi
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M0 | Khóa phạm vi, thông báo change request | Thông báo khóa scope | 23/11, 12:00 |
| M1/M2/M3/M4 | Fix lỗi còn lại | Defect close | 23/11, 21:00 |
| M5 | Release final | Release candidate ready | 23/11, 21:00 |

### Thứ 3, 24/11 – Review & Retro
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| Cả nhóm | Sprint review + retrospective | Biên bản họp | 24/11, 21:00 |
| M0 | Chuẩn bị sprint 7 | Backlog sprint 7 | 24/11, 22:00 |

## Tiêu chí hoàn thành (DoD)
- Có tối thiểu 10 phiếu phản hồi UAT đã được tổng hợp.
- Defect nghiêm trọng đã được sửa hoặc từ chối với lý do rõ ràng.
- Bản demo/staging hoặc video demo chạy được và có user guide.
- Hệ thống đã được rà soát về bảo mật, hiệu năng và monitoring cơ bản.
- Tất cả thay đổi sau khóa phạm vi phải qua Change Request.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| UAT không đủ feedback | M2 bắt đầu nhắc sớm và có phương án dự phòng |
| Lỗi nghiêm trọng phát hiện muộn | M5 phân loại lỗi ngay và M3/M4 sửa trong 24h |
| Demo bị lỗi | M5 chuẩn bị video demo thay thế |

## Báo cáo cuối sprint
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 7: [ ]
- Bài học từ retro: [ ]

---
