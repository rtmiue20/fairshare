# FairShare v1.0.0 – Release notes (BẢN NHÁP)

**Trạng thái:** nháp 16/11/2026, chờ chốt tên tag, thời điểm gắn tag và commit `master` (dự kiến 18/11). Số liệu kiểm thử bên dưới lấy trên `master` @ `f18a705` ngày 16/11; sẽ chạy lại trên commit được gắn tag.
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
| Cảnh báo sớm | Cảnh báo thành viên không hoạt động (CR-04) | M3 |
| Báo cáo | Xuất PDF đóng góp theo sprint, tiếng Việt có dấu; chậm nhất 0,064 s với nhóm 6 người, 500 sự kiện (mục tiêu G4 < 10 s) | M0 |
| Triển khai | Docker Compose 3 service (Nginx + Spring Boot + MariaDB), staging 1 lệnh kèm smoke test, CI GitHub Actions (backend, frontend, docker) | M5 |

## Thay đổi phạm vi CR-02: bỏ Trello, dùng Task Board nội bộ

- Không còn gọi Trello REST API (lý do: rate limit, rủi ro bảo mật token, dữ liệu ngoài hệ thống có thể bị sửa/xóa).
- Đã gỡ module `integration/trello`, `TrelloClientTest`, trang `ConnectTrelloPage` và API tích hợp (DEF-25). Enum `ActivitySource.TRELLO` được giữ để dữ liệu cũ vẫn đọc được; hồi quy TRL-01..03 đạt.
- Đường dẫn `/integration` (`/tich-hop`) nay dùng cho trang "không gian vector đa chiều" (`MultidimensionalVectorPage`), không liên quan Trello.
- Tài liệu: `docs/CR02-Internal-Board-Module.md`.

## Lỗi đã sửa (đã retest đạt)

33 lỗi Closed trong `docs/qa/defect-log.md`. Các lỗi mức High:

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

Medium/Low tiêu biểu: PDF mất dấu tiếng Việt (DEF-21), PDF trộn sprint nhóm khác (DEF-26), `JWT_SECRET` mặc định trong compose (DEF-18), lỗ hổng xem board/sprint nhóm khác (DEF-34, 35), validate ngày sprint (DEF-36), CI backend đỏ (DEF-27).

## Lỗi còn tồn tại và cách né

| Mã | Mức | Lỗi | Cách né |
|---|---|---|---|
| DEF-31 | High | Khai báo đóng góp thủ công không xác thực người gọi (giả danh, tự duyệt) | Không dùng chức năng Khai báo đóng góp |
| DEF-40 | High | Migration V23 tạo tài khoản demo có mật khẩu công khai, ghi đè dữ liệu nhóm id 1 | Dựng CSDL mới và khóa 5 tài khoản demo (`docs/deploy/demo-checklist.md` bước 4). `<chờ M0: sửa trước tag hay chấp nhận rủi ro>` |
| DEF-41 | High | Kéo thẻ của mình qua lại giữa các cột tự nâng tỷ lệ đóng góp | Chỉ kéo thẻ một chiều tới Done |
| DEF-32 | Medium | Người ngoài nhóm xem được khai báo đóng góp | Như DEF-31 |
| DEF-19, 28, 39, 42 | Low | 400 thay vì 403; ảnh upload trong repo; số liệu mẫu cứng trên Dashboard/Lịch; đổi tên thẻ vượt bản sửa DEF-38 | Xem defect log |

Trạng thái cuối cùng của 3 lỗi High phụ thuộc kết quả sửa và quyết định của M0 (`docs/qa/uat/uat-closure.md`).

## Kiểm thử (16/11, `master` @ `f18a705`)

| Bộ test | Kết quả |
|---|---|
| Unit backend (`mvn test` trong Docker, có Testcontainers) | 233 test, 0 lỗi, 0 skip |
| Unit frontend (Vitest) | 86/86 |
| Smoke staging | PASS |
| Tích hợp (`integration-sprint4.py`) | 23/23 |
| Hồi quy (`regression-sprint5.py`) | 30/30 |
| Pilot UAT (`uat-pilot.py`) | 20/24 (4 ca thuộc DEF-31, 32) |
| UAT chính thức (M2) | `<TODO 17/11>` |

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
