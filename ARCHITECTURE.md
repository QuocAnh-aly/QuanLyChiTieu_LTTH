# Budget Management — Kiến trúc dự án

## 📋 Tổng quan

**Budget Management** là ứng dụng quản lý tài chính cá nhân (Personal Finance Manager) với kiến trúc microservices backend (ASP.NET Core 8) + React SPA frontend (Vite + Tailwind CSS).

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Frontend   │────▶│ API Gateway  │────▶│   APIService     │
│  (React/Vite)│     │ (Ocelot:5229)│     │  (Business API)  │
└──────────────┘     └──────────────┘     │  (API: 5133)     │
                                          ├──────────────────┤
                                          │   AuthService    │
                                          │  (Auth: 5134)    │
                                          ├──────────────────┤
                                          │   LogService     │
                                          │  (Logging)       │
                                          └──────────────────┘
                                                │
                                          ┌────▼────┐
                                          │  SQL    │
                                          │ Server  │
                                          │ (1434)  │
                                          └─────────┘
```

### Nguyên tắc kế toán (Double-entry)

Hệ thống sử dụng **kế toán kép 5 loại tài khoản**:

| TypeId | Loại | Ví dụ | Ghi chú |
|---|---|---|---|
| 1 | **Assets** (Tài sản) | Ví chính, MB Bank, Tiền mặt | Số dư ≥ 0 |
| 2 | **Liabilities** (Nợ) | Thẻ tín dụng VISA, Khoản vay | Số dư ≤ 0 |
| 3 | **Equity** (Vốn chủ) | Tiết kiệm, Đầu tư | Chung với Savings Goals |
| 4 | **Revenue** (Thu nhập) | Lương, Freelance, Đầu tư | Dùng cho Income transactions |
| 5 | **Expense** (Chi phí) | Ăn uống, Mua sắm, Di chuyển | Dùng cho Expense transactions + Budgets |

**Nguyên tắc cập nhật balance:**
- Assets/Expense: Debit tăng (+), Credit giảm (-)
- Liabilities/Equity/Revenue: Credit tăng (+), Debit giảm (-)

---

## 🗂️ Cấu trúc thư mục

### Backend (`BudgetManagement/`)

```
BudgetManagement/
├── BudgetManagement.APIService/     # API chính — 16 Controllers
│   ├── Controllers/
│   │   ├── AccountController.cs      # Tài khoản (CRUD + pagination)
│   │   ├── AttachmentsController.cs  # File đính kèm
│   │   ├── BaseController.cs         # Base class (GetUserId)
│   │   ├── BillController.cs         # Hóa đơn định kỳ
│   │   ├── BudgetController.cs       # Ngân sách + Savings Goals
│   │   ├── CurrenciesController.cs   # Tiền tệ
│   │   ├── DashboardController.cs    # Dashboard tổng quan
│   │   ├── DataController.cs         # Data utilities
│   │   ├── ExchangeRatesController.cs# Tỷ giá hối đoái
│   │   ├── InsightController.cs      # Thống kê chi tiêu
│   │   ├── RecurringController.cs    # Giao dịch định kỳ
│   │   ├── RuleGroupsController.cs   # Nhóm rules
│   │   ├── RulesController.cs        # Rules Engine
│   │   ├── SearchController.cs       # Tìm kiếm
│   │   ├── TransactionController.cs  # Giao dịch (CRUD + range)
│   │   └── WebhooksController.cs     # Webhooks
│   └── RecurringHostedService.cs     # Background job 24h
│
├── BudgetManagement.AuthService/     # Xác thực — JWT
│   └── Controllers/
│       ├── AuthController.cs         # Register, Login, Refresh
│       └── BaseController.cs
│
├── BudgetManagement.APIGateway/      # Ocelot Gateway
│   ├── ocelot.json                   # Routing config
│   └── Program.cs
│
├── BudgetManagement.Services/        # Business Logic Layer
│   ├── Implementations/              # 15 services
│   │   ├── AccountService.cs
│   │   ├── AttachmentService.cs
│   │   ├── AuthService.cs
│   │   ├── BillService.cs
│   │   ├── BudgetService.cs
│   │   ├── CurrencyService.cs
│   │   ├── DashboardService.cs
│   │   ├── ExchangeRateService.cs
│   │   ├── ExportService.cs
│   │   ├── InsightService.cs
│   │   ├── RecurringService.cs
│   │   ├── RuleService.cs
│   │   ├── SearchService.cs
│   │   ├── TransactionService.cs
│   │   └── WebhookService.cs
│   └── Interfaces/                   # 15 interfaces
│
├── BudgetManagement.Repository/      # Data Access Layer (EF Core)
│   ├── Implementations/
│   │   ├── BaseRepository.cs         # Generic CRUD
│   │   ├── AccountRepository.cs
│   │   ├── BudgetRepository.cs
│   │   ├── JournalRepository.cs
│   │   └── ... (10 repositories)
│   ├── Interfaces/
│   └── BudgetManagementDbContext.cs
│
├── BudgetManagement.Entities/        # Entity Models (14 classes)
│   ├── Account.cs, AccountType.cs
│   ├── Budget.cs, Bill.cs
│   ├── JournalEntry.cs, JournalDetail.cs
│   ├── Currency.cs, ExchangeRate.cs
│   ├── Rule.cs, RuleTrigger.cs, RuleAction.cs, RuleGroup.cs
│   ├── Webhook.cs, WebhookMessage.cs
│   ├── RecurringJournal.cs, RecurringInstance.cs
│   ├── PiggyBankEvent.cs
│   ├── Attachment.cs
│   └── User.cs
│
├── BudgetManagement.Dto/             # Request/Response DTOs
│   ├── Account/, Auth/, Bill/, Budget/
│   ├── Currency/, Dashboard/, Export/
│   ├── Recurring/, Rule/, Search/
│   ├── Transaction/, Webhook/
│   └── PaginatedResult.cs
│
├── BudgetManagement.Common/          # Utilities
│   └── PasswordStrengthValidator.cs
│
├── BudgetManagement.Tests/           # Unit Tests (321 tests)
│   ├── AuthServiceTests.cs
│   ├── BudgetServiceTests.cs
│   ├── TransactionServiceTests.cs
│   └── ... (18 test files)
│
├── BudgetManagement.LogService/      # Logging microservice
└── DbTester/                         # DB connection tester
```

### Frontend (`src/`)

```
src/
├── main.jsx                          # Entry point
├── app/
│   ├── App.jsx                       # Root component (providers)
│   ├── routes.jsx                    # React Router config (40+ routes)
│   │
│   ├── context/                      # React Contexts
│   │   ├── AuthContext.jsx           # Auth + JWT management
│   │   ├── SettingsContext.jsx       # Currency, rates, formatting
│   │   ├── CategoriesContext.jsx     # Expense/Income categories + tags
│   │   └── NotificationContext.jsx   # Notification center
│   │
│   ├── api/                          # API Clients (axios)
│   │   ├── axiosClient.js            # Base axios + interceptor (JWT refresh)
│   │   ├── authApi.js, budgetApi.js, transactionApi.js
│   │   ├── accountApi.js, billApi.js, walletApi.js
│   │   ├── currencyApi.js, exchangeRateApi.js
│   │   ├── dashboardApi.js, insightApi.js
│   │   ├── recurringApi.js, ruleApi.js, webhookApi.js
│   │   ├── exportApi.js, piggyBankApi.js
│   │   └── ...
│   │
│   ├── utils/
│   │   ├── formatMoney.jsx           # formatVND, parseVND
│   │   └── toastOnce.jsx            # Session-based toast dedup
│   │
│   ├── pages/
│   │   ├── auth/Login.jsx            # Login + Register form
│   │   ├── dashboard/Dashboard.jsx   # Tổng quan
│   │   ├── financial-control/
│   │   │   ├── Budgets.jsx           # Danh sách ngân sách
│   │   │   ├── BudgetDetail.jsx      # Chi tiết ngân sách
│   │   │   ├── PiggyBanks.jsx        # Ống heo (savings)
│   │   │   ├── PiggyBankDetail.jsx   # Chi tiết ống heo
│   │   │   ├── Subscriptions.jsx     # Hóa đơn định kỳ
│   │   │   └── SubscriptionDetail.jsx
│   │   ├── accounting/
│   │   │   ├── Transactions.jsx      # Danh sách giao dịch
│   │   │   ├── Withdrawal.jsx        # Chi tiêu
│   │   │   ├── Deposit.jsx          # Thu nhập
│   │   │   ├── Transfers.jsx         # Chuyển khoản
│   │   │   └── automation/
│   │   │       ├── Rules.jsx         # Rules Engine
│   │   │       ├── Recurrences.jsx   # Giao dịch định kỳ
│   │   │       └── Webhooks.jsx      # Webhooks
│   │   ├── others/accounts/
│   │   │   ├── AssetAccounts.jsx     # Tài sản
│   │   │   ├── Liabilities.jsx       # Nợ
│   │   │   ├── ExpenseView.jsx       # Chi phí
│   │   │   └── IncomeView.jsx        # Thu nhập
│   │   ├── others/classification/
│   │   │   ├── Categories.jsx        # Danh mục chi tiêu/thu nhập
│   │   │   ├── Tags.jsx              # Nhãn
│   │   │   └── ObjectGroups.jsx      # Nhóm đối tượng
│   │   ├── others/
│   │   │   ├── Reports.jsx           # Báo cáo
│   │   │   ├── ExportData.jsx        # Xuất dữ liệu
│   │   │   └── ErrorPage.jsx         # Error boundary
│   │   ├── options/
│   │   │   ├── Profile.jsx           # Hồ sơ + đổi mật khẩu
│   │   │   ├── OAuthTokens.jsx       # OAuth tokens
│   │   │   ├── Preferences.jsx       # Tùy chọn hiển thị
│   │   │   ├── Currencies.jsx        # Quản lý tiền tệ
│   │   │   ├── ExchangeRates.jsx     # Tỷ giá
│   │   │   ├── Administrations.jsx   # Quản trị
│   │   │   └── SystemSettings.jsx    # Cài đặt hệ thống
│   │   └── notifications/
│   │       └── NotificationCenter.jsx # Trung tâm thông báo
│   │
│   └── components/
│       ├── layout/                   # Layout + Navigation
│       │   ├── Layout.jsx            # App shell (sidebar + header)
│       │   ├── PageLayout.jsx        # Page wrapper
│       │   └── ProtectedRoute.jsx    # Auth guard
│       ├── modals/                   # 12 modal components
│       │   ├── AddTransactionModal.jsx    # Thêm giao dịch (3 types)
│       │   ├── EditTransactionModal.jsx
│       │   ├── AddBudgetModal.jsx
│       │   ├── EditBudgetModal.jsx
│       │   ├── QuickTransferModal.jsx     # Chuyển khoản nhanh│   │   ├── AccountFormModal.jsx       # Tạo/Sửa tài khoản + subtype grids (Asset/Liability/Revenue/Expense)
│       │   ├── AddWalletModal.jsx         # Thêm ví (legacy)
│       │   ├── EditWalletModal.jsx
│       │   ├── PiggyBankFormModal.jsx
│       │   ├── SubscriptionFormModal.jsx
│       │   ├── AddMoneyModal.jsx
│       │   └── RemoveMoneyModal.jsx
│       └── ui/                       # UI components (shadcn/ui)
│           ├── navigation/
│           │   ├── PaginationBar.jsx
│           │   └── pagination.jsx
│           ├── data/
│           │   └── chart.jsx
│           └── ... (card, dialog, dropdown, tooltip, etc.)
│
└── styles/
    ├── index.css                     # Tailwind + theme
    ├── globals.css                   # CSS variables
    ├── theme.css                     # Theme overrides
    ├── tailwind.css                  # Tailwind directives
    └── fonts.css                     # Font imports
