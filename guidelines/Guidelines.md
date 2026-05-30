# Project Guidelines — Quản Lý Chi Tiêu

> Coding conventions and best practices for this project.
> Stack: .NET 10 (C#) microservices + React 18 (Vite) + SQL Server

---

## 1. General

- **Language:** Vietnamese for UI text (e.g., "Thêm giao dịch", "Đăng nhập"), English for code identifiers
- **Naming:** `snake_case` in DB, `PascalCase` in C#, `camelCase` in JS/TS/JSON
- **Imports (React):** Group by: 1) React/third-party, 2) Local components, 3) API/context, 4) Utilities
- **Async:** All async methods end with `Async` in C#

---

## 2. C# Conventions

### Controllers
- Extend `BaseController` which provides `GetUserId()` from JWT claims
- Catch specific exceptions and map to appropriate HTTP status codes:

```csharp
[HttpPost]
public async Task<IActionResult> Create([FromBody] CreateDto dto)
{
    try { return Ok(await _service.CreateAsync(GetUserId(), dto)); }
    catch (ArgumentException e) => BadRequest(new { message = e.Message });
    catch (InvalidOperationException e) => Conflict(new { message = e.Message });
    catch (KeyNotFoundException e) => NotFound(new { message = e.Message });
    catch (UnauthorizedAccessException e) => Unauthorized(new { message = e.Message });
}
```

### Services
- Inject repositories via constructor
- Throw typed exceptions: `KeyNotFoundException` (404), `UnauthorizedAccessException` (403), `InvalidOperationException` (409), `ArgumentException` (400)

```csharp
public class XxxService : IXxxService
{
    private readonly IXxxRepository _repo;
    public XxxService(IXxxRepository repo) => _repo = repo;
}
```

### Repository Pattern
- Use `BaseRepository<T>` for generic CRUD
- Create specific repositories (e.g., `UserRepository`, `JournalRepository`) for complex queries

### DTOs
- Use `[JsonPropertyName]` for JSON serialization (snake_case in JSON)
- Use data annotations: `[Required]`, `[StringLength]`, `[EmailAddress]`, `[RegularExpression]`

---

## 3. React Conventions

### Component Structure
- Functional components with hooks
- Accept `isOpen`, `onClose`, `onAdd`/`onSave` props for modals

```jsx
export function MyPage() {
  const { user } = useAuth();
  const { fmt } = useSettings();
  const { addNotification } = useNotifications();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (force) => {
    // ...
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <PageLayout title="..." subtitle="...">
      {/* Content */}
    </PageLayout>
  );
}
```

### Toast + Notification Pattern
Always use both Sonner toast AND in-app notifications together:

```jsx
try {
  await api.doSomething(data);
  toast.success('Thành công!');
  addNotification({ type: 'success', title: 'Thành công', message: '...' });
  await loadData(true);
} catch (err) {
  toast.error(err?.response?.data || 'Có lỗi xảy ra');
  addNotification({ type: 'error', title: 'Lỗi', message: err?.response?.data });
}
```

### Pages
- Use `<PageLayout>` for consistent header/filter/content structure
- Use Recharts (`<ResponsiveContainer>`, `<BarChart>`, `<PieChart>`) for charts
- Use shadcn `<Table>` for data tables

### Modals
- Use `<Dialog>` from shadcn/ui
- Common pattern: `AddXxxModal({ isOpen, onClose, onAdd })`

---

## 4. Architecture Patterns

### Frontend talks only to Gateway
- All API calls go through `http://localhost:5229` (API Gateway)
- **Never** call individual services directly from frontend
- Auth routes: `/api/auth/*`
- Business routes: `/api/*`

### State Management
- **Auth state:** AuthContext (JWT tokens in localStorage)
- **Settings/currencies:** SettingsContext (fetched from API)
- **Categories/tags:** CategoriesContext (localStorage only)
- **Notifications:** NotificationContext (localStorage)
- **Local state:** `useState` + `useCallback` + `useEffect`
- **No Redux/Zustand** — context + local state is sufficient

### Axios Client
- Base URL: `http://localhost:5229`
- JWT Bearer token attached by request interceptor (except signin/signup)
- Auto-refresh on 401 with request queuing
- Response interceptor unwraps `response.data`

---

## 5. Database

- **Column mapping:** EF Core uses automatic `snake_case` mapping (e.g., `CurrencyCode` → `currency_code`)
- **Tables with underscores:** Explicit `ToTable()` for `Account_Types`, `Journal_Entries`, `Journal_Details`, etc.
- **PKs:** All entities use `int IDENTITY(1,1)` primary keys
- **FKs:** Foreign keys use `ON DELETE CASCADE` for user-owned entities
- **Default currency:** VND (not USD)

---

## 6. Components & UI

### shadcn/ui Components
- All components are local files in `src/app/components/ui/`
- They can be modified directly (not npm packages)
- Organized by: inputs/, overlays/, navigation/, data/, layout/, feedback/

### Icons
- Use Lucide React (`import { Wallet, Target } from "lucide-react"`)
- Japanese Yen icon: `JapaneseYen` (not `Yen`)

### Currency Display
- Use `SettingsContext.fmt(n)` for formatting: `"10,000 ₫"`
- Use `SettingsContext.fmtShort(n)` for abbreviated: `"10k"`, `"1.5M"`
- Currency codes: VND, USD, EUR, JPY

---

## 7. Testing

- **Framework:** xUnit + Moq + FluentAssertions
- **Naming:** `MethodName_Scenario_ExpectedBehavior`
- **Repository mocking:** Use `Mock<IXxxRepository>` with `Setup()` and `Verify()`
- Run: `cd BudgetManagement && dotnet test BudgetManagement.Tests/BudgetManagement.Tests.csproj`

---

## 8. Git & Workflow

- **Branch naming:** `feature/xxx`, `fix/xxx`, `refactor/xxx`
- **Commit messages:** Vietnamese or English, descriptive
- **Before committing:** Run `npm run build` to verify frontend
- **Sensitive data:** `appsettings.json` with connection strings is gitignored — use `.Development.json` for overrides

---

## 9. Common Pitfalls

1. Always check `ocelot.json` before adding new API routes
2. All pages are in `src/app/pages/` — organized by feature (auth, dashboard, accounting, financial-control, etc.)
3. DbContext uses snake_case — EF queries use PascalCase but SQL columns are snake_case
4. Gateway port is 5229, not 5133 or 5134
5. Notification system is **separate** from Sonner toasts
6. Recurring background service runs every 60 seconds
7. shadcn/ui components are local files — can be modified directly
8. Default currency is VND, not USD
