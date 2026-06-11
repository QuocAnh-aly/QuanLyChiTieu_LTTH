# Quản Lý Chi Tiêu — Personal Finance Management

> **Full-stack personal finance management system** inspired by Firefly III, built with a Vietnamese UI.
> Tech Stack: .NET 10 (C#) microservices + React 18 (Vite) + SQL Server

[![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev/)
[![SQL Server](https://img.shields.io/badge/SQL_Server-2022-CC2927?logo=microsoft-sql-server)](https://www.microsoft.com/en-us/sql-server/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ Features

### Financial Management
- **Multi-currency wallets** — Manage accounts with VND, USD, EUR, JPY
- **Transaction recording** — Income, expenses, and transfers with double-entry accounting
- **Budgets** — Set spending limits with real-time progress tracking and warnings at >80% / >100%
- **Savings goals** — Piggy bank-style savings tracking with target amounts
- **Recurring transactions** — Auto-generated journal entries on schedule
- **Bills management** — Track and manage recurring bills
- **Pagination** — Server-side paginated responses with PaginatedResult DTO + UI controls (prev/next, page numbers, page size selector)
- **Server-side search/sort** — Search and sort accounts/budgets on backend
- **Source Account** — Link debt creation to bank accounts or create assets by transferring from existing accounts
- **Modal design** — All forms use consistent shadcn/ui design system with purple accent

### Automation
- **Rules engine** — Create if-then rules with triggers and actions
- **Webhooks** — Send transaction data to external services
- **Recurring journals** — Automated recurring entry generation

### Analytics & Insights
- **Dashboard** — Summary cards, charts, recent transactions
- **Monthly reports** — Income vs expense breakdown
- **Cash flow analysis** — Track money movement over time
- **Export** — CSV, Excel data export

### System
- **User authentication** — JWT-based with auto-refresh
- **Multi-currency** — Full currency management + exchange rates
- **Notifications** — In-app notification center + toast alerts
- **Search** — Full-text search across transactions

---

## 🏗️ Architecture

```
             ┌──────────────────┐
             │   Frontend       │  React 18 + Vite
             │ localhost:5173   │
             └────────┬─────────┘
                      │
             ┌────────▼─────────┐
             │   API Gateway    │  Ocelot at localhost:5229
             │  (reverse proxy) │
             └───┬────────┬─────┘
                  │        │
         ┌────────▼──┐  ┌──▼──────────┐
         │ API Svc   │  │ Auth Svc    │
         │ :5133     │  │ :5134       │
         │ Business  │  │ Auth/JWT    │
         │ CRUD      │  │ Login/Signup│
         └───────────┘  └─────────────┘
                │
         ┌──────▼──────┐
         │   SQL       │
         │   Server    │
         │  Docker     │
         │  :1434      │
         └─────────────┘
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | `:5173` | React SPA (Vite) |
| **API Gateway** | `:5229` | Ocelot reverse proxy |
| **API Service** | `:5133` | Business logic + CRUD |
| **Auth Service** | `:5134` | Authentication + JWT |
| **SQL Server** | `:1434` | Database (Docker) |

### Project Structure

```
QuanLyChiTieu_LTTH/
├── BudgetManagement/                 # .NET 10 solution
│   ├── BudgetManagement.APIGateway/  # Ocelot gateway
│   ├── BudgetManagement.APIService/  # Business API
│   ├── BudgetManagement.AuthService/ # Auth API
│   ├── BudgetManagement.Entities/    # EF Core entity models
│   ├── BudgetManagement.Dto/         # DTOs with validation
│   ├── BudgetManagement.Services/    # Business logic
│   ├── BudgetManagement.Repository/  # Data access (EF Core)
│   ├── BudgetManagement.Common/      # Shared utilities
│   └── BudgetManagement.Tests/       # xUnit tests (168 tests)
├── src/                              # React frontend
│   ├── app/
│   │   ├── api/                      # Axios API modules
│   │   ├── components/               # UI, layout, modals
│   │   ├── context/                  # Auth, Settings, Notifications
│   │   └── pages/                    # Route-based pages
│   └── styles/                       # Tailwind + theme
├── csdl_sqlserver.sql                # Database schema
├── migration_fix.sql                 # Schema migration fix
├── AI_GUIDE.md                       # AI agent onboarding guide
├── improvement.md                    # Improvement log
└── run.sh                            # Start all services
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- .NET 10 SDK
- Docker (for SQL Server)

### Setup

```bash
# 1. Start SQL Server
chmod +x run.sh
./run.sh

# Or manually:
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Hoangphuc@040505" \
  -p 1434:1433 --name sqlserver_2022 -d mcr.microsoft.com/mssql/server:2022-latest

# 2. Create database + apply schema
docker exec -i sqlserver_2022 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Hoangphuc@040505' -C -Q "CREATE DATABASE BudgetManagement"

docker exec -i sqlserver_2022 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i csdl_sqlserver.sql

docker exec -i sqlserver_2022 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i migration_fix.sql

# 3. Start all services
./run.sh
```

The `run.sh` script starts all 4 services with real-time logging and graceful shutdown.
Press `Ctrl+C` to stop all services.

### Manual Start (individual terminals)

```bash
# Terminal 1 — API Service
cd BudgetManagement/BudgetManagement.APIService && dotnet run --launch-profile http

# Terminal 2 — Auth Service
cd BudgetManagement/BudgetManagement.AuthService && dotnet run --launch-profile http

# Terminal 3 — API Gateway
cd BudgetManagement/BudgetManagement.APIGateway && dotnet run --launch-profile http

# Terminal 4 — Frontend
npm run dev
```

### Run Tests

```bash
cd BudgetManagement && dotnet test BudgetManagement.Tests/BudgetManagement.Tests.csproj
# 368 tests total
```

### URLs

| Service | URL |
|---------|-----|
| Frontend | [http://localhost:5173](http://localhost:5173) |
| API Gateway | [http://localhost:5229](http://localhost:5229) |
| API Service Swagger | [http://localhost:5133/swagger](http://localhost:5133/swagger) |
| Auth Service Swagger | [http://localhost:5134/swagger](http://localhost:5134/swagger) |

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| **[AI_GUIDE.md](./AI_GUIDE.md)** | Comprehensive onboarding guide for AI agents — architecture, routes, API, workflows, conventions |
| **[improvement.md](./improvement.md)** | Detailed log of all improvements, fixes, and features added |
| **[migration_fix.sql](./migration_fix.sql)** | Database migration script (9 missing tables, 3 missing columns) |
| **[csdl_sqlserver.sql](./csdl_sqlserver.sql)** | Complete SQL Server schema |
| **[seed_demo_2026.sql](./seed_demo_2026.sql)** | Seed data — user `demo2026` / `Demo@2026`, 12 tháng dữ liệu mẫu |
| **[seed_full_user.sql](./seed_full_user.sql)** | Seed data — user `nguyenvana` / `Abc@123456`, đầy đủ accounts/budgets/bills/rules/webhooks/attachments |
| **[SETUP.md](./SETUP.md)** | Hướng dẫn setup chi tiết từ A-Z |
| **[guidelines/Guidelines.md](./guidelines/Guidelines.md)** | Project coding guidelines |

### Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signin` | Login |
| POST | `/api/auth/signup` | Register |
| GET | `/api/accounts?page=1&pageSize=50` | List accounts (paginated) |
| GET | `/api/accounts/type/{typeId}?page=1&pageSize=50` | Filter by type (1=Asset, 4=Revenue, 5=Expense) — paginated |
| GET | `/api/accounts/wallet-summary?search=&sortBy=balance-desc&page=1&pageSize=5` | Balance summary (server-side search/sort) |
| GET/POST/PUT/DELETE | `/api/accounts/{id}` | Account CRUD |
| POST | `/api/accounts` | Create account (optional `SourceAccountId` for source transactions) |
| GET/POST/PUT/DELETE | `/api/transactions/{id}` | Transaction CRUD |
| GET | `/api/budgets/expense?page=1&pageSize=50&search=&filterStatus=all&sortBy=name` | List expense budgets (paginated + server-side search/filter/sort) |
| GET | `/api/budgets/savings` | List savings goals |
| GET | `/api/bills?page=1&pageSize=50` | List bills (paginated) |
| GET | `/api/recurring?page=1&pageSize=50` | List recurring transactions (paginated) |
| GET | `/api/dashboard/summary` | Dashboard summary |
| GET | `/api/dashboard/monthly-report` | Monthly report |

> **Note:** All requests go through the API Gateway at `http://localhost:5229`.  
> Auth routes use `/api/auth/*`, business routes use `/api/*`.

---

## 🧪 Testing

**368 unit tests** using **xUnit + Moq + FluentAssertions**:

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `PasswordStrengthValidatorTests.cs` | 27 | Validation rules, edge cases |
| `AccountServiceTests.cs` | 25 | CRUD, auth, WalletSummary, **pagination** |
| `CurrencyServiceTests.cs` | 25 | CRUD, primary rules, constraints |
| `BudgetServiceTests.cs` | 11 | CRUD, **pagination**, savings goals, server-side search/filter/sort |
| `BillServiceTests.cs` | 10 | CRUD, **pagination**, rescan |
| `RecurringServiceTests.cs` | 11 | CRUD, **pagination**, process due |
| `PaginatedResultTests.cs` | 9 | **PaginatedResult** computed properties |
| `AccountControllerTests.cs` | 10 | **Source account**, pagination params |

```bash
cd BudgetManagement && dotnet test BudgetManagement.Tests/BudgetManagement.Tests.csproj
```

---

## 🛠️ Tech Stack

### Backend (.NET 10)
- ASP.NET Core Minimal APIs + Controllers
- Entity Framework Core + SQL Server
- Ocelot API Gateway
- BCrypt password hashing
- Swagger / OpenAPI

### Frontend (React 18)
- Vite 5 build tool
- React Router DOM v6
- Axios (with JWT auto-refresh interceptor)
- Tailwind CSS
- shadcn/ui (Radix-based, local components)
- Recharts for charts
- React Hook Form + Zod
- Sonner toasts + custom notification system
- date-fns, Lucide React, TanStack Table

### DevOps
- Docker (SQL Server)
- Shell scripts for service orchestration

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is for educational purposes. Original design by [Figma Community](https://www.figma.com/design/asc5PkB2YXy8pmseQgS2Tl/Budget-Management-Website).

---

## 🙏 Acknowledgments

- Inspired by [Firefly III](https://www.firefly-iii.org/) — an excellent open-source personal finance manager
- UI design from Figma Community
- All contributors and team members