```

---

## 🗄️ Database Schema

### ER Diagram

```
Users ──▶ Accounts ──▶ Account_Types
  │            │
  │            ├── Journal_Details ──▶ Journal_Entries
  │            │
  │            └── Budgets ──▶ Piggy_Bank_Events
  │                              (for savings type)
  │
  ├── Currencies ──▶ Exchange_Rates
  ├── Bills
  ├── Recurring_Journals ──▶ Recurring_Instances
  ├── Rules ──▶ Rule_Triggers + Rule_Actions
  │       └── Rule_Groups
  ├── Webhooks ──▶ Webhook_Messages
  └── Attachments
```

### Chi tiết bảng

#### `Users`
```sql
user_id INT PK IDENTITY,
user_account NVARCHAR(50) UNIQUE NOT NULL,
password_hash NVARCHAR(255) NOT NULL,       -- BCrypt hash
user_name NVARCHAR(100) DEFAULT 'BonSpark',
email NVARCHAR(100),
avatar_initials NVARCHAR(5) DEFAULT 'JD',
theme NVARCHAR(10) DEFAULT 'light',         -- 'light'|'dark'|'auto'
currency NVARCHAR(10) DEFAULT 'USD',
notify_email BIT DEFAULT 1,
notify_push BIT DEFAULT 1,
notify_sms BIT DEFAULT 0,
created_at DATETIME2 DEFAULT GETDATE()
```

#### `Account_Types` (reference data)
| type_id | type_name |
|---|---|
| 1 | Assets |
| 2 | Liabilities |
| 3 | Equity |
| 4 | Revenue |
| 5 | Expense |

#### `Accounts`
```sql
account_id INT PK IDENTITY,
user_id INT FK→Users,
type_id INT FK→Account_Types,              -- 1=Asset, 2=Liability, 3=Equity, 4=Revenue, 5=Expense
name NVARCHAR(100) NOT NULL,
icon_name NVARCHAR(30) DEFAULT 'Landmark',
color NVARCHAR(20) DEFAULT 'blue',
gradient_from NVARCHAR(10) DEFAULT '#3b82f6',
gradient_to NVARCHAR(10) DEFAULT '#1d4ed8',
balance DECIMAL(18,2) DEFAULT 0,            -- Số dư hiện tại
initial_balance DECIMAL(18,2) DEFAULT 0,
card_number NVARCHAR(20) DEFAULT '•••• ••••',
currency_code NVARCHAR(10) NOT NULL DEFAULT 'USD',
is_active BIT DEFAULT 1,
created_at DATETIME2 DEFAULT GETDATE()
```

#### `Journal_Entries` + `Journal_Details` (Double-entry)
```sql
-- Journal Entry (1 record per transaction)
journal_id INT PK IDENTITY,
user_id INT FK,
transaction_date DATETIME2 NOT NULL,
description NVARCHAR(500) DEFAULT 'Unknown',
notes NVARCHAR(MAX) NULL,
tags NVARCHAR(1000) NULL,                   -- Comma-separated tag names
bill_id INT FK→Bills NULL,                 -- Liên kết subscription
foreign_amount DECIMAL(18,2) NULL,          -- Amount in original currency
foreign_currency_code NVARCHAR(10) NULL,    -- e.g. 'USD'
created_at DATETIME2 DEFAULT GETDATE()

