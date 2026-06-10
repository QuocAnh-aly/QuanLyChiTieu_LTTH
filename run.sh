#!/usr/bin/env bash
# ============================================================
# run.sh — Start the entire Quản Lý Chi Tiêu project
#
# Features:
#   - Health check polling (curl-based, thay vì sleep cố định)
#   - Tự động kill service cũ trên cùng port
#   - Selective start (chỉ frontend / chỉ backend)
#   - Auto-open browser khi frontend sẵn sàng
#   - Real-time status dashboard
#
# Usage:
#   ./run.sh                — Start tất cả services
#   ./run.sh --frontend-only — Chỉ chạy frontend
#   ./run.sh --backend-only  — Chỉ chạy backend
#   ./run.sh --no-browser    — Không tự động mở trình duyệt
#   ./run.sh --help          — Xem hướng dẫn
# ============================================================
set -euo pipefail

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

# ─── Config ──────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
PID_FILE="$LOG_DIR/services.pid"
> "$PID_FILE"

# ─── Parse flags ─────────────────────────────────────────────────────────────
FRONTEND_ONLY=false
BACKEND_ONLY=false
OPEN_BROWSER=true

for arg in "$@"; do
  case "$arg" in
    --frontend-only) FRONTEND_ONLY=true ;;
    --backend-only)  BACKEND_ONLY=true  ;;
    --no-browser)    OPEN_BROWSER=false ;;
    --help|-h)
      echo -e "${CYAN}Usage:${NC} ./run.sh [options]"
      echo ""
      echo "  --frontend-only    Chỉ chạy frontend (Vite dev server)"
      echo "  --backend-only     Chỉ chạy backend (API, Auth, Gateway)"
      echo "  --no-browser       Không tự động mở trình duyệt"
      echo "  --help, -h         Xem hướng dẫn này"
      exit 0
      ;;
  esac
done

if $FRONTEND_ONLY && $BACKEND_ONLY; then
  echo -e "${RED}✖ Không thể dùng --frontend-only và --backend-only cùng lúc${NC}"
  exit 1
fi

# ─── Prerequisites check ──────────────────────────────────────────────────────
MISSING=0
check_dep() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✖ Missing dependency: $1${NC}"
    MISSING=1
  fi
}
check_dep dotnet
check_dep npm
check_dep curl

if [[ $MISSING -eq 1 ]]; then
  echo "" && echo "Please install the missing dependencies above and try again." && exit 1
fi

# ─── Extract ports from source code ──────────────────────────────────────────
extract_port() {
  local launch_file="$1"
  grep -oP '"applicationUrl".*?http://localhost:\K[0-9]+' "$launch_file" 2>/dev/null | head -1 || echo ""
}

GATEWAY_PORT=$(extract_port "BudgetManagement/BudgetManagement.APIGateway/Properties/launchSettings.json")
API_PORT=$(extract_port "BudgetManagement/BudgetManagement.APIService/Properties/launchSettings.json")
AUTH_PORT=$(extract_port "BudgetManagement/BudgetManagement.AuthService/Properties/launchSettings.json")

FRONTEND_PORT=$(grep -oP 'port:\s*\K[0-9]+' vite.config.ts 2>/dev/null | head -1 || echo "5173")

if [[ -z "$GATEWAY_PORT" || -z "$API_PORT" || -z "$AUTH_PORT" ]]; then
  echo -e "${RED}✖ Không thể đọc port từ launchSettings.json${NC}"
  echo "   Gateway: ${GATEWAY_PORT:-không tìm thấy}"
  echo "   API:     ${API_PORT:-không tìm thấy}"
  echo "   Auth:    ${AUTH_PORT:-không tìm thấy}"
  echo "" && echo "Hãy chạy script từ thư mục gốc project." && exit 1
fi

# ─── Service definitions ──────────────────────────────────────────────────────
declare -A SERVICES=(
  ["API"]="$API_PORT|backend|http://localhost:$API_PORT"
  ["Auth"]="$AUTH_PORT|backend|http://localhost:$AUTH_PORT"
  ["Gateway"]="$GATEWAY_PORT|backend|http://localhost:$GATEWAY_PORT"
  ["Frontend"]="$FRONTEND_PORT|frontend|http://localhost:$FRONTEND_PORT"
)

# ─── Helper: Hyperlink trong terminal ────────────────────────────────────────
print_hyperlink() {
  printf '\e]8;;%s\e\\%s\e]8;;\e\\' "$1" "$2"
}

