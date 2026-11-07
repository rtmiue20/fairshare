# SPRINT 4 – Bảng đóng góp và board/card hoàn thiện

**Thời gian:** Thứ 4, 04/11/2026 → Thứ 3, 10/11/2026 | **Tương ứng:** Sprint 4 trong kế hoạch 7 sprint (Sprint 2 trong kế hoạch gốc) | **Trạng thái sprint:** 🔄 Đang thực hiện

> **Căn cứ CR-02:** board/card là module nội bộ (không còn Trello API). Sprint 3 chỉ làm khung; Sprint 4 làm phần nâng cao (kéo thả, chi tiết card, log chống gian lận). Dữ liệu tổng hợp đóng góp từ nay lấy từ `ActivityEvent` nguồn `BOARD`.

## Mục tiêu sprint
- Hoàn thiện bảng đóng góp: tổng hợp theo người/sprint, truy vết đến sự kiện gốc, dashboard, bảng bằng chứng, khai báo thủ công có xác nhận.
- Hoàn thiện board/card (kéo thả, chi tiết card, story point, hạn) và ghi `ActivityEvent` đầy đủ (`CARD_CREATED`, `CARD_MOVED`, `CARD_COMPLETED` kèm `delay_days`, `is_on_time`), có log không sửa được để chống gian lận.
- Có API và form chấm chéo, môi trường staging, defect log đầu tiên.
- Quyết định tính năng có điều kiện (cảnh báo sớm, Google Docs) bằng Change Request.

## Lịch sinh hoạt
| Sự kiện | Thời điểm |
|---|---|
| Sprint Planning | Thứ 4, 04/11 |
| Daily | Hằng ngày |
| Họp quyết định tính năng có điều kiện (CR) | Thứ 2, 09/11 |
| Sprint Review + Retrospective | Thứ 3, 10/11 |

## Phân công công việc (lát cắt dọc)
| Người | Công việc | Sản phẩm/minh chứng | Deadline | Trạng thái |
|---|---|---|---|---|
| M3 | Đóng góp & Dashboard: routine tổng hợp đóng góp, API truy vết đến sự kiện gốc, dashboard biểu đồ, bảng bằng chứng, bộ lọc theo sprint/người, khai báo thủ công có xác nhận | Commit, API doc, demo | 09/11 | ⬜ |
| M1 | Board/card hoàn thiện: chi tiết card (người phụ trách, story point, hạn), giao diện kéo thả, ghi sự kiện hoàn thành/đúng hạn, log hoạt động không sửa được | Commit, test, demo | 08/11 | ⬜ |
| M2 | Nhóm hoàn thiện + BA: quản lý thành viên/sprint; kiểm tra công thức với dữ liệu thật của nhóm (có đồng ý), thu thập phản hồi | Báo cáo kiểm tra công thức, CR-03 | 09/11 | ✅ Hoàn thành |
| M4 | Chấm chéo: API mở/đóng đợt, nhận đánh giá; form chấm chéo | Commit, demo | 09/11 | ⬜ |
| M5 | Tích hợp: test các module, ghi defect, môi trường staging | Integration log, defect log | 09/11 | ⬜ |
| M0 | Rà việc tồn đọng Sprint 3, cập nhật Gantt thực tế, **quyết định tính năng có điều kiện** (CR), báo cáo tuần | Sprint report, CR | 10/11 | ⬜ |

## Tiêu chí hoàn thành (DoD)
- Dashboard hiển thị đóng góp theo sprint/người; bấm vào một chỉ số mở được danh sách sự kiện gốc.
- Kéo thả card giữa cột hoạt động và sinh `ActivityEvent` nguồn `BOARD` đúng loại; card vào cột hoàn thành có `CARD_COMPLETED`, `delay_days` và `is_on_time` đúng theo hạn chót.
- Không có API sửa/xóa `ActivityEvent`; xóa card không làm mất sự kiện đã ghi.
- Form chấm chéo gửi được đánh giá và lưu vào DB.
- Staging chạy được, defect log có mục đầu tiên và người xử lý.
- Quyết định về cảnh báo sớm, Google Docs được ghi vào Change Log.

## Rủi ro theo dõi
| Rủi ro | Biện pháp |
|---|---|
| R02: phụ thuộc API ngoài | Đã loại bỏ nhờ CR-02 (board nội bộ); chỉ còn theo dõi Google Docs (có điều kiện) |
| R19: M1 quá tải với giao diện kéo thả | Dùng thư viện kéo thả có sẵn, cắt bớt tính năng card nâng cao nếu trễ |
| R06: công thức bị cho là thiếu công bằng | M2 + M3 chỉnh theo dữ liệu thật, ghi vào báo cáo kiểm tra công thức |
| R05: gian lận dữ liệu (tạo/chia nhỏ card giả) | Log hoạt động không sửa được, trọng số theo story point, cho phép phản đối |
| Việc tồn đọng từ Sprint 3 | M0 liệt kê ngày 04/11, ưu tiên xử lý trước việc mới |

## Báo cáo cuối sprint (điền khi họp Review)
- Việc hoàn thành: [ ]
- Việc tồn đọng chuyển sang Sprint 5: [ ]
- Bài học từ Retro: [ ]

---

## Chi tiết lịch của sprint (theo ngày)

> Giờ họp/deadline là gợi ý, nhóm chỉnh theo lịch học. Mọi task ≤ 2 giờ; việc lớn hơn đã tách thành các task con (1/2, 2/2…), mỗi task con có đầu ra riêng.