-- Journal Detail (2 records per transaction: 1 debit + 1 credit)
detail_id INT PK IDENTITY,
journal_id INT FK,
account_id INT FK→Accounts,
debit DECIMAL(18,2) DEFAULT 0,
credit DECIMAL(18,2) DEFAULT 0
```

#### `Budgets`
```sql
budget_id INT PK IDENTITY,
user_id INT FK,
account_id INT FK→Accounts,                 -- expense: Expense Account | savings: Asset Account
title NVARCHAR(100) NOT NULL,
budget_type NVARCHAR(20) DEFAULT 'expense',  -- 'expense' | 'savings'
target_amount DECIMAL(18,2) NOT NULL,
current_amount DECIMAL(18,2) DEFAULT 0,     -- expense: đã chi | savings: đã tiết kiệm
monthly_contribution DECIMAL(18,2) DEFAULT 0,
period_type NVARCHAR(20) DEFAULT 'monthly',  -- daily|weekly|monthly|yearly
start_date DATE NOT NULL,
end_date DATE NULL,
deadline NVARCHAR(20) NULL,                 -- savings target date
icon_name NVARCHAR(30) DEFAULT 'Coffee',
color NVARCHAR(20) DEFAULT 'orange',
is_active BIT DEFAULT 1,
created_at DATETIME2 DEFAULT GETDATE()
```

#### `Bills` (Subscriptions / Hóa đơn định kỳ)
```sql
bill_id INT PK IDENTITY,
user_id INT FK,
name NVARCHAR(255) NOT NULL,
amount_min DECIMAL(18,2) NOT NULL DEFAULT 0,
amount_max DECIMAL(18,2) NOT NULL DEFAULT 0,
date DATE NOT NULL,                          -- Ngày bắt đầu
end_date DATE NULL,                          -- Ngày kết thúc
extension_date DATE NULL,
repeat_freq NVARCHAR(20) NOT NULL DEFAULT 'monthly',  -- daily|weekly|monthly|quarterly|half-year|yearly
skip INT NOT NULL DEFAULT 0,                  -- Skip N chu kỳ
active BIT NOT NULL DEFAULT 1,
notes NVARCHAR(MAX) NULL,
object_group NVARCHAR(255) NULL,             -- Nhóm hóa đơn (vd: "Bảo hiểm", "Nhà cửa")
created_at DATETIME2 DEFAULT GETDATE()
```

#### `Recurring_Journals` + `Recurring_Instances`
```sql
-- Giao dịch định kỳ (do background service xử lý)
recurring_id INT PK IDENTITY,
user_id INT FK,
debit_account_id INT FK→Accounts,
credit_account_id INT FK→Accounts,
amount DECIMAL(18,2) NOT NULL,
title NVARCHAR(100),
description NVARCHAR(500),
frequency NVARCHAR(20) NOT NULL,             -- daily|weekly|monthly|yearly
interval_value INT DEFAULT 1,                 -- Mỗi N kỳ
next_run_date DATETIME2 NOT NULL,
is_active BIT DEFAULT 1,
created_at DATETIME2 DEFAULT GETDATE()

