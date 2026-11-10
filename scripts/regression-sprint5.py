#!/usr/bin/env python3
"""
Regression + đo hiệu năng PDF – Sprint 5 (WP5 – M5) trên môi trường STAGING.

Phạm vi (docs/sprint5.md, dòng M5 và DoD):
  SCR  : board -> ActivityEvent -> ScoringEngine v1.1 (POST /calculate) -> điểm lưu DB
  DASH : các API mà ContributionDashboard.tsx thật sự gọi
  PERM : phân quyền leader/thành viên trên board (DoD Sprint 5)
  TRL  : gỡ Trello legacy (CR-02) + dữ liệu cũ nguồn TRELLO không làm lỗi hệ thống
  PDF  : hiệu năng xuất PDF so với G4 (< 10 s, nhóm 6 người, dữ liệu 4 sprint), nội dung, tiếng Việt, quyền

Điều kiện: staging đang chạy và DB đã nạp seed M3
  (fairshare-backend/src/main/resources/seed/large_dataset_500_tasks.sql -> team 1, 6 thành viên, 500 sự kiện, sprint 1..5).
Cách chạy:  python3 scripts/regression-sprint5.py [BASE_URL]      # mặc định http://localhost:8081
Kết quả  :  docs/qa/regression-result-sprint5.json ; thoát mã 1 nếu có ca FAIL.
"""
import json
import os
import re
import statistics
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8081").rstrip("/")
PROJECT = os.environ.get("STAGING_PROJECT", "fairshare-staging")
ENV_FILE = os.environ.get("STAGING_ENV_FILE", ".env.staging")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUN = f"{int(time.time())}"
PDF_RUNS = int(os.environ.get("PDF_RUNS", "10"))
G4_LIMIT_S = 10.0
results = []
pdf_perf = []


# ----------------------------------------------------------------------------- helpers
def call(method, path, body=None, token=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            payload = r.read()
            if raw:
                return r.status, payload, dict(r.headers)
            return r.status, json.loads(payload.decode() or "null")
    except urllib.error.HTTPError as e:
        payload = e.read()
        if raw:
            return e.code, payload, dict(e.headers)
        try:
            return e.code, json.loads(payload.decode()) if payload else None
        except ValueError:
            return e.code, payload.decode(errors="replace")


def data(resp):
    return resp.get("data") if isinstance(resp, dict) and "data" in resp else resp


def check(tc, name, expected, actual, ok, group):
    results.append({"id": tc, "group": group, "name": name, "expected": expected,
                    "actual": actual, "result": "PASS" if ok else "FAIL"})
    print(f"[{'PASS' if ok else 'FAIL'}] {tc} {name}\n       mong đợi: {expected}\n       thực tế : {actual}")


def env_value(key):
    with open(os.path.join(REPO, ENV_FILE), encoding="utf-8") as f:
        for line in f:
            if line.startswith(key + "="):
                return line.split("=", 1)[1].strip()
    raise KeyError(key)


def sql(query):
    cmd = ["docker", "compose", "-p", PROJECT, "exec", "-T", "db", "mariadb",
           "-u", env_value("DB_USER"), f"-p{env_value('DB_PASSWORD')}", env_value("DB_NAME"),
           "-N", "-B", "-e", query]
    return subprocess.run(cmd, capture_output=True, text=True, check=True, cwd=REPO).stdout.strip()


def register(tag, full_name):
    email = f"r5_{tag}_{RUN}@staging.local"
    st, r = call("POST", "/api/auth/register", {"email": email, "password": "R5@123456", "fullName": full_name})
    assert st in (200, 201), f"register {tag}: {st} {r}"
    d = data(r)
    return {"email": email, "token": d["accessToken"], "id": d["user"]["id"], "name": full_name}


def pdf_text(pdf_bytes):
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(pdf_bytes)
        path = f.name
    try:
        return subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True).stdout
    finally:
        os.unlink(path)


def fetch_pdf(team_id, sprint_id, token):
    t0 = time.perf_counter()
    st, body, headers = call("GET", f"/api/reports/teams/{team_id}/sprints/{sprint_id}/pdf", token=token, raw=True)
    return st, body, time.perf_counter() - t0


