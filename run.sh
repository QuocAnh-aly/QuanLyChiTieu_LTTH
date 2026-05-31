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
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# ─── Project root ────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ─── Log directory ───────────────────────────────────────────────────────────
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
PID_FILE="$LOG_DIR/services.pid"
> "$PID_FILE"   # clear old PIDs

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

# ─── Log file paths ──────────────────────────────────────────────────────────
API_LOG="$LOG_DIR/api-service_$LOG_TIMESTAMP.log"
AUTH_LOG="$LOG_DIR/auth-service_$LOG_TIMESTAMP.log"
GATEWAY_LOG="$LOG_DIR/gateway_$LOG_TIMESTAMP.log"
FRONTEND_LOG="$LOG_DIR/frontend_$LOG_TIMESTAMP.log"

# ─── Helper: tạo hyperlink có thể bấm trong terminal ────────────────────────
print_hyperlink() {
  local url="$1"
  local text="$2"
  printf '\e]8;;%s\e\\%s\e]8;;\e\\' "$url" "$text"
}

# ─── Helper: start a dotnet service in background ────────────────────────────
start_dotnet_service() {
  local name="$1"
  local dir="$2"
  local launch_profile="$3"
  local port="$4"
  local log_file="$5"
  local color="$6"

  echo -e "${color}[+] Starting $name...${NC}"
  echo -e "      Port: ${CYAN}$port${NC}"

  (
    cd "$dir"
    # stdbuf -oL  → line-buffer every stage so output reaches
    #                the log file immediately (no 4KB pipe buffer)
    # sed         → prefix each line with [ServiceName]
    # timestamp   → add timestamp to each line
    # tee -a      → write to BOTH terminal AND log file in real-time
    stdbuf -oL dotnet run --launch-profile "$launch_profile" 2>&1 \
      | stdbuf -oL sed "s/^/[${name}] /" \
      | stdbuf -oL awk '{ print strftime("[%Y-%m-%d %H:%M:%S]"), $0; fflush() }' \
      | stdbuf -oL tee -a "$log_file"
  ) &
  local pid=$!
  echo "$pid" >> "$PID_FILE"
}

# ════════════════════════════════════════════════════════════════════════════
echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Quản Lý Chi Tiêu — Starting All Services          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ─── 1. API Service (Business Logic) ─────────────────────────────────────────
start_dotnet_service "API" \
  "BudgetManagement/BudgetManagement.APIService" \
  "http" \
  "$API_PORT" \
  "$API_LOG" \
  "$GREEN"

# ─── 2. Auth Service (Authentication) ────────────────────────────────────────
start_dotnet_service "Auth" \
  "BudgetManagement/BudgetManagement.AuthService" \
  "http" \
  "$AUTH_PORT" \
  "$AUTH_LOG" \
  "$CYAN"

# ─── 3. API Gateway (Ocelot Router) ──────────────────────────────────────────
start_dotnet_service "Gateway" \
  "BudgetManagement/BudgetManagement.APIGateway" \
  "http" \
  "$GATEWAY_PORT" \
  "$GATEWAY_LOG" \
  "$PURPLE"

# ─── 4. Frontend (React + Vite) ──────────────────────────────────────────────
echo -e "${BLUE}[+] Starting Frontend...${NC}"
echo -e "      Port: ${CYAN}$FRONTEND_PORT${NC}"

(
  stdbuf -oL npm run dev 2>&1 \
    | stdbuf -oL sed "s/^/[Frontend] /" \
    | stdbuf -oL awk '{ print strftime("[%Y-%m-%d %H:%M:%S]"), $0; fflush() }' \
    | stdbuf -oL tee -a "$FRONTEND_LOG"
) &
FPID=$!
echo "$FPID" >> "$PID_FILE"

# ─── Cleanup: kill all background processes on Ctrl+C ─────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}⏹  Stopping services...${NC}"
  if [[ -f "$PID_FILE" ]]; then
    while IFS= read -r pid; do
      kill "$pid" 2>/dev/null || true
    done < "$PID_FILE"
  fi
  # Also kill any dotnet/npm processes from the project
  pgrep -f "dotnet.*BudgetManagement" 2>/dev/null | xargs kill 2>/dev/null || true
  pgrep -f "npm run dev" 2>/dev/null | xargs kill 2>/dev/null || true
  echo -e "${GREEN}✓ All services stopped.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM

# ─── Wait for services to start ──────────────────────────────────────────────
echo ""
echo -e "${YELLOW}⏳  Allowing 10 seconds for services to start...${NC}"
sleep 10

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
echo -e "   ${CYAN}PID file:${NC}       $PID_FILE"
echo ""
echo -e "${YELLOW}   Press Ctrl+C to stop all services.${NC}"
echo -e "${YELLOW}   Use ./kill.sh to stop services if needed.${NC}"
echo ""

# ─── Keep running until user presses Ctrl+C ──────────────────────────────────
wait
