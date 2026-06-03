# Budget Management — Kiến trúc dự án

## 📋 Tổng quan

**Budget Management** là ứng dụng quản lý tài chính cá nhân với kiến trúc microservices backend (ASP.NET Core) + React SPA frontend.

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│   Frontend   │────▶│ API Gateway  │────▶│  APIService    │
│  (React/Vite)│     │  (Ocelot)    │     │  (Business)    │
└──────────────┘     └──────────────┘     ├────────────────┤
                                          │  AuthService   │
                                          │  LogService    │
                                          └────────────────┘
                                                │
                                          ┌────▼────┐
                                          │  SQL    │
                                          │ Server  │
                                          └─────────┘
```

---

## 🗂️ Cấu trúc thư mục

### Backend (`BudgetManagement/`)

| Project | Mô tả |
|---|---|
| `BudgetManagement.APIService` | API chính — controllers cho budget, transaction, account, v.v. |
| `BudgetManagement.AuthService` | Xác thực — register, login, refresh token |
| `BudgetManagement.APIGateway` | Gateway Ocelot — routing, aggregation |
| `BudgetManagement.Services` | Business logic layer |
| `BudgetManagement.Repository` | Data access layer (EF Core + SQL Server) |
| `BudgetManagement.Entities` | Entity models (POCO classes) |
| `BudgetManagement.Dto` | Request/Response DTOs |
| `BudgetManagement.Common` | Utilities (PasswordStrengthValidator) |
| `BudgetManagement.LogService` | Logging service |
| `BudgetManagement.Tests` | Unit tests (xUnit + Moq + FluentAssertions) |

### Frontend (`src/`)

| Thư mục | Mô tả |
|---|---|
| `src/app/pages/` | Trang (Dashboard, Budgets, Transactions, Accounts, Savings...) |
| `src/app/components/` | Component dùng chung (modals, layout, UI) |
| `src/app/context/` | React contexts (Auth, Categories, Settings, Notifications) |
| `src/app/api/` | API clients (axios) |
| `src/app/utils/` | Helpers (formatMoney) |
| `src/styles/` | CSS (Tailwind, globals, theme) |

---

## 🗄️ Database Schema

### Account_Types (reference data)

| type_id | type_name |
|---|---|
| 1 | Assets |
| 2 | Liabilities |
| 3 | Equity |
| 4 | Revenue |
| 5 | Expense |

### Users

```sql
Users (user_id, user_account, password_hash, user_name, email, theme, currency, ...)
```

### Accounts

```sql
Accounts (account_id, user_id, type_id FK→Account_Types, name, icon_name, color,
          balance, initial_balance, currency_code, is_active, created_at)
```

**Mỗi user khi đăng ký được tạo 3 account mặc định:**
- TypeId=4 (Revenue): "Thu nhập chính" — nguồn thu nhập
- TypeId=5 (Expense): "Ăn uống" — danh mục chi tiêu đầu tiên
- TypeId=3 (Equity): "Initial" — account vốn (bị ẩn khỏi UI)

### Budgets

```sql
Budgets (budget_id, user_id, account_id FK→Accounts, title, budget_type,
         target_amount, current_amount, period_type, start_date, end_date,
         icon_name, color, is_active, ...)