### Thứ 4, 04/11 – Planning
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| Cả nhóm | Sprint Planning | Rà việc tồn đọng Sprint 3, chia việc Sprint 4 | Sprint backlog | 1h | 04/11, 21:00 |
| M3 | Routine tổng hợp (1/2) | Viết routine tổng hợp đóng góp theo người/sprint trong migration | Migration chứa routine | 2h | 05/11, 12:00 |
| M1 | Chi tiết card | API cập nhật người phụ trách, story point, hạn | Endpoint + validation | 2h | 05/11, 12:00 |
| M4 | API đợt chấm (1/2) | API mở/đóng đợt chấm chéo | Endpoint + validation | 2h | 05/11, 21:00 |
| M2 | Quản lý thành viên | API xóa/đổi vai trò thành viên | Endpoint + validation | 2h | 05/11, 21:00 |

### Thứ 5, 05/11 – API tổng hợp
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M3 | Routine tổng hợp (2/2) | Gọi routine từ backend, API tổng hợp đóng góp | API summary + test | 2h | 06/11, 12:00 |
| M1 | Kanban UI (1/3) | Hiển thị board, cột, card từ API | Màn hình board | 2h | 06/11, 12:00 |
| M4 | API đợt chấm (2/2) | API nhận đánh giá, kiểm tra hợp lệ | Endpoint + validation | 2h | 06/11, 21:00 |
| M2 | Màn hình thành viên/sprint | Đổi vai trò, danh sách sprint | Màn hình dùng được | 2h | 06/11, 21:00 |

### Thứ 6, 06/11 – Truy vết & kéo thả
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M3 | Truy vết (1/2) | Routine trả danh sách sự kiện gốc của một chỉ số | Routine + test | 2h | 07/11, 12:00 |
| M3 | Truy vết (2/2) | API truy vết | Endpoint + test | 2h | 07/11, 17:00 |
| M1 | Kanban UI (2/3) | Kéo thả card giữa cột | Kéo thả hoạt động | 2h | 07/11, 12:00 |
| M1 | Kanban UI (3/3) | Màn hình chi tiết card | Màn hình chi tiết card | 2h | 07/11, 17:00 |
| M4 | Form chấm chéo (1/2) | Màn hình nhập điểm theo tiêu chí | Màn hình form | 2h | 07/11, 21:00 |
| M5 | Staging (1/2) | Docker Compose cho backend, frontend, MariaDB trên staging | Staging chạy thử | 2h | 07/11, 21:00 |

### Thứ 7, 07/11 – Dashboard & sự kiện
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M3 | Dashboard (1/2) | Biểu đồ tỷ lệ đóng góp | Biểu đồ | 2h | 08/11, 12:00 |
| M3 | Dashboard (2/2) | Bộ lọc theo sprint/người | Dashboard có bộ lọc | 2h | 08/11, 17:00 |
| M1 | Sự kiện hoạt động | Sinh sự kiện hoàn thành/đúng hạn; log không sửa được | Commit + test | 2h | 08/11, 17:00 |
| M4 | Form chấm chéo (2/2) | Kiểm tra hợp lệ, gửi đánh giá | Form hoàn chỉnh | 2h | 08/11, 17:00 |
| M5 | Staging (2/2) + test tích hợp | Hoàn thiện staging, chạy test tích hợp các module đã merge | Staging, integration log | 2h | 08/11, 21:00 |
| M2 | Kiểm tra công thức (1/2) | Chạy công thức với dữ liệu thật của nhóm (đã có đồng ý) | Bảng kết quả nháp | 2h | 08/11, 21:00 |

### Chủ nhật, 08/11 – Bằng chứng & khai báo thủ công
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M3 | Bảng bằng chứng | Bảng sự kiện gốc, bấm từ dashboard | Màn hình bằng chứng | 2h | 09/11, 12:00 |
| M3 | Khai báo thủ công (1/2) | API khai báo và xác nhận bởi người khác | Endpoint + test | 2h | 09/11, 17:00 |
| M3 | Khai báo thủ công (2/2) | Màn hình khai báo/xác nhận | Màn hình dùng được | 2h | 09/11, 21:00 |
| M1 | Sửa lỗi board | Xử lý lỗi từ staging/test tích hợp | Commit | 2h | 08/11, 21:00 |
| M2 | Thu phản hồi công thức | Thu phản hồi của thành viên về công thức | Bản nháp phản hồi | 2h | 09/11, 12:00 |

### Thứ 2, 09/11 – Chốt tính năng có điều kiện
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M2 | Báo cáo kiểm tra công thức | Hoàn thiện báo cáo, đề xuất chỉnh công thức | Báo cáo kiểm tra công thức | 2h | 09/11, 17:00 |
| M4 | Hoàn tất chấm chéo | Demo form + API, PR vào `develop` | PR merge, demo | 1h | 09/11, 17:00 |
| M5 | Defect log | Phân loại lỗi, giao người xử lý | Defect log | 2h | 09/11, 17:00 |
| Cả nhóm | Họp CR | Quyết định cảnh báo sớm (rule-based) và Google Docs: giữ hay cắt | CR, Change Log | 1h | 09/11, 21:00 |

### Thứ 3, 10/11 – Review & Retro
| Người | Việc | Nội dung thực hiện | Đầu ra | Thời lượng | Hạn |
|---|---|---|---|---|---|
| M0 | Cập nhật Gantt, báo cáo tuần 4 | Gantt thực tế, burndown, Risk | Sprint report, Gantt | 2h | 10/11, 12:00 |
| Cả nhóm | Sprint Review + Retro | Demo dashboard, board kéo thả, form chấm chéo, staging | Biên bản họp | 1h | 10/11, 21:00 |
| M0 | Chuẩn bị Sprint 5 | Chọn việc Sprint 5 theo CR vừa chốt | Sprint 5 backlog | 1h | 10/11, 22:00 |