# ----------------------------------------------------------------------------- setup
print(f"== Setup trên {BASE} (run {RUN})")
seed_events = sql("SELECT COUNT(*) FROM activity_events WHERE team_id = 1")
assert int(seed_events) >= 500, "Chưa nạp seed large_dataset_500_tasks.sql (team 1 phải có >= 500 sự kiện)"

# 6 thành viên, tên tiếng Việt có dấu (để kiểm tra PDF) + 1 người ngoài nhóm
A = register("a", "Nguyễn Văn Ánh")
B = register("b", "Trần Thị Bích")
C = register("c", "Lê Hoàng Cường")
D = register("d", "Phạm Đức Dũng")
E = register("e", "Võ Thị Én")
F = register("f", "Đặng Quốc Phú")
X = register("x", "Người Ngoài Nhóm")
st, r = call("POST", "/api/teams", {"name": f"Nhóm Hồi Quy {RUN}", "courseName": "QLDA CNTT"}, A["token"])
team_id = data(r)["id"]
for u in (B, C, D, E, F):
    st, r = call("POST", f"/api/teams/{team_id}/members", {"email": u["email"]}, A["token"])
    assert st in (200, 201), f"invite {u['email']}: {st} {r}"
today = date.today()
st, r = call("POST", f"/api/teams/{team_id}/sprints",
             {"name": f"R5 Sprint {RUN}", "startDate": str(today - timedelta(days=3)),
              "endDate": str(today + timedelta(days=4))}, A["token"])
sprint_id = data(r)["id"]
st, r = call("POST", "/api/boards", {"teamId": team_id, "name": "R5 Board"}, A["token"])
board = data(r)
board_id = board["id"]
cols = {c["name"]: c["id"] for c in board["columns"]}
now = datetime.now()
print(f"   team={team_id} sprint={sprint_id} board={board_id}")


def card(title, assignee, sp, due, actor=None):
    st, r = call("POST", f"/api/boards/columns/{cols['To Do']}/cards",
                 {"title": title, "assigneeId": assignee["id"], "storyPoints": sp, "difficultyLevel": 2,
                  "dueDate": due.strftime("%Y-%m-%dT%H:%M:%S")}, (actor or assignee)["token"])
    assert st in (200, 201), f"card {title}: {st} {r}"
    return data(r)["id"]


def move(card_id, col, user):
    return call("PUT", f"/api/cards/{card_id}/move", {"targetColumnId": cols[col]}, user["token"])[0]


cb = card("Viết API đúng hạn", B, 3, now + timedelta(days=2))
cc = card("Sửa lỗi trễ hạn", C, 3, now - timedelta(days=2))
cd = card("Card chỉ tạo, chưa làm", D, 8, now + timedelta(days=2))
ce = card("Thiết kế màn hình", E, 3, now + timedelta(days=2))
for cid, u in ((cb, B), (cc, C), (ce, E)):
    move(cid, "Done", u)

# ============================================================================= SCR
print("\n== SCR: board -> ActivityEvent -> ScoringEngine v1.1")
st, r = call("POST", f"/api/contributions/sprints/{sprint_id}/calculate", token=A["token"])
calc = data(r) or []
by = {x["userId"]: x for x in calc} if isinstance(calc, list) else {}
check("SCR-01", "POST /calculate chạy ScoringEngine cho cả 6 thành viên",
      "HTTP 200, 6 dòng", f"HTTP {st}, {len(by)} dòng", st == 200 and len(by) == 6, "SCR")


def sc(u):
    return float(by.get(u["id"], {}).get("score") or 0)


pct_sum = sum(float(x.get("percentage") or 0) for x in by.values())
check("SCR-02", "Tổng tỷ lệ đóng góp của nhóm = 100% (API trả dạng tỷ lệ 0–1 hoặc 0–100)",
      "tổng ≈ 1.0 hoặc ≈ 100", f"tổng = {pct_sum:.4f}", abs(pct_sum - 1) < 0.005 or abs(pct_sum - 100) < 0.5, "SCR")
