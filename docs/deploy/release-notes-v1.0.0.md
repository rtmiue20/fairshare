# FairShare v1.0.0 – Release notes

**Trạng thái:** ứng viên release, cập nhật 24/11/2026 22:00 (GMT+7). Đã chạy lại toàn bộ kiểm thử trên `master` @ `677a9be` (`docs/qa/test-report-final.md`). **M0 đã chấp nhận rủi ro** (24/11 22:21) cho 3 lỗi High Open (DEF-40, 41, 65) và 1 High In Progress (DEF-66), kèm điều kiện ở mục "Lỗi còn tồn tại". Tag `v1.0.0` gắn trên commit merge `nam-anh` (có bản sửa DEF-55..57) vào `master`.
**Soạn:** M5 – Khiếu Hoàng Nam Anh (QA & Deployment) · **Dự án:** FairShare – đồ án môn Quản lý dự án CNTT, UEH

FairShare giúp nhóm sinh viên đo và minh bạch hóa mức đóng góp trong đồ án nhóm: ai làm gì, bao nhiêu, khi nào, có bằng chứng truy vết, kèm chấm chéo ẩn danh và báo cáo PDF để nhóm tự chia điểm và giảng viên tham khảo.

## Tính năng chính

| Nhóm | Tính năng | Phân hệ |
|---|---|---|
| Tài khoản | Đăng ký, đăng nhập JWT, hồ sơ cá nhân | M1 |
| Nhóm và sprint | Tạo nhóm, mã mời 8 ký tự, mời thành viên qua email (chỉ Leader), tham gia bằng mã; đồng thuận chia sẻ dữ liệu (consent) và rút consent; tạo/đóng sprint, tự tạo "Sprint 1" khi tạo nhóm | M2 |
| Task Board nội bộ (CR-02) | Board, cột Kanban (To Do / In Progress / Review / Done), thẻ có người phụ trách, story points, độ khó, hạn chót, bình luận, checklist, đính kèm. Mọi thao tác tự ghi `ActivityEvent` nguồn `BOARD`, không sửa/xóa được | M1 |
| Phân quyền | Leader quản lý board, cột, sprint, đợt chấm; thành viên chỉ sửa/kéo thẻ được giao; người ngoài nhóm bị chặn (403) ở board, sprint, đóng góp, hoạt động, chấm chéo, báo cáo | M1, M2, M3, M4 |
| Đo đóng góp | `ScoringEngine` 4 tầng (khối lượng, chất lượng, đúng hạn, hợp tác), routine `sp_calculate_contribution_scores`; Dashboard tỷ lệ đóng góp, radar 4 chiều, bộ lọc sprint/thành viên; truy vết bằng chứng từng sự kiện | M3 |
| Chấm chéo | Đợt chấm theo sprint (DRAFT/OPEN/CLOSED), 3 tiêu chí thang 1–5, **ẩn danh: chỉ hiện điểm khi có ≥ 3 người chấm khác nhau** | M4 |
| Cảnh báo sớm | Cảnh báo thành viên không hoạt động (CR-04), dữ liệu cảnh báo thật, nhắc nhở và đánh dấu đã giải quyết | M3, M4 |
| Bổ sung từ 18/11 | Lịch dự án (ngày bắt đầu/kết thúc), lịch công việc, deep-link thẻ và thành viên, chia sẻ thẻ bằng mã QR, ảnh đại diện, chuông thông báo theo tài khoản, chatbox AI theo khung TCREI (cần khóa API, chưa có kiểm thử tích hợp), giao diện mobile 375px, sáng/tối | M0, M1, M3 |
| Báo cáo | Xuất PDF đóng góp theo sprint, tiếng Việt có dấu; chậm nhất 0,110 s với nhóm 6 người, 500 sự kiện; 0,237 s trên nhóm demo (24/11; mục tiêu G4 < 10 s) | M0 |
| Triển khai | Docker Compose 3 service (Nginx + Spring Boot + MariaDB), staging 1 lệnh kèm smoke test, CI GitHub Actions (backend, frontend, docker); ảnh tải lên lưu trong volume `uploads_data`, Nginx chuyển `/uploads/**` và nhận tệp tới 20MB | M5 |

