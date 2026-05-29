#!/usr/bin/env bash
# ============================================================
# run.sh — Start the entire Quản Lý Chi Tiêu project
#
# Dynamically reads ports from source configuration files
# so you don't need to hardcode or forward ports manually.
# Each service logs to its own file under logs/.
# ============================================================
set -euo pipefail

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ─── Project root ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Log directory ───────────────────────────────────────────────────────────
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

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
  echo ""
  echo "Please install the missing dependencies above and try again."
  exit 1
fi

# ─── Extract ports from source code (no hardcoding) ──────────────────────────
extract_port() {
  local launch_file="$1"
  grep -oP '"applicationUrl".*?http://localhost:\K[0-9]+' "$launch_file" 2>/dev/null | head -1 || echo ""
}

GATEWAY_PORT=$(extract_port "BudgetManagement/BudgetManagement.APIGateway/Properties/launchSettings.json")
API_PORT=$(extract_port "BudgetManagement/BudgetManagement.APIService/Properties/launchSettings.json")
AUTH_PORT=$(extract_port "BudgetManagement/BudgetManagement.AuthService/Properties/launchSettings.json")

# Frontend port: check if vite.config.ts has an explicit server.port
FRONTEND_PORT=$(grep -oP 'port:\s*\K[0-9]+' vite.config.ts 2>/dev/null | head -1 || echo "")
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# Get the frontend's API base URL from axiosClient.js
API_BASE_URL=$(grep -oP "baseURL:\s*'\K[^']+" src/app/api/axiosClient.js 2>/dev/null || echo "http://localhost:$GATEWAY_PORT")

# ─── Log file paths ──────────────────────────────────────────────────────────
API_LOG="$LOG_DIR/api-service_$LOG_TIMESTAMP.log"
AUTH_LOG="$LOG_DIR/auth-service_$LOG_TIMESTAMP.log"
GATEWAY_LOG="$LOG_DIR/gateway_$LOG_TIMESTAMP.log"
FRONTEND_LOG="$LOG_DIR/frontend_$LOG_TIMESTAMP.log"

# ─── Validate extracted ports ────────────────────────────────────────────────
if [[ -z "$GATEWAY_PORT" || -z "$API_PORT" || -z "$AUTH_PORT" ]]; then
  echo -e "${RED}✖ Could not extract ports from launchSettings.json${NC}"
  echo "   Gateway: ${GATEWAY_PORT:-not found}"
  echo "   API:     ${API_PORT:-not found}"
  echo "   Auth:    ${AUTH_PORT:-not found}"
  echo ""
  echo "Make sure you're running this script from the project root."
  exit 1
fi