check("SCR-03", "Cùng 3 SP: hoàn thành đúng hạn (B) được điểm cao hơn trễ hạn (C)",
      "score(B) > score(C)", f"B={sc(B):.2f}, C={sc(C):.2f}", sc(B) > sc(C), "SCR")
check("SCR-04", "Thành viên không có hoạt động (F) không cao hơn người có card Done",
      "score(F) ≤ min(B, C, E)", f"F={sc(F):.2f}, B={sc(B):.2f}, C={sc(C):.2f}, E={sc(E):.2f}",
      sc(F) <= min(sc(B), sc(C), sc(E)), "SCR")
check("SCR-05", "Chỉ tạo card 8 SP (D) không cao hơn người hoàn thành 3 SP đúng hạn (E) – liên quan DEF-17",
      "score(D) ≤ score(E)", f"D={sc(D):.2f}, E={sc(E):.2f}", sc(D) <= sc(E), "SCR")
st, r = call("GET", f"/api/contributions/sprints/{sprint_id}", token=A["token"])
saved = {x["userId"]: float(x.get("score") or 0) for x in (data(r) or [])} if st == 200 else {}
check("SCR-06", "Điểm ScoringEngine được lưu và đọc lại đúng (GET /contributions/sprints/{id})",
      "HTTP 200, điểm trùng với kết quả /calculate",
      f"HTTP {st}, {len(saved)} dòng, khớp={all(abs(saved.get(k, -1) - sc_v) < 0.01 for k, sc_v in ((k, float(v.get('score') or 0)) for k, v in by.items()))}",
      st == 200 and len(saved) == 6 and all(abs(saved.get(k, -1) - float(v.get("score") or 0)) < 0.01 for k, v in by.items()),
      "SCR")
before_f = sc(F)
cf = card("Việc mới của F", F, 5, now + timedelta(days=2))
move(cf, "Done", F)
st, r = call("POST", f"/api/contributions/sprints/{sprint_id}/calculate", token=A["token"])
by = {x["userId"]: x for x in (data(r) or [])} if st == 200 else by
check("SCR-07", "Regression luồng đầy đủ: F hoàn thành card mới -> tính lại -> điểm F tăng",
      "score(F) sau > trước", f"trước={before_f:.2f}, sau={sc(F):.2f}", sc(F) > before_f, "SCR")
st, r = call("GET", f"/api/contributions/summary?teamId={team_id}&sprintId={sprint_id}", token=A["token"])
summ = {x["userId"]: float(x.get("finalPct") or 0) for x in (data(r) or [])} if st == 200 else {}
top_engine = max(by.values(), key=lambda x: float(x.get("score") or 0))["userId"] if by else None
top_proc = max(summ, key=summ.get) if summ else None
names = {u["id"]: u["name"].split()[-1] for u in (A, B, C, D, E, F)}
check("SCR-08", "Hai nguồn điểm thống nhất: ScoringEngine (/calculate) và routine (/summary) xếp cùng người đứng đầu",
      "Người có điểm cao nhất giống nhau",
      f"Engine: {names.get(top_engine)} ; routine: {names.get(top_proc)} "
      f"(routine: {', '.join(f'{names[k]}={v}' for k, v in summ.items())})",
      top_engine is not None and top_engine == top_proc, "SCR")

# ============================================================================= DASH
print("\n== DASH: API mà dashboard gọi")
dash_src = open(os.path.join(REPO, "frontend/src/features/dashboard/ContributionDashboard.tsx"), encoding="utf-8").read()
hard = re.findall(r"contributionApi\.\w+\(\s*1\s*,", dash_src)
check("DASH-01", "Dashboard lấy teamId theo nhóm đang chọn, không gán cứng",
      "Không có lời gọi contributionApi.*(1, ...)",
      f"{len(hard)} lời gọi gán cứng teamId=1 (ContributionDashboard.tsx)", len(hard) == 0, "DASH")
