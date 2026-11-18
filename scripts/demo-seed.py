#!/usr/bin/env python3
"""
Tạo tài khoản demo và dữ liệu mẫu cho buổi demo / release (WP5 – M5), dùng lại logic scripts/uat-seed.py.

Cách chạy (môi trường demo đang chạy, CSDL nên là bản mới reset):
    python3 scripts/demo-seed.py [BASE_URL]          # mặc định http://localhost:8081
    Windows:  py -X utf8 scripts/demo-seed.py [BASE_URL]

Kết quả:
  - 5 tài khoản demo01..demo05@fairshare.test, dùng chung 1 mật khẩu.
    Mật khẩu lấy từ biến môi trường DEMO_PASSWORD; nếu không có thì sinh ngẫu nhiên
    (chạy lại thì dùng lại mật khẩu trong .demo-credentials.local).
  - Nhóm "Nhóm 07 – FairShare (demo)": Leader demo01, thành viên demo02..demo05, đều đã đồng thuận.
    Board 12 thẻ: 6 Done (có 1 thẻ trễ hạn), 2 Review, 2 In Progress, 2 To Do -> Dashboard có tỷ lệ khác nhau.
    Đợt chấm chéo đang mở: demo01 và demo02 có đủ 3 phiếu (thấy điểm), demo03 chỉ 2 phiếu (minh họa ẩn danh).
  - docs/deploy/demo-accounts.md: danh sách tài khoản và vai trò (KHÔNG có mật khẩu) -> commit được.
  - .demo-credentials.local: email + mật khẩu -> .gitignore, chỉ M5/M0 giữ.
Thẻ chỉ được kéo một chiều To Do -> In Progress -> Review -> Done (tránh DEF-41: kéo qua lại tự cộng điểm).
Không tạo khai báo đóng góp thủ công (DEF-31 chưa sửa).
"""
import json
import os
import secrets
import string
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8081").rstrip("/")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CRED_FILE = os.path.join(REPO, ".demo-credentials.local")
PASSWORD = os.environ.get("DEMO_PASSWORD") or (
    "Demo#" + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10)))
if os.path.exists(CRED_FILE) and not os.environ.get("DEMO_PASSWORD"):
    with open(CRED_FILE, encoding="utf-8") as f:
        for line in f:
            if line.startswith("PASSWORD="):
                PASSWORD = line.split("=", 1)[1].strip()

PEOPLE = [  # (họ tên giả, vai trò hiển thị khi demo)
    ("Phan Minh Khôi", "Leader – mở/đóng chấm chéo, xuất PDF"),
    ("Trịnh Ngọc Lan", "Thành viên – nhiều đóng góp nhất"),
    ("Đoàn Quốc Bình", "Thành viên – có thẻ hoàn thành trễ hạn"),
    ("Lâm Thảo My", "Thành viên – dưới ngưỡng 3 phiếu (minh họa ẩn danh)"),
    ("Tạ Văn Sơn", "Thành viên – ít đóng góp (minh họa cảnh báo)"),
]
TEAM_NAME = "Nhóm 07 – FairShare (demo)"


def call(method, path, body=None, token=None):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode() or "null"
            return r.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw) if raw else None
        except ValueError:
            return e.code, raw


def data(resp):
    return resp.get("data") if isinstance(resp, dict) and "data" in resp else resp


def ok(st, r, what):
    assert st in (200, 201), f"{what}: HTTP {st} {r}"
    return data(r)


def account(i):
    email, (name, _) = f"demo{i:02d}@fairshare.test", PEOPLE[i - 1]
    st, r = call("POST", "/api/auth/register", {"email": email, "password": PASSWORD, "fullName": name})
    if st not in (200, 201):
        st, r = call("POST", "/api/auth/login", {"email": email, "password": PASSWORD})
    assert st in (200, 201), f"{email}: HTTP {st} (tài khoản đã có với mật khẩu khác? xóa CSDL hoặc đặt DEMO_PASSWORD)"
    d = data(r)
    return {"email": email, "name": name, "id": d["user"]["id"], "token": d["accessToken"]}


print(f"== Demo seed trên {BASE}")
U = [None] + [account(i) for i in range(1, 6)]
lead, mem = U[1], U[2:6]
print(f"   5 tài khoản demo sẵn sàng (id {U[1]['id']}..{U[5]['id']})")

st, r = call("GET", "/api/teams", token=lead["token"])
team = next((t for t in (data(r) if st == 200 else []) or [] if t.get("name") == TEAM_NAME), None)
if team:
    print(f"   Nhóm demo đã có (id {team['id']}) -> bỏ qua tạo dữ liệu")
