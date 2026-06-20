#!/usr/bin/env bash
# ============================================================
# kill.sh — Stop all Quản Lý Chi Tiêu services
#
# Features:
#   - Graceful shutdown: SIGTERM → wait → SIGKILL (nếu cần)
#   - Đọc PID file từ run.sh để kill chính xác hơn
#   - Selective stop: --frontend-only, --backend-only
#   --clean hiển thị dung lượng logs trước khi xoá
#   - Verify không còn process sót trên port
#
# Usage:
#   ./kill.sh                    — Dừng tất cả services
#   ./kill.sh --frontend-only    — Chỉ dừng frontend
#   ./kill.sh --backend-only     — Chỉ dừng backend
#   ./kill.sh --force            — Dùng kill -9 ngay lập tức
#   ./kill.sh --clean            — Dừng services + xoá logs
#   ./kill.sh --logs             — Chỉ xem danh sách log files
#   ./kill.sh --help             — Xem hướng dẫn
# ============================================================
set -euo pipefail

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; PURPLE='\033[0;35m'; GRAY='\033[0;90m'
NC='\033[0m'; BOLD='\033[1m'

# ─── Project root ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Log directory ───────────────────────────────────────────────────────────
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$LOG_DIR/services.pid"

# ─── Parse flags ──────────────────────────────────────────────────────────────
SHOW_LOGS_ONLY=false
CLEAN_LOGS=false
FORCE_KILL=false
FRONTEND_ONLY=false
BACKEND_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --clean)         CLEAN_LOGS=true    ;;
    --logs)          SHOW_LOGS_ONLY=true ;;
    --force)         FORCE_KILL=true    ;;
    --frontend-only) FRONTEND_ONLY=true ;;
    --backend-only)  BACKEND_ONLY=true  ;;
    --help|-h)
      echo -e "${CYAN}Usage:${NC} ./kill.sh [options]"
      echo ""
      echo "  --frontend-only    Chỉ dừng frontend (Vite)"
      echo "  --backend-only     Chỉ dừng backend (API, Auth, Gateway)"
      echo "  --force            Dùng kill -9 ngay (không graceful)"
      echo "  --clean            Dừng services + xoá toàn bộ logs"
      echo "  --logs             Chỉ xem danh sách log files"
      echo "  --help, -h         Xem hướng dẫn này"
      exit 0
      ;;
  esac
done

# ─── Extract ports from source code ──────────────────────────────────────────
extract_port() {
  local launch_file="$1"
  grep -oP '"applicationUrl".*?http://localhost:\K[0-9]+' "$launch_file" 2>/dev/null | head -1 || echo ""
}

GATEWAY_PORT=$(extract_port "BudgetManagement/BudgetManagement.APIGateway/Properties/launchSettings.json" 2>/dev/null || echo "")
API_PORT=$(extract_port "BudgetManagement/BudgetManagement.APIService/Properties/launchSettings.json" 2>/dev/null || echo "")
AUTH_PORT=$(extract_port "BudgetManagement/BudgetManagement.AuthService/Properties/launchSettings.json" 2>/dev/null || echo "")
FRONTEND_PORT=$(grep -oP 'port:\s*\K[0-9]+' vite.config.ts 2>/dev/null | head -1 || echo "5173")

# ─── Show logs mode ───────────────────────────────────────────────────────────
if $SHOW_LOGS_ONLY; then
  echo -e "${CYAN}📝  Log files in logs/:${NC}"
  if [[ -d "$LOG_DIR" ]]; then
    local count=0
    while IFS= read -r f; do
      ((count++))
      size=$(du -sh "$LOG_DIR/$f" 2>/dev/null | cut -f1)
      echo -e "   ${CYAN}$f${NC}  (${size})"
    done < <(ls -1t "$LOG_DIR" 2>/dev/null || true)
    if [[ $count -eq 0 ]]; then echo "   (không có log files)"; fi
  else
    echo "   (thư mục logs/ không tồn tại)"
  fi
  exit 0
fi

# ─── Banner ──────────────────────────────────────────────────────────────────
clear
echo -e "${RED}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     💰   QUẢN LÝ CHI TIÊU  —  STOPPING SERVICES             ║"
echo "║     📅   $(date '+%Y-%m-%d %H:%M:%S')                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Helper: find PIDs on a port ──────────────────────────────────────────────
find_pids_by_port() {
  local port="$1"
  local pids=""
  if command -v lsof &>/dev/null; then
    pids=$(lsof -ti ":$port" 2>/dev/null || true)
  fi
  if [[ -z "$pids" ]] && command -v ss &>/dev/null; then
    local pid_line
    pid_line=$(ss -tlnp 2>/dev/null | grep ":$port[[:space:]]" | grep -oP 'pid=\K[0-9]+' || true)
    if [[ -n "$pid_line" ]]; then
      pids="$pid_line"
    fi
  fi
  echo "$pids"
}

