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
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

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
    # ss doesn't directly give PID, but we can use it as last resort
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
    echo -e "   Killing ${CYAN}$name${NC} on port $port (PID: $(echo "$pids" | tr '\n' ' '))"
    if [[ "$FORCE_KILL" == "true" ]]; then
      kill -9 $pids 2>/dev/null || true
    else
      kill $pids 2>/dev/null || true
    fi
  fi
}

echo -e "${YELLOW}⏹  Stopping all project services...${NC}"
echo ""

# Kill by port (catches processes listening on project ports)
kill_by_port "$API_PORT"    "API Service"
kill_by_port "$AUTH_PORT"   "Auth Service"
kill_by_port "$GATEWAY_PORT" "API Gateway"

# Kill frontend (Vite) — by dynamic port
kill_by_port "$FRONTEND_PORT" "Frontend (Vite)"

# Kill any remaining dotnet processes running from the BudgetManagement directory
dotnet_pids=$(pgrep -f "dotnet.*BudgetManagement" 2>/dev/null || true)
if [[ -n "$dotnet_pids" ]]; then
  echo -e "   Killing remaining ${CYAN}dotnet${NC} processes from project"
  kill $dotnet_pids 2>/dev/null || true
fi

# Kill any remaining npm/vite processes that might have been spawned
frontend_pids=$(pgrep -f "npm.*dev" 2>/dev/null || true)
if [[ -z "$frontend_pids" ]]; then
  frontend_pids=$(pgrep -f "vite" 2>/dev/null || true)
fi
if [[ -n "$frontend_pids" ]]; then
  echo -e "   Killing remaining ${CYAN}Frontend${NC} processes (npm/vite — PID: $(echo "$frontend_pids" | tr '\n' ' '))"
  kill $frontend_pids 2>/dev/null || true
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
  LATEST_LOG=$(ls -1t "$LOG_DIR" 2>/dev/null | head -3)
  if [[ -n "$LATEST_LOG" ]]; then
    echo -e "${CYAN}   Recent log files:${NC}"
    echo "$LATEST_LOG" | while IFS= read -r f; do
      echo -e "      $f"
    done
    echo -e "   (view: cat logs/<file>   |   tail -f logs/<file>)"
  fi
else
  echo -e "${CYAN}   No log directory found (run.sh was not started).${NC}"
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
  echo -e "${GREEN}✓ All services stopped successfully.${NC}"
fi
