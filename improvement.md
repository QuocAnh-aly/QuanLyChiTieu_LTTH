# 📈 Improvement Log — Quản Lý Chi Tiêu

> **Các cải thiện đã thực hiện**  
> Last updated: May 29, 2026

---

## 1. 🗄️ Database Schema Fixes

### Vấn đề
Khi đăng ký user mới, lỗi `Invalid column name 'currency_code'` xảy ra vì database thiếu nhiều cột và bảng so với entity models trong code.

### Giải pháp
Tạo `migration_fix.sql` — migration script an toàn với `IF NOT EXISTS` checks.

### Các cột đã thêm
| Bảng | Cột | Loại |
|------|-----|------|
| `Accounts` | `currency_code` | `NVARCHAR(10) NOT NULL DEFAULT 'USD'` |
| `Journal_Entries` | `foreign_amount` | `DECIMAL(18,2) NULL` |
| `Journal_Entries` | `foreign_currency_code` | `NVARCHAR(10) NULL` |

### Các bảng đã tạo mới (9 bảng)
| Bảng | Mục đích |
|------|----------|
| `Currencies` | Quản lý tiền tệ (VND, USD, EUR, JPY...) |
| `Exchange_Rates` | Tỷ giá hối đoái |
| `Rule_Groups` | Nhóm quy tắc tự động hóa |
| `Rules` | Quy tắc tự động hóa |
| `Rule_Triggers` | Điều kiện kích hoạt quy tắc |
| `Rule_Actions` | Hành động khi quy tắc kích hoạt |
| `Webhooks` | Webhook endpoints |
| `Webhook_Messages` | Lịch sử webhook messages |
| `Attachments` | File đính kèm |

### Seed data
Mặc định 4 loại tiền tệ được tạo cho mỗi user: **VND** (primary), **USD**, **EUR**, **JPY**

---

## 2. 🔧 Backend Improvements

### 2.1 Connection String
| Before | After |
|--------|-------|
| `Data Source=(localdb)\\MSSQLLocalDB;...` | `Data Source=localhost,1434;User ID=sa;Password=...;Database=BudgetManagement;...` |

Chuyển từ SQL Server LocalDB sang Docker SQL Server để dễ dàng thiết lập và chia sẻ môi trường.

### 2.2 CORS
Thêm `http://127.0.0.1:5173`, `http://127.0.0.1:5174`, `http://127.0.0.1:5175` vào allowed origins (cả Gateway và API Service) để hỗ trợ kết nối qua IP thay vì chỉ localhost.

### 2.3 Currency trên Account
- **DTOs:** Thêm `CurrencyCode` vào `CreateAccountDto` (default `"VND"`), `UpdateAccountDto` (nullable), `AccountDto`
- **Entity:** Đổi default từ `"USD"` → `"VND"` trong `Account.cs`
- **Service:** `AccountService.CreateAsync` ghi nhận `request.CurrencyCode`, `UpdateAsync` hỗ trợ `request.CurrencyCode ?? account.CurrencyCode`, `MapToDto` map `a.CurrencyCode`

### 2.4 Password Validation (Relaxed)
Loại bỏ yêu cầu lowercase letter và digit — chỉ giữ yêu cầu uppercase letter + special character.

### 2.5 DbTester Project
Thêm `DbTester` console app vào solution để test kết nối database nhanh.

### 2.6 .gitignore
- Thêm `appsettings.json` của mỗi service vào gitignore (tránh lộ credentials)
- Thêm thư mục `logs/` và `logs/services.pid`

---

## 3. 🎨 Frontend Improvements

### 3.1 Hệ thống Notification (In-App)
Tạo hệ thống thông báo trong ứng dụng, **tách biệt** với Sonner toasts:

| Component | Chức năng |
|-----------|-----------|
| `NotificationContext` | Context quản lý notifications (persist localStorage, max 100) |
| `NotificationBell` | Icon chuông trên sidebar, hiển thị số unread |
| `NotificationCenter` | Trang `/notifications` — danh sách đầy đủ |

Hỗ trợ 4 loại: `success`, `error`, `warning`, `info`. Mỗi notification có thể có `link` để điều hướng.

**Các trang đã tích hợp notification:**
- `Deposit.jsx` — thêm/xóa/sửa khoản thu
- `Transactions.jsx` — thêm/xóa/sửa giao dịch
- `Transfers.jsx` — chuyển khoản
- `Withdrawal.jsx` — khoản chi
- `Budgets.jsx` — cảnh báo ngân sách
- `BudgetDetail.jsx` — cảnh báo ngân sách

### 3.2 Currency Selector trên Ví (Wallet)

| Modal | Thay đổi |
|-------|----------|
| `AddWalletModal` | Thêm grid 4 nút chọn VND/USD/EUR/JPY với icon tương ứng |
| `EditWalletModal` | Thêm grid chọn currency tương tự, gửi `currencyCode` khi save |

Icon mapping:
- VND → `DollarSign` (₫)
- USD → `CircleDollarSign` ($)
- EUR → `Euro` (€)
- JPY → `JapaneseYen` (¥)

### 3.3 Hiển thị Currency trên AssetAccounts
- Thẻ ví hiển thị badge currency bên cạnh số dư (màu xanh dương)
- Bảng chi tiết thêm cột "Tiền tệ"
- Gửi `currencyCode` khi tạo/sửa ví qua API

