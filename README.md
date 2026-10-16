# FairShare

**Nền tảng đo lường và minh bạch hóa mức đóng góp trong đồ án nhóm**

Đồ án nhóm môn *Quản lý dự án CNTT* – Trường Đại học Kinh tế TP.HCM (UEH).

> Trạng thái: đang phát triển (MVP). Cấu trúc thư mục dưới đây là cấu trúc đích của dự án; một số thư mục/tập tin sẽ được bổ sung dần theo từng sprint.

---

## 1. Giới thiệu

### 1.1 Vấn đề
Trong đồ án nhóm thường xuất hiện tình trạng free-rider: leader khó chứng minh ai làm ít, thành viên làm nhiều bị thiệt thòi, giảng viên không có dữ liệu để chấm điểm cá nhân.

### 1.2 Giải pháp
FairShare giúp nhóm sinh viên theo dõi **ai đã làm gì, bao nhiêu và khi nào** trong suốt học kỳ, từ đó tạo bản đánh giá đóng góp có bằng chứng để nhóm tự chia điểm và giảng viên tham khảo khi chấm.

### 1.3 Điểm khác biệt
- Ứng dụng quản lý task chỉ cho biết việc nào đã xong.
- FairShare tự thu thập dữ liệu thật từ công cụ nhóm đang dùng, có bằng chứng truy vết và có cơ chế chấm chéo ẩn danh.
- FairShare là **công cụ hỗ trợ ra quyết định**, không tự quyết định điểm cuối cùng.

### 1.4 Tính năng MVP

| # | Tính năng | Trạng thái |
|---|---|---|
| 1 | Đăng nhập, tạo nhóm, mời thành viên, đồng ý chia sẻ dữ liệu (consent) | Bắt buộc |
| 2 | Tích hợp Trello: tự động ghi nhận task hoàn thành | Bắt buộc |
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
| Quản lý dự án | Trello, GitHub, MS Project/GanttProject |

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
├── backend/                          # Spring Boot (Maven)
│   ├── pom.xml
│   ├── Dockerfile
│   ├── mvnw / mvnw.cmd
│   └── src/
│       ├── main/
│       │   ├── java/com/fairshare/
│       │   │   ├── FairShareApplication.java
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
│       │   │   ├── integration/               # Tích hợp bên ngoài
│       │   │   │   ├── common/
│       │   │   │   │   ├── IntegrationAdapter.java
│       │   │   │   │   ├── SyncResult.java
│       │   │   │   │   └── SyncScheduler.java
│       │   │   │   ├── trello/
│       │   │   │   │   ├── controller/TrelloController.java
│       │   │   │   │   ├── client/TrelloClient.java
│       │   │   │   │   ├── service/TrelloSyncService.java
│       │   │   │   │   ├── mapper/TrelloEventMapper.java
│       │   │   │   │   └── dto/
│       │   │   │   └── googledocs/            # Có điều kiện (Sprint 4)
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
│       │       │   └── V5__alert.sql
│       │       ├── templates/report/           # Mẫu báo cáo PDF
│       │       └── seed/
│       │           └── sample_data.sql         # Dữ liệu mẫu (ghi rõ nguồn)
│       │
│       └── test/
│           ├── java/com/fairshare/
│           │   ├── auth/
│           │   ├── integration/trello/
│           │   ├── contribution/ScoringEngineTest.java
│           │   ├── peerreview/AnonymityAggregatorTest.java
│           │   └── report/
│           └── resources/
│               ├── application-test.yml
│               └── fixtures/trello/            # JSON mẫu giả lập Trello API
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
│       │   ├── integration.api.ts
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
│       │   ├── integration/
│       │   │   ├── ConnectTrelloPage.tsx
│       │   │   └── SyncStatusCard.tsx
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
| `backend/` | API Spring Boot, tổ chức theo module nghiệp vụ (auth, team, integration, contribution, peerreview, report...) |
| `frontend/` | Giao diện React TS, tổ chức theo `features/` (mỗi tính năng một thư mục) |
| `database/` | ERD, script khởi tạo CSDL. Migration chính nằm trong `backend/src/main/resources/db/migration` |
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
                                             │ REST (OAuth/token)
                                             ▼
                                   ┌──────────────────┐
                                   │ Trello API       │
                                   │ Google Docs API* │   (*có điều kiện)
                                   └──────────────────┘