# ─── Auto-kill: dọn port trước khi start ─────────────────────────────────────
auto_kill_ports() {
  local killed=false
  for svc in "${!SERVICES[@]}"; do
    IFS='|' read -r port _ _ <<< "${SERVICES[$svc]}"
    local pids=""
    if command -v lsof &>/dev/null; then
      pids=$(lsof -ti ":$port" 2>/dev/null || true)
    elif command -v ss &>/dev/null; then
      # ss -tlnp output: LISTEN 0 128 0.0.0.0:5173 0.0.0.0:* users:(("node",pid=1234,...))
      pids=$(ss -tlnp 2>/dev/null | grep ":$port[[:space:]]" | grep -oP 'pid=\K[0-9]+' || true)
    fi
    if [[ -n "$pids" ]]; then
      echo -e "   ${YELLOW}↻ Port $port ($svc) đang được dùng — đang dọn...${NC}"
      for pid in $pids; do
        kill -15 "$pid" 2>/dev/null || true
      done
      # Đợi port được giải phóng (tối đa 5s)
      for i in {1..5}; do
        remaining=$(lsof -ti ":$port" 2>/dev/null || true)
        [[ -z "$remaining" ]] && break
        if [[ $i -eq 5 ]]; then
          kill -9 $remaining 2>/dev/null || true
        fi
        sleep 1
      done
      killed=true
    fi
  done
  $killed && echo -e "   ${GREEN}✓ Đã giải phóng port${NC}" || true
}

