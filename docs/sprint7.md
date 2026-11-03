# SPRINT 7 – UAT cuối, hardening và đóng dự án

**Thời gian:** Thứ 4, 25/11/2026 → Thứ 3, 01/12/2026 | **Tương ứng:** Sprint 7 trong kế hoạch mới | **Trạng thái sprint:** ⬜ Chưa bắt đầu

## Mục tiêu sprint
- Hoàn tất hardening cuối cùng, kiểm tra chất lượng và sẵn sàng release.
- Đóng gói báo cáo cuối, minh chứng kỹ thuật, demo final và báo cáo cá nhân.
- Thực hiện retrospective cuối cùng và nộp các tài liệu cần thiết cho buổi đánh giá cuối.

## PCCV theo vai trò
| Người | Vai trò | Công việc chính | Minh chứng | Deadline |
|---|---|---|---|---|
| M0 | Quản lý / PM | Tổng hợp báo cáo cuối, đánh giá G1–G6, lessons learned, kiểm tra link/định dạng, closure checklist | Final report, checklist | 30/11 |
| M1 | Frontend 1 | Fix UI cuối từ UAT, hỗ trợ demo, chốt flow chính | Demo + fix UI | 30/11 |
| M2 | Frontend 2 | Hoàn thiện UX, onboarding, màn hình phụ, kiểm tra cross-browser/mobile | Checklist UX | 30/11 |
| M3 | Backend 1 | Fix bug nghiệp vụ cuối, kiểm tra API response, tối ưu lại logic chính | Final API log | 30/11 |
| M4 | Backend 2 | Data cleanup, migration cuối, performance final tuning, monitoring/caching | Final benchmark | 30/11 |
| M5 | QA / DevOps | Full regression, release candidate, demo final, deploy/monitoring, video backup | Release notes, test log | 30/11 |

## Kế hoạch công việc theo ngày
### Thứ 4, 25/11 – Planning & bắt đầu viết
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| Cả nhóm | Sprint planning và chốt mục tiêu final | Sprint backlog | 25/11, 21:00 |
| M0 | Tạo khung báo cáo cuối | File outline báo cáo | 26/11, 12:00 |
| M1/M3 | Chốt flow kỹ thuật chính | Demo script | 26/11, 21:00 |

### Thứ 5, 26/11 – Viết chương và demo
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M1 | Kiến trúc & giao diện | Phần trình bày kỹ thuật | 27/11, 12:00 |
| M2 | Kết quả khảo sát/UAT & trải nghiệm người dùng | Phần UX/UAT | 27/11, 12:00 |
| M3 | API / logic nghiệp vụ | Phần backend | 27/11, 17:00 |
| M4 | DB / hiệu năng / dữ liệu | Phần dữ liệu/performance | 27/11, 17:00 |
| M5 | Test plan + demo final | Kết quả test/demo | 27/11, 21:00 |

### Thứ 6, 27/11 – Hạn nộp nội dung chương
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M0–M5 | Nộp nội dung chương và minh chứng | Các file phần của từng người | 27/11, 21:00 |
| Cả nhóm | Viết Mini-PM Report cá nhân | Bản nháp cá nhân | 28/11, 12:00 |

### Thứ 7, 28/11 – Tổng hợp
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M0 | Ghép báo cáo cuối | Final report bản 1 | 28/11, 21:00 |
| M0 | Kiểm tra định dạng và link | Checklist fix format | 29/11, 12:00 |
| Cả nhóm | Hoàn thiện Mini-PM Report | Mini-PM Report bản 1 | 29/11, 21:00 |

### Chủ nhật, 29/11 – Kiểm tra & slide
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M0 | Kiểm tra đạo văn và link | Kết quả kiểm tra | 29/11, 21:00 |
| M5 | Chuẩn bị slide, video demo, backup | Slide final | 29/11, 21:00 |
| Cả nhóm | Bảng mức độ tham gia | Bảng tự đánh giá & nhóm đánh giá | 29/11, 21:00 |

### Thứ 2, 30/11 – Chốt release
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| M0 | Chốt báo cáo cuối | Final report | 30/11, 17:00 |
| M5 | Release candidate cuối | Release final | 30/11, 17:00 |
| Cả nhóm | Nộp Mini-PM Report | Bản nộp cuối | 30/11, 17:00 |
| Cả nhóm | Tập thuyết trình | Kịch bản và timing | 30/11, 21:00 |

### Thứ 3, 01/12 – Đóng dự án
| Người | Việc | Đầu ra | Hạn |
|---|---|---|---|
| Cả nhóm | Kiểm tra lần cuối source code + test logs | Checklist xác nhận | 01/12, 12:00 |
| Cả nhóm | Họp đóng dự án + retrospective cuối | Biên bản đóng dự án | 01/12, 21:00 |

## Tiêu chí hoàn thành (DoD)
- Final report, Mini-PM Report và slide đã hoàn thiện đúng định dạng.
- Demo final chạy ổn định, có backup video nếu cần.
- Tất cả lỗi nghiêm trọng đã được xử lý hoặc ghi rõ lý do từ chối.
- Mỗi thành viên có minh chứng đóng góp rõ ràng trong module của mình.
- Sprint 7 kết thúc với biên bản closure và lessons learned rõ ràng.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| Nộp chậm nội dung | M0 nhắc từ đầu sprint, có deadline nội bộ trước 27/11 |
| Link/hình ảnh lỗi | M0 kiểm tra bằng tài khoản khác và chuẩn bị bản backup |
| Demo lỗi | M5 chuẩn bị video dự phòng và kịch bản hiện trường |

## Báo cáo cuối dự án
- Kết quả so với mục tiêu: [ ]
- Bài học kinh nghiệm: [ ]
- Đề xuất cải thiện: [ ]

---
