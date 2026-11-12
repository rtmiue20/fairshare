#!/usr/bin/env bash
# Dựng (hoặc cập nhật) môi trường staging FairShare.
# Cách dùng (chạy ở thư mục gốc repo):
#   ./scripts/staging-up.sh            # build + chạy
#   ./scripts/staging-up.sh down       # tắt, GIỮ dữ liệu
#   ./scripts/staging-up.sh reset      # tắt và XÓA dữ liệu DB staging
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=.env.staging
COMPOSE=(docker compose -p fairshare-staging --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.staging.yml)

gen_secret() { python3 -c 'import secrets; print(secrets.token_hex(32))'; }

if [[ ! -f "$ENV_FILE" ]]; then
  echo "[staging] Chưa có $ENV_FILE -> tạo từ .env.staging.example với mật khẩu ngẫu nhiên"
  cp .env.staging.example "$ENV_FILE"
fi
# Điền các biến bí mật còn trống (không ghi đè giá trị đã có)
for var in DB_PASSWORD DB_ROOT_PASSWORD JWT_SECRET; do
  if grep -qE "^${var}=$" "$ENV_FILE"; then
    sed -i.bak "s|^${var}=$|${var}=$(gen_secret)|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  fi
done

case "${1:-up}" in
  down)  "${COMPOSE[@]}" down; exit 0 ;;
  reset) "${COMPOSE[@]}" down -v; exit 0 ;;
  up)    ;;
  *)     echo "Dùng: $0 [up|down|reset]"; exit 1 ;;
esac

"${COMPOSE[@]}" config --quiet
"${COMPOSE[@]}" up -d --build --wait --wait-timeout 300
"${COMPOSE[@]}" ps
echo "[staging] Đang chạy smoke test..."
./scripts/staging-smoke.sh