```

- `budget_type = 'expense'`: Ngân sách chi tiêu — `account_id` trỏ đến Expense Account (typeId=5)
- `budget_type = 'savings'`: Mục tiêu tiết kiệm (ống heo) — `account_id` trỏ đến Asset Account (typeId=1)

### Journal_Entries + Journal_Details (Double-entry accounting)

```sql
Journal_Entries  (journal_id, user_id, transaction_date, description, notes, tags, ...)
Journal_Details  (detail_id, journal_id FK, account_id FK, debit, credit)
```

**Nguyên tắc:**
1 giao dịch = 1 JournalEntry + 2 JournalDetails (1 debit, 1 credit)
- Chi tiêu: Debit → Expense Account, Credit → Asset Account
- Thu nhập: Debit → Asset Account, Credit → Revenue Account
- Chuyển khoản: Debit → Asset Account đích, Credit → Asset Account nguồn

### Bills (Hóa đơn định kỳ)

```sql
Bills (bill_id, user_id, account_id, amount, due_date, recurrence, ...)
```

### Recurring_Journals (Giao dịch định kỳ)

```sql
Recurring_Journals (recurring_id, user_id, ...)
Recurring_Instances (instance_id, recurring_id FK, ...)
```

### Exchange_Rates + Currencies

```sql
Currencies     (currency_id, user_id, code, name, symbol, is_primary)
Exchange_Rates (rate_id, user_id, from_currency, to_currency, rate)
```

### Webhooks + Webhook_Messages

```sql
Webhooks          (webhook_id, user_id, url, secret, events, ...)
Webhook_Messages  (message_id, webhook_id FK, status, payload, ...)
```

### Rules + Rule_Groups + Rule_Triggers + Rule_Actions

```sql
Rules            (rule_id, user_id, group_id FK, name, ...)
Rule_Groups      (group_id, user_id, name, ...)
Rule_Triggers    (trigger_id, rule_id FK, type, condition)
Rule_Actions     (action_id, rule_id FK, type, value)
```

### Piggy_Bank_Events (Lịch sử ống heo)

```sql
Piggy_Bank_Events (event_id, budget_id FK→Budgets, amount, event_date, notes)
```

### Attachments

```sql
Attachments (attachment_id, user_id, journal_id, file_name, file_path, ...)
```

---

## 🔄 Core Flows

### Flow 1: Tạo Budget (Expense)

```
[User clicks "Thêm ngân sách"]
        │
        ▼
[AddBudgetModal mở → form 1 cột]
        │
        ├── Chọn danh mục (Expense Account có sẵn — bắt buộc)
        ├── Nhập tên, số tiền, chu kỳ, ngày
        └── Submit
        │
        ▼
[Frontend: budgetApi.createExpenseBudget(data)]
        │  data = { accountId, title, targetAmount, periodType, startDate, ... }
        ▼
[API Gateway → APIService → BudgetController.CreateExpenseBudget]
        │
        ▼
[BudgetService.CreateExpenseBudgetAsync]
        │
        ├── Validate AccountId > 0
        ├── accountRepo.GetWithDetailsAsync(AccountId)
        │   ├── null → KeyNotFoundException
        │   ├── UserId mismatch → UnauthorizedAccessException
        │   └── TypeId != 5 → ArgumentException
        ├── Tạo Budget với AccountId từ request
        └── BudgetRepo.CreateAsync(budget)
        │
        ▼
[Response: BudgetDto với budgetId, title, targetAmount, ...]
        │
        ▼
[Frontend: refresh danh sách + toast.success("Đã thêm ngân sách!")]
```

**Lưu ý:** Theo nghiên cứu từ YNAB, EveryDollar, Money Lover — không app nào tự động tạo category mới khi tạo budget. Budget luôn gắn với category có sẵn. DB đã được thiết kế đúng (account_id FK → Accounts), code trước đây sai (auto-create Account). Đã fix.

### Flow 2: Tạo Transaction (Double-entry)

```
[User clicks "Thêm giao dịch" → AddTransactionModal]
        │
        ├── Chọn loại: Chi tiêu / Thu nhập / Chuyển khoản
        │
        ├── CHI TIÊU:
        │   ├── Chọn ví thanh toán (Asset Account) → creditAccountId
        │   ├── Chọn danh mục chi tiêu (Expense Account) → debitAccountId
        │   │   └── Hoặc "+ Danh mục mới" → expenseCategoryName (accountId=0)
        │   └── Submit
        │
        ├── THU NHẬP:
        │   ├── Chọn ví nhận (Asset Account) → debitAccountId
        │   ├── Chọn nguồn thu (Revenue Account) → creditAccountId
        │   │   └── Hoặc "+ Nguồn thu mới" → incomeCategoryName (accountId=0)
        │   └── Submit
        │
        └── CHUYỂN KHOẢN:
            ├── Chọn ví nguồn + ví đích (Asset Accounts)
            └── Submit
        │
        ▼