-- Lịch sử thực thi
instance_id INT PK IDENTITY,
recurring_id INT FK,
due_date DATETIME2 NOT NULL,
status NVARCHAR(20) DEFAULT 'pending',        -- pending|completed|skipped
journal_id INT FK→Journal_Entries NULL
```

#### `Rules Engine`
```sql
Rule_Groups  (group_id, user_id, title, description, [order], is_active)
Rules        (rule_id, user_id, group_id FK, title, [order], is_active, strict, stop_processing, runs, last_run_at)
Rule_Triggers(trigger_id, rule_id FK, trigger_type, trigger_value, [order])
Rule_Actions (action_id, rule_id FK, action_type, action_value, [order])
```

#### `Webhooks`
```sql
Webhooks          (webhook_id, user_id, title, url, trigger_type, response, secret, is_active)
Webhook_Messages  (message_id, webhook_id FK, journal_id, payload, status_code, success, response_body, error_message)
```

#### `Currencies` + `Exchange_Rates`
```sql
Currencies     (currency_id, user_id, code, name, symbol, decimal_places, is_enabled, is_primary)
Exchange_Rates (rate_id, user_id, from_currency, to_currency, rate, rate_date)
```

#### `Piggy_Bank_Events`
```sql
event_id INT PK IDENTITY,
budget_id INT FK→Budgets,
amount DECIMAL(18,2),                       -- positive=add, negative=remove
event_date DATETIME2 DEFAULT GETDATE(),
notes NVARCHAR(500) NULL
```

#### `Attachments`
```sql
attachment_id INT PK IDENTITY,
user_id INT FK,
attachable_type NVARCHAR(20),               -- 'transaction'|'bill'|'budget'|'account'|'piggy'|'tag'
attachable_id INT NOT NULL,                  -- FK to the corresponding table (polymorphic)
title NVARCHAR(255) NULL,
notes NVARCHAR(1000) NULL,
filename NVARCHAR(255) NOT NULL,
mime NVARCHAR(100) NULL,
size BIGINT NOT NULL DEFAULT 0,
file_path NVARCHAR(500) NOT NULL,
uploaded_at DATETIME2 DEFAULT GETDATE()
```

---

## 🔄 Core Flows

### Flow 1: Tạo Budget (Expense)

```
[User clicks "Thêm ngân sách"]
        │
        ▼