st, r = call("GET", f"/api/teams/{team_id}/contributions?sprintId={sprint_id}", token=A["token"])
check("DASH-02", "API điểm dashboard gọi: GET /api/teams/{teamId}/contributions (contribution.api.ts)",
      "HTTP 200", f"HTTP {st}", st == 200, "DASH")
st, r = call("GET", f"/api/contributions/summary?teamId={team_id}&sprintId={sprint_id}", token=A["token"])
check("DASH-03", "API biểu đồ dashboard: GET /api/contributions/summary", "HTTP 200, 6 thành viên",
      f"HTTP {st}, {len(data(r) or []) if st == 200 else 0} dòng", st == 200 and len(data(r) or []) == 6, "DASH")
st, r = call("GET", f"/api/contributions/evidence?teamId={team_id}&sprintId={sprint_id}&userId={B['id']}",
             token=A["token"])
check("DASH-04", "API truy vết dashboard: GET /api/contributions/evidence", "HTTP 200, có card của B",
      f"HTTP {st}, {len(data(r) or []) if st == 200 else 0} mục",
      st == 200 and any("Viết API" in (x.get("taskName") or "") for x in (data(r) or [])), "DASH")
st, r = call("GET", f"/api/teams/{team_id}/contributions/{B['id']}/evidence?sprintId={sprint_id}", token=A["token"])
check("DASH-05", "API bằng chứng thành viên: GET /api/teams/{teamId}/contributions/{userId}/evidence (contribution.api.ts)",
      "HTTP 200", f"HTTP {st}", st == 200, "DASH")

# ============================================================================= PERM
print("\n== PERM: phân quyền leader/thành viên trên board")
st, r = call("POST", f"/api/boards/{board_id}/columns", {"name": "Cột do thành viên tạo"}, B["token"])
check("PERM-01", "Thành viên thường tạo cột -> bị chặn", "HTTP 403", f"HTTP {st}", st == 403, "PERM")
st, r = call("PUT", f"/api/boards/{board_id}", {"name": "Đổi tên bởi thành viên"}, B["token"])
check("PERM-02", "Thành viên thường đổi tên board -> bị chặn", "HTTP 403", f"HTTP {st}", st == 403, "PERM")
cx = card("Card của E (để B thử kéo)", E, 2, now + timedelta(days=2))
st = move(cx, "In Progress", B)
check("PERM-03", "Thành viên kéo card được giao cho người khác -> bị chặn", "HTTP 403", f"HTTP {st}", st == 403, "PERM")
st = move(cx, "In Progress", E)
check("PERM-04", "Thành viên kéo card của chính mình -> được phép", "HTTP 200", f"HTTP {st}", st == 200, "PERM")
st, r = call("POST", f"/api/boards/{board_id}/columns", {"name": "QA"}, A["token"])
check("PERM-05", "Leader tạo cột -> được phép", "HTTP 200/201", f"HTTP {st}", st in (200, 201), "PERM")
st, r = call("PUT", f"/api/cards/{cx}/move", {"targetColumnId": cols["Done"]}, X["token"])
check("PERM-06", "Người ngoài nhóm kéo card của nhóm -> bị chặn", "HTTP 403", f"HTTP {st}", st == 403, "PERM")

# ============================================================================= TRL
print("\n== TRL: gỡ Trello legacy (CR-02)")
legacy = ["fairshare-backend/src/main/java/com/fairshare/integration/trello",
          "fairshare-backend/src/test/java/com/fairshare/integration/trello/TrelloClientTest.java",
          "frontend/src/features/integration/ConnectTrelloPage.tsx",
          "frontend/src/api/integration.api.ts"]
left = [p for p in legacy if os.path.exists(os.path.join(REPO, p))]
check("TRL-01", "Đã xóa module/test/trang Trello legacy theo DoD", "0 đường dẫn còn tồn tại",
      f"còn {len(left)}/{len(legacy)}: {', '.join(os.path.basename(p) for p in left) or '-'}", not left, "TRL")