[Frontend → API Gateway → TransactionService.CreateAsync]
        │
        ├── Nếu accountId = 0 + categoryName:
        │   ├── FindByUserAndNameAsync(userId, typeId, name) → tìm account có sẵn
        │   ├── null → ArgumentException (KHÔNG auto-create như cũ!)
        │   └── found → dùng account đó
        │
        ├── Validate debit & credit accounts (tồn tại, thuộc user)
        ├── Tạo JournalEntry + 2 JournalDetails
        ├── Cập nhật balance (UpdateAccountBalanceAsync)
        └── Nếu debit là Expense → UpdateSpentAmountAsync → cập nhật budget
```

### Flow 3: Authentication

```
[Register]
        │
        ├── Validate username unique
        ├── Validate password strength (PasswordStrengthValidator)
        ├── Hash password (BCrypt)
        ├── Tạo User
        ├── Tạo 3 accounts mặc định:
        │   ├── Revenue: "Thu nhập chính" (typeId=4)
        │   ├── Expense: "Ăn uống" (typeId=5)
        │   └── Equity: "Initial" (typeId=3 — hidden from UI)
        └── Generate JWT (access token 5h, refresh token 2 ngày)

[Login]
        ├── Find user by account
        ├── Verify password (BCrypt)
        └── Generate JWT pair
```

### Flow 4: Cập nhật Budget (Edit)

```
[User clicks ✏️ on budget card]
        │
        ▼
[EditBudgetModal mở với dữ liệu hiện tại]
        │
        ├── Sửa: tên, số tiền, chu kỳ, ngày
        ├── Sửa: icon (19 icons), màu sắc (10 colors)
        └── Submit → gửi các field thay đổi
        │
        ▼
[budgetApi.updateExpenseBudget(id, {title?, targetAmount?, iconName?, color?, ...})]
        │
        ▼
[BudgetService.UpdateExpenseBudgetAsync]
        ├── Validate budget tồn tại, thuộc user
        └── Update từng field (null-safe: chỉ update khi != null)
```

### Flow 5: Savings Goals (Ống heo)

```
[User tạo mục tiêu tiết kiệm → CreateSavingsGoal]
        │
        ├── Chọn Asset Account đích
        ├── Nhập tên, số tiền mục tiêu, hạn, contribution hàng tháng
        └── Submit → Budget với budget_type='savings'
        │
        ▼
[Nạp tiền vào ống heo → AddMoneyAsync]
        ├── Tăng CurrentAmount
        ├── Tạo PiggyBankEvent (+amount)
        └── Clamp to TargetAmount

[Rút tiền → RemoveMoneyAsync]
        ├── Giảm CurrentAmount
        ├── Tạo PiggyBankEvent (-amount)
        └── Clamp to 0
```

### Flow 6: Export dữ liệu

```
[User chọn Export → CSV / JSON / Excel]
        │
        ▼
[ExportService]
        ├── CollectTransactionsAsync → giao dịch
        ├── CollectAccountsAsync → tài khoản
        └── CollectBudgetsAsync → ngân sách (bao gồm events_count, net_deposited từ PiggyBankEvents)
        │
        ▼
[Formatter → ToCsv / ToJson / ToXlsxSpreadsheetML]
```

### Flow 7: Recurring Journals — Giao dịch định kỳ

```
[User tạo recurring → CreateRecurringDto]
        │
        ├── Chọn tài khoản debit (nguồn) + credit (đích)
        ├── Nhập số tiền, mô tả
        ├── Frequency: daily / weekly / monthly / yearly
        ├── IntervalValue: mỗi N kỳ (vd: 2 = mỗi 2 tháng)
        └── NextRunDate: ngày chạy đầu tiên
        │
        ▼
[Lưu vào DB → RecurringJournals table]
        │
        │      ┌──────────────────────────────────────┐
        │      │  RecurringHostedService (Background) │
        │      │  - Chạy mỗi 24h, delay đến nửa đêm  │
        │      │  - Dùng IServiceScopeFactory (Scoped)│
        │      └──────────────────────────────────────┘
        │                        │
        ▼                        ▼