[AddBudgetModal → form 1 cột]
        │
        ├── Chọn danh mục (Expense Account có sẵn — bắt buộc)
        ├── Nhập tên, số tiền, chu kỳ (monthly/weekly/yearly/custom), ngày
        └── Submit
        │
        ▼
[Frontend: budgetApi.createExpenseBudget({ accountId, title, targetAmount, periodType, startDate })]
        │
        ▼
[API Gateway → APIService → BudgetController.CreateExpenseBudget]
        │
        ▼
[BudgetService.CreateExpenseBudgetAsync]
        ├── Validate AccountId > 0
        ├── accountRepo.GetWithDetailsAsync(AccountId)
        │   ├── null → KeyNotFoundException
        │   ├── UserId mismatch → UnauthorizedAccessException
        │   └── TypeId != 5 → ArgumentException
        ├── Tạo Budget với account_id = Expense Account
        └── BudgetRepo.CreateAsync(budget)
        │
        ▼
[Response: BudgetDto]
        │
        ▼
[Frontend: refresh list + toast.success("Đã thêm ngân sách!") + addNotification]
```

**Lưu ý:** Budget luôn gắn với Expense Account có sẵn (không auto-create).

### Flow 2: Tạo Transaction (Double-entry)

```
[User clicks "Thêm giao dịch" → AddTransactionModal]
        │
        ├── Chọn loại: Chi tiêu / Thu nhập / Chuyển khoản
        │
        ├── CHI TIÊU:
        │   ├── Chọn ví thanh toán (Asset) → creditAccountId
        │   ├── Chọn danh mục chi tiêu (Expense) → debitAccountId
        │   └── Submit → TransactionService.CreateAsync
        │       ├── Debit: Expense Account (tăng chi phí)
        │       ├── Credit: Asset Account (giảm tiền)
        │       ├── Cập nhật balance
        │       └── UpdateSpentAmountAsync → cập nhật budget currentAmount
        │
        ├── THU NHẬP:
        │   ├── Chọn ví nhận (Asset) → debitAccountId
        │   ├── Chọn nguồn thu (Revenue) → creditAccountId
        │   └── Submit
        │       ├── Debit: Asset Account (tăng tiền)
        │       └── Credit: Revenue Account (tăng thu nhập)
        │
        └── CHUYỂN KHOẢN / TRẢ NỢ:
            ├── Chọn ví nguồn (Asset) + ví đích (Asset/Liability)
            ├── Check "Thanh toán nợ" → đích = Liability Account
            └── Submit
                ├── Debit: Asset đích / Liability (giảm nợ)
                └── Credit: Asset nguồn (giảm tiền)
```

### Flow 3: Authentication

```
[Register]
        │
        ├── Validate username unique
        ├── Validate password (PasswordStrengthValidator: ≥8 ký tự, hoa/thường/số/ký tự đặc biệt)
        ├── Hash password (BCrypt)
        ├── Tạo User
        ├── Tạo 3 accounts mặc định:
        │   ├── Revenue (typeId=4): "Thu nhập chính"
        │   ├── Expense (typeId=5): "Ăn uống"
        │   └── Equity (typeId=3): "Initial" (hidden from UI)
        ├── Seed 4 currencies: VND (primary), USD, EUR, JPY
        └── Generate JWT (access_token 5h, refresh_token 2 ngày)

[Login]
        ├── Find user by account
        ├── Verify password (BCrypt)
        └── Generate JWT pair

[Token Refresh]
        ├── Validate refresh token
        ├── Generate new access_token + refresh_token
        └── Return new pair
```

### Flow 4: Cập nhật Budget (Edit)

```
[User clicks ✏️ → EditBudgetModal mở với dữ liệu hiện tại]
        │
        ├── Sửa: tên, số tiền, chu kỳ, ngày bắt đầu/kết thúc
        ├── Icon picker: 19 icons (Coffee, ShoppingBag, Car, Heart, ...)
        ├── Color picker: 10 colors (orange, pink, blue, purple, ...)
        ├── Live preview icon + màu
        └── Submit → PATCH các field thay đổi
        │
        ▼
[BudgetService.UpdateExpenseBudgetAsync]
        ├── Validate budget tồn tại, thuộc user
        └── Update từng field (null-safe: chỉ update khi != null)
```

### Flow 5: Savings Goals (Ống heo)

```
[CreateSavingsGoal (budget_type='savings')]
        │
        ├── Chọn Asset Account đích
        ├── Nhập tên, targetAmount, deadline, monthlyContribution
        └── Submit
        │
        ▼
[Nạp tiền → AddMoneyAsync]
        ├── Tăng currentAmount (clamp to target)
        └── Tạo PiggyBankEvent (+amount)

[Rút tiền → RemoveMoneyAsync]
        ├── Giảm currentAmount (clamp to 0)
        └── Tạo PiggyBankEvent (-amount)

[Đặt lại lịch sử → ResetHistoryAsync]
        ├── Xóa tất cả PiggyBankEvents
        └── Reset currentAmount về 0
```

### Flow 6: Export dữ liệu

```
[User chọn Export → CSV / JSON / Excel]
        │
        ▼
