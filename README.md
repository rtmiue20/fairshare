# FairShare

**Nền tảng đo lường và minh bạch hóa mức đóng góp trong đồ án nhóm**

Đồ án nhóm môn *Quản lý dự án CNTT* – Đại học Kinh tế TP.HCM (UEH).

> Trạng thái: đang phát triển (MVP, Sprint 5/7, tính đến 08/11/2026). Cấu trúc thư mục dưới đây là cấu trúc đích của dự án; một số thư mục/tập tin sẽ được bổ sung dần theo từng sprint.
>
> **Thay đổi quan trọng (CR-02, 29/10/2026):** FairShare hoàn toàn không sử dụng Trello REST API bên ngoài (do rate limit nghiêm ngặt và rủi ro bảo mật/bất biến dữ liệu). Nhóm tự xây dựng **phân hệ Task Board nội bộ** (bảng, cột Kanban, thẻ, Story Points, hạn chót) và tự động ghi mọi thao tác thành `ActivityEvent` nguồn `BOARD`. Xem [`docs/CR02-Internal-Board-Module.md`](docs/CR02-Internal-Board-Module.md).

---

## 1. Giới thiệu

### 1.1 Vấn đề
Trong đồ án nhóm thường xuất hiện tình trạng free-rider: leader khó chứng minh ai làm ít, thành viên làm nhiều bị thiệt thòi, giảng viên không có dữ liệu để chấm điểm cá nhân.

### 1.2 Giải pháp
FairShare giúp nhóm sinh viên theo dõi **ai đã làm gì, bao nhiêu và khi nào** trong suốt học kỳ, từ đó tạo bản đánh giá đóng góp có bằng chứng để nhóm tự chia điểm và giảng viên tham khảo khi chấm.

### 1.3 Điểm khác biệt
- Ứng dụng quản lý task chỉ cho biết việc nào đã xong.
- FairShare tự thu thập dữ liệu thật từ **Task Board nội bộ** do chính hệ thống quản lý (và Google Docs nếu bật), có bằng chứng truy vết và có cơ chế chấm chéo ẩn danh.
- Nhóm làm chủ dữ liệu board nên không phụ thuộc dịch vụ ngoài, không bị rate limit, và sự kiện được ghi tự động ngay trong hệ thống (không thể xóa/sửa lịch sử ở nơi khác).
- FairShare là **công cụ hỗ trợ ra quyết định**, không tự quyết định điểm cuối cùng.

### 1.4 Tính năng MVP

| # | Tính năng | Trạng thái |
|---|---|---|
| 1 | Đăng nhập, tạo nhóm, mời thành viên, đồng ý chia sẻ dữ liệu (consent) | Bắt buộc |
| 2 | Task Board nội bộ (bảng, cột, thẻ, người phụ trách, Story Points, hạn chót): tự động ghi `ActivityEvent` khi tạo/di chuyển/hoàn thành thẻ (thay tích hợp Trello – CR-02) | Bắt buộc |
| 3 | Bảng đóng góp: biểu đồ tỷ lệ từng người, truy vết bằng chứng | Bắt buộc |
| 4 | Chấm chéo ẩn danh cuối mỗi sprint | Bắt buộc |
| 5 | Xuất báo cáo PDF đóng góp | Bắt buộc |
| 6 | Cảnh báo sớm khi thành viên không hoạt động | Có điều kiện |
| 7 | Tích hợp Google Docs (bản đơn giản: số lần chỉnh sửa) | Có điều kiện |

---

## 2. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 3.x (Web, Security, Data JPA, Validation), Maven |
| Cơ sở dữ liệu | MariaDB 11.x, Flyway (migration) |
| Frontend | Vite, React 18, TypeScript, React Router, Axios, thư viện biểu đồ (Recharts) |
| Xuất PDF | OpenPDF hoặc thư viện tương đương (phía backend) |
| Kiểm thử | JUnit 5, Mockito, Testcontainers (backend); Vitest, React Testing Library (frontend) |
| Triển khai | Docker, Docker Compose, GitHub Actions (CI) |
| Quản lý dự án | GitHub, MS Project/GanttProject (Task Board của sản phẩm là module nội bộ, không dùng Trello API – CR-02) |

> Có thể thay đổi phiên bản/thư viện cụ thể theo thực tế phát triển. Ghi lại thay đổi quan trọng trong Change Log.

---

## 3. Cây thư mục dự án