```

Luồng dữ liệu chính:
1. Thành viên đồng ý chia sẻ dữ liệu (consent) và kết nối Trello.
2. Backend đồng bộ board/card/action của Trello thành các `ActivityEvent` (bằng chứng gốc).
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
| `TRELLO_API_KEY` | API key ứng dụng Trello | `...` |
| `TRELLO_API_SECRET` | Secret ứng dụng Trello (nếu dùng) | `...` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (có điều kiện) | `...` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (có điều kiện) | `...` |
| `APP_FRONTEND_URL` | URL frontend (cho CORS/redirect) | `http://localhost:5173` |
| `VITE_API_BASE_URL` | URL backend mà frontend gọi tới | `http://localhost:8080/api` |

> **Không commit file `.env` hoặc bất kỳ khóa/token thật nào lên Git.** Chỉ commit `.env.example`.

### 6.3 Cách 1: Chạy bằng Docker Compose (nhanh nhất)

```bash
docker compose up --build
```

Sau khi khởi động:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- MariaDB: `localhost:3306`

Dừng và xóa container:

```bash
docker compose down        # giữ dữ liệu
docker compose down -v     # xóa cả dữ liệu
```

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

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

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
4. **Kết nối Trello**: vào mục *Tích hợp*, chọn *Kết nối Trello*, cấp quyền và chọn board của nhóm.
5. Theo dõi **Bảng đóng góp** theo thời gian thực (tỷ lệ từng người, bằng chứng truy vết).
6. Cuối mỗi sprint, **mở đợt chấm chéo** và nhắc thành viên hoàn thành.
7. Khi cần nộp cho giảng viên, nhấn **Xuất báo cáo PDF**.

### 7.2 Dành cho thành viên
1. Nhận lời mời và đăng nhập.
2. Đọc và **đồng ý chia sẻ dữ liệu (consent)** để dữ liệu của bạn được tính vào bảng đóng góp.
3. Kết nối tài khoản Trello của mình nếu được yêu cầu.
4. Xem phần đóng góp của bản thân và bằng chứng đi kèm; nếu có việc ngoài Trello, **khai báo đóng góp thủ công** để các thành viên khác xác nhận.
5. Cuối sprint, **chấm chéo ẩn danh** các thành viên khác theo tiêu chí: chất lượng, đúng hạn, tinh thần hợp tác.

### 7.3 Dành cho giảng viên
- Nhận file PDF báo cáo đóng góp do nhóm xuất ra.
- Báo cáo chỉ mang tính **tham khảo**, nên đối chiếu thêm với quan sát thực tế.

### 7.4 Lưu ý về chấm chéo ẩn danh
- Danh tính người chấm không được hiển thị; kết quả chỉ được tổng hợp khi có tối thiểu số lượt đánh giá theo cấu hình.
- Với nhóm nhỏ, ẩn danh có giới hạn (có thể suy đoán). Hãy xem phần giới hạn trong `docs/03-analysis-design/privacy-and-consent.md`.

---

## 8. API chính (tóm tắt)

Tài liệu đầy đủ xem tại Swagger UI (`/swagger-ui.html`) hoặc `docs/api/openapi.yaml`.

| Nhóm | Phương thức | Đường dẫn | Mô tả |
|---|---|---|---|
| Auth | POST | `/api/auth/register` | Đăng ký |
| Auth | POST | `/api/auth/login` | Đăng nhập, nhận JWT |
| Team | POST | `/api/teams` | Tạo nhóm |
| Team | GET | `/api/teams/{id}` | Chi tiết nhóm |
| Team | POST | `/api/teams/{id}/members` | Mời thành viên |
| Team | POST | `/api/teams/{id}/consent` | Xác nhận đồng ý chia sẻ dữ liệu |
| Integration | POST | `/api/teams/{id}/integrations/trello` | Kết nối Trello |
| Integration | POST | `/api/teams/{id}/integrations/trello/sync` | Đồng bộ thủ công |
| Contribution | GET | `/api/teams/{id}/contributions` | Tỷ lệ đóng góp (lọc theo sprint) |
| Contribution | GET | `/api/teams/{id}/contributions/{userId}/evidence` | Bằng chứng truy vết của một người |
| Contribution | POST | `/api/teams/{id}/contributions/manual` | Khai báo đóng góp thủ công |
| Peer review | POST | `/api/teams/{id}/review-rounds` | Mở đợt chấm chéo |
| Peer review | POST | `/api/review-rounds/{id}/submissions` | Gửi đánh giá |
| Peer review | GET | `/api/review-rounds/{id}/results` | Kết quả tổng hợp (ẩn danh) |
| Report | GET | `/api/teams/{id}/report.pdf` | Xuất báo cáo PDF |

