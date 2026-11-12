#!/usr/bin/env python3
"""
Test tích hợp Sprint 4 (WP5 – M5) chạy trên môi trường STAGING thật
(Nginx -> Spring Boot -> MariaDB + Flyway + stored procedure + trigger).

Luồng 1 (IT-BRD-*): Board/Card -> ActivityEvent -> API tổng hợp đóng góp / truy vết
Luồng 2 (IT-PR-*) : Chấm chéo -> lưu DB -> kết quả ẩn danh (ngưỡng >= 3 lượt)

Cách chạy (sau khi ./scripts/staging-up.sh báo PASS):
    python3 scripts/integration-sprint4.py [BASE_URL]      # mặc định http://localhost:8081
Kết quả: in bảng ra màn hình và ghi docs/qa/integration-result-sprint4.json
Thoát với mã 1 nếu có ca FAIL (để CI/người chạy thấy ngay).

Cập nhật 10/11: đợt chấm được tạo/mở qua API mới của M4 (POST /api/review-rounds/sprint/{id}, /open);
SQL trong container DB chỉ dùng để đối chiếu dữ liệu đã lưu.
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8081").rstrip("/")
PROJECT = os.environ.get("STAGING_PROJECT", "fairshare-staging")
ENV_FILE = os.environ.get("STAGING_ENV_FILE", ".env.staging")
RUN = f"{int(time.time())}"
results = []


# ----------------------------------------------------------------------------- helpers
def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
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
    """Bóc lớp ApiResponse {success, message, data} nếu có."""
    return resp.get("data") if isinstance(resp, dict) and "data" in resp else resp


def check(tc, name, expected, actual, ok):
    results.append({"id": tc, "name": name, "expected": expected,
                    "actual": actual, "result": "PASS" if ok else "FAIL"})
    print(f"[{'PASS' if ok else 'FAIL'}] {tc} {name}\n       mong đợi: {expected}\n       thực tế : {actual}")


def env_value(key):
    with open(ENV_FILE, encoding="utf-8") as f:
        for line in f:
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip()
    raise KeyError(key)


def sql(query):
    cmd = ["docker", "compose", "-p", PROJECT, "exec", "-T", "db", "mariadb",
           "-u", env_value("DB_USER"), f"-p{env_value('DB_PASSWORD')}", env_value("DB_NAME"),
           "-N", "-B", "-e", query]
    return subprocess.run(cmd, capture_output=True, text=True, check=True).stdout.strip()


def register(tag):
    email = f"it_{tag}_{RUN}@staging.local"
    st, r = call("POST", "/api/auth/register",
                 {"email": email, "password": "It@123456", "fullName": f"IT {tag.upper()}"})
    assert st in (200, 201), f"register {tag}: {st} {r}"
    d = data(r)
    return {"email": email, "token": d["accessToken"], "id": d["user"]["id"], "name": f"IT {tag.upper()}"}


# ----------------------------------------------------------------------------- setup
print(f"== Setup trên {BASE} (run {RUN})")
A, B, C, D, E = (register(t) for t in "abcde")          # E là người NGOÀI nhóm
st, r = call("POST", "/api/teams", {"name": f"IT Team {RUN}", "courseName": "QLDA CNTT"}, A["token"])
team_id = data(r)["id"]
for u in (B, C, D):
    st, r = call("POST", f"/api/teams/{team_id}/members", {"email": u["email"]}, A["token"])
    assert st in (200, 201), f"invite {u['email']}: {st} {r}"
today = date.today()
st, r = call("POST", f"/api/teams/{team_id}/sprints",
             {"name": f"IT Sprint {RUN}", "startDate": str(today - timedelta(days=3)),
              "endDate": str(today + timedelta(days=4))}, A["token"])
sprint_id = data(r)["id"]
st, r = call("POST", "/api/boards", {"teamId": team_id, "name": "IT Board"}, A["token"])
board = data(r)
cols = {c["name"]: c["id"] for c in board["columns"]}
print(f"   team={team_id} sprint={sprint_id} board={board['id']} cột={list(cols)}")


def create_card(title, assignee, sp, due, actor):
    st, r = call("POST", f"/api/boards/columns/{cols['To Do']}/cards",
                 {"title": title, "assigneeId": assignee["id"], "storyPoints": sp,
                  "difficultyLevel": 2, "dueDate": due.strftime("%Y-%m-%dT%H:%M:%S")}, actor["token"])
    assert st in (200, 201), f"create card {title}: {st} {r}"
    return data(r)["id"]


def sprint_events():
    st, r = call("GET", f"/api/activities/sprint/{sprint_id}", token=A["token"])
    return data(r) or []


# ============================================================================= LUỒNG 1
print("\n== Luồng 1: Board -> ActivityEvent -> đóng góp")
now = datetime.now()
c1 = create_card("IT card đúng hạn", B, 3, now + timedelta(days=2), B)
c2 = create_card("IT card trễ hạn", C, 2, now - timedelta(days=1), C)
c3 = create_card("IT card thử giả mạo", D, 5, now + timedelta(days=2), D)

ev = sprint_events()
created = [e for e in ev if e["eventType"] == "CARD_CREATED"]
check("IT-BRD-01", "Tạo card sinh CARD_CREATED nguồn BOARD, gắn đúng sprint",
      "3 sự kiện CARD_CREATED, source=BOARD, sprintId=" + str(sprint_id),
      f"{len(created)} sự kiện, source={sorted({e['source'] for e in created})}",
      len(created) == 3 and all(e["source"] == "BOARD" and e["sprintId"] == sprint_id for e in created))

call("PUT", f"/api/cards/{c1}/move", {"targetColumnId": cols["In Progress"]}, B["token"])
call("PUT", f"/api/cards/{c1}/move", {"targetColumnId": cols["Done"]}, B["token"])
call("PUT", f"/api/cards/{c2}/move", {"targetColumnId": cols["Done"]}, C["token"])
ev = sprint_events()
moved = [e for e in ev if e["eventType"] == "CARD_MOVED"]
check("IT-BRD-02", "Kéo card giữa cột thường sinh CARD_MOVED",
      ">= 1 CARD_MOVED của B", f"{len([e for e in moved if e['userId'] == B['id']])} sự kiện",
      any(e["userId"] == B["id"] for e in moved))

done_b = [e for e in ev if e["eventType"] == "CARD_COMPLETED" and e["userId"] == B["id"]]
check("IT-BRD-03", "Card vào Done trước hạn -> CARD_COMPLETED, is_on_time=true, delay_days=0",
      "isOnTime=true, delayDays=0, storyPoints=3",
      [(e["isOnTime"], e["delayDays"], e["storyPoints"]) for e in done_b],
      len(done_b) == 1 and done_b[0]["isOnTime"] is True and done_b[0]["delayDays"] == 0
      and done_b[0]["storyPoints"] == 3)

done_c = [e for e in ev if e["eventType"] == "CARD_COMPLETED" and e["userId"] == C["id"]]
check("IT-BRD-04", "Card vào Done sau hạn 1 ngày -> is_on_time=false, delay_days≈1",
      "isOnTime=false, 0.9 <= delayDays <= 1.1",
      [(e["isOnTime"], e["delayDays"]) for e in done_c],
      len(done_c) == 1 and done_c[0]["isOnTime"] is False and 0.9 <= done_c[0]["delayDays"] <= 1.1)

st, r = call("GET", f"/api/contributions/summary?teamId={team_id}&sprintId={sprint_id}", token=A["token"])
summary = data(r) or []
by_user = {s["userId"]: s for s in summary} if isinstance(summary, list) else {}
check("IT-BRD-05", "API tổng hợp đóng góp (sp_calculate_contribution_scores) trả điểm cho thành viên có card Done",
      "HTTP 200; B và C có finalPct > 0",
      f"HTTP {st}; " + ", ".join(f"user {u}: finalPct={s.get('finalPct')}" for u, s in by_user.items()),
      st == 200 and all(float(by_user.get(u["id"], {}).get("finalPct") or 0) > 0 for u in (B, C)))

st, r = call("GET", f"/api/contributions/evidence?teamId={team_id}&sprintId={sprint_id}&userId={B['id']}",
             token=A["token"])
evid = data(r) or []
names = [x.get("taskName", "") for x in evid] if isinstance(evid, list) else []
check("IT-BRD-06", "Truy vết bằng chứng của B chứa sự kiện hoàn thành card",
      "HTTP 200; có mục chứa 'IT card đúng hạn'",
      f"HTTP {st}; {len(names)} mục; sourceType={sorted({x.get('sourceType') for x in evid}) if names else '-'}",
      st == 200 and any("IT card đúng hạn" in n for n in names))
check("IT-BRD-07", "Nguồn bằng chứng ghi đúng là BOARD (theo CR-02, không còn Trello)",
      "sourceType = BOARD", f"sourceType = {sorted({x.get('sourceType') for x in evid})}",
      bool(evid) and all(x.get("sourceType") == "BOARD" for x in evid))

before = len([e for e in sprint_events() if e["eventType"] == "CARD_COMPLETED"])
st_del, _ = call("DELETE", f"/api/cards/{c1}", token=A["token"])
after = len([e for e in sprint_events() if e["eventType"] == "CARD_COMPLETED"])
check("IT-BRD-08", "Xóa card không làm mất sự kiện đã ghi",
      "HTTP 200; số CARD_COMPLETED giữ nguyên", f"HTTP {st_del}; trước={before}, sau={after}",
      st_del == 200 and before == after)

st, r = call("PUT", f"/api/cards/{c3}/move",
             {"targetColumnId": cols["In Progress"], "toColumnName": "Done"}, D["token"])
forged = [e for e in sprint_events() if e["eventType"] == "CARD_COMPLETED" and e["userId"] == D["id"]]
check("IT-BRD-09", "Chống gian lận: kéo card vào 'In Progress' nhưng gửi toColumnName='Done'",
      "Không sinh CARD_COMPLETED (server phải dùng tên cột thật)",
      f"HTTP {st}; {len(forged)} CARD_COMPLETED giả cho D", len(forged) == 0)

st, r = call("GET", f"/api/contributions/summary?teamId={team_id}&sprintId={sprint_id}", token=E["token"])
check("IT-BRD-10", "Người ngoài nhóm xem bảng đóng góp của nhóm",
      "HTTP 403", f"HTTP {st}", st == 403)
st, r = call("GET", f"/api/activities/team/{team_id}", token=E["token"])
check("IT-BRD-11", "Người ngoài nhóm xem log hoạt động của nhóm",
      "HTTP 403", f"HTTP {st}; {len(data(r) or []) if st == 200 else 0} sự kiện lộ ra", st == 403)

# ============================================================================= LUỒNG 2
print("\n== Luồng 2: Chấm chéo -> DB -> ẩn danh")
# Từ PR #57 (M4): tạo đợt bằng API (trạng thái DRAFT) rồi mở (OPEN). Người ngoài/thành viên thường không được tạo.
st_x, _ = call("POST", f"/api/review-rounds/sprint/{sprint_id}", {"name": "Thử tạo bởi thành viên"}, B["token"])
st, r = call("POST", f"/api/review-rounds/sprint/{sprint_id}",
             {"name": f"IT Round {RUN}",
              "startDate": (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S"),
              "endDate": (now + timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%S")}, A["token"])
round_id = (data(r) or {}).get("id")
st_open, r_open = call("POST", f"/api/review-rounds/{round_id}/open", token=A["token"])
check("IT-PR-00", "Trưởng nhóm tạo + mở đợt chấm qua API; thành viên thường không được tạo",
      "Tạo 201, mở 200 (OPEN); thành viên B tạo -> 4xx",
      f"tạo HTTP {st}, mở HTTP {st_open} ({(data(r_open) or {}).get('status')}); B tạo -> HTTP {st_x}",
      st == 201 and st_open == 200 and 400 <= st_x < 500)
st, r = call("GET", f"/api/review-rounds/sprint/{sprint_id}", token=A["token"])
check("IT-PR-01", "API liệt kê đợt chấm theo sprint", "HTTP 200, có round " + str(round_id),
      f"HTTP {st}; {[x.get('id') for x in (data(r) or [])] if st == 200 else r}",
      st == 200 and any(x.get("id") == round_id for x in (data(r) or [])))


def submit(reviewer, reviewee, score, fb="Làm tốt", crit="QUALITY"):
    return call("POST", f"/api/review-rounds/{round_id}/submissions",
                {"revieweeId": reviewee["id"], "scores": [{"criterion": crit, "score": score}], "feedback": fb},
                reviewer["token"])


def result(reviewee, token):
    st, r = call("GET", f"/api/review-rounds/{round_id}/results/{reviewee['id']}", token=token)
    return st, data(r) or {}


st, r = submit(A, C, 4, "Phản hồi từ A cho C")
rows = sql(f"SELECT reviewer_id, reviewee_id, criterion, score FROM review_submissions WHERE review_round_id={round_id}")
check("IT-PR-02", "Gửi đánh giá: API trả thành công và lưu vào bảng review_submissions",
      f"HTTP 200; 1 dòng ({A['id']}, {C['id']}, QUALITY, 4)", f"HTTP {st}; DB: {rows!r}",
      st == 200 and rows.split() == [str(A["id"]), str(C["id"]), "QUALITY", "4"])
check("IT-PR-03", "Response gửi đánh giá không trả lại thông tin người chấm",
      "HTTP 200, không có trường reviewer/email trong response",
      f"HTTP {st}; " + ("có reviewer trong response" if "reviewer" in json.dumps(r) else "không có"),
      st == 200 and "reviewer" not in json.dumps(r) and A["email"] not in json.dumps(r))

st, res = result(C, C["token"])
check("IT-PR-04", "Dưới 3 lượt (1 lượt): không lộ điểm/nhận xét",
      "isAnonymousSafe=false, averageScore ẩn (null/0), feedback rỗng",
      f"HTTP {st}; safe={res.get('anonymousSafe', res.get('isAnonymousSafe'))}, "
      f"avg={res.get('averageScore')}, count={res.get('submissionCount')}, fb={res.get('feedbackComments')}",
      st == 200 and not res.get("feedbackComments") and res.get("averageScore") in (None, 0, 0.0))

st, r = submit(C, C, 5)
check("IT-PR-05", "Tự chấm chính mình bị từ chối", "HTTP 400", f"HTTP {st}", st == 400)
st, r = submit(B, C, 9)
check("IT-PR-06", "Điểm ngoài thang 1–5 bị từ chối với lỗi validation", "HTTP 400", f"HTTP {st}", st == 400)
st, r = submit(E, C, 1, "Người ngoài chấm")
saved = sql(f"SELECT COUNT(*) FROM review_submissions WHERE review_round_id={round_id} AND reviewer_id={E['id']}")
check("IT-PR-07", "Người ngoài nhóm không được chấm thành viên nhóm",
      "HTTP 403/400 và KHÔNG có dòng nào trong DB", f"HTTP {st}; {saved} dòng đã lưu vào DB",
      st in (400, 403) and saved == "0")
# Dọn lượt chấm của người ngoài (nếu lỡ được lưu) để không làm sai IT-PR-09
sql(f"DELETE FROM review_submissions WHERE review_round_id={round_id} AND reviewer_id={E['id']}")

dup = [submit(B, D, 1, "B chấm D lặp lại")[0] for _ in range(3)]
st, res = result(D, D["token"])
check("IT-PR-08", "Một người chấm 3 lần cho cùng người: không được coi là đủ 3 lượt ẩn danh",
      "Lần 2, 3 bị từ chối (4xx) và isAnonymousSafe=false",
      f"HTTP các lần gửi={dup}; safe={res.get('anonymousSafe', res.get('isAnonymousSafe'))}, "
      f"count={res.get('submissionCount')}, fb={res.get('feedbackComments')}",
      dup[0] == 200 and all(400 <= c < 500 for c in dup[1:])
      and not res.get("anonymousSafe", res.get("isAnonymousSafe")))

submit(B, C, 5, "Phản hồi từ B cho C")
submit(D, C, 3, "Phản hồi từ D cho C")
st, res = result(C, C["token"])
check("IT-PR-09", "Đủ 3 người chấm khác nhau: hiện điểm trung bình và nhận xét, không kèm danh tính",
      "isAnonymousSafe=true, avg=4.0, 3 nhận xét, không có reviewerId",
      f"safe={res.get('anonymousSafe', res.get('isAnonymousSafe'))}, avg={res.get('averageScore')}, "
      f"fb={len(res.get('feedbackComments') or [])}, reviewerId trong response={'reviewer' in json.dumps(res)}",
      bool(res.get("anonymousSafe", res.get("isAnonymousSafe"))) and res.get("averageScore") == 4.0
      and len(res.get("feedbackComments") or []) == 3 and "reviewer" not in json.dumps(res))

alerts = sql(f"SELECT COUNT(*) FROM alerts WHERE user_id={C['id']} AND alert_type='PEER_REVIEW_SUFFICIENT'")
check("IT-PR-10", "Trigger DB tạo alert PEER_REVIEW_SUFFICIENT khi đủ 3 người chấm",
      "1 alert", f"{alerts} alert", alerts == "1")

st, res = result(C, E["token"])
check("IT-PR-11", "Người ngoài nhóm xem kết quả chấm chéo của thành viên", "HTTP 403",
      f"HTTP {st}; avg={res.get('averageScore')}", st == 403)

# ----------------------------------------------------------------------------- tổng kết
passed = sum(r["result"] == "PASS" for r in results)
print(f"\nTỔNG: {passed}/{len(results)} PASS")
os.makedirs("docs/qa", exist_ok=True)
with open("docs/qa/integration-result-sprint4.json", "w", encoding="utf-8") as f:
    json.dump({"run": RUN, "base_url": BASE, "executed_at": datetime.now().isoformat(timespec="seconds"),
               "ids": {"team": team_id, "sprint": sprint_id, "round": round_id,
                       "users": {k: u["id"] for k, u in zip("ABCDE", (A, B, C, D, E))}},
               "passed": passed, "total": len(results), "cases": results}, f, ensure_ascii=False, indent=2)
sys.exit(0 if passed == len(results) else 1)
