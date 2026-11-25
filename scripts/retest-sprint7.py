#!/usr/bin/env python3
"""
Retest Sprint 7 (WP5 – M5): kiểm lại qua API các lỗi ghi ngày 20/11 (DEF-55..60, 64..66) trên staging.

    python3 scripts/retest-sprint7.py [BASE_URL]      Windows: py -X utf8 scripts/retest-sprint7.py

Điều kiện: staging đang chạy (./scripts/staging-up.sh), project fairshare-staging, file .env.staging.
BASE_URL mặc định http://localhost:8081 (qua Nginx của frontend, giống người dùng thật).
Script tự tạo 4 tài khoản rt7_* (A Leader, B, C thành viên, E người ngoài) và 1 nhóm riêng, không đụng nhóm UAT/demo.

Các ca:
  RT7-55      DEF-55: tải ảnh đại diện PNG hợp lệ trong image Docker
  RT7-56      DEF-56: ảnh vừa tải mở được qua Nginx (/uploads/** là ảnh, không phải index.html)
  RT7-57      DEF-57: ảnh 2,4 MB qua Nginx không bị 413
  RT7-60      DEF-60: file HTML đặt tên .png bị từ chối
  RT7-59      DEF-59: thành viên thường không sửa được thông tin nhóm
  RT7-58a..b  DEF-58: người ngoài nhóm không nhắc nhở / giải quyết cảnh báo của nhóm
  RT7-64a..b  DEF-64: phiếu chấm chéo luôn đứng tên người trong token (bỏ qua reviewerId do client gửi)
  RT7-65a..b  DEF-65: người ngoài không xem được ai chấm ai, không xem danh sách đợt chấm của nhóm
  RT7-66a..b  DEF-66: người ngoài không kích hoạt gửi email báo cáo của nhóm
Kết quả: docs/qa/evidence/retest-sprint7-result-2026-11-24.json (+ in ra màn hình).
"""
import json
import os
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
import zlib
from datetime import datetime, timedelta

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8081").rstrip("/")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT = os.environ.get("STAGING_PROJECT", "fairshare-staging")
ENV_FILE = os.path.join(REPO, os.environ.get("STAGING_ENV_FILE", ".env.staging"))
OUT = os.path.join(REPO, "docs", "qa", "evidence", "retest-sprint7-result-2026-11-24.json")
RUN = str(int(time.time()))
results = []


def _open(req, timeout):
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", ""), e.read()


def _json(raw):
    try:
        return json.loads(raw.decode() or "null")
    except ValueError:
        return raw.decode(errors="replace")[:200]


def call(method, path, body=None, token=None, timeout=30):
    req = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body is not None else None,
                                 method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    st, _, raw = _open(req, timeout)
    return st, _json(raw)


def upload(path, filename, content, ctype, token):
    boundary = uuid.uuid4().hex
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\n"
            f"Content-Type: {ctype}\r\n\r\n").encode() + content + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(BASE + path, data=body, method="POST")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    req.add_header("Authorization", f"Bearer {token}")
    st, ct, raw = _open(req, 60)
    return st, ct, (_json(raw) if "json" in ct else raw.decode(errors="replace")[:120])


def png(width, height, noise=False):
    """PNG RGB hợp lệ. noise=True: dữ liệu ngẫu nhiên, không nén được (để tạo file lớn)."""
    row = width * 3
    raw = b"".join(b"\x00" + (os.urandom(row) if noise else b"\x40\x80\xc0" * width) for _ in range(height))

    def chunk(tag, payload):
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 0 if noise else 9)) + chunk(b"IEND", b""))


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
    cmd = ["docker", "compose", "-p", PROJECT, "--env-file", ENV_FILE, "exec", "-T", "db", "mariadb",
           "-u", env_value("DB_USER"), f"-p{env_value('DB_PASSWORD')}", env_value("DB_NAME"), "-N", "-B", "-e", query]
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", check=True,
                          cwd=REPO).stdout.strip()


def register(tag):
    email = f"rt7_{tag}_{RUN}@staging.local"
    st, r = call("POST", "/api/auth/register",
                 {"email": email, "password": "Rt7@123456", "fullName": f"RT7 {tag.upper()}"})
    assert st in (200, 201), f"register {tag}: {st} {r}"
    d = data(r)
    return {"email": email, "token": d["accessToken"], "id": d["user"]["id"]}


# ----------------------------------------------------------------------------- setup
print(f"== Retest Sprint 7 trên {BASE} (run {RUN})")
A, B, C, E = (register(t) for t in "abce")          # A Leader; B, C thành viên; E người ngoài
st, r = call("POST", "/api/teams", {"name": f"RT7 Team {RUN}", "courseName": "QLDA CNTT"}, A["token"])
assert st in (200, 201), f"create team: {st} {r}"
team_id = data(r)["id"]
for u in (B, C):
    st, r = call("POST", f"/api/teams/{team_id}/members", {"email": u["email"]}, A["token"])
    assert st in (200, 201), f"invite {u['email']}: {st} {r}"