```
fairshare/
├── README.md
├── LICENSE
├── .gitignore
├── .editorconfig
├── .env.example                      # Mẫu biến môi trường (không chứa bí mật thật)
├── docker-compose.yml                # MariaDB + backend + frontend (môi trường dev/demo)
├── Makefile                          # Lệnh tắt: make up, make test, ...
│
├── .github/
│   ├── workflows/
│   │   ├── backend-ci.yml            # Build + test backend
│   │   └── frontend-ci.yml           # Lint + test + build frontend
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── change_request.md
│   └── pull_request_template.md
│
├── fairshare-backend/                # Spring Boot (Maven)
│   ├── pom.xml
│   ├── Dockerfile
│   ├── mvnw / mvnw.cmd
│   └── src/
│       ├── main/
│       │   ├── java/com/fairshare/
│       │   │   ├── FairShareBackendApplication.java
│       │   │   │
│       │   │   ├── config/                    # Cấu hình chung
│       │   │   │   ├── SecurityConfig.java
│       │   │   │   ├── CorsConfig.java
│       │   │   │   ├── OpenApiConfig.java
│       │   │   │   └── AppProperties.java
│       │   │   │
│       │   │   ├── common/                    # Thành phần dùng chung
│       │   │   │   ├── exception/
│       │   │   │   │   ├── GlobalExceptionHandler.java
│       │   │   │   │   ├── ResourceNotFoundException.java
│       │   │   │   │   └── BusinessException.java
│       │   │   │   ├── dto/
│       │   │   │   │   ├── ApiResponse.java
│       │   │   │   │   └── PageResponse.java
│       │   │   │   ├── audit/
│       │   │   │   │   └── BaseEntity.java
│       │   │   │   └── util/
│       │   │   │       ├── DateTimeUtils.java
│       │   │   │       └── CryptoUtils.java   # Mã hóa token tích hợp
│       │   │   │
│       │   │   ├── auth/                      # Đăng nhập, JWT, phân quyền
│       │   │   │   ├── controller/AuthController.java
│       │   │   │   ├── service/AuthService.java
│       │   │   │   ├── security/
│       │   │   │   │   ├── JwtService.java
│       │   │   │   │   └── JwtAuthenticationFilter.java
│       │   │   │   └── dto/
│       │   │   │       ├── LoginRequest.java
│       │   │   │       ├── RegisterRequest.java
│       │   │   │       └── AuthResponse.java
│       │   │   │
│       │   │   ├── user/                      # Người dùng
│       │   │   │   ├── controller/UserController.java
│       │   │   │   ├── service/UserService.java
│       │   │   │   ├── repository/UserRepository.java
│       │   │   │   ├── entity/User.java
│       │   │   │   └── dto/UserDto.java
│       │   │   │
│       │   │   ├── team/                      # Nhóm, thành viên, consent
│       │   │   │   ├── controller/TeamController.java
│       │   │   │   ├── service/TeamService.java
│       │   │   │   ├── repository/
│       │   │   │   │   ├── TeamRepository.java
│       │   │   │   │   ├── TeamMemberRepository.java
│       │   │   │   │   └── ConsentRepository.java
│       │   │   │   ├── entity/
│       │   │   │   │   ├── Team.java
│       │   │   │   │   ├── TeamMember.java
│       │   │   │   │   ├── Consent.java
│       │   │   │   │   └── MemberRole.java
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── sprint/                    # Sprint của dự án sinh viên
│       │   │   │   ├── controller/SprintController.java
│       │   │   │   ├── service/SprintService.java
│       │   │   │   ├── repository/SprintRepository.java
│       │   │   │   ├── entity/Sprint.java
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── board/                     # Task Board nội bộ (CR-02, thay Trello API)
│       │   │   │   ├── controller/BoardController.java   # /api/boards
│       │   │   │   ├── service/BoardService.java         # CRUD board/cột/thẻ + ghi ActivityEvent
│       │   │   │   ├── repository/
│       │   │   │   │   ├── BoardRepository.java
│       │   │   │   │   ├── BoardColumnRepository.java
│       │   │   │   │   └── CardRepository.java
│       │   │   │   ├── entity/
│       │   │   │   │   ├── Board.java
│       │   │   │   │   ├── BoardColumn.java
│       │   │   │   │   └── Card.java
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── integration/               # Tích hợp bên ngoài
│       │   │   │   ├── common/
│       │   │   │   │   ├── IntegrationAdapter.java
│       │   │   │   │   ├── SyncResult.java
│       │   │   │   │   └── SyncScheduler.java
│       │   │   │   └── googledocs/            # Có điều kiện (quyết định ở Sprint 4)
│       │   │   │       ├── client/GoogleDocsClient.java
│       │   │   │       ├── service/GoogleDocsSyncService.java
│       │   │   │       └── dto/
│       │   │   │
│       │   │   ├── activity/                  # Sự kiện hoạt động (bằng chứng gốc)
│       │   │   │   ├── controller/ActivityController.java
│       │   │   │   ├── service/ActivityService.java
│       │   │   │   ├── repository/ActivityEventRepository.java
│       │   │   │   ├── entity/
│       │   │   │   │   ├── ActivityEvent.java
│       │   │   │   │   └── ActivitySource.java
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── contribution/              # Tính điểm đóng góp, truy vết
│       │   │   │   ├── controller/ContributionController.java
│       │   │   │   ├── service/
│       │   │   │   │   ├── ContributionService.java
│       │   │   │   │   └── ScoringEngine.java      # Công thức đóng góp
│       │   │   │   ├── repository/ContributionRepository.java
│       │   │   │   ├── entity/
│       │   │   │   │   ├── ContributionScore.java
│       │   │   │   │   └── ManualContribution.java # Khai báo thủ công + xác nhận
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── peerreview/                # Chấm chéo ẩn danh
│       │   │   │   ├── controller/PeerReviewController.java
│       │   │   │   ├── service/
│       │   │   │   │   ├── PeerReviewService.java
│       │   │   │   │   └── AnonymityAggregator.java # Ngưỡng tổng hợp tối thiểu
│       │   │   │   ├── repository/
│       │   │   │   ├── entity/
│       │   │   │   │   ├── ReviewRound.java
│       │   │   │   │   ├── ReviewSubmission.java
│       │   │   │   │   └── ReviewCriterion.java
│       │   │   │   └── dto/
│       │   │   │
│       │   │   ├── alert/                     # Cảnh báo sớm (có điều kiện)
│       │   │   │   ├── service/InactivityAlertService.java
│       │   │   │   ├── entity/Alert.java
│       │   │   │   └── repository/AlertRepository.java
│       │   │   │
│       │   │   └── report/                    # Xuất báo cáo PDF
│       │   │       ├── controller/ReportController.java
│       │   │       ├── service/PdfReportService.java
│       │   │       └── dto/
│       │   │
│       │   └── resources/
│       │       ├── application.yml
│       │       ├── application-dev.yml
│       │       ├── application-prod.yml
│       │       ├── db/migration/               # Flyway
│       │       │   ├── V1__init_schema.sql
│       │       │   ├── V2__integration_and_activity.sql
│       │       │   ├── V3__contribution.sql
│       │       │   ├── V4__peer_review.sql
│       │       │   ├── V5__alert.sql
│       │       │   ├── V6__expense_and_split.sql
│       │       │   ├── V7__alter_existing_and_expenses.sql
│       │       │   ├── V8__scoring_engine.sql
│       │       │   ├── V9__routines.sql                          # Stored procedure/function/trigger
│       │       │   ├── V10__create_boards_and_cards.sql          # CR-02: boards, board_columns, cards
│       │       │   └── V11__create_contribution_summary_routine.sql
│       │       ├── templates/report/           # Mẫu báo cáo PDF
│       │       └── seed/
│       │           └── sample_data.sql         # Dữ liệu mẫu (ghi rõ nguồn)
│       │
│       └── test/
│           ├── java/com/fairshare/
│           │   ├── auth/
│           │   ├── board/BoardServiceTest.java
│           │   ├── activity/ActivitySourceBackwardCompatibilityTest.java
│           │   ├── contribution/ScoringEngineTest.java
│           │   ├── peerreview/AnonymityAggregatorTest.java
│           │   └── report/
│           └── resources/
│               └── application-test.yml
│
├── frontend/                         # Vite + React + TypeScript
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── eslint.config.js
│   ├── .prettierrc
│   ├── index.html
│   ├── Dockerfile
│   ├── nginx.conf                    # Dùng khi chạy bản build bằng Docker
│   ├── .env.example
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── vite-env.d.ts
│       │
│       ├── app/
│       │   ├── router.tsx
│       │   ├── providers.tsx
│       │   └── ProtectedRoute.tsx
│       │
│       ├── api/                      # Gọi backend
│       │   ├── client.ts             # Axios instance + interceptor
│       │   ├── auth.api.ts
│       │   ├── team.api.ts
│       │   ├── board.api.ts          # Gọi /api/boards (CR-02)
│       │   ├── contribution.api.ts
│       │   ├── peerReview.api.ts
│       │   └── report.api.ts
│       │
│       ├── features/
│       │   ├── auth/
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   └── useAuth.ts
│       │   ├── team/
│       │   │   ├── TeamListPage.tsx
│       │   │   ├── TeamDetailPage.tsx
│       │   │   ├── ConsentDialog.tsx
│       │   │   └── MemberTable.tsx
│       │   ├── board/
│       │   │   └── BoardView.tsx              # Kanban: thêm thẻ, phân công, Story Points, di chuyển thẻ (/teams/:id/board)
│       │   ├── dashboard/
│       │   │   ├── ContributionDashboard.tsx
│       │   │   ├── ContributionPieChart.tsx
│       │   │   ├── ContributionTimeline.tsx
│       │   │   └── EvidenceTable.tsx          # Bằng chứng truy vết
│       │   ├── peerreview/
│       │   │   ├── ReviewRoundPage.tsx
│       │   │   ├── ReviewForm.tsx
│       │   │   └── ReviewResultCard.tsx
│       │   ├── alerts/
│       │   │   └── AlertList.tsx
│       │   └── report/
│       │       └── ExportReportButton.tsx
│       │
│       ├── components/               # Thành phần UI dùng chung
│       │   ├── layout/
│       │   │   ├── AppLayout.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── Header.tsx
│       │   └── ui/
│       │       ├── Button.tsx
│       │       ├── Card.tsx
│       │       ├── Modal.tsx
│       │       ├── Spinner.tsx
│       │       └── EmptyState.tsx
│       │
│       ├── hooks/
│       │   └── useDebounce.ts
│       ├── store/                    # Trạng thái toàn cục (Zustand hoặc Context)
│       │   └── authStore.ts
│       ├── types/                    # Kiểu dữ liệu dùng chung
│       │   ├── api.ts
│       │   ├── team.ts
│       │   ├── board.ts
│       │   └── contribution.ts
│       ├── utils/
│       │   ├── date.ts
│       │   └── format.ts
│       ├── styles/
│       │   └── global.css
│       └── tests/
│           ├── setup.ts
│           └── ContributionDashboard.test.tsx
│
├── database/                         # Tài liệu và script hỗ trợ CSDL
│   ├── erd/
│   │   ├── fairshare-erd.drawio
│   │   └── fairshare-erd.png
│   ├── init/
│   │   └── 01-create-database.sql    # Tạo DB và user (mount vào container MariaDB)
│   └── backup/
│       └── .gitkeep
│
├── docs/                             # Tài liệu môn học và dự án
│   ├── CR02-Internal-Board-Module.md   # Change Request: Task Board nội bộ thay Trello
│   ├── CR03-Dieu-Chinh-Cong-Thuc-Dong-Gop.md
│   ├── sprint1.md … sprint7.md         # Kế hoạch từng sprint
│   ├── 01-initiation/
│   │   ├── project-charter.md
│   │   ├── stakeholder-register.md
│   │   └── team-charter.md
│   ├── 02-planning/
│   │   ├── plan-PM.md
│   │   ├── phan-cong-cong-viec-PM.md
│   │   ├── scope-statement.md
│   │   ├── wbs.md
│   │   ├── gantt/                    # File MS Project / GanttProject / ảnh
│   │   ├── risk-register.md
│   │   ├── communication-plan.md
│   │   └── raci.md
│   ├── 03-analysis-design/
│   │   ├── requirements.md
│   │   ├── use-cases/
│   │   ├── bpmn/
│   │   ├── architecture.md
│   │   ├── contribution-formula.md   # Định nghĩa công thức đóng góp
│   │   ├── privacy-and-consent.md    # Chính sách dữ liệu và quyền riêng tư
│   │   └── ui-prototype/
│   ├── 04-execution/
│   │   ├── sprint-reports/           # Báo cáo tuần/sprint
│   │   ├── meeting-minutes/          # Biên bản họp
│   │   ├── change-log.md
│   │   ├── issue-log.md
│   │   └── work-logs/                # Log công việc từng thành viên
│   ├── 05-testing/
│   │   ├── test-plan.md
│   │   ├── test-cases.md
│   │   ├── defect-log.md
│   │   ├── uat/
│   │   └── evidence/                 # Ảnh chụp có ngày giờ
│   ├── 06-closure/
│   │   ├── final-report/
│   │   ├── lessons-learned.md
│   │   ├── closure-checklist.md
│   │   └── mini-pm-reports/
│   └── api/
│       └── openapi.yaml              # Đặc tả API (xuất từ Swagger)
│
└── scripts/
    ├── setup-dev.sh                  # Cài đặt môi trường dev
    ├── seed-data.sh                  # Nạp dữ liệu mẫu
    └── backup-db.sh                  # Sao lưu MariaDB
```