[Khi đến nửa đêm ← RecurringHostedService.ExecuteAsync]
        │
        ├── Gọi ProcessDueRecurringsAsync()
        │
        ▼
[RecurringService.ProcessDueRecurringsAsync]
        │
        ├── Query: RecurringRepo.GetDueAsync(now)
        │   └── WHERE NextRunDate <= now AND IsActive = true
        │
        ├── Với mỗi recurring đến hạn:
        │
        │   ├── 1. Tạo transaction thực tế:
        │   │       TransactionService.CreateAsync(
        │   │         debitAccountId, creditAccountId, amount, description
        │   │       )
        │   │
        │   │   ├── THÀNH CÔNG:
        │   │   │   ├── Ghi RecurringInstance (status="completed", journalId)
        │   │   │   ├── Tính NextRunDate = ComputeNextRunDate(
        │   │   │   │     currentDate, frequency, intervalValue)
        │   │   │   │   ├── daily   → +interval ngày
        │   │   │   │   ├── weekly  → +interval*7 ngày
        │   │   │   │   ├── monthly → +interval tháng
        │   │   │   │   └── yearly  → +interval năm
        │   │   │   └── Update recurring (NextRunDate mới)
        │   │   │
        │   │   └── THẤT BẠI:
        │   │       └── Ghi RecurringInstance (status="skipped")
        │   │           → Không dừng vòng lặp, log lỗi
        │   │
        │   └── 2. Lặp lại cho recurring tiếp theo
        │
        └── Kết thúc → chờ 24h cho lần chạy tiếp theo

[Lịch sử thực thi → RecurringInstances table]
        │
        ├── instance_id, recurring_id FK, due_date,
        │   status ("completed"|"skipped"), journal_id FK
        └── Mỗi recurring có thể xem lịch sử N lần chạy gần nhất
```

### Flow 8: Webhooks — HTTP Callbacks

```
[Webhook được tạo → lưu URL + trigger_type + secret]
        │
        ├── Trigger types: STORE_TRANSACTION / UPDATE_TRANSACTION / DESTROY_TRANSACTION
        ├── Response formats: TRANSACTIONS / ACCOUNTS / NONE
        └── Webhook nhận secret + tự động sinh HMAC-SHA256 signature

[Khi có transaction event → WebhookService.DispatchAsync]
        │
        ├── Tìm tất cả webhooks active của user có matching trigger_type
        │
        ▼
[WebhookService.DeliverAsync — gửi HTTP POST]
        │
        ├── Header: X-BM-Signature (HMAC-SHA256 của payload)
        ├── Header: X-BM-Trigger (trigger type)
        ├── Header: X-BM-Webhook-Id
        ├── Body: JSON payload (transaction data)
        ├── Timeout: 10 giây
        │
        ├── THÀNH CÔNG:
        │   ├── Log WebhookMessage (success=true, status_code=2xx)
        │   └── Lưu response_body (truncated 2000 ký tự)
        │
        └── THẤT BẠI:
            ├── Log WebhookMessage (success=false, status_code=0 hoặc 4xx/5xx)
            └── Lưu error_message — không retry (fire-and-forget)

[Manual test — POST api/webhooks/{id}/submit]
        │
        └── Gửi payload tùy chỉnh → log message → trả về WebhookMessageDto
```

### Flow 9: Rules Engine — Auto-classification

```
[Rule được tạo → gồm Triggers (điều kiện) + Actions (hành động)]
        │
        ├── Group: nhóm rule theo chủ đề (vd: "Phân loại chi tiêu")
        ├── Strict mode (AND): TẤT CẢ triggers phải match
        └── Non-strict mode (OR): CHỈ CẦN 1 trigger match

[Trigger types — 12 loại điều kiện]
        │
        ├── description_contains     : Mô tả chứa từ khóa
        ├── description_is           : Mô tả khớp chính xác
        ├── amount_more / amount_less / amount_exactly : So sánh số tiền
        ├── source_account_is        : Tài khoản nguồn (credit)
        ├── destination_account_is   : Tài khoản đích (debit)
        ├── transaction_type         : withdrawal / deposit / transfer
        ├── tag_is                   : Transaction có tag cụ thể
        ├── has_no_category          : Chưa được phân loại
        ├── category_is              : Danh mục chi tiêu cụ thể
        ├── date_after / date_before : Ngày giao dịch
        └── (strict=AND / strict=OR — evaluated theo mode)