### 3.4 Budget Warnings

| Ngưỡng | Hành động |
|--------|-----------|
| >80% target | Toast warning (vàng) + in-app notification |
| >100% target (vượt hạn mức) | Toast alert (đỏ) + in-app notification |
| Deduplication | `useRef` set để tránh spam notification |

**Cảnh báo xuất hiện ở:**
- `Budgets.jsx` — danh sách tất cả budgets (một lần khi load)
- `BudgetDetail.jsx` — trang chi tiết budget (mỗi lần truy cập)

### 3.5 Sidebar Layout
- Thêm `NotificationBell` vào sidebar header
- Sắp xếp lại navigation items hợp lý hơn

### 3.6 API Layer
- `authApi.changePassword` — sửa payload từ `{ currentPassword, newPassword }` → `{ old_password, new_password }`

---

## 4. 🚀 Infrastructure Improvements

### 4.1 run.sh — Real-time Logging
| Trước | Sau |
|-------|-----|
| `dotnet run ... >> file.log` (lỗi: buffered 4KB, không thấy real-time output) | `stdbuf -oL dotnet run ... \| tee -a "$log_file"` |

Các cải tiến:
- **stdbuf -oL** — line-buffer mọi stage, output đến log file ngay lập tức
- **sed prefix** — thêm `[API]`, `[Auth]`, `[Gateway]`, `[Frontend]` vào mỗi dòng log
- **tee -a** — ghi đồng thời ra terminal + log file
- **Trap SIGINT/SIGTERM** — `Ctrl+C` dọn dẹp tất cả background processes
- Bỏ `wait_for_port` (thay bằng `sleep 10`)
- Rút ngắn tên service: "API Service" → "API", "Auth Service" → "Auth", etc.

### 4.2 Docker Scripts
- `run-dbtester.sh` — script riêng để chạy DbTester
- `kill.sh` — dừng toàn bộ services

---

## 5. 🧪 Testing

### Test Project: `BudgetManagement.Tests`
- **Framework:** xUnit + Moq + FluentAssertions
- **Tổng số tests:** 72
- **Phạm vi:**

| File | Số tests | Mô tả |
|------|----------|-------|
| `PasswordStrengthValidatorTests.cs` | 27 | null/empty, length boundaries, character variety, special chars, edge cases, Result factories |
| `AccountServiceTests.cs` | 20 | CRUD + auth checks + null-field preservation + WalletSummary |
| `CurrencyServiceTests.cs` | 25 | CRUD + primary currency rules + duplicate/delete/disable protections |

**Key scenarios:**
- ✅ Authorization: user không thể truy cập/sửa/xóa account của user khác
- ✅ Business rules: không xóa/disable được primary currency
- ✅ Edge cases: null fields không ghi đè dữ liệu cũ, empty accounts
- ✅ CurrencyCode: dữ liệu tiền tệ truyền đúng qua full stack

---

## 6. 📚 Documentation

| File | Mô tả |
|------|-------|
| `AI_GUIDE.md` | Onboarding guide cho AI agents — 10 sections, architecture, routes, API, workflows, conventions |
| `improvement.md` | **← File này** — lịch sử cải thiện |
| `guidelines/Guidelines.md` | Template cho project coding guidelines |
| `PROJECT_ANALYSIS.md` | Phân tích chi tiết kiến trúc (đã cập nhật) |

---

## Tổng quan Feature Completion

| Feature | Status | Ghi chú |
|---------|--------|---------|
| Authentication (login/register/refresh) | ✅ Complete | JWT + auto-refresh |
| Account management (CRUD) | ✅ Complete | Full REST API |
| Wallet management | ✅ Complete | CRUD + QuickTransfer + currency |
| Transaction recording | ✅ Complete | Income/expense/transfer |
| Budgets (expense + savings) | ✅ Complete | Progress bars, warnings |
| Budget warnings (>80%, >100%) | ✅ Complete | Toast + notification |
| Currency management | ✅ Complete | CRUD + set-primary |
| Exchange rates | ✅ Complete | CRUD + bulk + convert |
| Currency on wallet | ✅ Complete | Selector + display + API |
| Recurring transactions | ✅ Complete | Auto-generation |
| Bills management | ✅ Complete | CRUD |
| Rules engine | ✅ Complete | Triggers + actions |
| Webhooks | ✅ Complete | Trigger + messages |
| Dashboard + charts | ✅ Complete | Recharts |
| Reports | ✅ Complete | Financial reports |
| Export (CSV/Excel) | ✅ Complete | |
| Search | ✅ Complete | Full-text search |
| Piggy banks (savings) | ✅ Complete | |
| Subscriptions | ⚠️ Partial | Scaffolding |
| Settings/Preferences | ✅ Complete | |
| Notification center | ✅ Complete | In-app + sidebar bell |
| Attachments | ✅ Scaffolded | Table + FK ready |
| Unit tests (72 tests) | ✅ Complete | Password, Account, Currency |
| Documentation | ✅ Complete | AI_GUIDE, improvement, guidelines |
| Log Service | ❌ Unused | Scaffolding only |
| Mobile responsiveness | ⚠️ Partial | Basic responsive |
