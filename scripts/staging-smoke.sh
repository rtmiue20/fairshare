#!/usr/bin/env bash
# Smoke test staging: kiểm tra 3 container, Flyway, health, frontend và luồng đăng ký/đăng nhập.
# Cách dùng: ./scripts/staging-smoke.sh [FRONTEND_URL]   (mặc định http://localhost:8081)
# Thoát với mã khác 0 nếu có bước lỗi.
set -uo pipefail

cd "$(dirname "$0")/.."
FE_URL="${1:-http://localhost:${FRONTEND_PORT:-8081}}"
PROJECT=fairshare-staging
fail=0
ok()   { echo "  [PASS] $*"; }
bad()  { echo "  [FAIL] $*"; fail=1; }

echo "== 1. Trạng thái container"
for svc in db backend frontend; do
  cid=$(docker compose -p "$PROJECT" ps -q "$svc")
  st=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo missing)
  [[ "$st" == "healthy" || "$st" == "running" ]] && ok "$svc: $st" || bad "$svc: $st"
done

echo "== 2. Flyway migration"
belog=$(docker compose -p "$PROJECT" logs backend 2>&1)   # lưu vào biến để tránh SIGPIPE khi grep -q + pipefail
flyway=$(grep -oE 'Successfully applied [0-9]+ migrations?[^,]*|Schema .* is up to date' <<<"$belog" | tail -1)
if [[ -n "$flyway" ]]; then
  ok "$flyway"
else
  bad "không thấy log Flyway thành công"
fi

echo "== 3. DB không mở cổng ra ngoài"
dbports=$(docker inspect -f '{{json .HostConfig.PortBindings}}' "$(docker compose -p "$PROJECT" ps -q db)" 2>/dev/null)
[[ "$dbports" == "{}" || "$dbports" == "null" ]] && ok "3306 không publish" || bad "3306 đang publish: $dbports"

echo "== 4. Frontend + reverse proxy /api"
index=$(curl -fsS "$FE_URL/")
[[ "$index" == *'id="root"'* ]] && ok "index.html tại $FE_URL" || bad "frontend không trả index.html"
code=$(curl -s -o /dev/null -w '%{http_code}' "$FE_URL/api/teams")
[[ "$code" == "401" ]] && ok "/api/teams chưa đăng nhập -> 401 (proxy tới backend OK)" || bad "/api/teams -> $code (mong đợi 401)"

echo "== 5. Đăng ký + đăng nhập qua Nginx"
email="smoke_$(date +%s)_${RANDOM}@staging.local"
reg=$(curl -s -X POST "$FE_URL/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$email\",\"password\":\"Smoke@123456\",\"fullName\":\"Smoke Test\"}")
echo "$reg" | grep -q '"accessToken"' && ok "register $email" || bad "register: $reg"
login=$(curl -s -X POST "$FE_URL/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$email\",\"password\":\"Smoke@123456\"}")
token=$(echo "$login" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])' 2>/dev/null)
[[ -n "$token" ]] && ok "login trả JWT" || bad "login: $login"
code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $token" "$FE_URL/api/teams")
[[ "$code" == "200" ]] && ok "/api/teams có token -> 200" || bad "/api/teams có token -> $code"

echo
[[ $fail -eq 0 ]] && echo "SMOKE TEST: PASS" || echo "SMOKE TEST: FAIL"
exit $fail