### Giải thích nhanh

| Thư mục | Vai trò |
|---|---|
| `fairshare-backend/` | API Spring Boot, tổ chức theo module nghiệp vụ (auth, team, board, activity, contribution, peerreview, report...) |
| `frontend/` | Giao diện React TS, tổ chức theo `features/` (mỗi tính năng một thư mục) |
| `database/` | ERD, script khởi tạo CSDL. Migration chính nằm trong `fairshare-backend/src/main/resources/db/migration` |
| `docs/` | Toàn bộ artefact quản lý dự án, sắp theo vòng đời dự án, dùng làm minh chứng cho môn học |
| `scripts/` | Script hỗ trợ cài đặt, nạp dữ liệu, sao lưu |
| `.github/` | CI, mẫu Issue/Pull Request |

---

## 4. Kiến trúc tổng quan

```
┌──────────────┐     HTTPS/JSON     ┌──────────────────┐      JDBC      ┌───────────┐
│ React (Vite) │ ─────────────────► │ Spring Boot API  │ ─────────────► │  MariaDB  │
│  Frontend    │ ◄───────────────── │  (REST + JWT)    │ ◄───────────── │           │
└──────────────┘                    └────────┬─────────┘                └───────────┘
                                             │ REST (OAuth/token, có điều kiện)
                                             ▼
                                   ┌──────────────────┐
                                   │ Google Docs API* │   (*có điều kiện)
                                   └──────────────────┘
```