[ExportService]
        ├── CollectTransactionsAsync(interval) → transactions trong khoảng
        ├── CollectAccountsAsync → accounts with balances
        └── CollectBudgetsAsync → budgets + events_count + net_deposited
        │
        ▼
[Formatter → ToCsv / ToJson / ToXlsxSpreadsheetML]
```

### Flow 7: Recurring Journals

```
[User tạo recurring → RecurringJournals table]
        │
        ├── debit_account_id + credit_account_id
        ├── amount, description
        ├── frequency (daily/weekly/monthly/yearly)
        ├── interval_value (mỗi N kỳ)
        └── next_run_date
        │
        ▼
[RecurringHostedService — Background job]
        │
        ├── Chạy mỗi 24h, delay đến nửa đêm
        ├── Dùng IServiceScopeFactory (Scoped services)
        │
        ▼
[ProcessDueRecurringsAsync]
        │
        ├── Query: WHERE NextRunDate <= now AND IsActive = true
        │
        └── Với mỗi recurring đến hạn:
            ├── Tạo transaction thực tế qua TransactionService
            ├── THÀNH CÔNG: ghi Instance (status="completed") + cập nhật NextRunDate
            └── THẤT BẠI: ghi Instance (status="skipped")
```

### Flow 8: Webhooks

```
[Webhook được tạo → lưu URL + trigger_type + secret]
        │
        ├── trigger_type: STORE_TRANSACTION / UPDATE_TRANSACTION / DESTROY_TRANSACTION
        ├── response: TRANSACTIONS / ACCOUNTS / NONE
        └── HMAC-SHA256 signature với whsec_ secret

[Khi transaction event → DispatchAsync]
        │
        ▼
[DeliverAsync — HTTP POST]
        │
        ├── Headers: X-BM-Signature, X-BM-Trigger, X-BM-Webhook-Id
        ├── Body: JSON payload
        ├── Timeout: 10 giây
        │
        ├── THÀNH CÔNG: log WebhookMessage (success=true)
        └── THẤT BẠI: log WebhookMessage (success=false) — không retry
```

### Flow 9: Rules Engine

```
[Rule được tạo → Triggers (điều kiện) + Actions (hành động)]
        │
        ├── Group: nhóm rule theo chủ đề
        ├── Strict mode (AND): TẤT CẢ triggers phải match
        └── Non-strict (OR): CHỈ CẦN 1 trigger match

[12 Trigger types]
        │
        ├── description_contains / description_is
        ├── amount_more / amount_less / amount_exactly
        ├── source_account_is / destination_account_is
        ├── transaction_type (withdrawal/deposit/transfer)
        ├── tag_is / has_no_category / category_is
        └── date_after / date_before

[8 Action types]
        │
        ├── set_description / append_description
        ├── set_notes / append_notes
        ├── add_tag / remove_tag / clear_tags
        └── link_to_bill

[Test (dry-run) → POST /api/rules/{id}/test]
        ├── Duyệt 1000 transactions gần nhất
        └── Trả về matched_count + 50 mẫu

[Trigger (apply) → POST /api/rules/{id}/trigger]
        ├── Duyệt → match → apply actions
        ├── Persist via UpdateEntryAsync
        └── RecordRunAsync(ruleId, matchedCount)
```

### Flow 10: Debt Payment (Trả nợ)

```
[User có dư nợ (Liability Account with negative balance)]
        │
        ├── Vào AddTransactionModal → chọn "Chuyển khoản"
        ├── Check "Thanh toán nợ"
        │
        ▼
[Dropdown đích hiển thị các Liability Accounts có dư nợ > 0]
        │
        ├── Chọn khoản nợ cần trả
        ├── Nhập số tiền
        └── Submit
        │
        ▼
[TransactionService.CreateAsync]
        ├── Debit: Liability Account (giảm nợ: balance tăng từ âm về 0)
        └── Credit: Asset Account (giảm tiền)
```

---

## 📄 Pagination

### Backend — `PaginatedResult<T>`

**File:** `BudgetManagement/BudgetManagement.Dto/PaginatedResult.cs`

```csharp
public class PaginatedResult<T>
{
    public List<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages =>
        (int)Math.Ceiling((double)TotalCount / Math.Max(1, PageSize));
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}
```

**Các repository implement:** `CountAsync()` → `Skip().Take()` pattern.

**Endpoints hỗ trợ phân trang:**

| Endpoint | Params | Giới hạn |
|---|---|---|
| `GET /api/budgets/expense` | `page, pageSize, search, filterStatus, sortBy` | pageSize ≤ 100 |
| `GET /api/accounts` | `page, pageSize` | pageSize ≤ 100 |
| `GET /api/transactions` | `page, pageSize` | pageSize ≤ 100 |
| `GET /api/recurring` | `page, pageSize` | pageSize ≤ 100 |
| `GET /api/bills` | `page, pageSize` | pageSize ≤ 100 |

### Frontend — `PaginationBar`

```jsx
<PaginationBar
    currentPage={page}          // Trang hiện tại
    totalPages={totalPages}     // Tổng số trang
    totalCount={totalCount}     // Tổng số bản ghi
    pageSize={pageSize}         // Số bản ghi/trang
    onPageChange={(p) => ...}   // Callback đổi trang
    onPageSizeChange={(s) => ...} // Callback đổi pageSize
    pageSizeOptions={[5,10,20]} // Tùy chọn pageSize