## Thay đổi phạm vi CR-02: bỏ Trello, dùng Task Board nội bộ

- Không còn gọi Trello REST API (lý do: rate limit, rủi ro bảo mật token, dữ liệu ngoài hệ thống có thể bị sửa/xóa).
- Đã gỡ module `integration/trello`, `TrelloClientTest`, trang `ConnectTrelloPage` và API tích hợp (DEF-25). Enum `ActivitySource.TRELLO` được giữ để dữ liệu cũ vẫn đọc được; hồi quy TRL-01..03 đạt.
- Đường dẫn `/integration` (`/tich-hop`) nay dùng cho trang "không gian vector đa chiều" (`MultidimensionalVectorPage`), không liên quan Trello.
- Tài liệu: `docs/CR02-Internal-Board-Module.md`.

## Lỗi đã sửa (đã retest đạt)

42 lỗi Closed trong `docs/qa/defect-log.md` (24/11). Các lỗi mức High:

| Mã | Lỗi | Ngày đóng |
|---|---|---|
| DEF-01, 02 | Module auth chưa hiện thực / sai định dạng phản hồi | 09/11, 15/11 |
| DEF-08, 09, 10 | Lộ điểm chấm chéo dưới 3 lượt; đếm lượt thay vì người; người ngoài nhóm chấm được | 10/11 |
| DEF-11 | Giả mạo hoàn thành thẻ bằng tên cột do client gửi | 11/11 |
| DEF-12 | Thiếu phân quyền theo nhóm | 15/11 |
| DEF-20 | Xuất PDF luôn lỗi 500 | 15/11 |
| DEF-22 | Dashboard hiển thị sai nhóm | 15/11 |
| DEF-24 | Thiếu phân quyền Leader/thành viên trên board | 11/11 |
| DEF-33 | Người ngoài nhóm tự thêm mình làm Leader | 16/11 |
| DEF-38 | Kéo thẻ vào cột Review lặp lại để tự cộng điểm | 16/11 |
| DEF-43 | API bằng chứng trả 500 (Audit Trail trống) | 20/11 |
| DEF-45 | Chuông thông báo hiện thông báo của tài khoản khác | 20/11 |
| DEF-31 | Khai báo đóng góp giả danh, tự duyệt | 24/11 |
| DEF-64 | Chấm chéo thay người khác bằng `reviewerId` | 24/11 |
| DEF-55, 56 | Ảnh đại diện không lưu được/không hiển thị trên bản Docker | 24/11 (nhánh `nam-anh`) |

Medium/Low tiêu biểu: PDF mất dấu tiếng Việt (DEF-21), PDF trộn sprint nhóm khác (DEF-26), `JWT_SECRET` mặc định trong compose (DEF-18), lỗ hổng xem board/sprint nhóm khác (DEF-34, 35), xem khai báo đóng góp nhóm khác (DEF-32), validate ngày sprint (DEF-36), CI backend đỏ (DEF-27), Nginx chặn tệp > 1MB (DEF-57), chuông thông báo (DEF-44).

## Lỗi còn tồn tại và cách né (24/11)

| Mã | Mức | Lỗi | Cách né |
|---|---|---|---|
| DEF-40 | High | Migration V23–V25 tạo tài khoản demo có mật khẩu công khai, ghi đè dữ liệu nhóm id 1, V25 xóa toàn bộ điểm đóng góp đã tính | Dựng CSDL mới và khóa 6 tài khoản demo (`docs/deploy/demo-checklist.md` bước 4). M0 chấp nhận rủi ro 24/11 |
| DEF-41 | High | Kéo thẻ của mình qua lại giữa các cột tự nâng tỷ lệ đóng góp | Chỉ kéo thẻ một chiều tới Done |
| DEF-65 | High | Người ngoài nhóm xem được ai đã chấm ai, bao nhiêu điểm, và danh sách đợt chấm (`/api/review-rounds/{id}/submissions/reviewer/{id}`, `/team/{id}`) | Kết quả trên giao diện vẫn ẩn danh khi < 3 người chấm; không công bố URL bản demo ra ngoài nhóm. M0 chấp nhận rủi ro 24/11 |
| DEF-66 | High (In Progress) | Gửi email báo cáo: người ngoài đã bị chặn, nhưng vẫn trả 200, gửi đồng bộ (khoảng 133 s), giao diện báo thành công cả khi lỗi | Không dùng nút Gửi email khi demo |
| DEF-47, 50, 53, 58, 59, 67 | Medium | Một thẻ một người phụ trách; tab Nghị định 13; số liệu mẫu ở hồ sơ/thành viên tiêu biểu; người ngoài nhắc nhở/giải quyết cảnh báo; thành viên thường sửa thông tin nhóm; 401 bất thường trên Render | Xem defect log |
| DEF-19, 28, 42, 54, 60–63, 68 | Low | 400 thay 403; ảnh upload trong repo; đổi tên thẻ vượt bản sửa DEF-38; trùng tab Báo cáo; avatar không kiểm nội dung; TopNav 1280px; mã cột thay tên cột; gọi API nhóm 1; chữ "Git commits" | Xem defect log |

