#!/usr/bin/env bash
# ============================================================
# run-dbtester.sh — Build & run the DB Connection Tester
#
# Usage:
#   ./run-dbtester.sh             — Build & run (auto-reads appsettings.json)
#   ./run-dbtester.sh <conn_str>  — Use a custom connection string
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

# ─── Prerequisites ────────────────────────────────────────────────────────────
if ! command -v dotnet &>/dev/null; then
  echo -e "${RED}✖ Missing dependency: dotnet${NC}"
  exit 1
fi

# ─── Build ────────────────────────────────────────────────────────────────────
echo -e "${CYAN}🔨  Building DbTester...${NC}"
if ! dotnet build BudgetManagement/DbTester/DbTester.csproj; then
  echo -e "${RED}✖ Build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓   Build succeeded${NC}"
echo ""

# ─── Run ──────────────────────────────────────────────────────────────────────
# cd into the DbTester directory so relative paths ("..") in Program.cs
# resolve correctly to find appsettings.json in sibling projects.
echo -e "${CYAN}🚀  Running DbTester...${NC}"
echo ""

(
  cd "$SCRIPT_DIR/BudgetManagement/DbTester"
  dotnet run -- "$@"
)