Task Board (board, cột, thẻ) là **module nội bộ** của Spring Boot API (`com.fairshare.board`), lưu trực tiếp trong MariaDB, không còn gọi dịch vụ bên ngoài (CR-02).

Luồng dữ liệu chính:
1. Thành viên đồng ý chia sẻ dữ liệu (consent) và dùng Task Board nội bộ của nhóm (tạo thẻ, phân công, gán Story Points, di chuyển thẻ giữa các cột).
2. `BoardService` tự động ghi `ActivityEvent` nguồn `BOARD` khi tạo thẻ (`CARD_CREATED`), di chuyển thẻ (`CARD_MOVED`) hoặc hoàn thành thẻ (`CARD_COMPLETED`), kèm độ trễ (`delay_days`) và đúng hạn (`is_on_time`) làm bằng chứng gốc.
3. `ScoringEngine` tính điểm đóng góp từ các sự kiện theo công thức đã định nghĩa trong `docs/03-analysis-design/contribution-formula.md`.
4. Cuối sprint, thành viên chấm chéo ẩn danh; `AnonymityAggregator` chỉ trả kết quả khi đủ số lượt đánh giá tối thiểu.
5. Hệ thống xuất báo cáo PDF gồm tỷ lệ đóng góp, điểm chấm chéo và bằng chứng chính.

---

## 5. Yêu cầu hệ thống

| Công cụ | Phiên bản khuyến nghị |
|---|---|
| JDK | 21 |
| Maven | 3.9+ (hoặc dùng `mvnw` kèm theo) |
| Node.js | 20 LTS trở lên |
| npm | 10+ |
| MariaDB | 11.x (hoặc dùng Docker) |
| Docker + Docker Compose | Tùy chọn, khuyến nghị cho môi trường dev/demo |
| Git | 2.40+ |

---

## 6. Hướng dẫn cài đặt và chạy

### 6.1 Lấy mã nguồn

```bash
git clone https://github.com/rtmiue20/fairshare.git
cd fairshare
```

### 6.2 Cấu hình biến môi trường

```bash
cp .env.example .env
```

Chỉnh sửa `.env`. Các biến chính:

| Biến | Ý nghĩa | Ví dụ |
|---|---|---|
| `DB_HOST` | Máy chủ MariaDB | `localhost` |
| `DB_PORT` | Cổng MariaDB | `3306` |
| `DB_NAME` | Tên CSDL | `fairshare` |
| `DB_USER` | Tài khoản CSDL | `fairshare` |
| `DB_PASSWORD` | Mật khẩu CSDL | `thay-bang-mat-khau-cua-ban` |
| `JWT_SECRET` | Khóa ký JWT (chuỗi ngẫu nhiên đủ dài) | `...` |
| `JWT_EXPIRATION_MINUTES` | Thời hạn token đăng nhập | `120` |
| `TOKEN_ENCRYPTION_KEY` | Khóa mã hóa token tích hợp lưu trong DB | `...` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (có điều kiện) | `...` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (có điều kiện) | `...` |
| `APP_FRONTEND_URL` | URL frontend (cho CORS/redirect) | `http://localhost:5173` |
| `VITE_API_BASE_URL` | URL backend mà frontend gọi tới | `http://localhost:8080/api` |

> **Không commit file `.env` hoặc bất kỳ khóa/token thật nào lên Git.** Chỉ commit `.env.example`.

### 6.3 Cách 1: Chạy bằng Docker Compose (nhanh nhất)

Yêu cầu: Docker Desktop (hoặc Docker Engine + Compose v2).

```bash
cp .env.example .env          # đổi DB_PASSWORD, DB_ROOT_PASSWORD
docker compose up -d --build  # lần đầu mất vài phút để build image
docker compose ps             # db phải ở trạng thái "healthy"
```

Sau khi khởi động:
- Frontend (Nginx, đã proxy `/api` sang backend): http://localhost
- Backend API: http://localhost:8080 (kiểm tra nhanh: http://localhost:8080/actuator/health)
- MariaDB 10.11: `localhost:3306`, CSDL `fairshare`, tài khoản `DB_USER`/`DB_PASSWORD` trong `.env`

Backend chỉ khởi động sau khi MariaDB báo `healthy`, Flyway tự chạy migration `V1`–`V11` (gồm `V10` tạo bảng `boards`, `board_columns`, `cards` cho Task Board nội bộ).

**Chỉ chạy MariaDB** (khi code backend bằng IntelliJ/`mvnw`):

```bash
docker compose up -d db
# backend chạy local: đặt DB_USER=fairshare và SPRING_DATASOURCE_PASSWORD=<DB_PASSWORD trong .env>
```

Xem log, dừng và xóa container:

```bash
docker compose logs -f backend
docker compose down        # giữ dữ liệu
docker compose down -v     # xóa cả dữ liệu (reset CSDL)
```

**CI (GitHub Actions):** mỗi lần push/PR, `backend-ci.yml` chạy `mvn verify` (Java 21, MariaDB qua Testcontainers), `frontend-ci.yml` chạy lint + Vitest + build; PR vào `master`/`develop` chạy thêm `docker-ci.yml` (build và khởi động cả 3 container).

### 6.4 Cách 2: Chạy thủ công

**Bước 1 – CSDL MariaDB**

```sql
CREATE DATABASE fairshare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fairshare'@'%' IDENTIFIED BY 'thay-bang-mat-khau-cua-ban';
GRANT ALL PRIVILEGES ON fairshare.* TO 'fairshare'@'%';
FLUSH PRIVILEGES;
```

(Có thể dùng sẵn script `database/init/01-create-database.sql`.)

**Bước 2 – Backend**

Tạo file mật khẩu riêng cho backend (đã `.gitignore`, không commit):

```bash
cd fairshare-backend/src/main/resources
cp application-secret.example.yaml application-secret.yaml
# mở application-secret.yaml, điền mật khẩu MariaDB vào spring.datasource.password
```

`application.yaml` tự nạp file này qua `spring.config.import`. Sau đó chạy backend:

```bash
cd fairshare-backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

> Mật khẩu chỉ nằm ở 2 file không commit: `application-secret.yaml` (chạy bằng IDE/mvnw) và `.env` (chạy bằng Docker Compose). Repo chỉ chứa file mẫu `application-secret.example.yaml` và `.env.example` với mật khẩu để trống.

Flyway sẽ tự tạo bảng khi backend khởi động lần đầu. Backend chạy tại http://localhost:8080.

**Bước 3 – Frontend**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend chạy tại http://localhost:5173.

### 6.5 Nạp dữ liệu mẫu (tùy chọn)

```bash
./scripts/seed-data.sh
```

Dữ liệu mẫu là dữ liệu tự tạo, **không chứa thông tin cá nhân thật**. Nguồn và cách tạo được ghi trong `docs/03-analysis-design/privacy-and-consent.md`.

---

## 7. Hướng dẫn sử dụng

### 7.1 Dành cho nhóm trưởng (Leader)
1. **Đăng ký / đăng nhập** vào hệ thống.
2. **Tạo nhóm** mới, nhập tên nhóm, môn học và danh sách sprint.
3. **Mời thành viên** bằng email hoặc mã mời.
4. **Dựng Task Board của nhóm**: vào `/teams/:id/board`, tạo board và các cột (ví dụ To Do, In Progress, Review, Done), rồi thêm thẻ công việc.
5. Theo dõi **Bảng đóng góp** theo thời gian thực (tỷ lệ từng người, bằng chứng truy vết).
6. Cuối mỗi sprint, **mở đợt chấm chéo** và nhắc thành viên hoàn thành.
7. Khi cần nộp cho giảng viên, nhấn **Xuất báo cáo PDF**.

### 7.2 Dành cho thành viên
1. Nhận lời mời và đăng nhập.
2. Đọc và **đồng ý chia sẻ dữ liệu (consent)** để dữ liệu của bạn được tính vào bảng đóng góp.
3. Làm việc trên **Task Board**: nhận thẻ được phân công, cập nhật Story Points/hạn chót và kéo thẻ sang cột tiếp theo; mỗi thao tác tự được ghi thành bằng chứng.
4. Xem phần đóng góp của bản thân và bằng chứng đi kèm; nếu có việc ngoài Task Board, **khai báo đóng góp thủ công** để các thành viên khác xác nhận.
5. Cuối sprint, **chấm chéo ẩn danh** các thành viên khác theo tiêu chí: chất lượng, đúng hạn, tinh thần hợp tác.

### 7.3 Dành cho giảng viên
- Nhận file PDF báo cáo đóng góp do nhóm xuất ra.
- Báo cáo chỉ mang tính **tham khảo**, nên đối chiếu thêm với quan sát thực tế.

### 7.4 Lưu ý về chấm chéo ẩn danh
- Danh tính người chấm không được hiển thị; kết quả chỉ được tổng hợp khi có tối thiểu số lượt đánh giá theo cấu hình.
- Với nhóm nhỏ, ẩn danh có giới hạn (có thể suy đoán). Hãy xem phần giới hạn trong `docs/03-analysis-design/privacy-and-consent.md`.

---

## 8. API chính (tóm tắt)

> [!IMPORTANT]
> **Lưu ý kiến trúc (Change Request CR-02, 29/10/2026):**
> FairShare **KHÔNG sử dụng Trello REST API bên ngoài** do các nguyên nhân: giới hạn rate limit nghiêm ngặt của Trello gây cản trở đồng bộ thời gian thực, rủi ro phụ thuộc bên thứ 3 và không thể đảm bảo tính bất biến của dữ liệu/truy vết chống gian lận.
> Nhóm đã **tự xây dựng toàn bộ phân hệ Task Board nội bộ** (gần giống Trello gồm bảng Kanban, cột, thẻ, Story Points, hạn chót, kéo thả di chuyển thẻ) và tự động ghi nhận `ActivityEvent` (nguồn `BOARD`) trực tiếp vào CSDL.
> Danh mục dưới đây **chỉ ghi các REST API nội bộ thực tế đang dùng** do backend FairShare (`fairshare-backend`) cung cấp.

Tài liệu chi tiết xem tại Swagger UI (`/swagger-ui.html`) hoặc `docs/api/openapi.yaml`.

| Phân hệ | Phương thức | Đường dẫn API | Mô tả chức năng |
|---|---|---|---|
| **Auth** | POST | `/api/auth/register` | Đăng ký tài khoản người dùng mới |
| **Auth** | POST | `/api/auth/login` | Đăng nhập hệ thống, cấp mã xác thực JWT |
| **User** | GET | `/api/users/me` | Lấy thông tin cá nhân của người dùng hiện tại |
| **Team** | POST | `/api/teams` | Khởi tạo nhóm đồ án mới |
| **Team** | GET | `/api/teams` | Lấy danh sách nhóm người dùng đang tham gia |
| **Team** | GET | `/api/teams/{teamId}` | Lấy thông tin chi tiết nhóm đồ án |
| **Team** | POST | `/api/teams/{teamId}/members` | Mời / thêm thành viên vào nhóm đồ án |
| **Team** | GET | `/api/teams/{teamId}/members` | Lấy danh sách thành viên trong nhóm |
| **Team** | POST | `/api/teams/{teamId}/sprints` | Tạo mới Sprint cho nhóm đồ án |
| **Team** | GET | `/api/teams/{teamId}/sprints` | Lấy danh sách các Sprint của nhóm |
| **Consent** | POST | `/api/teams/{teamId}/consent` | Xác nhận đồng thuận chia sẻ dữ liệu hoạt động |
| **Consent** | GET | `/api/teams/{teamId}/consent/status` | Kiểm tra trạng thái đồng thuận của thành viên |
| **Board (Nội bộ)** | POST | `/api/boards` | Tạo bảng công việc nhóm (tự sinh 4 cột: To Do, In Progress, Review, Done) |
| **Board (Nội bộ)** | GET | `/api/boards/team/{teamId}` | Lấy bảng công việc Task Board của nhóm |
| **Board (Nội bộ)** | GET / PUT / DELETE | `/api/boards/{id}` | Xem chi tiết (kèm cột & thẻ) / chỉnh sửa / xóa bảng |
| **Board (Nội bộ)** | POST | `/api/boards/{boardId}/columns` | Thêm cột mới trên bảng công việc |
| **Board (Nội bộ)** | PUT / DELETE | `/api/boards/columns/{columnId}` | Cập nhật tên, thứ tự sắp xếp / xóa cột |
| **Board (Nội bộ)** | POST | `/api/boards/columns/{columnId}/cards` | Tạo thẻ công việc (tự động ghi `ActivityEvent` `CARD_CREATED`) |
| **Card (Nội bộ)** | GET / PUT / DELETE | `/api/cards/{cardId}` | Xem chi tiết thẻ / sửa thông tin / xóa thẻ |
| **Card (Nội bộ)** | PUT / PATCH | `/api/cards/{cardId}/assignee` | Phân công người phụ trách thẻ |
| **Card (Nội bộ)** | PUT / PATCH | `/api/cards/{cardId}/story-points` | Cập nhật Story Points (độ khó) cho thẻ |
| **Card (Nội bộ)** | PUT / PATCH | `/api/cards/{cardId}/due-date` | Cập nhật hạn chót (due date) cho thẻ |
| **Card (Nội bộ)** | PUT | `/api/cards/{cardId}/move` | Di chuyển thẻ giữa các cột (tự động ghi `CARD_MOVED` hoặc `CARD_COMPLETED` kèm `delay_days`, `is_on_time`) |
| **Contribution** | GET | `/api/contributions/summary` | Tổng hợp chỉ số đóng góp 4 chiều (D1 Output, D2 Reliability, D3 Collaboration, D4 Peer, % Final, cờ `isEnoughEvidence`, `suspicionFlag`) lọc theo Team và Sprint (dùng cho Radar Chart) |
| **Contribution** | GET | `/api/contributions/evidence` | Lấy danh sách bằng chứng truy vết hoạt động (`ActivityEvent` nguồn `BOARD`) |
| **Contribution** | POST | `/api/contributions/sprints/{sprintId}/calculate` | Kích hoạt tính toán điểm đóng góp cho Sprint theo `ScoringEngine` v1.1 |
| **Contribution** | GET | `/api/contributions/sprints/{sprintId}` | Lấy bảng điểm đóng góp của Sprint |
| **Activity** | GET | `/api/activities/team/{teamId}` | Danh sách sự kiện hoạt động bất biến của nhóm |
| **Activity** | GET | `/api/activities/sprint/{sprintId}` | Danh sách sự kiện hoạt động trong Sprint |
| **Peer Review** | GET | `/api/review-rounds/team/{teamId}` | Lấy danh sách đợt chấm chéo của nhóm |
| **Peer Review** | GET | `/api/review-rounds/sprint/{sprintId}` | Lấy đợt chấm chéo theo Sprint |
| **Peer Review** | POST | `/api/review-rounds/{roundId}/submissions` | Gửi phiếu chấm chéo ẩn danh (chất lượng, đúng hạn, hợp tác) |
| **Peer Review** | GET | `/api/review-rounds/{roundId}/results/{revieweeId}` | Kết quả chấm chéo tổng hợp ẩn danh (chỉ trả kết quả khi đủ ≥ 3 lượt) |
| **Report** | GET | `/api/reports/teams/{teamId}/sprints/{sprintId}/pdf` | Xuất báo cáo đóng góp Sprint định dạng PDF |
| **Sprint** | GET | `/api/sprints/{sprintId}` | Chi tiết thông tin Sprint |
| **Sprint** | PUT | `/api/sprints/{sprintId}/close` | Đóng Sprint và chốt dữ liệu |

> Danh sách trên là các API nội bộ thực tế của hệ thống, không phụ thuộc vào bất kỳ API ngoài nào của Trello.

---

## 9. Kiểm thử

**Backend**

```bash
cd fairshare-backend
./mvnw test              # Unit + integration test
./mvnw verify            # Kèm kiểm tra đóng gói
```

**Frontend**

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Test case và kết quả được ghi trong `docs/05-testing/`.

---

## 10. Quy ước làm việc

**Nhánh Git**
- `main`: bản ổn định, dùng để demo/nộp
- `develop`: nhánh tích hợp
- `feature/<module>-<mô-tả>`: phát triển tính năng
- `fix/<mô-tả>`: sửa lỗi

**Commit** (theo Conventional Commits):

```
feat(board): ghi ActivityEvent khi di chuyển thẻ sang cột Done
fix(peerreview): sửa lỗi lộ danh tính khi ít hơn 3 lượt đánh giá
docs(plan): cập nhật Gantt tuần 5
test(scoring): thêm test cho công thức đóng góp
```

**Pull Request**: cần ít nhất 1 người review, CI phải pass, gắn liên kết tới thẻ/task tương ứng trên Task Board của nhóm.

**Definition of Done**: code đã merge qua PR, có test tương ứng và pass, task board và log công việc đã cập nhật, demo được trên môi trường chung.

---

## 11. Bảo mật và quyền riêng tư

- Chỉ thu thập dữ liệu **tối thiểu** cần cho việc đo đóng góp và chỉ khi thành viên đã đồng ý.
- Token tích hợp Google (nếu bật) được mã hóa khi lưu; thành viên có thể thu hồi quyền và yêu cầu xóa dữ liệu.
- Dữ liệu Task Board do hệ thống tự quản lý; `ActivityEvent` nguồn `BOARD` được ghi tự động khi thao tác và không có API sửa/xóa, nhằm chống chỉnh sửa lịch sử để gian lận (CR-02).
- Không dùng dữ liệu cá nhân thật hoặc nhạy cảm khi demo; chỉ dùng dữ liệu mẫu hoặc dữ liệu của chính nhóm đã đồng ý.
- Kết quả của FairShare là **thông tin tham khảo**, không thay thế đánh giá của nhóm và giảng viên.
- Tuân thủ nguyên tắc bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.
- Phát hiện lỗ hổng: báo cho nhóm qua Issue (không công khai thông tin nhạy cảm).

---

## 12. Lộ trình phát triển (theo sprint)

| Giai đoạn | Thời gian | Trạng thái | Nội dung chính |
|---|---|:---:|---|
| Tuần 1 (Sprint 1) | 09/10 – 15/10/2026 | ✅ Hoàn thành | Khởi động dự án, Project Charter, Team Charter, khảo sát nhu cầu, xác định phạm vi MVP, WBS, Product Backlog ban đầu. |
| Tuần 2 (Sprint 2) | 16/10 – 22/10/2026 | ✅ Hoàn thành | Lập kế hoạch & thiết kế (Gantt, RACI, Risk Register, Communication Plan); kiến trúc hệ thống, ERD, prototype UI; spike kỹ thuật phát hiện Trello API bộc lộ hạn chế rate limit nghiêm ngặt. |
| Tuần 3 (Sprint 3) | 23/10 – 29/10/2026 | ✅ Hoàn thành | Nền tảng xác thực (JWT), quản lý nhóm, consent; đề xuất **CR-02 (29/10)** tự xây dựng **Task Board nội bộ** (`V10`, board/cột/thẻ, ghi `ActivityEvent` `BOARD`) thay thế Trello API; khởi tạo `ScoringEngine` v1. |
| Tuần 4 (Sprint 4) | 30/10 – 05/11/2026 | ✅ Hoàn thành | Hoàn thiện Task Board nội bộ (kéo thả Kanban, chi tiết thẻ, story points, hạn chót, log chống gian lận); Bảng đóng góp + truy vết bằng chứng (`ActivityEvent` nguồn `BOARD`); đề xuất **CR-03** (công thức tính điểm v1.1); môi trường Staging. |
| Tuần 5 (Sprint 5) | 06/11 – 12/11/2026 | 🔄 Đang thực hiện | Tích hợp biểu đồ Radar 4 chiều (D1–D4), bộ lọc Sprint & Thành viên trên Dashboard; hoàn thiện chấm chéo ẩn danh (ngưỡng ≥ 3 lượt); xuất báo cáo PDF; phân quyền board theo vai trò; gỡ triệt để mã legacy Trello; chuẩn bị UAT; **code freeze 12/11/2026**. |
| Tuần 6 (Sprint 6) | 13/11 – 19/11/2026 | ⬜ Chưa bắt đầu | Thử nghiệm chấp nhận người dùng (UAT ≥ 10 người); ghi nhận và sửa lỗi theo Defect Log; triển khai bản demo chính thức; viết tài liệu hướng dẫn và soạn thảo báo cáo song song. |
| Tuần 7 (Sprint 7) | 20/11 – 26/11/2026 | ⬜ Chưa bắt đầu | Chốt báo cáo toàn văn, slide thuyết trình, tập dượt thuyết trình (tất cả thành viên), rà soát checklist nghiệm thu, đóng dự án, **nộp bài chính thức 26/11/2026**. |

Chi tiết từng sprint xem `docs/sprint1.md` … `docs/sprint7.md`.

### Lịch sử thay đổi (Change Request)

| Mã | Ngày | Nội dung | Tài liệu |
|---|---|---|---|
| CR-02 | 29/10/2026 | Thay tích hợp Trello API bằng module Task Board nội bộ (bảng, cột, thẻ), ghi `ActivityEvent` nguồn `BOARD` | [`docs/CR02-Internal-Board-Module.md`](docs/CR02-Internal-Board-Module.md) |
| CR-03 | 09/11/2026 | Hiệu chỉnh trọng số `ScoringEngine` v1.1; công thức tổng hợp 3 thành phần | [`docs/CR03-Dieu-Chinh-Cong-Thuc-Dong-Gop.md`](docs/CR03-Dieu-Chinh-Cong-Thuc-Dong-Gop.md) |

---

## 13. Giới hạn đã biết

- Dữ liệu chỉ phản ánh hoạt động ghi trên Task Board nội bộ (và Google Docs nếu bật); công việc ngoài hệ thống (họp, nghiên cứu, thiết kế offline) cần khai báo thủ công.
- Vì board là nội bộ, nhóm phải thực sự dùng FairShare để quản lý công việc; việc làm ngoài board không được tính trừ khi khai báo thủ công.
- Số task hoặc số lần chỉnh sửa không phản ánh hoàn toàn chất lượng công việc.
- Ẩn danh trong nhóm nhỏ chỉ ở mức tương đối.
- Tích hợp Google Docs có thể bị hạn chế bởi chính sách OAuth của Google.
- Module Trello legacy (cả backend và frontend) đã được gỡ bỏ hoàn toàn ở Sprint 5, bảo toàn tương thích ngược cho dữ liệu cũ qua enum `ActivitySource.TRELLO`.

---

## 14. Nhóm thực hiện

| Họ tên | MSSV | Vai trò |
|---|---|---|
| Nguyễn Văn Minh Triều (Nhóm trưởng) | 31241027455 | PM hệ thống chung |
| Hà Ngọc Thiện | 31241021658 | PM phân tích nghiệp vụ |
| Nguyễn Phúc Vương | 31241025017 | PM Backend/API & Tích hợp |
| Ngô Trọng Phúc | 31241020074 | PM Web Frontend |
| Triệu Nguyễn Huỳnh Khang | 31241022785 | PM Database/Data |
| Khiếu Hoàng Nam Anh | 31241022203 | PM QA & Deployment |

**Giảng viên hướng dẫn:** TS. Nguyễn Mạnh Tuấn – Khoa CNTTKD, UEH  
**Môn học:** Quản lý dự án CNTT  

---

## 15. Giấy phép

Dự án này được phân phối dưới giấy phép **MIT License**. Xem chi tiết tại tập tin [LICENSE](LICENSE).