st, r = call("GET", f"/api/teams/{team_id}/sprints", token=A["token"])
sprint_id = data(r)[0]["id"]
print(f"   team={team_id} sprint={sprint_id} A={A['id']} B={B['id']} C={C['id']} E={E['id']}")

# ============================================================================= DEF-55, 56, 57, 60
print("\n== Ảnh đại diện qua Nginx (bản Docker)")
st, ct, r = upload("/api/users/me/avatar", "rt7.png", png(64, 64), "image/png", B["token"])
url = (data(r) or {}).get("avatarUrl") if isinstance(r, dict) else None
check("RT7-55", "DEF-55", "Tải ảnh đại diện PNG hợp lệ (64×64) trong image Docker",
      "HTTP 200, có avatarUrl", f"HTTP {st}; avatarUrl={url}; {'' if st == 200 else r}", st == 200 and bool(url))
if not url and "/app/uploads" in str(r):
    # Cách tạm như lần kiểm 20/11: cấp quyền thư mục uploads cho user fairshare TRONG container đang chạy,
    # để kiểm riêng DEF-56, 57, 60 (không sửa image; tạo lại container là mất).
    subprocess.run(["docker", "exec", "-u", "root", "fairshare-backend", "sh", "-c",
                    "mkdir -p /app/uploads && chown fairshare:fairshare /app/uploads"], check=True)
    print("   [tạm] đã chown /app/uploads trong container để kiểm tiếp DEF-56, 57, 60")
    st, ct, r = upload("/api/users/me/avatar", "rt7.png", png(64, 64), "image/png", B["token"])
    url = (data(r) or {}).get("avatarUrl") if isinstance(r, dict) else None
    print(f"   tải lại sau khi cấp quyền tạm: HTTP {st}, avatarUrl={url}")

if url:
    req = urllib.request.Request(BASE + url)
    st2, ct2, raw2 = _open(req, 30)
    check("RT7-56", "DEF-56", "Ảnh vừa tải mở được qua Nginx (:8081)",
          "HTTP 200, Content-Type image/png", f"HTTP {st2}, Content-Type {ct2}, {len(raw2)} byte",
          st2 == 200 and ct2.startswith("image/"))
else:
    check("RT7-56", "DEF-56", "Ảnh vừa tải mở được qua Nginx (:8081)",
          "HTTP 200, Content-Type image/png", "không chạy được: RT7-55 không trả avatarUrl", False)

big = png(1000, 800, noise=True)
st, ct, r = upload("/api/users/me/avatar", "rt7-big.png", big, "image/png", C["token"])
check("RT7-57", "DEF-57", f"Ảnh PNG hợp lệ {len(big) / 1024 / 1024:.1f} MB qua Nginx",
      "Không bị 413 của Nginx (200, hoặc thông báo JSON của app)",
      f"HTTP {st}, Content-Type {ct}; {r if 'json' in ct else str(r)[:80]}", st != 413 and "json" in ct)

st, ct, r = upload("/api/users/me/avatar", "evil.png",
                   b"<html><script>alert(1)</script></html>", "image/png", B["token"])
check("RT7-60", "DEF-60", "File HTML đặt tên evil.png, Content-Type image/png",
      "Bị từ chối (4xx)", f"HTTP {st}; {r}", 400 <= st < 500)

# ============================================================================= DEF-59
print("\n== Sửa thông tin nhóm")
st, r = call("PUT", f"/api/teams/{team_id}", {"name": "Đổi tên bởi member", "courseName": "QLDA CNTT"}, B["token"])
name_now = sql(f"SELECT name FROM teams WHERE id={team_id}")
check("RT7-59", "DEF-59", "Thành viên thường B sửa tên nhóm",
      "HTTP 403, tên nhóm không đổi", f"HTTP {st}; tên nhóm trong CSDL: '{name_now}'",
      st == 403 and name_now != "Đổi tên bởi member")

# ============================================================================= DEF-58
print("\n== Cảnh báo của nhóm")
st, r = call("POST", f"/api/alerts/team/{team_id}",
             {"userId": B["id"], "alertType": "INACTIVITY", "severity": "MEDIUM", "title": "RT7 cảnh báo",
              "message": "Kiểm thử DEF-58", "senderName": "RT7 A", "senderRole": "LEADER"}, A["token"])
alert_id = (data(r) or {}).get("id") if isinstance(data(r), dict) else None
print(f"   tạo cảnh báo: HTTP {st}, id={alert_id}")
if alert_id:
    st_r, r_r = call("POST", f"/api/alerts/{alert_id}/remind", token=E["token"])
    check("RT7-58a", "DEF-58", "Người ngoài nhóm E nhắc nhở cảnh báo của nhóm", "HTTP 403",
          f"HTTP {st_r}; {(r_r or {}).get('message') if isinstance(r_r, dict) else r_r}", st_r == 403)
    st_s, r_s = call("PUT", f"/api/alerts/{alert_id}/resolve", token=E["token"])
    resolved = sql(f"SELECT resolved FROM alerts WHERE id={alert_id}")
    check("RT7-58b", "DEF-58", "Người ngoài nhóm E đánh dấu đã giải quyết cảnh báo của nhóm",
          "HTTP 403, cảnh báo vẫn chưa giải quyết", f"HTTP {st_s}; resolved trong CSDL = {resolved}",
          st_s == 403 and resolved in ("0", "", "NULL"))
