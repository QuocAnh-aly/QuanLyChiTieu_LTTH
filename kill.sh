#!/usr/bin/env bash
# ============================================================
# kill.sh — Stop all Quản Lý Chi Tiêu services
#
# Finds and kills processes started by run.sh by:
#   - Reading ports from launchSettings.json (same as run.sh)
#   - Reading frontend port from vite.config.ts (same as run.sh)
#   - Killing dotnet processes running from project directories
#   - Killing the Vite dev server
#
# Usage:
#   ./kill.sh          — Stop all services
#   ./kill.sh --clean  — Stop all services and delete log files
#   ./kill.sh --logs   — Just show log file locations without killing
#   ./kill.sh --force  — Use kill -9 for stubborn processes
# ============================================================
set -euo pipefail

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; PURPLE='\033[0;35m'
NC='\033[0m'; BOLD='\033[1m'

# ─── Project root ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Log directory ───────────────────────────────────────────────────────────
LOG_DIR="$SCRIPT_DIR/logs"

# ─── Parse flags ──────────────────────────────────────────────────────────────
SHOW_LOGS_ONLY=false
CLEAN_LOGS=false
FORCE_KILL=false
for arg in "$@"; do
  case "$arg" in
    --clean) CLEAN_LOGS=true ;;
    --logs)  SHOW_LOGS_ONLY=true ;;
    --force) FORCE_KILL=true ;;
  esac
done

# ─── Extract ports from source code (same method as run.sh) ──────────────────
extract_port() {
  local launch_file="$1"
  grep -oP '"applicationUrl".*?http://localhost:\K[0-9]+' "$launch_file" | head -1
}

GATEWAY_PORT=$(extract_port "BudgetManagement/BudgetManagement.APIGateway/Properties/launchSettings.json" 2>/dev/null || echo "")
API_PORT=$(extract_port "BudgetManagement/BudgetManagement.APIService/Properties/launchSettings.json" 2>/dev/null || echo "")
AUTH_PORT=$(extract_port "BudgetManagement/BudgetManagement.AuthService/Properties/launchSettings.json" 2>/dev/null || echo "")

# Frontend port – read from vite.config.ts, fallback to 5173
FRONTEND_PORT=$(grep -oP 'port:\s*\K[0-9]+' vite.config.ts 2>/dev/null | head -1 || echo "")
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# ─── Show logs mode ───────────────────────────────────────────────────────────
if [[ "$SHOW_LOGS_ONLY" == "true" ]]; then
  echo -e "${CYAN}Log files in $LOG_DIR:${NC}"
  if [[ -d "$LOG_DIR" ]]; then
    logs=$(ls -1t "$LOG_DIR" 2>/dev/null || true)
    if [[ -z "$logs" ]]; then
      echo "   (no log files found)"
    else
      echo "$logs" | while IFS= read -r f; do
        echo -e "   ${CYAN}$f${NC}"
      done
    fi
  else
    echo "   (log directory does not exist)"
  fi
  exit 0
fi

# ─── Banner ──────────────────────────────────────────────────────────────────
clear
echo -e "${RED}${BOLD}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     💰  QUẢN LÝ CHI TIÊU - STOPPING ALL SERVICES            ║"
echo "║     📅  $(date '+%Y-%m-%d %H:%M:%S')                               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── Helper: find PIDs listening on a port ────────────────────────────────────
find_pids_by_port() {
  local port="$1"
  local pids=""

  # Try lsof first
  if command -v lsof &>/dev/null; then
    pids=$(lsof -ti ":$port" 2>/dev/null || true)
  fi

  # If lsof gives nothing, try fuser
  if [[ -z "$pids" ]] && command -v fuser &>/dev/null; then
    pids=$(fuser "$port/tcp" 2>/dev/null | tr -d ' ' || true)
  fi

  # If still nothing, try ss
  if [[ -z "$pids" ]] && command -v ss &>/dev/null; then
    local pid_line=$(ss -tlnp "sport = :$port" 2>/dev/null | grep -oP 'pid=\K[0-9]+' || true)
    if [[ -n "$pid_line" ]]; then
      pids="$pid_line"
    fi
  fi

  echo "$pids"
}