else:
    team = ok(*call("POST", "/api/teams", {"name": TEAM_NAME, "courseName": "Quản lý dự án CNTT – UEH",
                                           "description": "Dữ liệu demo FairShare v1.0"}, lead["token"]), "tạo nhóm")
    tid = team["id"]
    for m in mem:
        ok(*call("POST", f"/api/teams/{tid}/members", {"email": m["email"]}, lead["token"]), f"mời {m['email']}")
        ok(*call("POST", f"/api/teams/{tid}/consent", {"consented": True}, m["token"]), f"consent {m['email']}")
    call("POST", f"/api/teams/{tid}/consent", {"consented": True}, lead["token"])
    sid = ok(*call("GET", f"/api/teams/{tid}/sprints", token=lead["token"]), "sprints")[0]["id"]
    board = ok(*call("GET", f"/api/boards/team/{tid}", token=lead["token"]), "board")[0]
    cols = {c["name"]: c["id"] for c in board["columns"]}
    for need in ("To Do", "In Progress", "Review", "Done"):
        assert need in cols, f"Board thiếu cột {need}: {list(cols)}"
    now = datetime.now()
    a, b, c, d = mem
    cards = [  # (tiêu đề, người phụ trách, SP, độ khó, hạn so với bây giờ (ngày), cột cuối, người review)
        ("Project Charter và phạm vi MVP", lead, 3, 2, 3, "Done", a),
        ("Khảo sát 30 sinh viên về free-rider", a, 5, 3, 2, "Done", b),
        ("Thiết kế ERD và migration Flyway", a, 8, 4, 2, "Done", lead),
        ("API Task Board nội bộ (CR-02)", b, 8, 4, -1, "Done", a),          # hoàn thành trễ hạn
        ("Màn hình Dashboard đóng góp", a, 5, 3, 3, "Done", c),
        ("Kiểm thử tích hợp Sprint 4", c, 3, 2, 3, "Done", a),
        ("Form chấm chéo ẩn danh", b, 5, 3, 4, "Review", a),
        ("Xuất báo cáo PDF tiếng Việt", lead, 5, 3, 4, "Review", b),
        ("Cảnh báo thành viên không hoạt động", c, 3, 2, 5, "In Progress", None),
        ("User guide có ảnh màn hình", d, 2, 1, 5, "In Progress", None),
        ("Slide Sprint Review", d, 2, 1, 6, "To Do", None),
        ("Retro và kế hoạch Sprint 7", lead, 1, 1, 7, "To Do", None),
    ]
    order = ["To Do", "In Progress", "Review", "Done"]
    for title, who, sp, diff, due_days, final, reviewer in cards:
        due = (now + timedelta(days=max(due_days, 1))).strftime("%Y-%m-%dT%H:%M:%S")
        card = ok(*call("POST", f"/api/boards/columns/{cols['To Do']}/cards",
                        {"title": title, "assigneeId": who["id"], "storyPoints": sp, "difficultyLevel": diff,
                         "dueDate": due, "description": "Dữ liệu demo"}, lead["token"]), f"thẻ {title}")
        if due_days < 0:   # thẻ trễ hạn: đặt hạn về quá khứ trước khi hoàn thành
            call("PUT", f"/api/boards/cards/{card['id']}/due-date",
                 {"dueDate": (now + timedelta(days=due_days)).strftime("%Y-%m-%dT%H:%M:%S")}, lead["token"])
        # Kéo một chiều tới cột cuối; vào Review do người review kéo (khác người phụ trách)
        for col in order[1:order.index(final) + 1]:
            actor = reviewer if (col == "Review" and reviewer) else who
            ok(*call("PUT", f"/api/boards/cards/{card['id']}/move", {"targetColumnId": cols[col]},
                     actor["token"]), f"kéo {title} -> {col}")
    call("POST", f"/api/contributions/sprints/{sid}/calculate", token=lead["token"])
    rr = ok(*call("POST", f"/api/review-rounds/sprint/{sid}",
                  {"name": "Chấm chéo Sprint 1 (demo)",
                   "startDate": (now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S"),
                   "endDate": (now + timedelta(days=5)).strftime("%Y-%m-%dT%H:%M:%S")}, lead["token"]), "đợt chấm")
    ok(*call("POST", f"/api/review-rounds/{rr['id']}/open", token=lead["token"]), "mở đợt chấm")
    plan = {lead["id"]: [(a, 5), (b, 4), (c, 4)],          # đủ 3 phiếu -> thấy điểm
            a["id"]: [(lead, 5), (b, 5), (c, 4)],          # đủ 3 phiếu
            c["id"]: [(a, 3), (b, 4)]}                     # 2 phiếu -> ẩn điểm (anonymity guard)
    for reviewee, reviews in plan.items():
        for reviewer, score in reviews:
            ok(*call("POST", f"/api/review-rounds/{rr['id']}/submissions",
                     {"revieweeId": reviewee, "scores": [{"criterion": k, "score": score}
                                                         for k in ("QUALITY", "PUNCTUALITY", "COOPERATION")],
                      "feedback": "Phiếu mẫu demo"}, reviewer["token"]), "phiếu chấm")
    print(f"   Nhóm demo id {tid}: sprint {sid}, board {board['id']}, 12 thẻ, đợt chấm {rr['id']} (OPEN)")

os.makedirs(os.path.join(REPO, "docs", "deploy"), exist_ok=True)
with open(os.path.join(REPO, "docs", "deploy", "demo-accounts.md"), "w", encoding="utf-8", newline="\n") as f:
    f.write("# Tài khoản demo – FairShare v1.0\n\n")
    f.write(f"**Tạo bởi:** `scripts/demo-seed.py` (M5) – {datetime.now():%d/%m/%Y %H:%M} | **Môi trường:** {BASE}\n\n")
    f.write("> Mật khẩu dùng chung **không ghi ở đây** (file `.demo-credentials.local` trên máy chạy demo, không commit).\n\n")
    f.write(f"Nhóm: **{TEAM_NAME}**\n\n| Tài khoản | Họ tên (giả) | Vai trò khi demo |\n|---|---|---|\n")
    for i in range(1, 6):
        f.write(f"| `{U[i]['email']}` | {U[i]['name']} | {PEOPLE[i - 1][1]} |\n")
with open(CRED_FILE, "w", encoding="utf-8", newline="\n") as f:
    f.write(f"# Tài khoản demo FairShare – {BASE} – KHÔNG commit\nPASSWORD={PASSWORD}\n")
    for i in range(1, 6):
        f.write(f"{U[i]['email']}\n")
print("   Đã ghi docs/deploy/demo-accounts.md và .demo-credentials.local")