[Action types — 8 loại hành động]
        │
        ├── set_description          : Ghi đè mô tả
        ├── append_description       : Thêm vào mô tả
        ├── set_notes                : Ghi đè ghi chú
        ├── append_notes             : Thêm vào ghi chú
        ├── add_tag                  : Thêm tag (nếu chưa có)
        ├── remove_tag               : Xóa tag (nếu có)
        ├── clear_tags               : Xóa tất cả tags
        └── link_to_bill             : Gắn vào hóa đơn (bill_id)

[Test (dry-run) — POST api/rules/{id}/test]
        │
        ├── Duyệt 1000 transaction gần nhất
        ├── Match theo triggers (AND/OR tùy strict mode)
        └── Trả về matched_count + 50 matched transactions mẫu

[Trigger (apply) — POST api/rules/{id}/trigger]
        │
        ├── Duyệt 1000 transaction gần nhất
        ├── Match → apply actions (sửa description, notes, tags, bill)
        ├── Gọi journalRepo.UpdateEntryAsync() để persist
        ├── RecordRunAsync(ruleId, matchedCount)
        └── Trả về matched_count + applied_count
```

---

## 📄 Pagination

Pagination được triển khai đồng bộ từ backend → frontend, hỗ trợ tất cả các danh sách có nhiều dữ liệu (accounts, budgets, transactions, recurring...).

### Backend — `PaginatedResult<T>`

**File:** `BudgetManagement/BudgetManagement.Dto/PaginatedResult.cs`

```csharp
public class PaginatedResult<T>
{
    public List<T> Items { get; set; } = [];          // Dữ liệu trang hiện tại
    public int TotalCount { get; set; }                // Tổng số bản ghi
    public int Page { get; set; }                      // Trang hiện tại (bắt đầu từ 1)
    public int PageSize { get; set; }                  // Số bản ghi mỗi trang
    public int TotalPages                               // Tổng số trang (computed)
        => (int)Math.Ceiling((double)TotalCount / Math.Max(1, PageSize));
    public bool HasPreviousPage => Page > 1;            // Có trang trước?
    public bool HasNextPage => Page < TotalPages;       // Có trang sau?
}
```

**Cách repository implement phân trang (ví dụ AccountRepository):**

```csharp
public async Task<PaginatedResult<Account>> GetByUserIdPagedAsync(int userId, int page, int pageSize)
{
    var query = _dbSet
        .Where(a => a.UserId == userId && a.IsActive == true)
        .Include(a => a.AccountType)
        .OrderBy(a => a.TypeId).ThenBy(a => a.Name);

    // 1. Đếm tổng số bản ghi (chạy 1 query)
    var totalCount = await query.CountAsync();

    // 2. Skip + Take để lấy đúng trang (chạy 1 query)
    var items = await query
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .ToListAsync();

    return new PaginatedResult<Account>
    {
        Items = items,
        TotalCount = totalCount,
        Page = page,
        PageSize = pageSize
    };
}
```

**Controller nhận query params và gọi service:**

```csharp
[HttpGet]
public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
{
    if (pageSize <= 0 || pageSize > 100) pageSize = 50;
    if (page <= 0) page = 1;

    var result = await _service.GetByUserPagedAsync(GetUserId(), page, pageSize);
    return Ok(result);
}
```

### Frontend — `PaginationBar`

**File:** `src/app/components/ui/navigation/PaginationBar.jsx`

| Props | Kiểu | Mô tả |
|---|---|---|
| `currentPage` | `number` | Trang hiện tại |
| `totalPages` | `number` | Tổng số trang |
| `totalCount` | `number` | Tổng số bản ghi |
| `onPageChange` | `(page: number) => void` | Callback khi đổi trang |
| `pageSize` | `number` (default 10) | Số bản ghi mỗi trang |
| `onPageSizeChange` | `(size: number) => void` | Callback khi đổi số bản ghi/trang |
| `pageSizeOptions` | `number[]` (default [5,10,20]) | Các tùy chọn số bản ghi/trang |

**Thuật toán hiển thị trang (`getVisiblePages`):**

```
[1] ... [n-1] [n] [n+1] ... [last]
```

- Luôn hiển thị trang đầu và trang cuối
- Hiển thị tối đa 3 trang xung quanh trang hiện tại
- Dùng `...` (PaginationEllipsis) khi có khoảng cách
- Khi totalPages ≤ 5: hiển thị tất cả

**Cách sử dụng trong page (ví dụ Budgets.jsx):**

```jsx
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(10);
const [totalCount, setTotalCount] = useState(0);
const [totalPages, setTotalPages] = useState(1);