/>
```

---

## 💡 Utility: Session-based Toast Dedup

**File:** `src/app/utils/toastOnce.jsx`

Ngăn toast trùng lặp trong cùng session. Dùng `Set` module-level (tồn tại khi chưa refresh trang).

```javascript
import { shouldShowToast } from '../../utils/toastOnce';

const toastKey = `budget-over:${b.id}`;
if (shouldShowToast(toastKey)) {
    toast.error(`"${b.name}" đã vượt hạn mức!`);
}
addNotification({ type: 'error', title: '⚠️ Vượt hạn mức...', message: `...` });
```

---

## 🔐 API Endpoints

### AuthService (Port 5134)

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/auth/signup` | Đăng ký |
| POST | `/api/auth/signin` | Đăng nhập |
| POST | `/api/auth/refresh` | Refresh token |
| GET | `/api/auth/profile` | Lấy profile |
| PUT | `/api/auth/profile` | Cập nhật profile |
| PUT | `/api/auth/change-password` | Đổi mật khẩu |

### APIService — Gateway (`localhost:5229/api/`)

#### Accounts
| Method | Path | Mô tả |
|---|---|---|
| GET | `/accounts?page=&pageSize=` | Danh sách tài khoản (phân trang) |
| GET | `/accounts/{id}` | Chi tiết tài khoản |
| GET | `/accounts/type/{typeId}` | Lọc theo loại (1=Asset, 2=Liability, ...) |
| POST | `/accounts` | Tạo tài khoản |
| PUT | `/accounts/{id}` | Cập nhật tài khoản |
| DELETE | `/accounts/{id}` | Xóa tài khoản |

#### Budgets
| Method | Path | Mô tả |
|---|---|---|
| GET | `/budgets/expense?page=&pageSize=&search=&filterStatus=&sortBy=` | DS ngân sách |
| GET | `/budgets/expense/{id}` | Chi tiết ngân sách |
| POST | `/budgets/expense` | Tạo ngân sách |
| PUT | `/budgets/expense/{id}` | Cập nhật ngân sách |
| DELETE | `/budgets/{id}` | Xóa ngân sách |
| GET | `/budgets/savings` | DS ống heo |
| GET | `/budgets/savings/{id}` | Chi tiết ống heo |
| POST | `/budgets/savings` | Tạo ống heo |
| PUT | `/budgets/savings/{id}` | Cập nhật ống heo |
| POST | `/budgets/savings/{id}/add` | Nạp tiền |
| POST | `/budgets/savings/{id}/remove` | Rút tiền |
| POST | `/budgets/savings/{id}/reset` | Reset lịch sử |
| GET | `/budgets/savings/{id}/events` | Lịch sử giao dịch |

#### Transactions
| Method | Path | Mô tả |
|---|---|---|
| GET | `/transactions?page=&pageSize=` | DS giao dịch |
| GET | `/transactions/{id}` | Chi tiết |
| POST | `/transactions` | Tạo giao dịch |
| PUT | `/transactions/{id}` | Cập nhật |
| DELETE | `/transactions/{id}` | Xóa |
| GET | `/transactions/range?from=&to=` | Theo khoảng ngày |
| GET | `/transactions/range/account?accountId=&from=&to=` | Theo khoảng ngày + tài khoản |
| GET | `/transactions/cashflow?from=&to=` | Dòng tiền |

#### Dashboard
| Method | Path | Mô tả |
|---|---|---|
| GET | `/dashboard/summary` | Tổng quan |
| GET | `/dashboard/recent?count=` | Giao dịch gần đây |

#### Bills, Currencies, Exchange Rates, Rules, Webhooks, Recurring, Search, Export, Insights
| Method | Path | Mô tả |
|---|---|---|
| CRUD | `/bills/**` | Hóa đơn định kỳ |
| CRUD | `/currencies/**` | Tiền tệ |
| CRUD | `/exchange-rates/**` | Tỷ giá |
| CRUD | `/rules/**` + `/rule-groups/**` | Rules Engine |
| CRUD | `/webhooks/**` | Webhooks |
| CRUD | `/recurring/**` | Giao dịch định kỳ |
| GET | `/search/**` | Tìm kiếm |
| GET | `/export/**` | Export dữ liệu |
| GET | `/insights/**` | Thống kê chi tiêu |

---

## 🧪 Unit Tests (321 tests — all pass)

| Test class | Tests | Coverage |
|---|---|---|
| AuthServiceTests | 17 | Register, Login, Refresh, Profile, ChangePassword |
| BudgetServiceTests | 18 | CRUD budgets + savings, validation, ownership |
| TransactionServiceTests | 26 | CRUD, category lookup, cash flow, budget update |
| AccountServiceTests | ~20 | CRUD, pagination, balance, by-type filter |
| DashboardServiceTests | 8 | Summary aggregation, recent transactions |
| InsightServiceTests | 16 | Spending insights, trends |
| SearchServiceTests | 18 | Multi-field search |
| BillServiceTests | 14 | CRUD, recurring logic |
| CurrencyServiceTests | 20 | CRUD, primary currency |
| ExchangeRateServiceTests | 19 | Rate management, sync |
| RecurringServiceTests | 16 | Processing, instance tracking |
| WebhookServiceTests | ~15 | Dispatch, delivery, messages |
| AttachmentServiceTests | 3 | CRUD |
| RuleServiceTests | 20 | Matching, actions, groups, test/trigger |
| ExportServiceTests | 19 | CSV/JSON/Excel formats |
| PasswordStrengthValidatorTests | 14 | All password rules |
| PaginatedResultTests | 10 | Computed fields |
| AccountControllerTests | 11 | Controller validation, binding |