# ─── Graceful kill: SIGTERM → wait → SIGKILL ─────────────────────────────────
graceful_kill() {
  local pids="$1"
  local name="$2"
  local max_wait=4

  if [[ -z "$pids" ]]; then return 1; fi

  if $FORCE_KILL; then
    echo -e "   Stopping ${CYAN}$name${NC} (force)..."
    for pid in $pids; do
      kill -9 "$pid" 2>/dev/null || true
    done
    echo -e "     ${GREEN}✓ force-stopped${NC}"
    return 0
  fi

  echo -e "   Stopping ${CYAN}$name${NC} (graceful)..."
  for pid in $pids; do
    kill -15 "$pid" 2>/dev/null || true
  done

  # Wait and check
  local waited=0
  while [[ $waited -lt $max_wait ]]; do
    local alive=""
    for pid in $pids; do
      kill -0 "$pid" 2>/dev/null && alive+="$pid " || true
    done
    pids="$alive"
    [[ -z "$pids" ]] && break
    sleep 1
    ((waited++))
  done

  if [[ -n "$pids" ]]; then
    echo -e "     ${YELLOW}⚠  $name chưa dừng sau SIGTERM, dùng SIGKILL...${NC}"
    for pid in $pids; do
      kill -9 "$pid" 2>/dev/null || true
    done
    sleep 0.5
  fi

  echo -e "     ${GREEN}✓ stopped${NC}"
  return 0
}

# ─── Kill processes by port ──────────────────────────────────────────────────
kill_by_port() {
  local port="$1"
  local name="$2"
  [[ -z "$port" ]] && return 1

  local pids
  pids=$(find_pids_by_port "$port")
  if [[ -n "$pids" ]]; then
    graceful_kill "$pids" "$name (Port $port)"
    return 0
  else
    echo -e "   ${CYAN}$name${NC} (Port $port): ${PURPLE}not running${NC}"
    return 1
  fi
}

# ════════════════════════════════════════════════════════════════════════════

# ─── Phase 1: Kill by PID file (most reliable) ─────────────────────────────
PID_KILLED=false
if [[ -f "$PID_FILE" ]]; then
  pid_count=$(wc -l < "$PID_FILE" | tr -d ' ')
  if [[ "$pid_count" -gt 0 ]]; then
    echo -e "${CYAN}📋  Đọc PID file ($PID_FILE) — $pid_count process(es)${NC}"
    while IFS= read -r pid; do
      [[ -z "$pid" ]] && continue
      if kill -0 "$pid" 2>/dev/null; then
        # Xác định tên process để hiển thị
        proc_name=$(ps -p "$pid" -o comm= 2>/dev/null || echo "unknown")
        echo -e "   Stopping process ${CYAN}$pid${NC} ($proc_name)..."
        if $FORCE_KILL; then
          kill -9 "$pid" 2>/dev/null || true
        else
          kill -15 "$pid" 2>/dev/null || true
          sleep 0.3
          kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
        fi
        PID_KILLED=true
      fi
    done < "$PID_FILE"
    $PID_KILLED && echo -e "   ${GREEN}✓ Process từ PID file đã dừng${NC}" || \
      echo -e "   ${PURPLE}ℹ  Không có process nào từ PID file còn sống${NC}"
    echo ""
  fi
fi

# ─── Phase 2: Kill by port ────────────────────────────────────────────────────
echo -e "${BOLD}🔍  Đang dừng services theo port...${NC}"
echo ""

# Frontend
if ! $BACKEND_ONLY; then
  if $FRONTEND_ONLY; then
    echo -e "${BLUE}🎨  Chỉ dừng Frontend (--frontend-only)${NC}"
  fi
  kill_by_port "$FRONTEND_PORT" "Frontend (Vite)"
fi

# Backend
if ! $FRONTEND_ONLY; then
  if $BACKEND_ONLY; then
    echo -e "${BLUE}📦  Chỉ dừng Backend (--backend-only)${NC}"
  fi
  kill_by_port "$API_PORT"    "API Service"
  kill_by_port "$AUTH_PORT"   "Auth Service"
  kill_by_port "$GATEWAY_PORT" "API Gateway"
fi

echo ""