> Danh sách trên là thiết kế dự kiến, có thể thay đổi theo từng sprint.

---

## 9. Kiểm thử

**Backend**

```bash
cd backend
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
feat(trello): thêm đồng bộ card hoàn thành
fix(peerreview): sửa lỗi lộ danh tính khi ít hơn 3 lượt đánh giá
docs(plan): cập nhật Gantt tuần 5
test(scoring): thêm test cho công thức đóng góp
```

**Pull Request**: cần ít nhất 1 người review, CI phải pass, gắn liên kết tới task Trello.

**Definition of Done**: code đã merge qua PR, có test tương ứng và pass, task board và log công việc đã cập nhật, demo được trên môi trường chung.

---

## 11. Bảo mật và quyền riêng tư

- Chỉ thu thập dữ liệu **tối thiểu** cần cho việc đo đóng góp và chỉ khi thành viên đã đồng ý.
- Token tích hợp (Trello/Google) được mã hóa khi lưu; thành viên có thể thu hồi quyền và yêu cầu xóa dữ liệu.
- Không dùng dữ liệu cá nhân thật hoặc nhạy cảm khi demo; chỉ dùng dữ liệu mẫu hoặc dữ liệu của chính nhóm đã đồng ý.
- Kết quả của FairShare là **thông tin tham khảo**, không thay thế đánh giá của nhóm và giảng viên.
- Tuân thủ nguyên tắc bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP.
- Phát hiện lỗ hổng: báo cho nhóm qua Issue (không công khai thông tin nhạy cảm).

---

## 12. Lộ trình phát triển (theo sprint)

| Giai đoạn | Nội dung chính |
|---|---|
| Tuần 1–3 | Khởi động, phân tích, thiết kế, spike kỹ thuật Trello/Google |
| Sprint 1 (Tuần 4) | Khung dự án, xác thực, quản lý nhóm, consent, đồng bộ Trello |
| Sprint 2 (Tuần 5) | Công thức đóng góp, bảng đóng góp, truy vết bằng chứng |
| Sprint 3 (Tuần 6) | Chấm chéo ẩn danh, xuất PDF, kiểm thử tích hợp |
| Sprint 4 (Tuần 7) | UAT, sửa lỗi, triển khai demo, tính năng có điều kiện |
| Tuần 8 | Đóng dự án, báo cáo cuối kỳ |

Chi tiết xem `docs/02-planning/plan-PM.md`.

---

## 13. Giới hạn đã biết

- Dữ liệu chỉ phản ánh hoạt động có trên công cụ đã tích hợp; công việc ngoài hệ thống (họp, nghiên cứu, thiết kế offline) cần khai báo thủ công.
- Số task hoặc số lần chỉnh sửa không phản ánh hoàn toàn chất lượng công việc.
- Ẩn danh trong nhóm nhỏ chỉ ở mức tương đối.
- Tích hợp Google Docs có thể bị hạn chế bởi chính sách OAuth của Google.

---

## 14. Nhóm thực hiện

| Họ tên | MSSV | Vai trò |
|---|---|---|
| [ ] (Nhóm trưởng) | [ ] | PM hệ thống chung |
| [ ] | [ ] | PM phân tích nghiệp vụ |
| [ ] | [ ] | PM Backend/API & Tích hợp |
| [ ] | [ ] | PM Web Frontend |
| [ ] | [ ] | PM Database/Data |
| [ ] | [ ] | PM QA & Deployment |

**Giảng viên hướng dẫn:** TS. Nguyễn Mạnh Tuấn – Khoa CNTTKD, UEH
**Môn học:** Quản lý dự án CNTT

---

## 15. Giấy phép

Dự án thực hiện cho mục đích học tập. Chọn giấy phép phù hợp (ví dụ MIT) và cập nhật tập tin `LICENSE` trước khi công khai mã nguồn.
