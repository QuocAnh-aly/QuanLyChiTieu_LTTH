# Quản Lý Chi Tiêu (Personal Finance Management) — Project Analysis

> **Generated for AI Agent onboarding**  
> Date: May 29, 2026  
> Tech Stack: .NET (C#) microservices backend + React (Vite) frontend

---

## 1. Project Overview

A full-stack personal finance management application that allows users to:

- Manage accounts (assets, expenses, revenue, liabilities)
- Record transactions (deposits, withdrawals, transfers)
- Set and track budgets
- Manage bills/subscriptions
- Track savings goals (piggy banks)
- Automate recurring transactions
- View dashboards and reports
- Export financial data
- Manage categories, tags, and object groups
- Configure system settings, currencies, exchange rates, OAuth tokens

### Repository Structure

```
QuanLyChiTieu_LTTH/
├── BudgetManagement/              # .NET Backend (solution)
│   ├── BudgetManagement.slnx
│   ├── BudgetManagement.APIGateway/    # Ocelot API Gateway (port 5229)
│   ├── BudgetManagement.APIService/    # Main API (port 5133)
│   ├── BudgetManagement.AuthService/   # Authentication API (port 5134)
│   ├── BudgetManagement.LogService/    # Logging API (unused scaffolding)
│   ├── BudgetManagement.Entities/      # EF Core entity models
│   ├── BudgetManagement.Dto/           # Data Transfer Objects
│   ├── BudgetManagement.Services/      # Business logic layer
│   ├── BudgetManagement.Repository/    # Data access layer (EF Core DbContext)
│   └── BudgetManagement.Common/        # Shared utilities
├── src/                            # Frontend (React + Vite)
│   ├── main.jsx                   # App entry point
│   ├── app/
│   │   ├── App.jsx                # Root component with Router
│   │   ├── routes.jsx             # Route definitions
│   │   ├── api/                   # Axios-based API modules
│   │   ├── context/               # React contexts (Auth, Settings, Categories)
│   │   ├── components/
│   │   │   ├── layout/            # Layout, ProtectedRoute
│   │   │   ├── modals/            # Form modals (add/edit)
│   │   │   ├── pages/             # Older page components (legacy)
│   │   │   ├── ui/                # shadcn/ui components
│   │   │   └── figma/             # Image utilities
│   │   └── pages/                 # Route-based page components
│   └── styles/                    # CSS files (globals, theme, tailwind)
├── csdl_sqlserver.sql             # SQL Server database schema
├── package.json                   # Frontend dependencies & scripts
├── vite.config.ts                 # Vite configuration
├── postcss.config.mjs
├── index.html
├── run.sh                         # Start all services (single script)
├── kill.sh                        # Stop all services
├── PROJECT_ANALYSIS.md            # This file
├── IMPROVEMENTS.md                # Known issues & improvement roadmap
├── default_shadcn_theme.css
├── guidelines/Guidelines.md       # Project coding guidelines
├── README.md
└── ATTRIBUTIONS.md
```

---

## 2. Backend Architecture (.NET Microservices)

### 2.1 Solution Structure

The backend is a .NET solution split into **5 projects** communicating through an API Gateway:

| Service | Project | Port (dev) | Purpose |
|---------|---------|-----------|---------|
| API Gateway | `BudgetManagement.APIGateway` | **5229** | Ocelot-based routing gateway |
| Main API | `BudgetManagement.APIService` | **5133** | Core business logic & CRUD |
| Auth API | `BudgetManagement.AuthService` | **5134** | User authentication & JWT |
| Log API | `BudgetManagement.LogService` | (unused) | Activity logging (scaffolding only) |
| *(Common)* | `BudgetManagement.Common` | — | Utility classes (validation, helpers) |

> **Port note**: The original scaffolding used ports 5000-5004, but the actual `launchSettings.json` files now use **5229, 5133, 5134**. The frontend's `axiosClient.js` points to `http://localhost:5229` (gateway).

### 2.2 API Gateway (`ocelot.json`)

Routes incoming requests to the appropriate downstream service:

| Upstream Route | Downstream | Port | Purpose |
|---------------|-----------|------|---------|
| `/api/auth/{everything}` | `localhost:5134` | Auth Service | Login, signup, refresh, profile |
| `/api/{everything}` | `localhost:5133` | API Service | Business CRUD |

The auth route is listed **first** so Ocelot's first-match-wins routing correctly sends auth requests to the AuthService rather than the APIService.

**CORS**: Configured to allow all origins, methods, and headers.

### 2.3 Entity Models (`BudgetManagement.Entities`)

All entities use `int` primary keys with auto-increment (`IDENTITY(1,1)`).

| Entity | Table (SQL) | Key Fields |
|--------|------------|------------|
| **User** | `Users` | UserId, UserAccount, PasswordHash, UserName, Email, AvatarInitials, Theme, Currency, NotifyEmail/Push/Sms, CreatedAt |
| **Account** | `Accounts` | AccountId, UserId (FK), TypeId (FK→AccountTypes), Name, Balance, IconName, Color, IsDefault |
| **AccountType** | `AccountTypes` | AccountTypeId, Name |
| **JournalEntry** | `JournalEntries` | JournalId, UserId (FK), TransactionDate, Description, ReferenceNumber |
| **JournalDetail** | `JournalDetails` | DetailId, JournalId (FK), AccountId (FK), DebitAmount, CreditAmount, Description |
| **Budget** | `Budgets` | BudgetId, UserId (FK), Type (expense/savings), Name, Amount, SpentAmount, StartDate, EndDate, Description |
| **Bill** | `Bills` | BillId, UserId (FK), Name, Amount, DueDate, IsPaid, PaidDate, Description, RecurringJournalId (FK→RecurringJournals) |
| **RecurringJournal** | `RecurringJournals` | RecurringJournalId, UserId (FK), Name, Amount, Description, StartDate, EndDate, IntervalDays, NextRunDate, IsActive, Status, AccountId (FK) |
| **RecurringInstance** | `RecurringInstances` | InstanceId, RecurringJournalId (FK), JournalEntryId (FK), ScheduledDate, ProcessedDate, Status |
| **PiggyBankEvent** | `PiggyBankEvents` | EventId, UserId (FK), Name, TargetAmount, CurrentAmount, TargetDate, IsCompleted, IconName, Color |

**Relationships:**
- `User 1→* Account`, `User 1→* JournalEntry`, `User 1→* Budget`, `User 1→* Bill`, `User 1→* RecurringJournal`, `User 1→* PiggyBankEvent`
- `AccountType 1→* Account`
- `Account 1→* JournalDetail` (debit/credit)
- `JournalEntry 1→* JournalDetail`
- `RecurringJournal 1→* RecurringInstance`
- `RecurringJournal 1→* Bill`

### 2.4 Data Transfer Objects (`BudgetManagement.Dto`)

| DTO Namespace | Key Classes | Validation |
|--------------|-------------|-----------|
| **Auth** | `RegisterRequestDto`, `LoginRequestDto`, `RefreshTokenRequestDto`, `ChangePasswordDto`, `UpdateProfileDto`, `AuthResponseDto`, `UserProfileDto` | ✅ `[Required]`, `[StringLength]`, `[EmailAddress]`, `[RegularExpression]` on all request DTOs |
| **Account** | `AccountDto`, `CreateAccountDto`, `UpdateAccountDto` | — |
| **Transaction** | `CreateJournalDto`, `JournalDto`, `JournalDetailDto`, `OrderDto` | — |
| **Budget** | `BudgetDto`, `CreateBudgetDto`, `UpdateBudgetDto` | — |
| **Bill** | `BillDto`, `CreateBillDto`, `UpdateBillDto`, `BillPaymentDto` | — |
| **Recurring** | `RecurringJournalDto`, `CreateRecurringJournalDto`, `UpdateRecurringJournalDto` | — |
| **Dashboard** | `DashboardSummaryDto`, `MonthlyReportDto`, `AccountBalanceDto` | — |

**Auth DTOs have data annotation validation:**
- `RegisterRequestDto.Account`: `[Required]`, `[StringLength(3–50)]`, `[Regex: alphanumeric + . _ @ -]`
- `RegisterRequestDto.Password`: `[Required]`, `[StringLength(8–128)]`
- `RegisterRequestDto.Email`: `[EmailAddress]`, `[StringLength(max 200)]`
- `LoginRequestDto.Account/Password`: `[Required]`
- `ChangePasswordDto.OldPassword`: `[Required]`; `NewPassword`: `[Required]`, `[StringLength(8–128)]`
- `RefreshTokenRequestDto.RefreshToken`: `[Required]`

### 2.5 Service Layer (`BudgetManagement.Services`)

**Interfaces > Implementations pattern:**

| Service Interface | Implementation | Key Methods |
|------------------|---------------|-------------|
| `IAuthService` | `AuthService` | RegisterAsync, LoginAsync, RefreshTokenAsync, GetProfileAsync, UpdateProfileAsync, ChangePasswordAsync |
| `IAccountService` | `AccountService` | GetAccountsByUserAsync, GetByIdAsync, CreateAsync, UpdateAsync, DeleteAsync |
| `ITransactionService` | `TransactionService` | GetJournalsAsync, GetByIdAsync, CreateJournalAsync, DeleteAsync |
| `IBudgetService` | `BudgetService` | GetExpenseBudgetsAsync, GetExpenseBudgetByIdAsync, CreateExpenseBudgetAsync, UpdateExpenseBudgetAsync, DeleteExpenseBudgetAsync, GetSavingsGoalsAsync (same for savings) |
| `IBillService` | `BillService` | GetBillsAsync, GetByIdAsync, CreateAsync, UpdateAsync, DeleteAsync |
| `IRecurringService` | `RecurringService` | GetRecurringsAsync, GetByIdAsync, CreateAsync, UpdateAsync, DeleteAsync, ToggleActiveAsync |
| `IDashboardService` | `DashboardService` | GetSummaryAsync, GetRecentTransactionsAsync, GetAccountBalancesAsync, GetMonthlyReportAsync |

**Password strength validation** (`AuthService`):
- Uses `PasswordStrengthValidator` from `BudgetManagement.Common` on `RegisterAsync()` and `ChangePasswordAsync()`
- Validates: 8–128 chars, at least 1 lowercase, 1 uppercase, 1 digit, 1 special character
- Throws `ArgumentException` for weak passwords → mapped to 400 BadRequest by controller

### 2.6 Repository Layer (`BudgetManagement.Repository`)

**Interfaces > Implementations pattern with a generic `BaseRepository<T>`:**

| Repository | Entity | Notes |
|-----------|--------|-------|
| `IBaseRepository<T>` | Generic | CRUD operations |
| `IUserRepository` | User | ExistsAsync, GetByAccountAsync, GetByIdAsync |
| `IAccountRepository` | Account | CRUD by user |
| `IJournalRepository` | JournalEntry | GetByUserIdAsync, GetByDateRangeAsync, GetWithDetailsAsync |
| `IBudgetRepository` | Budget | GetExpenseBudgetsAsync, GetSavingsGoalsAsync |
| `IBillRepository` | Bill | GetBillsAsync |
| `IRecurringRepository` | RecurringJournal | GetRecurringsAsync, GetDueRecurringsAsync |

**DbContext (`BudgetManagementDbContext`):**
- Uses EF Core with SQL Server
- Configures entity relationships via Fluent API (`OnModelCreating`)
- Connection string from `appsettings.json` (`Data Source=(localdb)\MSSQLLocalDB;...`)

### 2.7 Controllers

#### API Service Controllers (`BudgetManagement.APIService.Controllers`)

| Controller | Base Route | Key Endpoints |
|-----------|-----------|--------------|
| `BaseController` | — | Base class with `GetUserId()` from JWT claims |
| `AccountController` | `api/account` | CRUD |
| `TransactionController` | `api/transaction` | CRUD + `get-by-user`, `get-by-date-range` |
| `BudgetController` | `api/budget` | CRUD expense budgets + savings goals |
| `BillController` | `api/bill` | CRUD |
| `RecurringController` | `api/recurring` | CRUD + `toggle-active` |
| `DashboardController` | `api/dashboard` | `summary`, `recent-transactions`, `account-balances`, `monthly-report` |

#### Auth Service Controllers (`BudgetManagement.AuthService.Controllers`)

| Controller | Base Route | Key Endpoints | Auth |
|-----------|-----------|--------------|------|
| `BaseController` | — | Base class with `GetUserId()` | — |
| `AuthController` | `api/auth` | `POST signup`, `POST signin`, `POST refresh`, `GET profile`, `PUT profile`, `PUT password` | Mixed |

**AuthController exception handling:**
| Exception | HTTP Status | Scenario |
|-----------|------------|----------|
| `InvalidOperationException` | 409 Conflict | Duplicate username on signup |
| `ArgumentException` | 400 BadRequest | Weak password on signup/password change |
| `UnauthorizedAccessException` | 401 Unauthorized | Invalid credentials on signin, bad refresh token |
| `KeyNotFoundException` | 500 (unhandled) | User not found (shouldn't happen in normal flow) |

### 2.8 Background Service

`RecurringHostedService` — A `BackgroundService` that runs every 60 seconds and calls `IRecurringService.ProcessDueRecurringsAsync()` to generate journal entries for due recurring transactions.

---

## 3. Frontend Architecture (React + Vite)

### 3.1 Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **Vite 5** | Build tool & dev server |
| **React Router DOM v6** | Client-side routing |
| **Axios** | HTTP client for API calls |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Component library (Radix-based) |
| **Recharts** | Charts (Dashboard) |
| **React Hook Form + Zod** | Form validation |
| **Sonner** | Toast notifications |
| **date-fns** | Date formatting |
| **Lucide React** | Icons |
| **re-resizable** & **vaul** | UI utilities |
| **TanStack Table** (@tanstack/react-table) | Data tables |
| **TanStack Virtual** | Virtualized lists |

### 3.2 Entry & Routing

**`src/main.jsx`** — Mounts `<App />` to DOM.

**`src/app/App.jsx`** — Wraps everything with contexts and router:
```
Providers: AuthProvider → SettingsProvider → CategoriesProvider
  └── Router → Routes
```

**`src/app/routes.jsx`** — Defines all routes (see section 4).

### 3.3 Context Providers

| Context | File | Purpose |
|---------|------|---------|
| **AuthContext** | `AuthContext.jsx` | Manages user login state, JWT token in localStorage, user info, login/register/logout functions, auto token refresh on session restore |
| **SettingsContext** | `SettingsContext.jsx` | App-wide settings (currency, language, theme, date format) |
| **CategoriesContext** | `CategoriesContext.jsx` | Manages transaction categories with fetch/CRUD |

**AuthContext details:**
- `login(credentials)` → calls `authApi.login()`, stores tokens, fetches profile
- `register(userData)` → calls `authApi.register()`, stores tokens, fetches profile
- `logout` → clears tokens from localStorage, sets user to `null` (stable `useCallback`)
- `restoreSession` → on mount, tries profile fetch; if 401, attempts token refresh; on failure, logs out
- Listens for `auth:logout` custom event dispatched by axios 401 interceptor
- Exposes: `{ user, loading, login, register, logout }`

### 3.4 API Layer (`src/app/api/`)

All API modules use a shared `axiosClient` instance configured with:

- **Base URL**: `http://localhost:5229` (API Gateway)
- **Request interceptor**: Attaches JWT Bearer token from localStorage to all requests except `/signin` and `/signup`
- **Response interceptor**: Unwraps `response.data`, **auto-refreshes tokens on 401** with request queuing (prevents multiple simultaneous refresh calls)
- On refresh failure: clears credentials and dispatches `auth:logout` event

| API Module | Endpoints |
|-----------|-----------|
| `authApi.js` | `POST /api/auth/signin`, `POST /api/auth/signup`, `POST /api/auth/refresh`, `GET /api/auth/profile`, `PUT /api/auth/profile`, `PUT /api/auth/password` |
| `accountApi.js` | CRUD `/api/account` |
| `transactionApi.js` | CRUD `/api/transaction` + `get-by-user`, `get-by-date-range` |
| `budgetApi.js` | CRUD `/api/budget` expense + savings |
| `billApi.js` | CRUD `/api/bill` |
| `recurringApi.js` | CRUD `/api/recurring` + `toggle-active` |
| `dashboardApi.js` | `summary`, `recent-transactions`, `account-balances`, `monthly-report` |
| `walletApi.js` | CRUD `/api/account` (wallet-specific operations) |
| `piggyBankApi.js` | CRUD `/api/piggybank` events |

### 3.5 UI Components (`src/app/components/ui/`)

Large library of shadcn/ui-styled components organized by category:

| Category | Components |
|----------|-----------|
| **inputs/** | Button, Input, Label, Textarea, Checkbox, RadioGroup, Select, Switch, Slider, Toggle, ToggleGroup, InputOTP, Form |
| **overlays/** | Dialog, Sheet, Drawer, Popover, Tooltip, Command, ContextMenu, HoverCard, AlertDialog, DropdownMenu |
| **navigation/** | Sidebar, Tabs, Pagination, NavigationMenu, Menubar, Breadcrumb |
| **data/** | Table, Calendar, Carousel, Accordion, Avatar, Chart |
| **layout/** | Card, Separator, ScrollArea, Resizable, AspectRatio, Collapsible |
| **feedback/** | Alert, Badge, Skeleton, Progress, Sonner (toasts) |
| **utils/** | `utils.ts` (cn() helper), `use-mobile.ts` (responsive hook) |

### 3.6 Page Structure — Two Layers

The frontend has **two overlapping page layers**:

#### A. Modern Pages (`src/app/pages/`) — Active route-based pages

These are the currently routed pages following a clean directory structure:

| Route Path | Page Component | Features |
|-----------|---------------|----------|
| `/auth/login` | `Login.jsx` | Email/password login form |
| `/dashboard` | `Dashboard.jsx` | Summary cards, charts, recent transactions |
| `/accounting/transactions` | `Transactions.jsx` | Transaction list with filters |
| `/accounting/deposit` | `Deposit.jsx` | Deposit transaction form |
| `/accounting/withdrawal` | `Withdrawal.jsx` | Withdrawal transaction form |
| `/accounting/transfers` | `Transfers.jsx` | Transfer between accounts form |
| `/accounting/automation/recurrences` | `Recurrences.jsx` | Manage recurring transactions |
| `/accounting/automation/rules` | `Rules.jsx` | Automation rules |
| `/accounting/automation/webhooks` | `Webhooks.jsx` | Webhook management |
| `/others/classification/categories` | `Categories.jsx` | Category CRUD |
| `/others/classification/object-groups` | `ObjectGroups.jsx` | Object group management |
| `/others/classification/tags` | `Tags.jsx` | Tag management |
| `/others/accounts/asset-accounts` | `AssetAccounts.jsx` | Asset account management |
| `/others/accounts/expense-accounts` | `ExpenseAccounts.jsx` | Expense account management |
| `/others/accounts/revenue-accounts` | `RevenueAccounts.jsx` | Revenue account management |
| `/others/accounts/liabilities` | `Liabilities.jsx` | Liability account management |
| `/others/reports` | `Reports.jsx` | Financial reports |
| `/others/export-data` | `ExportData.jsx` | Data export functionality |
| `/options/profile` | `Profile.jsx` | User profile settings |
| `/options/preferences` | `Preferences.jsx` | App preferences |
| `/options/currencies` | `Currencies.jsx` | Currency management |
| `/options/exchange-rates` | `ExchangeRates.jsx` | Exchange rate management |
| `/options/administrations` | `Administrations.jsx` | Admin panel |
| `/options/system-settings` | `SystemSettings.jsx` | System configuration |
| `/options/oauth-tokens` | `OAuthTokens.jsx` | OAuth token management |
| `/financial-control/budgets` | `Budgets.jsx` | Budget overview & management |
| `/financial-control/piggy-banks` | `PiggyBanks.jsx` | Savings goals list |
| `/financial-control/subscriptions` | `Subscriptions.jsx` | Subscription management |
| `/financial-control/piggy-banks/:id` | `PiggyBankDetail.jsx` | Single piggy bank detail |
| `/financial-control/subscriptions/:id` | `SubscriptionDetail.jsx` | Single subscription detail |

#### B. Legacy Components (`src/app/components/pages/` & `src/app/components/modals/`)

Older page components that may be replaced or refactored:

| Component | Type | Purpose |
|-----------|------|---------|
| `Dashboard.jsx` | Page | Legacy dashboard |
| `Transactions.jsx` | Page | Legacy transaction list |
| `Account.jsx` | Page | Legacy account page |
| `Budget.jsx` | Page | Legacy budget page |
| `Savings.jsx` | Page | Legacy savings page |
| `Wallet.jsx` | Page | Legacy wallet page |
| `Login.jsx` | Page | Legacy login page |
| `AddTransactionModal.jsx` | Modal | Add transaction form |
| `EditTransactionModal.jsx` | Modal | Edit transaction form |
| `AddBudgetModal.jsx` | Modal | Create budget |
| `EditBudgetModal.jsx` | Modal | Edit budget |
| `AddSavingsModal.jsx` | Modal | Create savings goal |
| `EditSavingsModal.jsx` | Modal | Edit savings goal |
| `AccountFormModal.jsx` | Modal | Account CRUD form |
| `PiggyBankFormModal.jsx` | Modal | Piggy bank form |
| `SubscriptionFormModal.jsx` | Modal | Subscription form |
| `AddWalletModal.jsx` | Modal | Add wallet |
| `EditWalletModal.jsx` | Modal | Edit wallet |
| `AddMoneyModal.jsx` | Modal | Add money to account |
| `RemoveMoneyModal.jsx` | Modal | Remove money from account |
| `QuickTransferModal.jsx` | Modal | Quick transfer form |

### 3.7 Layout Components

| Component | Purpose |
|-----------|---------|
| **`Layout.jsx`** | Main app shell — sidebar navigation, header, content area |
| **`ProtectedRoute.jsx`** | Route guard — redirects to `/login` if not authenticated |

### 3.8 Styles

| File | Purpose |
|------|---------|
| `src/styles/globals.css` | Tailwind directives, CSS variables, shadcn/ui theme tokens |
| `src/styles/theme.css` | Dark mode, scrollbar, gradient backgrounds, card/element styling |
| `src/styles/tailwind.css` | Tailwind CSS imports |
| `src/styles/fonts.css` | Font face declarations |
| `src/styles/index.css` | Main CSS entry point |
| `default_shadcn_theme.css` | Default shadcn/ui theme variables |

### 3.9 Config Files

| File | Key Settings |
|------|-------------|
| `vite.config.ts` | React plugin, path aliases (`@/` → `src/`) |
| `package.json` | Scripts: `dev`, `build`, `preview`, `lint`, `format` |
| `postcss.config.mjs` | Tailwind CSS + autoprefixer |
| `index.html` | SPA shell with `<div id="root">` |

---

## 4. Database (SQL Server)

The `csdl_sqlserver.sql` file contains the complete schema matching the entities above.

Key tables: `Users`, `AccountTypes`, `Accounts`, `JournalEntries`, `JournalDetails`, `Budgets`, `Bills`, `RecurringJournals`, `RecurringInstances`, `PiggyBankEvents`.

---

## 5. Key Workflows

### 5.1 Authentication Flow
```
User → Login Page → AuthApi.login() → Gateway (5229) → AuthService (5134) POST /api/auth/signin
     → JWT token pair returned
     → Stored in localStorage (access_token, refresh_token, user_id)
     → Axios interceptor attaches Bearer token to all subsequent requests
     → Protected routes check AuthContext → Redirect if unauthenticated

On 401 response:
  → Axios interceptor catches 401, calls POST /api/auth/refresh with refresh_token
  → On success: new tokens stored, original request retried with new token
  → On failure: clears credentials, dispatches 'auth:logout' event

Session restore (page refresh):
  → AuthContext.restoreSession() reads tokens from localStorage
  → Tries GET /api/auth/profile with stored access token
  → If 401, tries token refresh, then retries profile fetch
  → If all fails, logs out silently
```

### 5.2 Registration Flow with Validation
```
User → Registration Form → AuthApi.register() → Gateway → AuthService
  → DTO-level validation: [Required], [StringLength], [EmailAddress] (automatic 400)
  → Service-layer validation: checks username uniqueness (409 Conflict)
  → Password strength check via PasswordStrengthValidator (400 BadRequest):
      - Minimum 8 characters
      - At least 1 lowercase, 1 uppercase, 1 digit, 1 special character
  → Hashes password with BCrypt
  → Creates User + 3 default accounts (Main Income, General Expense, Opening Balance)
  → Returns JWT token pair
```

### 5.3 Transaction Flow
```
User → Transaction Form (Deposit/Withdrawal/Transfer) → TransactionApi
     → Gateway (5229) → APIService (5133) → TransactionController
     → TransactionService.CreateJournalAsync()
     → JournalRepository → Creates JournalEntry + JournalDetails
     → AccountService.UpdateBalance() → Updates account balances
```

### 5.4 Recurring Transactions Flow
```
Background Service (every 60s) → RecurringService.ProcessDueRecurringsAsync()
  → RecurringRepository.GetDueRecurringsAsync()
  → For each due recurring: Create JournalEntry from template
  → Create RecurringInstance record
  → Update NextRunDate
```

### 5.5 Budget Tracking
```
User → Budget page → BudgetApi → Gateway → APIService → BudgetController
     → BudgetService → BudgetRepository
     → Tracks BudgetAmount vs SpentAmount (from JournalDetails)
```

---

## 6. Development Commands & Scripts

### Run Everything (recommended)

```bash
# Start all 4 services with log files
chmod +x run.sh
./run.sh

# Stop all services
./kill.sh

# Stop + delete log files
./kill.sh --clean

# Just list recent logs without killing
./kill.sh --logs
```

The `run.sh` script:
- Reads ports dynamically from `launchSettings.json`
- Creates `logs/` directory with timestamped per-service log files
- Adds `[YYYY-MM-DD HH:MM:SS]` timestamps to all log output
- Waits for backend health checks before showing the summary
- `Ctrl+C` stops all services cleanly

### Manual Start (individual terminals)

```bash
# Terminal 1 — API Service
cd BudgetManagement/BudgetManagement.APIService && dotnet run

# Terminal 2 — Auth Service
cd BudgetManagement/BudgetManagement.AuthService && dotnet run

# Terminal 3 — API Gateway
cd BudgetManagement/BudgetManagement.APIGateway && dotnet run

# Terminal 4 — Frontend
npm run dev
```

### Frontend Only

```bash
npm run dev       # Start Vite dev server (default port 5173)
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
```

### URLs (when running)

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| API Gateway | `http://localhost:5229` |
| API Service | `http://localhost:5133` |
| Auth Service | `http://localhost:5134` |
| API Service Swagger | `http://localhost:5133/swagger` |
| Auth Service Swagger | `http://localhost:5134/swagger` |

---

## 7. Architecture Decisions & Patterns

1. **Microservices via Ocelot Gateway** — Separate bounded contexts routed through a single gateway on port 5229.
2. **Repository Pattern** — Data access abstracted behind interfaces with EF Core implementation.
3. **Service Layer** — Business logic separated from controllers.
4. **DTO Pattern** — API contracts decoupled from entity models + data annotation validation on request DTOs.
5. **JWT Authentication** — Stateless auth with token pair (access + refresh) stored client-side; auto-refresh via axios interceptor with request queuing.
6. **Double-Entry Accounting** — Journal entries use debit/credit accounting principles.
7. **shadcn/ui** — Copy-paste component library (not npm dependency), all components in `src/app/components/ui/`.
8. **Password strength validation** — `PasswordStrengthValidator` in Common project; validated at both DTO (data annotations) and service layer (programmatic rules).
9. **Shell scripts for dev workflow** — `run.sh` and `kill.sh` provide a unified start/stop experience with per-service log files.

---

## 8. Notes for AI Agents

- **Always check both page layers** — The `src/app/components/pages/` directory contains legacy pages that may still be in use or pending migration to `src/app/pages/`.
- **API endpoints route through the gateway** on port 5229, not individual services.
- **Auth routes use `/api/auth/`** (not `/api/v1/auth/`), business routes use `/api/` prefix.
- **All backend controllers require authentication** via JWT (user ID extracted from claims), except signup/signin/refresh.
- **The recurring background service** runs every 60 seconds and creates journal entries automatically.
- **shadcn/ui components are local** — they can be modified directly (not from npm).
- **Forms use React Hook Form + Zod** for validation (see modals for examples).
- **Sidebar/layout is in `Layout.jsx`** — changes to navigation should modify this component.
- **Project guidelines** are documented in `guidelines/Guidelines.md`.
- **Log files** are written to `logs/` directory with timestamps; use `tail -f logs/<file>` to watch live output.
- **Known improvements** are tracked in `IMPROVEMENTS.md`.
