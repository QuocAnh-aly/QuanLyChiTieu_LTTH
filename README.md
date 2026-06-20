# Quản Lý Chi Tiêu — Personal Finance Management

> **Hệ thống quản lý tài chính cá nhân full-stack** giao diện tiếng Việt.
> Tech Stack: .NET 10 (C#) microservices + React 18 (Vite) + SQL Server

[![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev/)
[![SQL Server](https://img.shields.io/badge/SQL_Server-2022-CC2927?logo=microsoft-sql-server)](https://www.microsoft.com/en-us/sql-server/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## ✨ Tính năng

### Quản lý tài chính
- **Ví đa tiền tệ** — Quản lý tài khoản với VND, USD, EUR, JPY…
- **Ghi nhận giao dịch** — Thu / chi / chuyển khoản theo hạch toán kép (double-entry)
- **Ngân sách (Budgets)** — Đặt hạn mức chi tiêu, theo dõi tiến độ realtime, cảnh báo khi vượt 80% / 100%
- **Lợn tiết kiệm (Piggy Banks)** — Mục tiêu tiết kiệm với số tiền đích, nạp/rút tiền từ ví, biểu đồ tích lũy
- **Hóa đơn định kỳ (Subscriptions / Bills)** — Theo dõi và thanh toán các hóa đơn lặp lại
- **Giao dịch định kỳ (Recurring)** — Tự sinh bút toán theo lịch
- **Phân trang phía server** — `PaginatedResult` DTO + điều khiển UI (trước/sau, số trang, chọn cỡ trang)
- **Tìm kiếm / sắp xếp phía server** — Cho tài khoản, ngân sách…
- **Source Account** — Tạo tài sản/nợ bằng cách chuyển từ tài khoản hiện có

### Tự động hóa
- **Rules engine** — Tạo quy tắc if-then với trigger và action
- **Webhooks** — Gửi dữ liệu giao dịch tới dịch vụ ngoài
- **Recurring journals** — Tự động sinh bút toán định kỳ

### Phân tích & Báo cáo
- **Dashboard** — Thẻ tổng quan, biểu đồ, giao dịch gần đây
- **Báo cáo tháng** — Đối chiếu thu nhập vs chi tiêu
- **Phân tích dòng tiền** — Theo dõi luồng tiền theo thời gian
- **Xuất dữ liệu** — CSV / Excel

### Hệ thống
- **Xác thực người dùng** — JWT có tự động refresh token
- **Đa tiền tệ** — Quản lý tiền tệ + tỷ giá hối đoái
- **Thông báo** — Trung tâm thông báo trong app + toast
- **Phân loại** — Danh mục (Categories), thẻ (Tags), nhóm đối tượng (Object Groups)
- **Giao diện** — shadcn/ui (Radix) với accent tím, hỗ trợ **Dark mode** (next-themes)

---

## 🏗️ Kiến trúc

```
             ┌──────────────────┐
             │   Frontend       │  React 18 + Vite 6
             │ localhost:5173   │
             └────────┬─────────┘
                      │
             ┌────────▼─────────┐
             │   API Gateway    │  Ocelot @ localhost:5229
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
         │   SQL        │
         │   Server     │
         │  (Docker)    │
         │  :1434       │
         └─────────────┘
```

### Services

| Service | Port | Mô tả |
|---------|------|-------|
| **Frontend** | `:5173` | React SPA (Vite) |
| **API Gateway** | `:5229` | Ocelot reverse proxy |
| **API Service** | `:5133` | Business logic + CRUD |
| **Auth Service** | `:5134` | Xác thực + JWT |
| **SQL Server** | `:1434` | Cơ sở dữ liệu (Docker) |

### Cấu trúc dự án

```
Budget Management/
├── BudgetManagement/                 # .NET 10 solution
│   ├── BudgetManagement.APIGateway/  # Ocelot gateway
│   ├── BudgetManagement.APIService/  # Business API
│   ├── BudgetManagement.AuthService/ # Auth API
│   ├── BudgetManagement.LogService/  # Logging service
│   ├── BudgetManagement.Entities/    # EF Core entity models
│   ├── BudgetManagement.Dto/         # DTOs + validation
│   ├── BudgetManagement.Services/    # Business logic
│   ├── BudgetManagement.Repository/  # Data access (EF Core)
│   ├── BudgetManagement.Common/      # Tiện ích dùng chung
│   ├── BudgetManagement.Tests/       # xUnit tests
│   └── DbTester/                     # Công cụ kiểm tra kết nối DB
├── src/                              # React frontend
│   ├── app/
│   │   ├── api/                      # Axios API modules
│   │   ├── components/               # UI, layout, modals
│   │   ├── context/                  # Auth, Settings, Categories, Notifications
│   │   ├── pages/                    # Trang theo route
│   │   └── utils/                    # Helper (format tiền, icons…)
│   └── styles/                       # Tailwind + theme
├── data/
│   ├── csdl_sqlserver.sql            # Schema CSDL
│   ├── migration_fix.sql             # Migration bổ sung
│   └── seed_demo_2026.sql            # Dữ liệu demo (tài khoản demo2026)
├── guidelines/Guidelines.md          # Quy ước code
├── run.sh                            # Khởi động toàn bộ services
├── run-dbtester.sh                   # Chạy công cụ test kết nối DB
└── kill.sh                           # Dừng toàn bộ services
```

---

## 🚀 Bắt đầu nhanh

### Yêu cầu

- Node.js 18+
- .NET 10 SDK
- Docker (cho SQL Server)

### Cài đặt

```bash
# 1. Khởi động SQL Server (Docker)
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Hoangphuc@040505" \
  -p 1434:1433 --name sqlserver_2022 -d mcr.microsoft.com/mssql/server:2022-latest

# 2. Tạo database + áp schema
docker exec -i sqlserver_2022 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Hoangphuc@040505' -C -Q "CREATE DATABASE BudgetManagement"

docker exec -i sqlserver_2022 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i data/csdl_sqlserver.sql

docker exec -i sqlserver_2022 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i data/migration_fix.sql

# 3. (Tùy chọn) Nạp dữ liệu demo — phủ mọi chức năng, 12 tháng giao dịch
docker exec -i sqlserver_2022 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i data/seed_demo_2026.sql

# 4. Cài dependencies frontend
npm install

# 5. Khởi động toàn bộ services
chmod +x run.sh
./run.sh
```

`run.sh` khởi động cả 4 services với health-check và tự mở trình duyệt. Nhấn `Ctrl+C` để dừng tất cả.

```bash
./run.sh                 # Chạy tất cả services
./run.sh --frontend-only # Chỉ frontend (Vite dev server)
./run.sh --backend-only  # Chỉ backend (API, Auth, Gateway)
./run.sh --no-browser    # Không tự mở trình duyệt
```

### Tài khoản demo

Sau khi nạp `data/seed_demo_2026.sql`:

| Tài khoản | Mật khẩu |
|-----------|----------|
| `demo2026` | `Demo@2026` |

### Chạy thủ công (mỗi terminal một service)

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

### Build frontend (production)

```bash
npm run build      # Xuất ra thư mục dist/
```

### Chạy test (backend)

```bash
cd BudgetManagement && dotnet test BudgetManagement.Tests/BudgetManagement.Tests.csproj
```

### URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API Gateway | http://localhost:5229 |
| API Service Swagger | http://localhost:5133/swagger |
| Auth Service Swagger | http://localhost:5134/swagger |

---

## 🗺️ Bản đồ route (Frontend)

| Route | Trang |
|-------|-------|
| `/` | Dashboard |
| `/budgets`, `/budgets/:id` | Ngân sách + chi tiết |
| `/piggy-banks`, `/piggy-banks/:id` | Lợn tiết kiệm + chi tiết |
| `/subscriptions`, `/subscriptions/:id` | Hóa đơn định kỳ + chi tiết |
| `/transactions/{all,deposit,withdrawal,transfers}` | Giao dịch |
| `/rules`, `/recurring`, `/webhooks` | Tự động hóa |
| `/accounts/{asset,expense,income,liabilities}` | Tài khoản |
| `/categories`, `/tags`, `/object-groups` | Phân loại |
| `/reports`, `/export` | Báo cáo & xuất dữ liệu |
| `/notifications` | Trung tâm thông báo |
| `/profile`, `/preferences`, `/currencies`, `/exchange-rates`, `/administrations` | Tùy chọn |

---

## 📖 Tài liệu

| Tài liệu | Mô tả |
|----------|-------|
| **[guidelines/Guidelines.md](./guidelines/Guidelines.md)** | Quy ước code của dự án |
| **[data/csdl_sqlserver.sql](./data/csdl_sqlserver.sql)** | Schema SQL Server đầy đủ |
| **[data/migration_fix.sql](./data/migration_fix.sql)** | Script migration bổ sung |
| **[data/seed_demo_2026.sql](./data/seed_demo_2026.sql)** | Dữ liệu demo (tài khoản `demo2026`) |

### Một số API endpoint chính

> Mọi request đi qua API Gateway tại `http://localhost:5229`. Route auth dùng `/api/auth/*`, route nghiệp vụ dùng `/api/*`.

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/signin` | Đăng nhập |
| POST | `/api/auth/signup` | Đăng ký |
| POST | `/api/auth/refresh` | Làm mới access token |
| GET | `/api/accounts?page=1&pageSize=50` | Danh sách tài khoản (phân trang) |
| GET | `/api/accounts/type/{typeId}` | Lọc theo loại (1=Asset, 4=Revenue, 5=Expense) |
| GET | `/api/accounts/wallet-summary` | Tổng quan số dư (search/sort phía server) |
| GET/POST/PUT/DELETE | `/api/accounts/{id}` | CRUD tài khoản |
| GET/POST/PUT/DELETE | `/api/transactions/{id}` | CRUD giao dịch |
| GET | `/api/budgets/expense` | Ngân sách chi tiêu (phân trang + search/filter/sort) |
| GET | `/api/budgets/savings` | Danh sách lợn tiết kiệm |
| POST | `/api/budgets/savings/{id}/add` · `/remove` | Nạp / rút tiền lợn tiết kiệm |
| GET | `/api/bills?page=1&pageSize=50` | Danh sách hóa đơn (phân trang) |
| GET | `/api/recurring?page=1&pageSize=50` | Giao dịch định kỳ (phân trang) |
| GET | `/api/dashboard/summary` | Tổng quan dashboard |
| GET | `/api/dashboard/monthly-report` | Báo cáo tháng |

---

## 🧪 Testing

Backend dùng **xUnit + Moq + FluentAssertions**. Bộ test phủ các service chính: Account, Budget, Bill, Recurring, Currency, ExchangeRate, Dashboard, Attachment, Auth… cùng các test về **phân trang** (`PaginatedResult`), **source account**, và validation độ mạnh mật khẩu.

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
- Vite 6 (build tool)
- React Router DOM v7
- Axios (interceptor tự refresh JWT)
- Tailwind CSS v4
- shadcn/ui (Radix-based, component cục bộ) + Lucide React icons
- Recharts (biểu đồ)
- React Hook Form (form)
- next-themes (dark mode) · Sonner (toast) · Motion (animation)
- date-fns

### DevOps
- Docker (SQL Server)
- Shell scripts orchestration (`run.sh`, `run-dbtester.sh`, `kill.sh`)

---

## 🤝 Đóng góp

1. Fork repository
2. Tạo nhánh tính năng (`git checkout -b feature/amazing-feature`)
3. Commit thay đổi (`git commit -m 'Add some amazing feature'`)
4. Push lên nhánh (`git push origin feature/amazing-feature`)
5. Mở Pull Request

---

## 📝 License

Dự án phục vụ mục đích học tập. Thiết kế gốc từ [Figma Community](https://www.figma.com/design/asc5PkB2YXy8pmseQgS2Tl/Budget-Management-Website).

---

## 🙏 Ghi nhận

- Lấy cảm hứng từ [Firefly III](https://www.firefly-iii.org/) — phần mềm quản lý tài chính cá nhân mã nguồn mở
- Giao diện thiết kế từ Figma Community
- Toàn thể thành viên nhóm