else:
    for tc in ("RT7-58a", "RT7-58b"):
        check(tc, "DEF-58", "Người ngoài nhóm thao tác cảnh báo", "HTTP 403",
              f"không tạo được cảnh báo: HTTP {st} {r}", False)

# ============================================================================= DEF-64, 65
print("\n== Chấm chéo")
now = datetime.now()
st, r = call("POST", f"/api/review-rounds/sprint/{sprint_id}",
             {"name": f"RT7 Round {RUN}", "startDate": (now - timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S"),
              "endDate": (now + timedelta(days=3)).strftime("%Y-%m-%dT%H:%M:%S")}, A["token"])
round_id = (data(r) or {}).get("id")
call("POST", f"/api/review-rounds/{round_id}/open", token=A["token"])
print(f"   đợt chấm {round_id}")


def submit(actor, reviewee, reviewer_field=None, crit="QUALITY"):
    body = {"revieweeId": reviewee["id"], "scores": [{"criterion": crit, "score": 1}], "feedback": "RT7"}
    if reviewer_field is not None:
        body["reviewerId"] = reviewer_field["id"]
    return call("POST", f"/api/review-rounds/{round_id}/submissions", body, actor["token"])


st, r = submit(E, B, reviewer_field=C)
rows = sql(f"SELECT COUNT(*) FROM review_submissions WHERE review_round_id={round_id}")
check("RT7-64a", "DEF-64", "Người ngoài E gửi phiếu đứng tên C (reviewerId=C) chấm B",
      "HTTP 403, không lưu phiếu", f"HTTP {st}; số phiếu trong đợt: {rows}", st == 403 and rows == "0")

st, r = submit(B, C, reviewer_field=A)
who = sql(f"SELECT GROUP_CONCAT(DISTINCT reviewer_id) FROM review_submissions "
          f"WHERE review_round_id={round_id} AND reviewee_id={C['id']}")
check("RT7-64b", "DEF-64", "Thành viên B gửi phiếu kèm reviewerId=A (Leader) chấm C",
      f"Phiếu đứng tên B (id {B['id']}), không đứng tên A (id {A['id']})",
      f"HTTP {st}; reviewer_id trong CSDL = {who}", who == str(B["id"]))

st, r = call("GET", f"/api/review-rounds/{round_id}/submissions/reviewer/{B['id']}", token=E["token"])
check("RT7-65a", "DEF-65", "Người ngoài E xem B đã chấm ai, bao nhiêu điểm",
      "HTTP 403", f"HTTP {st}; {len(data(r) or []) if st == 200 else 0} phiếu lộ ra", st == 403)
st, r = call("GET", f"/api/review-rounds/team/{team_id}", token=E["token"])
check("RT7-65b", "DEF-65", "Người ngoài E xem danh sách đợt chấm của nhóm",
      "HTTP 403", f"HTTP {st}; {len(data(r) or []) if st == 200 else 0} đợt lộ ra", st == 403)

# ============================================================================= DEF-66
print("\n== Gửi email báo cáo")
for tc, body in (("RT7-66a", {"teamId": team_id, "sprintId": sprint_id, "userIds": [B["id"]]}),
                 ("RT7-66b", {"sprintId": sprint_id, "userIds": [B["id"]]})):
    t0 = time.time()
    try:
        st, r = call("POST", "/api/reports/send-email", body, E["token"], timeout=200)
    except Exception as ex:                                   # noqa: BLE001
        st, r = "timeout", str(ex)
    dt = time.time() - t0
    ok_flag = r.get("success") if isinstance(r, dict) else None
    msg = r.get("message") if isinstance(r, dict) else r
    label = "kèm teamId của nhóm" if "teamId" in body else "bỏ trống teamId"
    check(tc, "DEF-66", f"Người ngoài E gửi email báo cáo cho B ({label})",
          "HTTP 403, hoặc success=false trả lời ngay (không gửi email)",
          f"HTTP {st}, success={ok_flag}, {dt:.1f} s; {str(msg)[:120]}",
          st == 403 or (ok_flag is False and dt < 10))

# ----------------------------------------------------------------------------- tổng
passed = sum(1 for x in results if x["result"] == "PASS")
print(f"\nTỔNG: {passed}/{len(results)} PASS")
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"run": RUN, "base": BASE, "team": team_id, "results": results}, f, ensure_ascii=False, indent=2)
print(f"Đã ghi {os.path.relpath(OUT, REPO)}")
sys.exit(0 if passed == len(results) else 1)
