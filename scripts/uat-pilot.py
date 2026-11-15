#!/usr/bin/env python3
"""
Chạy thử (pilot) kịch bản UAT Sprint 6 ở mức API trước khi mời người thử thật (WP5 – M5).
Cần chạy scripts/uat-seed.py trước (dùng tài khoản uat01..uat12 và nhóm A).

    python3 scripts/uat-pilot.py [BASE_URL]        Windows: py -X utf8 scripts/uat-pilot.py

Phạm vi:
  - UAT-M2-01..05 (M2): tạo nhóm + mã mời, mời/tham gia bằng mã, consent, rút consent, tạo/đóng sprint.
  - Các luồng chính trên dữ liệu mẫu: board, dashboard, khai báo đóng góp, chấm chéo, PDF.
  - Phân quyền và chống gian lận của các API mà người thử chạm tới.
Kết quả: docs/qa/uat/uat-pilot-result.json (+ in ra màn hình).
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8081").rstrip("/")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUN = str(int(time.time()))
results = []

with open(os.path.join(REPO, ".uat-credentials.local"), encoding="utf-8") as f:
    PASSWORD = next(l.split("=", 1)[1].strip() for l in f if l.startswith("PASSWORD="))


def call(method, path, body=None, token=None, raw=False):
    req = urllib.request.Request(BASE + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            b = r.read()
            return r.status, (b if raw else json.loads(b.decode() or "null"))
    except urllib.error.HTTPError as e:
        b = e.read()
        try:
            return e.code, (b if raw else (json.loads(b.decode()) if b else None))
        except ValueError:
            return e.code, b.decode(errors="ignore")


def data(r):
    return r.get("data") if isinstance(r, dict) and "data" in r else r


def safe(res):
    """Tên trường ẩn danh: anonymousSafe (hiện tại) hoặc isAnonymousSafe (bản cũ)."""
    return res.get("anonymousSafe", res.get("isAnonymousSafe"))


def check(tc, name, expected, actual, ok, area):
    results.append({"id": tc, "area": area, "name": name, "expected": expected, "actual": actual,
                    "result": "PASS" if ok else "FAIL"})
    print(f"[{'PASS' if ok else 'FAIL'}] {tc} {name}\n       mong đợi: {expected}\n       thực tế : {actual}")


def login(i):
    email = f"uat{i:02d}@fairshare.test"
    st, r = call("POST", "/api/auth/login", {"email": email, "password": PASSWORD})
    assert st == 200, f"login {email}: {st} {r}"
    d = data(r)
    return {"email": email, "id": d["user"]["id"], "token": d["accessToken"], "name": d["user"].get("fullName")}


U = [None] + [login(i) for i in range(1, 13)]
st, r = call("GET", "/api/teams", token=U[1]["token"])
teamA = next(t for t in data(r) if t["name"].startswith("UAT – Nhóm A"))
A = teamA["id"]
sprintA = data(call("GET", f"/api/teams/{A}/sprints", token=U[1]["token"])[1])[0]["id"]
outsider = U[12]
print(f"== Pilot UAT trên {BASE} (nhóm A = {A}, sprint {sprintA})")

# ============================================================== UAT-M2-01..05
print("\n== Kịch bản M2")
lead, m1, m2 = U[6], U[7], U[8]
st, r = call("POST", "/api/teams", {"name": "", "courseName": "QLDA"}, lead["token"])
check("UAT-M2-01a", "Tạo nhóm để trống tên bị từ chối", "HTTP 400", f"HTTP {st}", st == 400, "M2")
st, r = call("POST", "/api/teams", {"name": f"Nhóm 07 - Đồ án QLDA CNTT ({RUN})",
                                     "courseName": "Quản lý dự án Công nghệ Thông tin",
                                     "description": "Đề tài FairShare"}, lead["token"])
t = data(r) or {}
code = t.get("inviteCode") or ""
check("UAT-M2-01", "Tạo nhóm: người tạo là LEADER, sinh mã mời 6–8 ký tự",
      "HTTP 201/200, inviteCode 6–8 ký tự", f"HTTP {st}, inviteCode='{code}'",
      st in (200, 201) and 6 <= len(code.replace('-', '')) <= 8, "M2")
T = t.get("id")
st, r = call("POST", f"/api/teams/{T}/members", {"email": m1["email"]}, lead["token"])
check("UAT-M2-02a", "Leader mời thành viên qua email", "HTTP 200/201", f"HTTP {st}", st in (200, 201), "M2")
st, r = call("POST", f"/api/teams/{T}/members", {"email": m2["email"]}, m1["token"])
check("UAT-M2-02c", "Thành viên thường không mời được người khác", "HTTP 403", f"HTTP {st}", st == 403, "M2")
st, r = call("POST", "/api/teams/join", {"inviteCode": code}, U[10]["token"])   # uat10 chưa thuộc nhóm nào
check("UAT-M2-02b", "Tham gia nhóm bằng mã mời", "HTTP 200, vai trò MEMBER", f"HTTP {st}", st == 200, "M2")
st, r = call("POST", "/api/teams/join", {"inviteCode": "SAIMA1"}, U[9]["token"])
check("UAT-M2-02d", "Mã mời sai bị từ chối", "HTTP 400/404", f"HTTP {st}", st in (400, 404), "M2")
st, r = call("GET", f"/api/teams/{T}/consent/status", token=m2["token"])
before = (data(r) or {}).get("consented")
st, r = call("POST", f"/api/teams/{T}/consent", {"consented": True}, m2["token"])
st2, r2 = call("GET", f"/api/teams/{T}/consent/status", token=m2["token"])
check("UAT-M2-03", "Ký consent: trạng thái chuyển sang đã đồng thuận",
      "trước=false, sau=true", f"trước={before}, POST HTTP {st}, sau={(data(r2) or {}).get('consented')}",
      st == 200 and (data(r2) or {}).get("consented") is True, "M2")
st, r = call("DELETE", f"/api/teams/{T}/consent", token=m2["token"])
st2, r2 = call("GET", f"/api/teams/{T}/consent/status", token=m2["token"])
check("UAT-M2-04", "Rút consent: trạng thái về chưa đồng thuận", "HTTP 200, consented=false",
      f"HTTP {st}, consented={(data(r2) or {}).get('consented')}",
      st == 200 and (data(r2) or {}).get("consented") is False, "M2")
st, r = call("POST", f"/api/teams/{T}/sprints",
             {"name": "Sprint 2 - Phát triển", "startDate": str(date.today()),
              "endDate": str(date.today() + timedelta(days=7)), "goal": "UAT"}, lead["token"])
S = (data(r) or {}).get("id")
check("UAT-M2-05a", "Leader tạo sprint mới", "HTTP 200/201", f"HTTP {st}, sprintId={S}", st in (200, 201), "M2")
st, r = call("POST", f"/api/teams/{T}/sprints",
             {"name": "Sprint ngày ngược", "startDate": str(date.today() + timedelta(days=7)),
              "endDate": str(date.today())}, lead["token"])
check("UAT-M2-05b", "Sprint có ngày kết thúc trước ngày bắt đầu bị từ chối", "HTTP 400", f"HTTP {st}",
      st == 400, "M2")
st, r = call("PUT", f"/api/sprints/{S}/close", token=m1["token"])
check("UAT-M2-05c", "Thành viên thường không đóng được sprint", "HTTP 403", f"HTTP {st}", st == 403, "M2")
st, r = call("PUT", f"/api/sprints/{S}/close", token=lead["token"])
check("UAT-M2-05d", "Leader đóng sprint", "HTTP 200, trạng thái COMPLETED/CLOSED",
      f"HTTP {st}, status={(data(r) or {}).get('status')}", st == 200, "M2")

# ============================================================== Luồng chính trên nhóm A
print("\n== Luồng chính (nhóm A)")
st, r = call("GET", f"/api/contributions/summary?teamId={A}&sprintId={sprintA}", token=U[1]["token"])
rows = data(r) if isinstance(data(r), list) else []
check("UAT-DASH-01", "Dashboard nhóm A có tỷ lệ đóng góp cho 5 thành viên", "HTTP 200, 5 dòng",
      f"HTTP {st}, {len(rows)} dòng", st == 200 and len(rows) == 5, "Core")
st, r = call("GET", f"/api/review-rounds/sprint/{sprintA}", token=U[2]["token"])
rnd = (data(r) or [{}])[0]
st, r = call("GET", f"/api/review-rounds/{rnd.get('id')}/results/{U[1]['id']}", token=U[1]["token"])
res = data(r) or {}
check("UAT-PR-01", "uat01 xem kết quả chấm chéo của mình (đủ 3 người chấm)", "HTTP 200, anonymousSafe=true",
      f"HTTP {st}, safe={safe(res)}, avg={res.get('averageScore')}, phiếu={res.get('submissionCount')}",
      st == 200 and safe(res) is True, "Core")
st, r = call("GET", f"/api/review-rounds/{rnd.get('id')}/results/{U[2]['id']}", token=U[2]["token"])
res = data(r) or {}
check("UAT-PR-02", "uat02 chưa đủ 3 người chấm: không lộ điểm", "anonymousSafe=false, averageScore ẩn (0/null)",
      f"HTTP {st}, safe={safe(res)}, avg={res.get('averageScore')}",
      safe(res) is False and not res.get("averageScore"), "Core")
st, b = call("GET", f"/api/reports/teams/{A}/sprints/{sprintA}/pdf", token=U[1]["token"], raw=True)
check("UAT-PDF-01", "Leader xuất PDF nhóm A", "HTTP 200, file %PDF", f"HTTP {st}, {len(b) if isinstance(b, bytes) else 0} byte",
      st == 200 and isinstance(b, bytes) and b[:5] == b"%PDF-", "Core")

# ============================================================== Phân quyền / chống gian lận
print("\n== Phân quyền và chống gian lận")
st, r = call("GET", f"/api/teams/{A}/sprints", token=outsider["token"])
check("UAT-SEC-01", "Người ngoài nhóm xem danh sách sprint của nhóm A", "HTTP 403", f"HTTP {st}", st == 403, "Sec")
st, r = call("GET", f"/api/boards/team/{A}", token=outsider["token"])
check("UAT-SEC-02", "Người ngoài nhóm xem board của nhóm A", "HTTP 403", f"HTTP {st}", st == 403, "Sec")
st, r = call("GET", f"/api/contributions/manual?teamId={A}", token=outsider["token"])
check("UAT-SEC-03", "Người ngoài nhóm xem khai báo đóng góp của nhóm A", "HTTP 403",
      f"HTTP {st}, {len(data(r) or []) if isinstance(data(r), list) else '-'} mục", st == 403, "Sec")
st, r = call("POST", f"/api/contributions/manual?teamId={A}&sprintId={sprintA}&userId={U[3]['id']}",
             {"taskName": f"Khai báo hộ người khác {RUN}", "storyPoints": 5}, U[2]["token"])
check("UAT-SEC-04", "uat02 khai báo đóng góp đứng tên uat03 (giả danh)", "HTTP 403",
      f"HTTP {st}, người được ghi = {(data(r) or {}).get('userId') if isinstance(data(r), dict) else '-'}",
      st == 403, "Sec")
st, r = call("POST", f"/api/contributions/manual?teamId={A}&sprintId={sprintA}&userId={U[2]['id']}",
             {"taskName": f"Tự khai báo {RUN}", "storyPoints": 8}, U[2]["token"])
mc = (data(r) or {}).get("id") if isinstance(data(r), dict) else None
st, r = call("PUT", f"/api/contributions/manual/{mc}/review?reviewerId={U[3]['id']}&action=APPROVE",
             token=U[2]["token"])
status = (data(r) or {}).get("status") if isinstance(data(r), dict) else None
check("UAT-SEC-05", "uat02 tự duyệt khai báo của mình bằng cách gửi reviewerId=uat03", "HTTP 403",
      f"HTTP {st}, trạng thái = {status}", st == 403, "Sec")
st, r = call("PUT", f"/api/contributions/manual/{mc}/review?reviewerId={outsider['id']}&action=APPROVE",
             token=outsider["token"])
check("UAT-SEC-06", "Người ngoài nhóm duyệt khai báo của nhóm A", "HTTP 403", f"HTTP {st}", st == 403, "Sec")
st, b = call("GET", f"/api/reports/teams/{A}/sprints/{sprintA}/pdf", token=outsider["token"], raw=True)
check("UAT-SEC-07", "Người ngoài nhóm xuất PDF nhóm A", "HTTP 403", f"HTTP {st}", st == 403, "Sec")

st, r = call("POST", f"/api/teams/{T}/members", {"email": outsider["email"], "role": "LEADER"}, outsider["token"])
st2, r2 = call("GET", f"/api/teams/{T}/members", token=lead["token"])
mem = data(r2) if isinstance(data(r2), list) else []
role = next((m.get("role") for m in mem if m.get("userId") == outsider["id"] or m.get("email") == outsider["email"]), None)
check("UAT-SEC-08", "Người ngoài nhóm tự thêm mình vào nhóm với vai trò LEADER", "HTTP 403, không trở thành thành viên",
      f"HTTP {st}, vai trò trong nhóm = {role}", st == 403 and role is None, "Sec")

passed = sum(r["result"] == "PASS" for r in results)
print(f"\nTỔNG: {passed}/{len(results)} PASS")
os.makedirs(os.path.join(REPO, "docs", "qa", "uat"), exist_ok=True)
with open(os.path.join(REPO, "docs", "qa", "uat", "uat-pilot-result.json"), "w", encoding="utf-8") as f:
    json.dump({"run": RUN, "base_url": BASE, "executed_at": datetime.now().isoformat(timespec="seconds"),
               "passed": passed, "total": len(results), "cases": results}, f, ensure_ascii=False, indent=2)
sys.exit(0 if passed == len(results) else 1)