**Quyết định chấp nhận rủi ro (24/11 22:21):** M0 chấp nhận rủi ro cho DEF-40, 41, 65, 66 với điều kiện ở cột "Cách né"; chi tiết và người sửa sau release: `docs/qa/defect-log.md`, mục "Quyết định chấp nhận rủi ro".

## Kiểm thử (24/11, `master` @ `677a9be`)

| Bộ test | Kết quả |
|---|---|
| Unit backend (`mvn test`, có Testcontainers) | 243 test, 0 lỗi, 0 skip |
| Unit frontend (Vitest) | 21 file, 99/99; lint 0 lỗi |
| Smoke staging | PASS |
| Tích hợp (`integration-sprint4.py`) | 23/23 |
| Hồi quy (`regression-sprint5.py`) | 26/30: 4 ca PDF lỗi do migration V24/V25 (DEF-40) ghi đè nhóm id 1 mà bộ test dùng. PDF trên nhóm sạch: HTTP 200, chậm nhất 0,237 s, đủ nội dung (G4 đạt) |
| Retest lỗi gian lận (`retest-sprint6.py`) | 2/9 (DEF-19, 40, 41, 42 còn lỗi) |
| Pilot UAT (`uat-pilot.py`) | 22/24 (2 ca chỉ lệch mã trạng thái; DEF-31, 32 đã đóng) |
| Retest lỗi 20/11 (`retest-sprint7.py`) | 7/13 sau bản sửa DEF-55..57 (DEF-58, 59, 60, 65 còn lỗi) |
| UAT chính thức (M2, 17/11, bản Render) | 10 phiếu; SUS 47,0/100; CSAT 60% → G5 chưa đạt (`docs/qa/uat-report.md`) |

Minh chứng: `docs/qa/evidence/README.md`.

## Hướng dẫn chạy

Yêu cầu: Docker Desktop (hoặc Docker Engine + Compose v2), Git, Python 3 (cho script seed).

```bash
git clone https://github.com/rtmiue20/fairshare.git && cd fairshare
git checkout <tag>                 # ví dụ v1.0.0
./scripts/staging-up.sh            # tự sinh .env.staging, build, chạy, smoke test -> http://localhost:8081
py -X utf8 scripts/demo-seed.py    # (tuỳ chọn) 5 tài khoản demo + dữ liệu mẫu; Linux/macOS: python3
```

- Chạy bản dev (cổng 80/8080/3306): `cp .env.example .env`, điền `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `JWT_SECRET` rồi `docker compose up -d --build` (xem README mục 6).
- Hướng dẫn sử dụng có ảnh: `docs/deploy/user-guide.md`. Dựng bản demo: `docs/deploy/demo-checklist.md`.
- Video demo dự phòng: https://drive.google.com/file/d/1HE7ZnfLf49j5UMruRp-0IG11czHqGZjV/view

## Thành viên

M0 Nguyễn Văn Minh Triều (PM, báo cáo) · M1 Nguyễn Phúc Vương (Auth/User/Common/Board) · M2 Hà Ngọc Thiện (Team/Sprint, UAT) · M3 Ngô Trọng Phúc (Đóng góp/Dashboard) · M4 Triệu Nguyễn Huỳnh Khang (Chấm chéo) · M5 Khiếu Hoàng Nam Anh (QA/Deployment)