router_hits = subprocess.run(["grep", "-rlE", "path: *['\"]/?integration|ConnectTrelloPage", "frontend/src"],
                             capture_output=True, text=True, cwd=REPO).stdout.split()
check("TRL-02", "Router frontend không còn route integration / ConnectTrelloPage", "0 file tham chiếu",
      f"{len(router_hits)} file: {', '.join(router_hits) or '-'}", not router_hits, "TRL")
sql(f"INSERT INTO activity_events (team_id, sprint_id, user_id, source, event_type, details, occurred_at, "
    f"story_points, difficulty_level, delay_days, is_on_time) VALUES "
    f"({team_id}, {sprint_id}, {C['id']}, 'TRELLO', 'CARD_COMPLETED', 'Dữ liệu cũ từ Trello', NOW(), 2, 1, 0, 1)")
codes = [call("GET", f"/api/contributions/summary?teamId={team_id}&sprintId={sprint_id}", token=A["token"])[0],
         call("POST", f"/api/contributions/sprints/{sprint_id}/calculate", token=A["token"])[0],
         call("GET", f"/api/activities/sprint/{sprint_id}", token=A["token"])[0],
         fetch_pdf(team_id, sprint_id, A["token"])[0]]
check("TRL-03", "Dữ liệu cũ nguồn TRELLO không làm lỗi summary / calculate / activities / PDF",
      "HTTP 200 cả 4", f"HTTP {codes}", all(c == 200 for c in codes), "TRL")

# ============================================================================= PDF
print("\n== PDF: hiệu năng (G4 < 10 s) và nội dung")
# Đợt chấm chéo cho team seed, sprint 4: 3 người chấm cho user 1 để PDF có phần điểm chấm chéo
sql("INSERT INTO review_rounds (team_id, sprint_id, name, start_date, end_date, min_submissions_required, status) "
    "SELECT 1, 4, 'Seed Round S4', NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 1 DAY, 3, 'OPEN' "
    "WHERE NOT EXISTS (SELECT 1 FROM review_rounds WHERE team_id=1 AND sprint_id=4)")
rr = sql("SELECT id FROM review_rounds WHERE team_id=1 AND sprint_id=4 LIMIT 1")
for reviewer, score in ((2, 4), (3, 5), (4, 3)):
    sql(f"INSERT IGNORE INTO review_submissions (review_round_id, reviewer_id, reviewee_id, criterion, score, feedback) "
        f"VALUES ({rr}, {reviewer}, 1, 'QUALITY', {score}, 'Seed feedback')")

per_sprint = {}
all_ok = True
for s in (1, 2, 3, 4):
    ev = int(sql(f"SELECT COUNT(*) FROM activity_events WHERE team_id=1 AND sprint_id={s}"))
    st0, body0, cold = fetch_pdf(1, s, A["token"])           # lần đầu (lạnh)
    times = []
    for _ in range(PDF_RUNS):
        st, body, t = fetch_pdf(1, s, A["token"])
        all_ok &= st == 200 and body[:5] == b"%PDF-"
        times.append(t)
    times.sort()
    p95 = times[max(0, int(round(0.95 * len(times))) - 1)]
    per_sprint[s] = {"events": ev, "cold_s": round(cold, 3), "p50_s": round(statistics.median(times), 3),
                     "p95_s": round(p95, 3), "max_s": round(max(times), 3), "size_kb": round(len(body0) / 1024, 1),
                     "status": st0}
    pdf_perf.append({"sprint": s, **per_sprint[s]})
    print(f"   sprint {s}: {ev} sự kiện, lạnh {cold:.3f}s, p50 {per_sprint[s]['p50_s']}s, "
          f"p95 {p95:.3f}s, max {max(times):.3f}s, {per_sprint[s]['size_kb']} KB")
worst = max(max(v["max_s"], v["cold_s"]) for v in per_sprint.values())
check("PDF-01", f"G4: xuất PDF nhóm 6 người, 4 sprint dữ liệu seed (500 sự kiện), {PDF_RUNS + 1} lần/sprint",
      "Mọi lần HTTP 200, file %PDF hợp lệ, chậm nhất < 10 s",
      f"chậm nhất {worst:.3f}s; p50 theo sprint = {[v['p50_s'] for v in per_sprint.values()]}s",
      all_ok and worst < G4_LIMIT_S, "PDF")

