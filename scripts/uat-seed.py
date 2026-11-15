#!/usr/bin/env python3
"""
Tạo tài khoản thử và dữ liệu mẫu cho UAT Sprint 6 trên staging (WP5 – M5).

Cách chạy (staging đang chạy):
    python3 scripts/uat-seed.py [BASE_URL]          # mặc định http://localhost:8081
    Windows:  py -X utf8 scripts/uat-seed.py

Kết quả:
  - 12 tài khoản uat01..uat12@fairshare.test, dùng chung 1 mật khẩu.
    Mật khẩu lấy từ biến môi trường UAT_PASSWORD; nếu không có thì sinh ngẫu nhiên.
  - Nhóm demo "UAT – Nhóm A (dữ liệu mẫu)": Leader uat01, thành viên uat02..uat05, đã đồng thuận,
    board có 10 card ở các cột (có card xong đúng hạn, trễ hạn, đang làm), 1 khai báo đóng góp
    chờ duyệt, 1 đợt chấm chéo đang mở (uat01 đã có đủ 3 phiếu để thấy kết quả).
  - uat06..uat12 chưa vào nhóm nào: dùng cho kịch bản UAT-M2-01..05 (tạo nhóm, mời, consent, sprint).
  - docs/qa/uat/uat-accounts.md: danh sách tài khoản (KHÔNG có mật khẩu) -> commit được.
  - .uat-credentials.local: email + mật khẩu -> đã có trong .gitignore, chỉ gửi riêng cho M2.
Chạy lại nhiều lần được: tài khoản đã có thì đăng nhập lại, không tạo trùng.
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
PASSWORD = os.environ.get("UAT_PASSWORD") or (
    "Uat@" + "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8)))
CRED_FILE = os.path.join(REPO, ".uat-credentials.local")
if os.path.exists(CRED_FILE) and not os.environ.get("UAT_PASSWORD"):
    # Chạy lại: dùng lại mật khẩu đã sinh lần trước
    with open(CRED_FILE, encoding="utf-8") as f:
        for line in f:
            if line.startswith("PASSWORD="):
                PASSWORD = line.split("=", 1)[1].strip()

NAMES = ["Nguyễn Minh Anh", "Trần Gia Bảo", "Lê Thu Cúc", "Phạm Đức Duy", "Võ Hải Đăng", "Đỗ Ngọc Hân",
         "Bùi Quang Huy", "Hồ Thanh Lam", "Ngô Bảo Ngọc", "Dương Tuấn Phong", "Lý Mỹ Quyên", "Mai Anh Tú"]


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


def account(i):
    email, name = f"uat{i:02d}@fairshare.test", NAMES[i - 1]
    st, r = call("POST", "/api/auth/register", {"email": email, "password": PASSWORD, "fullName": name})
    if st not in (200, 201):
        st, r = call("POST", "/api/auth/login", {"email": email, "password": PASSWORD})
    assert st == 200 or st == 201, f"{email}: {st} {r}"
    d = data(r)
    return {"email": email, "name": name, "id": d["user"]["id"], "token": d["accessToken"]}


def ok(st, r, what):
    assert st in (200, 201), f"{what}: HTTP {st} {r}"
    return data(r)


print(f"== UAT seed trên {BASE}")
U = [None] + [account(i) for i in range(1, 13)]
print(f"   12 tài khoản sẵn sàng (uat01..uat12, id {U[1]['id']}..{U[12]['id']})")
lead, members = U[1], U[2:6]

# ---- Nhóm A (dữ liệu mẫu)
st, r = call("GET", "/api/teams", token=lead["token"])
teams = data(r) if st == 200 else []
team = next((t for t in teams or [] if t.get("name", "").startswith("UAT – Nhóm A")), None)
if team:
    print(f"   Nhóm A đã có (id {team['id']}) -> bỏ qua tạo dữ liệu")
else:
    team = ok(*call("POST", "/api/teams", {"name": "UAT – Nhóm A (dữ liệu mẫu)",
                                          "courseName": "Quản lý dự án CNTT – UEH",
                                          "description": "Dữ liệu mẫu cho UAT Sprint 6"}, lead["token"]), "tạo nhóm")
    tid = team["id"]
    for m in members:
        ok(*call("POST", f"/api/teams/{tid}/members", {"email": m["email"]}, lead["token"]), f"mời {m['email']}")
        ok(*call("POST", f"/api/teams/{tid}/consent", {"consented": True}, m["token"]), f"consent {m['email']}")
    sprints = ok(*call("GET", f"/api/teams/{tid}/sprints", token=lead["token"]), "sprints")
    sid = sprints[0]["id"]
    boards = ok(*call("GET", f"/api/boards/team/{tid}", token=lead["token"]), "board")
    board = boards[0]
    cols = {c["name"]: c["id"] for c in board["columns"]}
    todo, doing, done = cols.get("To Do"), cols.get("In Progress"), cols.get("Done")
    assert todo and doing and done, f"Board không có đủ cột To Do / In Progress / Done: {list(cols)}"
    now = datetime.now()
    cards = [  # (tiêu đề, người phụ trách, SP, độ khó, hạn so với bây giờ, cột cuối)
        ("Viết Project Charter", lead, 3, 2, 2, "Done"),
        ("Khảo sát pain points (10 sinh viên)", members[0], 5, 3, 1, "Done"),
        ("Thiết kế ERD bản đầu", members[1], 5, 3, -1, "Done"),        # hoàn thành trễ hạn
        ("API đăng ký / đăng nhập", members[2], 8, 4, 3, "Done"),
        ("Màn hình Dashboard", members[3], 5, 3, 4, "In Progress"),
        ("Dockerfile backend", members[2], 3, 2, 5, "In Progress"),
        ("Kịch bản UAT", members[0], 3, 2, 6, "To Do"),
        ("Viết báo cáo tuần", lead, 2, 1, 2, "To Do"),
        ("Form chấm chéo", members[1], 5, 3, 7, "To Do"),
        ("Unit test chấm chéo", members[3], 3, 2, 7, "To Do"),
    ]
    for title, who, sp, diff, due_days, final in cards:
        due = (now + timedelta(days=due_days)).strftime("%Y-%m-%dT%H:%M:%S")
        c = ok(*call("POST", f"/api/boards/columns/{todo}/cards",
                     {"title": title, "assigneeId": who["id"], "storyPoints": sp, "difficultyLevel": diff,
                      "dueDate": due, "description": "Dữ liệu mẫu UAT"}, lead["token"]), f"card {title}")
        if due_days < 0:  # card trễ hạn: đặt hạn về quá khứ rồi mới hoàn thành
            call("PUT", f"/api/cards/{c['id']}/due-date",
                 {"dueDate": (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")}, lead["token"])
        if final in ("In Progress", "Done"):
            ok(*call("PUT", f"/api/cards/{c['id']}/move", {"targetColumnId": doing}, who["token"]), f"move {title}")
        if final == "Done":
            ok(*call("PUT", f"/api/cards/{c['id']}/move", {"targetColumnId": done}, who["token"]), f"done {title}")
    call("POST", f"/api/contributions/sprints/{sid}/calculate", token=lead["token"])
    # Khai báo đóng góp ngoài board, chờ thành viên khác duyệt
    call("POST", f"/api/contributions/manual?teamId={tid}&sprintId={sid}&userId={members[0]['id']}",
         {"taskName": "Họp phỏng vấn giảng viên về tiêu chí chấm", "storyPoints": 2,
          "evidenceLink": "https://example.com/bien-ban-hop"}, members[0]["token"])
    # Đợt chấm chéo đang mở; uat01 đã có 3 phiếu (đủ ngưỡng ẩn danh)
    rr = ok(*call("POST", f"/api/review-rounds/sprint/{sid}",
                  {"name": "Chấm chéo Sprint 1 (UAT)",
                   "startDate": (now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S"),
                   "endDate": (now + timedelta(days=4)).strftime("%Y-%m-%dT%H:%M:%S")}, lead["token"]), "đợt chấm")
    ok(*call("POST", f"/api/review-rounds/{rr['id']}/open", token=lead["token"]), "mở đợt chấm")
    for reviewer, score in ((members[0], 4), (members[1], 5), (members[2], 4)):
        call("POST", f"/api/review-rounds/{rr['id']}/submissions",
             {"revieweeId": lead["id"], "scores": [{"criterion": "QUALITY", "score": score},
                                                   {"criterion": "PUNCTUALITY", "score": score},
                                                   {"criterion": "COOPERATION", "score": score}],
              "feedback": "Phiếu mẫu UAT"}, reviewer["token"])
    print(f"   Nhóm A id {tid}: sprint {sid}, board {board['id']}, 10 card, đợt chấm {rr['id']} (OPEN)")

# ---- Xuất danh sách
os.makedirs(os.path.join(REPO, "docs", "qa", "uat"), exist_ok=True)
with open(os.path.join(REPO, "docs", "qa", "uat", "uat-accounts.md"), "w", encoding="utf-8", newline="\n") as f:
    f.write("# Tài khoản thử UAT – Sprint 6\n\n")
    f.write(f"**Tạo bởi:** `scripts/uat-seed.py` (M5) – {datetime.now():%d/%m/%Y %H:%M} | **Môi trường:** {BASE}\n\n")
    f.write("> Mật khẩu dùng chung **không ghi ở đây**. M5 gửi riêng cho M2 (file `.uat-credentials.local`, không commit).\n\n")
    f.write("| Tài khoản | Họ tên (giả) | Dùng cho |\n|---|---|---|\n")
    for i in range(1, 13):
        use = ("Leader nhóm A (dữ liệu mẫu): board, dashboard, mở/đóng chấm chéo, xuất PDF" if i == 1 else
               "Thành viên nhóm A: kéo thẻ, chấm chéo, khai báo/duyệt đóng góp" if i <= 5 else
               "Chưa vào nhóm: kịch bản UAT-M2-01..05 (tạo nhóm, mời, consent, sprint)")
        f.write(f"| `{U[i]['email']}` | {U[i]['name']} | {use} |\n")
with open(CRED_FILE, "w", encoding="utf-8", newline="\n") as f:
    f.write(f"# Tài khoản UAT FairShare – {BASE} – KHÔNG commit\nPASSWORD={PASSWORD}\n")
    for i in range(1, 13):
        f.write(f"{U[i]['email']}\n")
print("   Đã ghi docs/qa/uat/uat-accounts.md và .uat-credentials.local")