---

## 🔧 Danh sách Bug đã fix

| # | File | Vấn đề | Fix |
|---|---|---|---|
| 1 | CategoriesContext.jsx | `if (user) return;` sai logic | Đổi thành `if (!user) return;` |
| 2 | TransactionService.cs | Auto-create Account khi tạo giao dịch | FindByUserAndNameAsync + throw error |
| 3 | EditBudgetModal.jsx | Thiếu icon/color picker | Thêm 19 icons + 10 colors + live preview |
| 4 | CategoriesContext.jsx | Gộp nhầm Liabilities vào Expense | Bỏ `liabilityRes` filter |
| 5 | BudgetService.cs | Constant sai vị trí | Chuyển `TypeExpenseAccount` lên đầu class |
| 6 | Budgetdtos.cs | Thiếu validation attributes | Thêm `[Required]`, `[Range]` |
| 7 | ExportService.cs | Thiếu PiggyBankEvents trong export | Thêm Include + events_count, net_deposited |
| 8 | AuthService.cs | Magic string "Initial" | Extract thành constant |
| 9 | AddBudgetModal.jsx | Filter còn typeId=2 (Liabilities) | Bỏ `|| c.typeId === 2` |
| 10 | Dashboard.jsx | Thiếu `useState` cho piggyBanks | Thêm `const [piggyBanks, setPiggyBanks] = useState([])` |
| 11 | BudgetDetail.jsx | Date range giới hạn tới hôm nay, bỏ sót transactions | Mở rộng `to` date + dùng `getByRangeAndAccount` API |
| 12 | AddTransactionModal.jsx | Debt payment không hiển thị liability accounts | Sửa dropdown đích hiển thị liabilities khi check "Thanh toán nợ" |
| 13 | QuickTransferModal.jsx | Debt payment không hiển thị liability accounts | Sửa dropdown đích hiển thị liabilities khi check "Thanh toán nợ" |
| 14 | Budgets.jsx, BudgetDetail.jsx | Toast lặp lại mỗi lần load trang | Thêm session-based dedup (`shouldShowToast`) |
| 15 | Subscriptions.jsx, SubscriptionDetail.jsx | Toast lặp lại | Thêm session-based dedup |
| 16 | Accounts DB | Account balances stale (không phản ánh journal entries) | Recalculate: `balance = initial_balance + SUM(debits) - SUM(credits)` |
| 17 | AccountFormModal.jsx | Thiếu subtype grid cho Nợ, Thu nhập, Chi tiêu | Thêm subtype grids (4 loại: Asset/Liability/Revenue/Expense) |

---

## 📊 Dữ liệu User QuocAnh (user_id=2)

| Entity | Số lượng |
|---|---|
| Accounts | 19 (Assets: 5, Liabilities: 2, Equity: 1, Revenue: 4, Expense: 7) |
| Budgets | 21 (Expense: 18, Savings: 3) |
| Journal Entries | 66 (trải đều tháng 1→6/2026 — đủ test pagination) |
| Bills | 18 |
| Recurring Journals | 12 |
| Currencies | 4 (VND, USD, EUR, JPY) |
| Exchange Rates | 6 |
| Rules | 7 (+2 Rule Groups) |
| Webhooks | 2 |
| Piggy Bank Events | 21 (lịch sử nạp tiết kiệm 6 tháng) |

**Net Worth:** ~51.78M₫ (Assets: 119.78M + Equity: 25M - Liabilities: 93M)

---

## 🛠️ Công nghệ sử dụng

| Layer | Công nghệ |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS 4, Recharts, Lucide Icons, Sonner (toast), date-fns, Axios, shadcn/ui (Radix UI) |
| **Backend** | .NET 8, ASP.NET Core, Entity Framework Core, Ocelot (API Gateway), BCrypt |
| **Database** | SQL Server 2022 (LocalDB/Container) |
| **Auth** | JWT (access 5h + refresh 2 ngày), BCrypt |
| **Testing** | xUnit, Moq, FluentAssertions |
| **Proxy** | `127.0.0.1:1434` (SQL Server) |

### Frontend Dependencies chính

| Package | Phiên bản | Mục đích |
|---|---|---|
| react-router-dom | ^7.14.2 | Routing |
| recharts | 2.15.2 | Biểu đồ |
| lucide-react | 0.487.0 | Icons |
| sonner | 2.0.3 | Toast notifications |
| date-fns | 3.6.0 | Date formatting |
| axios | ^1.16.0 | HTTP client |
| next-themes | 0.4.6 | Dark/Light mode |
| tailwind-merge | 3.2.0 | Class merge |

---