# ─── Kill processes by port ──────────────────────────────────────────────────
kill_by_port() {
  local port="$1"
  local name="$2"
  if [[ -z "$port" ]]; then
    return
  fi

  local pids
  pids=$(find_pids_by_port "$port")
  if [[ -n "$pids" ]]; then
    echo -e "   Stopping ${CYAN}$name${NC} (Port $port)..."
    for pid in $pids; do
      if [[ "$FORCE_KILL" == "true" ]]; then
        kill -9 "$pid" 2>/dev/null || true
      else
        kill "$pid" 2>/dev/null || true
        sleep 0.3
        kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
      fi
    done
    echo -e "     ${GREEN}✓ stopped${NC}"
  else
    echo -e "   ${CYAN}$name${NC} (Port $port): ${PURPLE}not running${NC}"
  fi
}

# ════════════════════════════════════════════════════════════════════════════

# Kill by port (catches processes listening on project ports)
kill_by_port "$API_PORT"    "API Service"
kill_by_port "$AUTH_PORT"   "Auth Service"
kill_by_port "$GATEWAY_PORT" "API Gateway"
kill_by_port "$FRONTEND_PORT" "Frontend (Vite)"

# Kill any remaining dotnet processes running from the BudgetManagement directory
dotnet_pids=$(pgrep -f "dotnet.*BudgetManagement" 2>/dev/null || true)
if [[ -n "$dotnet_pids" ]]; then
  echo -e "   Stopping remaining ${CYAN}dotnet${NC} processes from project..."
  kill $dotnet_pids 2>/dev/null || true
  echo -e "     ${GREEN}✓ stopped${NC}"
fi

# Kill any remaining npm/vite processes that might have been spawned
frontend_pids=$(pgrep -f "npm.*dev" 2>/dev/null || true)
if [[ -z "$frontend_pids" ]]; then
  frontend_pids=$(pgrep -f "vite" 2>/dev/null || true)
fi
if [[ -n "$frontend_pids" ]]; then
  echo -e "   Stopping remaining ${CYAN}Frontend${NC} processes (npm/vite)..."
  kill $frontend_pids 2>/dev/null || true
  echo -e "     ${GREEN}✓ stopped${NC}"
fi

# ─── Verify nothing is left on our ports ────────────────────────────────────
sleep 1
lingering=""
for port in "$API_PORT" "$AUTH_PORT" "$GATEWAY_PORT" "$FRONTEND_PORT"; do
  if [[ -n "$port" ]]; then
    remaining=$(find_pids_by_port "$port")
    if [[ -n "$remaining" ]]; then
      lingering+="  $port"
    fi
  fi
done

# ─── Log file info ────────────────────────────────────────────────────────────
echo ""
if [[ -d "$LOG_DIR" ]]; then
  echo -e "${CYAN}   Recent log files:${NC}"
  ls -1t "$LOG_DIR" 2>/dev/null | head -3 | while IFS= read -r f; do
    echo -e "      $f"
  done
fi

# ─── Clean logs (--clean flag) ────────────────────────────────────────────────
if [[ "$CLEAN_LOGS" == "true" ]]; then
  if [[ -d "$LOG_DIR" ]]; then
    echo ""
    echo -e "${YELLOW}🧹  Cleaning up log files...${NC}"
    rm -rf "$LOG_DIR"
    echo -e "${GREEN}✓ Log files deleted.${NC}"
  fi
fi

# ─── Final status ─────────────────────────────────────────────────────────────
echo ""
if [[ -n "$lingering" ]]; then
  echo -e "${YELLOW}⚠  Some ports may still be in use:$lingering${NC}"
  echo -e "   Try: ${GREEN}./kill.sh --force${NC}"
else
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗"
  echo -e "║           ✅  ALL SERVICES STOPPED SUCCESSFULLY              ║"
  echo -e "╚══════════════════════════════════════════════════════════════╝${NC}"
fi