st, body, _ = fetch_pdf(1, 4, A["token"])
txt = pdf_text(body) if st == 200 else ""
seed_names = sql("SELECT u.full_name FROM team_members tm JOIN users u ON u.id = tm.user_id WHERE tm.team_id = 1").split("\n")
missing = [n for n in seed_names if n.split(" (")[0] not in txt]
check("PDF-02", "PDF có phần đóng góp của đủ 6 thành viên", "Đủ 6 tên trong PDF",
      f"thiếu {len(missing)}: {missing or '-'}", st == 200 and not missing, "PDF")
peer_ok = bool(re.search(r"\d\.\d/5", txt))
check("PDF-03", "PDF có điểm chấm chéo khi đủ 3 người chấm (sprint 4 có 3 lượt cho thành viên 1)",
      "Có điểm dạng x.x/5", "có" if peer_ok else "không thấy điểm x.x/5", peer_ok, "PDF")
check("PDF-04", "PDF có bằng chứng chính (sự kiện gốc)", "Có tên task trong seed (vd. '#4xx')",
      "có" if re.search(r"#\d{1,3}", txt) else "không thấy", bool(re.search(r"#\d{1,3}", txt)), "PDF")

st, body, _ = fetch_pdf(team_id, sprint_id, A["token"])
txt_vn = pdf_text(body) if st == 200 else ""
vn_names = [u["name"] for u in (A, B, C, D, E, F)]
shown = [n for n in vn_names if n in txt_vn]
sample = next((ln.strip() for ln in txt_vn.splitlines() if "Bich" in ln or "Bch" in ln or "B" in ln and "ch" in ln), "")
check("PDF-05", "Tiếng Việt có dấu hiển thị đúng trong PDF (tên thành viên)",
      "Đủ 6 tên có dấu, vd. 'Trần Thị Bích'",
      f"HTTP {st}; đúng {len(shown)}/6; ví dụ dòng trong PDF: '{sample[:60]}'", st == 200 and len(shown) == 6, "PDF")
st, body, _ = fetch_pdf(1, 4, X["token"])
check("PDF-06", "Người ngoài nhóm tải PDF của nhóm khác", "HTTP 403", f"HTTP {st}", st == 403, "PDF")
st, body, _ = fetch_pdf(1, 999999, A["token"])
check("PDF-07", "Sprint không tồn tại", "HTTP 404", f"HTTP {st}", st == 404, "PDF")
st, body, _ = fetch_pdf(1, sprint_id, A["token"])
check("PDF-08", "Ghép team 1 với sprint của nhóm khác", "HTTP 400/404 (sprint không thuộc team)",
      f"HTTP {st}" + (" – vẫn xuất PDF" if st == 200 else ""), st in (400, 404), "PDF")

# ----------------------------------------------------------------------------- tổng kết
passed = sum(r["result"] == "PASS" for r in results)
groups = {}
for r_ in results:
    g = groups.setdefault(r_["group"], [0, 0])
    g[0] += r_["result"] == "PASS"
    g[1] += 1
print("\nTheo nhóm: " + ", ".join(f"{k} {v[0]}/{v[1]}" for k, v in groups.items()))
print(f"TỔNG: {passed}/{len(results)} PASS")
os.makedirs(os.path.join(REPO, "docs/qa"), exist_ok=True)
with open(os.path.join(REPO, "docs/qa/regression-result-sprint5.json"), "w", encoding="utf-8") as f:
    json.dump({"run": RUN, "base_url": BASE, "executed_at": datetime.now().isoformat(timespec="seconds"),
               "ids": {"team": team_id, "sprint": sprint_id, "board": board_id},
               "passed": passed, "total": len(results), "groups": groups,
               "pdf_performance": pdf_perf, "cases": results}, f, ensure_ascii=False, indent=2)
sys.exit(0 if passed == len(results) else 1)