# ─── Phase 3: Kill remaining processes (fallback) ──────────────────────────
echo -e "${BOLD}🧹  Dọn dẹp process còn sót...${NC}"
echo ""

# Remaining dotnet
dotnet_pids=$(pgrep -f "dotnet.*BudgetManagement" 2>/dev/null || true)
if [[ -n "$dotnet_pids" ]]; then
  echo -e "   Stopping remaining ${CYAN}dotnet${NC} processes..."
  if $FORCE_KILL; then
    kill -9 $dotnet_pids 2>/dev/null || true
  else
    kill -15 $dotnet_pids 2>/dev/null || true
    sleep 1
    kill -9 $(pgrep -f "dotnet.*BudgetManagement" 2>/dev/null) 2>/dev/null || true
  fi
  echo -e "     ${GREEN}✓ dọn xong${NC}"
else
  echo -e "   ${PURPLE}ℹ  Không còn dotnet process nào${NC}"
fi

# Remaining npm/vite
frontend_pids=$(pgrep -f "npm.*dev" 2>/dev/null || true)
if [[ -z "$frontend_pids" ]]; then
  frontend_pids=$(pgrep -f "vite" 2>/dev/null || true)
fi
if [[ -n "$frontend_pids" ]]; then
  echo -e "   Stopping remaining ${CYAN}Frontend (npm/vite)${NC} processes..."
  if $FORCE_KILL; then
    kill -9 $frontend_pids 2>/dev/null || true
  else
    kill -15 $frontend_pids 2>/dev/null || true
    sleep 1
    kill -9 $(pgrep -f "vite" 2>/dev/null) 2>/dev/null || true
  fi
  echo -e "     ${GREEN}✓ dọn xong${NC}"
else
  echo -e "   ${PURPLE}ℹ  Không còn npm/vite process nào${NC}"
fi

# ─── Phase 4: Verify không còn process sót ───────────────────────────────────
sleep 1
echo ""
echo -e "${BOLD}✅  Kiểm tra lại các port...${NC}"

lingering=""
for port in "$API_PORT" "$AUTH_PORT" "$GATEWAY_PORT" "$FRONTEND_PORT"; do
  if [[ -n "$port" ]]; then
    remaining=$(find_pids_by_port "$port")
    if [[ -n "$remaining" ]]; then
      lingering+="  $port"
    fi
  fi
done

if [[ -n "$lingering" ]]; then
  echo -e "   ${YELLOW}⚠  Port vẫn còn process:$lingering${NC}"
  echo -e "   ${YELLOW}   Thử: ./kill.sh --force${NC}"
else
  echo -e "   ${GREEN}✅  Tất cả port đã sạch${NC}"
fi

# ─── Log file info ────────────────────────────────────────────────────────────
echo ""
if [[ -d "$LOG_DIR" ]]; then
  log_count=$(ls -1 "$LOG_DIR" 2>/dev/null | wc -l)
  log_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
  echo -e "${CYAN}📝  Log files: $log_count file(s), tổng $log_size${NC}"
  ls -1t "$LOG_DIR" 2>/dev/null | head -4 | while IFS= read -r f; do
    size=$(du -sh "$LOG_DIR/$f" 2>/dev/null | cut -f1)
    echo -e "      $f  (${size})"
  done
  if [[ $log_count -gt 4 ]]; then
    echo -e "      ... và $(($log_count - 4)) file khác"
  fi
fi

# ─── Clean logs (--clean flag) ────────────────────────────────────────────────
if $CLEAN_LOGS; then
  if [[ -d "$LOG_DIR" ]]; then
    log_count=$(ls -1 "$LOG_DIR" 2>/dev/null | wc -l)
    log_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
    echo ""
    echo -e "${YELLOW}🧹  Cleaning up log files...${NC}"
    echo -e "     Sẽ xoá $log_count file(s) (${log_size})"
    rm -rf "$LOG_DIR"
    echo -e "${GREEN}✓ Log files đã xoá.${NC}"
  fi
fi

# ─── Cleanup PID file nếu còn ────────────────────────────────────────────────
if [[ -f "$PID_FILE" ]]; then
  rm -f "$PID_FILE" 2>/dev/null || true
fi

# ─── Final status ─────────────────────────────────────────────────────────────
echo ""
if [[ -n "$lingering" ]]; then
  echo -e "${YELLOW}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}${BOLD}║   ⚠️  STOPPED WITH WARNINGS — Một số port vẫn hoạt động    ║${NC}"
  echo -e "${YELLOW}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
else
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║           ✅  ALL SERVICES STOPPED SUCCESSFULLY              ║${NC}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
fi