# ─── Health check: poll đến khi service ready ────────────────────────────────
# Dùng curl (đã check dependency) — đáng tin cậy hơn /dev/tcp
wait_for_port() {
  local port="$1"
  local max_wait="$2"
  local waited=0
  local interval=1
  local spinner=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')

  while [[ $waited -lt $max_wait ]]; do
    # curl -s (silent), --connect-timeout 1 — return 0 nếu connect được (dù 404/500)
    if curl -so /dev/null --connect-timeout 1 "http://localhost:$port" 2>/dev/null; then
      return 0
    fi
    local idx=$((waited % ${#spinner[@]}))
    printf "\r   ${spinner[$idx]}  Đang chờ... (${waited}s)" >&2
    sleep "$interval"
    ((waited++))
  done
  printf "\r" >&2
  return 1
}

# ─── Start dotnet service ────────────────────────────────────────────────────
start_dotnet_service() {
  local name="$1"
  local dir="$2"
  local launch_profile="$3"
  local port="$4"
  local log_file="$5"
  local color="$6"

  (
    cd "$dir"
    stdbuf -oL dotnet run --launch-profile "$launch_profile" 2>&1 \
      | stdbuf -oL sed "s/^/[${name}] /" \
      | stdbuf -oL awk '{ print strftime("[%Y-%m-%d %H:%M:%S]"), $0; fflush() }' \
      | stdbuf -oL tee -a "$log_file"
  ) &
  echo $! >> "$PID_FILE"
}

# ─── Cleanup trap (Ctrl+C) ────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}⏹  Stopping services...${NC}"
  if [[ -f "$PID_FILE" ]]; then
    while IFS= read -r pid; do
      kill -15 "$pid" 2>/dev/null || true
    done < "$PID_FILE"
  fi
  sleep 1
  pgrep -f "dotnet.*BudgetManagement" 2>/dev/null | xargs kill 2>/dev/null || true
  pgrep -f "npm run dev" 2>/dev/null | xargs kill 2>/dev/null || true
  pgrep -f "vite" 2>/dev/null | xargs kill 2>/dev/null || true
  echo -e "${GREEN}✓ All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ════════════════════════════════════════════════════════════════════════════
echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║   💰  Quản Lý Chi Tiêu  —  Starting Services        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Auto-kill existing services ──────────────────────────────────────────────
echo -e "${YELLOW}🔍  Kiểm tra port đang dùng...${NC}"
auto_kill_ports
echo ""

# ─── Log file paths ──────────────────────────────────────────────────────────
API_LOG="$LOG_DIR/api-service_$LOG_TIMESTAMP.log"
AUTH_LOG="$LOG_DIR/auth-service_$LOG_TIMESTAMP.log"
GATEWAY_LOG="$LOG_DIR/gateway_$LOG_TIMESTAMP.log"
FRONTEND_LOG="$LOG_DIR/frontend_$LOG_TIMESTAMP.log"

# ─── Start Backend Services ───────────────────────────────────────────────────
if ! $FRONTEND_ONLY; then
  echo -e "${BOLD}📦  Backend Services:${NC}"

  echo -e "   ${GREEN}▶ API launching...${NC}      (port $API_PORT)"
  start_dotnet_service "API" \
    "BudgetManagement/BudgetManagement.APIService" "http" "$API_PORT" "$API_LOG" "$GREEN"

  echo -e "   ${CYAN}▶ Auth launching...${NC}     (port $AUTH_PORT)"
  start_dotnet_service "Auth" \
    "BudgetManagement/BudgetManagement.AuthService" "http" "$AUTH_PORT" "$AUTH_LOG" "$CYAN"

  echo -e "   ${PURPLE}▶ Gateway launching...${NC}  (port $GATEWAY_PORT)"
  start_dotnet_service "Gateway" \
    "BudgetManagement/BudgetManagement.APIGateway" "http" "$GATEWAY_PORT" "$GATEWAY_LOG" "$PURPLE"
  echo ""
fi

# ─── Start Frontend ───────────────────────────────────────────────────────────
if ! $BACKEND_ONLY; then
  echo -e "${BOLD}🎨  Frontend:${NC}"
  (
    stdbuf -oL npm run dev 2>&1 \
      | stdbuf -oL sed "s/^/[Frontend] /" \
      | stdbuf -oL awk '{ print strftime("[%Y-%m-%d %H:%M:%S]"), $0; fflush() }' \
      | stdbuf -oL tee -a "$FRONTEND_LOG"
  ) &
  echo $! >> "$PID_FILE"
  echo -e "   ${BLUE}▶ Frontend launching...${NC} (port $FRONTEND_PORT)"
  echo ""
fi

# ─── Health Check: chờ services ready ────────────────────────────────────────
MAX_WAIT=60
declare -A RESULTS

echo -e "${BOLD}⏳  Health Checks — đang chờ services sẵn sàng:${NC}"
echo ""

# Check frontend
if ! $BACKEND_ONLY; then
  printf "   ${GRAY}Frontend  :${NC} "
  if wait_for_port "$FRONTEND_PORT" "$MAX_WAIT"; then
    RESULTS["Frontend"]="✅"
    echo -e "\r   ${GREEN}✅ Frontend   ready  (port $FRONTEND_PORT)${NC}"
  else
    RESULTS["Frontend"]="❌"
    echo -e "\r   ${RED}❌ Frontend   timeout (port $FRONTEND_PORT)${NC}"
  fi
fi

# Check backend services
if ! $FRONTEND_ONLY; then
  for svc in "API" "Auth" "Gateway"; do
    IFS='|' read -r port _ _ <<< "${SERVICES[$svc]}"
    printf "   ${GRAY}%-10s:${NC} " "$svc"
    if wait_for_port "$port" "$MAX_WAIT"; then
      RESULTS[$svc]="✅"
      echo -e "\r   ${GREEN}✅ ${svc}        ready  (port $port)${NC}"
    else
      RESULTS[$svc]="❌"
      echo -e "\r   ${RED}❌ ${svc}        timeout (port $port)${NC}"
    fi
  done
fi

# ─── Summary Dashboard ────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║   📊  Services Status                               ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

declare -A URLS=(
  ["Frontend"]="http://localhost:$FRONTEND_PORT"
  ["API"]="http://localhost:$API_PORT"
  ["Auth"]="http://localhost:$AUTH_PORT"
  ["Gateway"]="http://localhost:$GATEWAY_PORT"
)

for svc in "Frontend" "API" "Auth" "Gateway"; do
  # Skip services not started based on flags
  if $FRONTEND_ONLY && [[ "$svc" != "Frontend" ]]; then continue; fi
  if $BACKEND_ONLY && [[ "$svc" == "Frontend" ]]; then continue; fi

  status="${RESULTS[$svc]:-⏳}"
  IFS='|' read -r port _ _ <<< "${SERVICES[$svc]}"
  link="${URLS[$svc]}"
  echo -e "   $status  ${BOLD}$svc${NC}  →  $(print_hyperlink "$link" "$link")  (port $port)"
done

echo ""

# Only show swagger if backend was started
if ! $FRONTEND_ONLY; then
  echo -e "   ${CYAN}📖  Swagger:${NC}"
  echo -e "      API:  $(print_hyperlink "http://localhost:$API_PORT/swagger" "http://localhost:$API_PORT/swagger")"
  echo -e "      Auth: $(print_hyperlink "http://localhost:$AUTH_PORT/swagger" "http://localhost:$AUTH_PORT/swagger")"
  echo ""
fi

# Log file info
echo -e "   ${CYAN}📝  Log files (logs/):${NC}"
echo -e "      API Service:     $API_LOG"
echo -e "      Auth Service:    $AUTH_LOG"
echo -e "      API Gateway:     $GATEWAY_LOG"
echo -e "      Frontend:        $FRONTEND_LOG"
echo ""

# ─── Auto-open browser ───────────────────────────────────────────────────────
if $OPEN_BROWSER && [[ "${RESULTS[Frontend]:-}" == "✅" ]]; then
  local_url="http://localhost:$FRONTEND_PORT"
  if command -v xdg-open &>/dev/null; then
    (xdg-open "$local_url" 2>/dev/null) &
  elif command -v open &>/dev/null; then
    (open "$local_url" 2>/dev/null) &
  elif command -v sensible-browser &>/dev/null; then
    (sensible-browser "$local_url" 2>/dev/null) &
  fi
  echo -e "   ${GREEN}🌐  Đã mở trình duyệt: $local_url${NC}"
  echo ""
fi

echo -e "   ${YELLOW}Press Ctrl+C  →  Dừng tất cả services${NC}"
echo -e "   ${YELLOW}./kill.sh     →  Dừng services (nếu cần)${NC}"
echo ""

# ─── Keep running ─────────────────────────────────────────────────────────────
# Dùng vòng lặp thay vì wait để tránh set -e thoát khi service crash
while true; do
  wait || sleep 1 2>/dev/null
done
