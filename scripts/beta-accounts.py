"""Tao 5 tai khoan cho flow test ban beta (docs/qa/uat/beta-test-flows.md).

1 Truong nhom + 4 Thanh vien, dang ky qua API that cua ban beta (giong form Dang ky),
sau do dang nhap thu tung tai khoan. Mat khau sinh ngau nhien, chi ghi vao file local
.beta-credentials.local (da gitignore), khong in ra man hinh.

Chay:   py -X utf8 scripts/beta-accounts.py
Tuy chon:
  --base-url URL   mac dinh https://fairshare-web-3iuo.onrender.com
  --tag TAG        them hau to vao email, vd --tag 2 -> beta2-leader@fairshare.test
                   (dung khi muon bo tai khoan moi, sach)

Tai khoan da ton tai thi bo qua, khong doi mat khau.
"""
import argparse
import json
import secrets
import string
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CRED_FILE = ROOT / ".beta-credentials.local"


def accounts(tag):
    p = f"beta{tag}"
    return [
        ("LEADER", f"{p}-leader@fairshare.test", "Trưởng nhóm Beta"),
        ("MEMBER", f"{p}-mem1@fairshare.test", "Thành viên Beta 1"),
        ("MEMBER", f"{p}-mem2@fairshare.test", "Thành viên Beta 2"),
        ("MEMBER", f"{p}-mem3@fairshare.test", "Thành viên Beta 3"),
        ("MEMBER", f"{p}-mem4@fairshare.test", "Thành viên Beta 4"),
    ]


def gen_password():
    alphabet = string.ascii_letters + string.digits
    while True:
        pw = "".join(secrets.choice(alphabet) for _ in range(14))
        if any(c.isdigit() for c in pw) and any(c.isupper() for c in pw) and any(c.islower() for c in pw):
            return pw


def post(url, body, timeout=90):
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "application/json", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def wake(base):
    """Render free tier ngu sau mot luc khong dung: goi truoc de backend khoi dong."""
    print("Dang danh thuc server (Render co the mat 30-60 giay)...")
    for i in range(6):
        try:
            code, _ = post(f"{base}/api/auth/login", {"email": "wake@fairshare.test", "password": "x"}, timeout=60)
            if code < 500:
                print(f"  server san sang (HTTP {code})")
                return True
            print(f"  HTTP {code}, thu lai...")
        except Exception as e:  # timeout, connection reset
            print(f"  chua phan hoi ({type(e).__name__}), thu lai...")
        time.sleep(10)
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="https://fairshare-web-3iuo.onrender.com")
    ap.add_argument("--tag", default="")
    a = ap.parse_args()
    base = a.base_url.rstrip("/")

    if not wake(base):
        print("Server khong phan hoi. Mo link beta tren trinh duyet cho tai xong roi chay lai.")
        sys.exit(1)

    created, lines, ok_all = [], [], True
    for role, email, name in accounts(a.tag):
        pw = gen_password()
        code, body = post(f"{base}/api/auth/register", {"email": email, "password": pw, "fullName": name})
        if code in (200, 201):
            lcode, _ = post(f"{base}/api/auth/login", {"email": email, "password": pw})
            status = "TAO MOI, dang nhap OK" if lcode == 200 else f"TAO MOI, dang nhap LOI (HTTP {lcode})"
            ok_all &= lcode == 200
            created.append((role, email, name, pw))
        else:
            low = body.lower()
            if code in (400, 409) and ("exist" in low or "ton tai" in low or "tồn tại" in low or "already" in low):
                status = "DA TON TAI, bo qua (giu mat khau cu)"
            else:
                status = f"LOI HTTP {code}: {body[:160]}"
                ok_all = False
        lines.append(f"{role:<6}  {email:<28}  {status}")

    print("\nKet qua:")
    print("\n".join(lines))

    if created:
        with open(CRED_FILE, "a", encoding="utf-8") as f:
            f.write(f"\n# Ban beta {base} - tao luc {datetime.now():%Y-%m-%d %H:%M}\n")
            f.write("# Vai tro | Email | Ho ten | Mat khau\n")
            for role, email, name, pw in created:
                f.write(f"{role} | {email} | {name} | {pw}\n")
        print(f"\nMat khau cua {len(created)} tai khoan moi da ghi vao {CRED_FILE.name} (file local, khong commit).")
    sys.exit(0 if ok_all else 2)


if __name__ == "__main__":
    main()