# ─── Tracking background PIDs ────────────────────────────────────────────────
pids=()
cleanup() {
  echo ""
  echo -e "${YELLOW}⏹  Shutting down all services...${NC}"
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  echo -e "${GREEN}✓ All services stopped.${NC}"
  echo -e "${CYAN}   Logs saved to: $LOG_DIR${NC}"
  echo ""
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# ─── Helper: tạo hyperlink có thể bấm trong terminal ────────────────────────
print_hyperlink() {
  local url="$1"
  local text="$2"
  # OSC 8: \e]8;;URL\e\\Text\e]8;;\e\\
  printf '\e]8;;%s\e\\%s\e]8;;\e\\' "$url" "$text"
}

# ─── Helper: đợi đơn giản, không gây treo ───────────────────────────────────
wait_for_port() {
  local port="$1"
  local service="$2"
  local max_attempts=30
  local attempt=0
  echo -n "   Waiting for $service on port $port..."
  while [ $attempt -lt $max_attempts ]; do
    if timeout 1 bash -c "echo > /dev/tcp/localhost/$port" 2>/dev/null; then
      echo -e " ${GREEN}ready${NC}"
      return 0
    fi
    sleep 1
    attempt=$((attempt + 1))
  done
  echo -e " ${YELLOW}timeout (port $port not responding)${NC}"
}

# ─── Helper: add timestamp prefix to log lines ────────────────────────────────
timestamp_pipe() {
  if command -v awk &>/dev/null; then
    awk '{ print strftime("[%Y-%m-%d %H:%M:%S]"), $0 }'
  else
    while IFS= read -r line; do
      echo "$(date '+[%Y-%m-%d %H:%M:%S]') $line"
    done
  fi
}

# ════════════════════════════════════════════════════════════════════════════
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Quản Lý Chi Tiêu — Starting All Services          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── Function to start a service in background, logging to file ───────────────
start_service() {
  local name="$1"
  local dir="$2"
  local launch_profile="$3"
  local port="$4"
  local log_file="$5"

  echo -e "${GREEN}[+] Starting $name...${NC}"
  echo -e "      Port: ${CYAN}$port${NC}"
  echo -e "      Log:  ${CYAN}$log_file${NC}"

  (
    cd "$dir"
    dotnet run --launch-profile "$launch_profile" 2>&1 | timestamp_pipe >> "$log_file"
  ) &
  local pid=$!
  pids+=("$pid")
}

# ─── 1. API Service (Business Logic) ─────────────────────────────────────────
start_service "API Service" \
  "BudgetManagement/BudgetManagement.APIService" \
  "http" \
  "$API_PORT" \
  "$API_LOG"

# ─── 2. Auth Service (Authentication) ────────────────────────────────────────
start_service "Auth Service" \
  "BudgetManagement/BudgetManagement.AuthService" \
  "http" \
  "$AUTH_PORT" \
  "$AUTH_LOG"

# ─── 3. API Gateway (Ocelot Router) ──────────────────────────────────────────
start_service "API Gateway" \
  "BudgetManagement/BudgetManagement.APIGateway" \
  "http" \
  "$GATEWAY_PORT" \
  "$GATEWAY_LOG"

# ─── 4. Frontend (React + Vite) ──────────────────────────────────────────────
echo -e "${GREEN}[+] Starting Frontend...${NC}"
echo -e "      Port: ${CYAN}$FRONTEND_PORT${NC}"
echo -e "      Log:  ${CYAN}$FRONTEND_LOG${NC}"

(npm run dev 2>&1 | timestamp_pipe >> "$FRONTEND_LOG") &
pids+=($!)

# ─── Wait for backend services to be ready ────────────────────────────────────
echo ""
echo -e "${YELLOW}⏳  Waiting for backend services to start...${NC}"
wait_for_port "$API_PORT"    "API Service" &
wait_for_port "$AUTH_PORT"   "Auth Service" &
wait_for_port "$GATEWAY_PORT" "API Gateway" &
wait

# ─── Summary (với hyperlink bấm được) ────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   All Services Running!                              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "   ${GREEN}Frontend:${NC}    $(print_hyperlink "http://localhost:$FRONTEND_PORT" "http://localhost:$FRONTEND_PORT")"
echo -e "   ${GREEN}API Gateway:${NC} $(print_hyperlink "http://localhost:$GATEWAY_PORT" "http://localhost:$GATEWAY_PORT")"
echo -e "   ${GREEN}API Service:${NC} $(print_hyperlink "http://localhost:$API_PORT" "http://localhost:$API_PORT")"
echo -e "   ${GREEN}Auth Service:${NC} $(print_hyperlink "http://localhost:$AUTH_PORT" "http://localhost:$AUTH_PORT")"
echo ""
echo -e "   ${GREEN}Swagger:${NC}"
echo -e "      API Service:  $(print_hyperlink "http://localhost:$API_PORT/swagger" "http://localhost:$API_PORT/swagger")"
echo -e "      Auth Service: $(print_hyperlink "http://localhost:$AUTH_PORT/swagger" "http://localhost:$AUTH_PORT/swagger")"
echo ""
echo -e "   ${CYAN}Log files:${NC}"
echo -e "      API Service:     $API_LOG"
echo -e "      Auth Service:    $AUTH_LOG"
echo -e "      API Gateway:     $GATEWAY_LOG"
echo -e "      Frontend:        $FRONTEND_LOG"
echo ""
echo -e "${YELLOW}   Press Ctrl+C to stop all services.${NC}"
echo -e "${YELLOW}   Use ./kill.sh to stop services if needed.${NC}"
echo ""

# ─── Keep running until user presses Ctrl+C ──────────────────────────────────
wait