// Fetch khi page/pageSize thay đổi
useEffect(() => { fetchBudgets(); }, [page, pageSize, search, filterStatus, sortBy]);

// Reset về trang 1 khi filter thay đổi
useEffect(() => { setPage(1); }, [search, filterStatus, sortBy]);

// Render
{totalPages > 1 && (
    <PaginationBar
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
    />
)}
```

### Flow dữ liệu phân trang

```
[Frontend]                            [Backend]
    │                                      │
    ├─ GET /api/budgets?page=2&pageSize=10 │
    │   ─────────────────────────────────▶  │
    │                                      ├─ Query DB với Skip(10).Take(10)
    │                                      ├─ CountAsync() tổng số
    │                                      │
    │   ◀── PaginatedResult<BudgetDto> ─── │
    │   {                                  │
    │     items: [...],                    │
    │     totalCount: 67,                  │
    │     page: 2,                         │
    │     pageSize: 10,                    │
    │     totalPages: 7,                   │
    │     hasPreviousPage: true,           │
    │     hasNextPage: true                │
    │   }                                  │
    │                                      │
    ├─ render PaginationBar                │
    │  "Hiển thị 11–20 trong 67"           │
    │  [<] [1] [...] [4] [5] [6] [...] [7]│
    │                                      │
```

### Các endpoint hỗ trợ phân trang

| Endpoint | Params | Giới hạn |
|---|---|---|
| `GET /api/budgets/expense` | `page, pageSize, search, filterStatus, sortBy` | pageSize ≤ 100 |
| `GET /api/accounts` | `page, pageSize` | pageSize ≤ 100 |
| `GET /api/transactions` | `page, pageSize` | pageSize ≤ 100 |
| `GET /api/recurring` | `page, pageSize` | pageSize ≤ 100 |
| `GET /api/bills` | `page, pageSize` | pageSize ≤ 100 |

---

## 🧪 Unit Tests (321 tests — all pass)

| Test class | Số tests | Coverage |
|---|---|---|
| AuthServiceTests | ~15 | Register, Login, Refresh, Profile, ChangePassword |
| BudgetServiceTests | ~25 | CRUD budgets + savings, validation (AccountId, type, ownership) |
| TransactionServiceTests | 26 | CRUD transactions, expense/income category lookup, cash flow |
| AccountServiceTests | ~20 | CRUD accounts, pagination, balance update |
| DashboardServiceTests | ~30 | Dashboard data aggregation, charts |
| InsightServiceTests | ~25 | Spending insights, trends |
| SearchServiceTests | ~20 | Search accounts, transactions |
| BillServiceTests | ~20 | CRUD bills, recurring logic |
| CurrencyServiceTests | ~15 | Currency CRUD, exchange rates |
| ExchangeRateServiceTests | ~15 | Exchange rate management |
| RecurringServiceTests | ~20 | Recurring journal processing |
| WebhookServiceTests | ~15 | Webhook triggering, retry |
| AttachmentServiceTests | ~15 | File upload, download |
| RuleServiceTests | ~20 | Rule matching, actions |
| ExportServiceTests | 19 | CSV/JSON/Excel export formats |
| PasswordStrengthValidatorTests | ~10 | Password validation rules |
| PaginatedResultTests | ~5 | Pagination helper |
| AccountControllerTests | ~10 | Controller binding, validation |

---

## 🔧 Danh sách Bug đã fix (10 bugs)

| # | File | Vấn đề | Mức | Trạng thái |
|---|---|---|---|---|
| **1** | `CategoriesContext.jsx:84` | `if (user) return;` → `if (!user) return;` | 🔴 | ✅ **Fixed** |
| **2** | `TransactionService.cs:62-88` | Auto-create Account khi tạo giao dịch — thay bằng FindByUserAndNameAsync + throw error | 🔴 | ✅ **Fixed** |
| **3** | `EditBudgetModal.jsx` | Thiếu icon/color picker — thêm 19 icons + 10 colors + live preview | 🟡 | ✅ **Fixed** |
| **4** | `CategoriesContext.jsx:87-92` | Gộp nhầm Liabilities (typeId=2) vào Expense categories — bỏ liabilityRes | 🟡 | ✅ **Fixed** |
| **5** | `BudgetService.cs` | `TypeExpenseAccount = 5` đặt giữa các method — chuyển lên đầu class | 🟢 | ✅ **Fixed** |
| **6** | `IBudgetService.cs` vs `Budgetservice.cs` | Parameter name: `int budgetId` vs `int accountId` | 🟢 | ✅ **Không cần fix** (Impl dùng `accountId` đúng) |
| **7** | `Budgetdtos.cs` | Thiếu `[Required]` / `[Range]` validation attributes | 🟢 | ✅ **Fixed** |
| **8** | `ExportService.cs` | `CollectBudgetsAsync` không include PiggyBankEvents — thêm Include + 2 cột events_count, net_deposited | 🟢 | ✅ **Fixed** |
| **9** | `AuthService.cs:58` | Magic string `"Initial"` — extract thành `AccountConstants.InitialEquity` | 🟢 | ✅ **Fixed** |
| **10** | `AddBudgetModal.jsx:55` | Filter còn typeId=2 (Liabilities) — bỏ `|| c.typeId === 2` | 🟢 | ✅ **Fixed** |

---

## 🔐 API Endpoints

### Gateway (`localhost:5229`)

| Method | Path | Service |
|---|---|---|
| POST | `/api/auth/register` | AuthService |
| POST | `/api/auth/login` | AuthService |
| POST | `/api/auth/refresh` | AuthService |
| GET/PUT | `/api/auth/profile` | AuthService |
| GET/POST/PUT/DELETE | `/api/budgets/**` | APIService |
| GET/POST/PUT/DELETE | `/api/transactions/**` | APIService |
| GET/POST/PUT/DELETE | `/api/accounts/**` | APIService |
| GET/POST/PUT/DELETE | `/api/currencies/**` | APIService |
| GET/POST/PUT/DELETE | `/api/bills/**` | APIService |
| GET/POST/PUT/DELETE | `/api/rules/**` | APIService |
| GET/POST/PUT/DELETE | `/api/webhooks/**` | APIService |
| GET | `/api/dashboard/**` | APIService |
| GET | `/api/insights/**` | APIService |
| GET | `/api/search/**` | APIService |
| GET | `/api/export/**` | APIService |

---

## 📊 Dữ liệu User QuocAnh (user_id=2)

| Entity | Số lượng |
|---|---|
| Accounts | 19 (Assets: 5, Liabilities: 2, Equity: 1, Revenue: 4, Expense: 7) |
| Budgets | 11 (Expense: 8, Savings: 3) |
| Journal Entries | 16 |
| Bills | 8 |
| Recurring Journals | 4 |
| Currencies | 4 (VND, USD, EUR, JPY) |
| Exchange Rates | 6 |
| Rules | 2 (+1 Rule Group) |
| Webhooks | 2 |
| Piggy Bank Events | 11 |

---

## 🛠️ Công nghệ sử dụng

| Layer | Công nghệ |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Lucide Icons, Sonner (toast) |
| Backend | .NET 8, ASP.NET Core, EF Core, Ocelot (Gateway) |
| Database | SQL Server (2022) |
| Auth | JWT (BCrypt for password) |
| Testing | xUnit, Moq, FluentAssertions |
| Proxy | 127.0.0.1:1434 (SQL Server) |
