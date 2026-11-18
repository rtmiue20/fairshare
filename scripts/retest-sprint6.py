#!/usr/bin/env python3
"""
Retest Sprint 6 (WP5 – M5): kiểm lại các lỗi có bản sửa trên master mà các script cũ chưa phủ.

    python3 scripts/retest-sprint6.py [BASE_URL]      Windows: py -X utf8 scripts/retest-sprint6.py

Điều kiện: staging đang chạy (./scripts/staging-up.sh), project fairshare-staging, file .env.staging.
Script tự tạo 5 tài khoản rt_* và 1 nhóm riêng, không đụng nhóm UAT.

Các ca:
  RT-38a..c  DEF-38: kéo thẻ vào cột Review lặp lại không được cộng REVIEW_CARD nhiều lần
  RT-41a..b  Người phụ trách kéo thẻ của mình qua lại To Do <-> In Progress: CARD_MOVED có cộng SP lặp không
  RT-19      DEF-19: thành viên thường tạo đợt chấm chéo phải nhận 403 (không phải 400)
  RT-40a..c  DEF-40: migration V23 chèn tài khoản demo + dữ liệu mẫu vào mọi CSDL
Kết quả: docs/qa/evidence/retest-result-2026-11-16.json (+ in ra màn hình).
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8081").rstrip("/")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = os.environ.get("STAGING_PROJECT", "fairshare-staging")
ENV_FILE = os.path.join(REPO, os.environ.get("STAGING_ENV_FILE", ".env.staging"))
OUT = os.path.join(REPO, "docs", "qa", "evidence", "retest-result-2026-11-16.json")
RUN = str(int(time.time()))
results = []


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
    return resp.get("data") if isinstance(resp, dict) and "data" in resp else resp


def check(tc, defect, name, expected, actual, ok):
    results.append({"id": tc, "defect": defect, "name": name, "expected": expected,
                    "actual": actual, "result": "PASS" if ok else "FAIL"})
    print(f"[{'PASS' if ok else 'FAIL'}] {tc} ({defect}) {name}\n       mong đợi: {expected}\n       thực tế : {actual}")


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
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()


def register(tag):
    email = f"rt_{tag}_{RUN}@staging.local"
    st, r = call("POST", "/api/auth/register",
                 {"email": email, "password": "Rt@123456", "fullName": f"RT {tag.upper()}"})
    assert st in (200, 201), f"register {tag}: {st} {r}"
    d = data(r)
    return {"email": email, "token": d["accessToken"], "id": d["user"]["id"]}


# ----------------------------------------------------------------------------- setup
print(f"== Retest Sprint 6 trên {BASE} (run {RUN})")
A, B, C, D, E = (register(t) for t in "abcde")     # A Leader; B, C, D thành viên; E người ngoài
st, r = call("POST", "/api/teams", {"name": f"RT Team {RUN}", "courseName": "QLDA CNTT"}, A["token"])
assert st in (200, 201), f"create team: {st} {r}"
team_id = data(r)["id"]
for u in (B, C, D):
    st, r = call("POST", f"/api/teams/{team_id}/members", {"email": u["email"]}, A["token"])
    assert st in (200, 201), f"invite {u['email']}: {st} {r}"
st, r = call("GET", f"/api/teams/{team_id}/sprints", token=A["token"])
sprint_id = data(r)[0]["id"]
st, r = call("POST", "/api/boards", {"teamId": team_id, "name": "RT Board"}, A["token"])
board = data(r)
cols = {c["name"]: c["id"] for c in board["columns"]}
print(f"   team={team_id} sprint={sprint_id} board={board['id']} cột={list(cols)}")


def create_card(title, assignee, sp, actor):
    st, r = call("POST", f"/api/boards/columns/{cols['To Do']}/cards",
                 {"title": title, "assigneeId": assignee["id"], "storyPoints": sp, "difficultyLevel": 2},
                 actor["token"])
    assert st in (200, 201), f"create card {title}: {st} {r}"
    return data(r)["id"]


def move(card, col, actor):
    return call("PUT", f"/api/boards/cards/{card}/move", {"targetColumnId": cols[col]}, actor["token"])[0]


def events(user=None, etype=None):
    st, r = call("GET", f"/api/activities/sprint/{sprint_id}", token=A["token"])
    ev = data(r) or []
    return [e for e in ev if (user is None or e.get("userId") == user["id"])
            and (etype is None or e.get("eventType") == etype)]


def pct(user):
    call("POST", f"/api/contributions/sprints/{sprint_id}/calculate", token=A["token"])
    st, r = call("GET", f"/api/contributions/summary?teamId={team_id}&sprintId={sprint_id}", token=A["token"])
    for s in data(r) or []:
        if s.get("userId") == user["id"]:
            return float(s.get("finalPct") or 0)
    return 0.0


# ============================================================================= DEF-38
print("\n== DEF-38: kéo thẻ vào Review lặp lại")
c_b = create_card("RT thẻ của B", B, 5, B)
c_d = create_card("RT thẻ của D", D, 5, D)
move(c_b, "In Progress", B)
move(c_d, "In Progress", D)
codes = [move(c_b, "Review", C)]                       # C review thẻ của B lần đầu
pct_c_once = pct(C)
for _ in range(5):                                     # B trả thẻ về In Progress, C kéo lại vào Review (5 lần)
    codes.append(move(c_b, "In Progress", B))
    codes.append(move(c_b, "Review", C))
rev = [e for e in events(C, "REVIEW_CARD") if "RT thẻ của B" in (e.get("details") or "")]
check("RT-38a", "DEF-38", "C kéo thẻ của B vào Review 6 lần chỉ sinh 1 REVIEW_CARD",
      "1 sự kiện REVIEW_CARD của C cho thẻ này", f"{len(rev)} sự kiện; HTTP {sorted(set(codes))}", len(rev) == 1)
pct_c_spam = pct(C)
check("RT-38b", "DEF-38", "Tỷ lệ đóng góp của C không tăng khi kéo lặp",
      "finalPct sau 6 lần = sau 1 lần", f"sau 1 lần {pct_c_once}%, sau 6 lần {pct_c_spam}%",
      abs(pct_c_spam - pct_c_once) < 0.01)
# Bản sửa so trùng bằng chuỗi "reviewed card '<tiêu đề>'" -> đổi tiêu đề thẻ rồi kéo lại
st_ren, _ = call("PUT", f"/api/boards/cards/{c_b}", {"title": "RT thẻ của B (đổi tên)"}, B["token"])
move(c_b, "In Progress", B)
move(c_b, "Review", C)
rev2 = [e for e in events(C, "REVIEW_CARD") if "RT thẻ của B" in (e.get("details") or "")]
check("RT-38c", "DEF-38", "Đổi tiêu đề thẻ rồi kéo lại vào Review không sinh thêm REVIEW_CARD",
      "vẫn 1 sự kiện REVIEW_CARD của C cho thẻ này",
      f"đổi tên HTTP {st_ren}; {len(rev2)} sự kiện REVIEW_CARD", len(rev2) == 1)

# ============================================================================= RT-41
print("\n== Người phụ trách kéo thẻ của mình qua lại (cùng loại R05)")
pct_d0 = pct(D)
sp_d0 = sum(float(e.get("storyPoints") or 0) for e in events(D, "CARD_MOVED"))
for _ in range(10):
    move(c_d, "To Do", D)
    move(c_d, "In Progress", D)
moved = events(D, "CARD_MOVED")
sp_d1 = sum(float(e.get("storyPoints") or 0) for e in moved)
check("RT-41a", "mới", "D kéo thẻ 5 SP của mình To Do <-> In Progress 10 vòng: tổng SP của CARD_MOVED không tăng",
      "tổng storyPoints CARD_MOVED của D không đổi", f"{len(moved)} CARD_MOVED, tổng SP {sp_d0} -> {sp_d1}",
      sp_d1 <= sp_d0 + 0.01)
pct_d1 = pct(D)
check("RT-41b", "mới", "Tỷ lệ đóng góp của D không tăng khi chỉ kéo qua lại, chưa hoàn thành thẻ",
      "finalPct không đổi", f"{pct_d0}% -> {pct_d1}%", pct_d1 <= pct_d0 + 0.01)

# ============================================================================= DEF-19
print("\n== DEF-19: thành viên thường tạo đợt chấm chéo")
st, r = call("POST", f"/api/review-rounds/sprint/{sprint_id}",
             {"name": f"RT round {RUN}", "minSubmissionsRequired": 3}, B["token"])
check("RT-19", "DEF-19", "Thành viên thường tạo đợt chấm bị chặn bằng 403", "HTTP 403",
      f"HTTP {st}: {(r or {}).get('message') if isinstance(r, dict) else r}", st == 403)

# ============================================================================= DEF-40
print("\n== DEF-40: migration V23 seed dữ liệu demo")
v23 = sql("SELECT COUNT(*) FROM flyway_schema_history WHERE version = '23' AND success = 1")
demo_users = sql("SELECT COUNT(*) FROM users WHERE id BETWEEN 109 AND 113")
check("RT-40a", "DEF-40", "Migration không được chèn tài khoản demo vào CSDL thật",
      "0 tài khoản id 109..113 do migration tạo", f"V23 đã chạy: {v23}; tài khoản demo: {demo_users}",
      v23 == "0" or demo_users == "0")
# Mật khẩu demo nằm trong comment của chính file migration -> đọc từ file, không chép lại ở đây
mig = os.path.join(REPO, "fairshare-backend", "src", "main", "resources", "db", "migration",
                   "V23__seed_demo_peer_review_data.sql")
pw = None
if os.path.exists(mig):
    m = re.search(r"mật khẩu ([^\s)]+)", open(mig, encoding="utf-8").read())
    pw = m.group(1) if m else None
st, _ = call("POST", "/api/auth/login", {"email": "demo@fairshare.io", "password": pw or "-"})
check("RT-40b", "DEF-40", "Không đăng nhập được bằng tài khoản demo có mật khẩu công khai trong repo",
      "HTTP 401", f"HTTP {st}", st != 200)
teams1 = sql("SELECT COUNT(*) FROM team_members WHERE team_id = 1 AND user_id BETWEEN 109 AND 113")
check("RT-40c", "DEF-40", "Migration không gắn thành viên/dữ liệu demo vào nhóm id 1 (nhóm thật đầu tiên)",
      "0 thành viên demo trong team 1", f"{teams1} thành viên demo trong team 1", teams1 == "0")

# ----------------------------------------------------------------------------- tổng kết
passed = sum(1 for x in results if x["result"] == "PASS")
print(f"\nTỔNG: {passed}/{len(results)} PASS")
with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"run": RUN, "base": BASE, "results": results}, f, ensure_ascii=False, indent=2)
sys.exit(0 if passed == len(results) else 1)
