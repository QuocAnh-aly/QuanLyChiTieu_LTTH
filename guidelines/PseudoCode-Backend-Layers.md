# Giả mã (Pseudocode) các tầng Backend — Budget Management

> Tài liệu tổng hợp mã giả của các tầng Controller → Service → Repository (và lớp Common).
> Quy ước chung:
> - `GetUserId()` lấy userId từ JWT (claim NameIdentifier) trong `BaseController`.
> - Mọi truy vấn theo `id` đều kiểm tra `entity.UserId == userId`; sai → `UnauthorizedAccessException` (controller map → 403/Forbid).
> - Repository dùng EF Core (LINQ → SQL); `Include` nạp kèm navigation; `ExecuteUpdate/ExecuteDelete` ghi thẳng DB (không load entity).
> - Bút toán kép (double-entry): mỗi giao dịch tạo 1 `JournalEntry` + 2 `JournalDetail` (Debit / Credit).

## AccountController
CONTROLLER AccountController  (route: "api/accounts", yêu cầu [Authorize])
  phụ thuộc: accountService, transactionService
  helper: GetUserId()  → lấy userId từ token

  ──────────────────────────────────────────────
  GetAll(page=1, pageSize=50) : accounts[]        // GET api/accounts
  ──────────────────────────────────────────────
    // Trong code thật GetAll == GetAllPaged (luôn phân trang)
    NẾU pageSize <= 0 HOẶC pageSize > 100  THÌ pageSize = 50
    NẾU page <= 0                          THÌ page = 1
    result = accountService.GetAllPagedAsync(GetUserId(), page, pageSize)
    TRẢ VỀ 200 OK(result)        // { items[], page, pageSize, total... }

  ──────────────────────────────────────────────
  GetAllPaged(page, pageSize) : accounts[]
  ──────────────────────────────────────────────
    // Không tồn tại riêng — chính là GetAll ở trên gọi GetAllPagedAsync.
    // (Service GetAllPagedAsync mới là nơi thực hiện skip/take + đếm total)

  ──────────────────────────────────────────────
  GetByType(typeId, page=1, pageSize=50) : accounts[]   // GET api/accounts/type/{typeId}
  ──────────────────────────────────────────────
    chuẩn hoá pageSize (<=0 hoặc >100 → 50)
    chuẩn hoá page (<=0 → 1)
    result = accountService.GetByTypePagedAsync(GetUserId(), typeId, page, pageSize)
    TRẢ VỀ 200 OK(result)        // lọc theo loại TK (1=Asset, 2=Liability...)

  ──────────────────────────────────────────────
  Create(dto: CreateAccountDto) : account          // POST api/accounts
  ──────────────────────────────────────────────
    NẾU dto.SourceAccountId có giá trị THÌ      // tạo TK kèm chuyển tiền
        amount = |dto.Balance ?? 0|
        NẾU amount <= 0  TRẢ VỀ 400 BadRequest("Số tiền không hợp lệ...")

        lưu sourceAccId, typeId, name
        dto.Balance = 0                          // transaction sẽ cập nhật số dư
        NẾU typeId == 2 (Liability) THÌ dto.InitialBalance = -amount

        result = accountService.CreateAsync(GetUserId(), dto)

        NẾU typeId == 2 (Liability) THÌ          // gán nợ
            transactionService.CreateAsync(
                Debit = sourceAccId, Credit = result.AccountId,
                Amount = amount, Desc = "Gán nợ: {name}")
        NGƯỢC LẠI (Asset) THÌ                    // rút từ nguồn tạo TK mới
            transactionService.CreateAsync(
                Debit = result.AccountId, Credit = sourceAccId,
                Amount = amount, Desc = "Tạo tài khoản từ {name}")

        TRẢ VỀ 201 CreatedAtAction(GetById, id=result.AccountId, result)

    // Trường hợp thường: không có nguồn tiền
    account = accountService.CreateAsync(GetUserId(), dto)
    TRẢ VỀ 201 CreatedAtAction(GetById, id=account.AccountId, account)

  ──────────────────────────────────────────────
  Update(id, dto: UpdateAccountDto) : account      // PUT api/accounts/{id}
  ──────────────────────────────────────────────
    THỬ
        result = accountService.UpdateAsync(GetUserId(), id, dto)
        TRẢ VỀ 200 OK(result)
    BẮT KeyNotFoundException        → 404 NotFound(message)
    BẮT UnauthorizedAccessException → 403 (message)

  ──────────────────────────────────────────────
  Delete(id, transferToAccountId?, force=false) : bool   // DELETE api/accounts/{id}
  ──────────────────────────────────────────────
    THỬ
        accountService.DeleteAsync(GetUserId(), id, transferToAccountId, force)
        TRẢ VỀ 204 NoContent              // ~ true (thành công, không body)
    BẮT KeyNotFoundException        → 404 NotFound(message)
    BẮT UnauthorizedAccessException → 403 (message)
    BẮT InvalidOperationException   → 400 BadRequest(message)
    BẮT DbUpdateException THÌ
        msg = inner.Message ?? message
        NẾU msg chứa "FK"/"REFERENCE"/"conflicted"
            → 400 "Không thể xoá vì dữ liệu đang được sử dụng..."
        NGƯỢC LẠI → 500 "Lỗi cơ sở dữ liệu..."

  ──────────────────────────────────────────────
  GetWalletSummary(page=1, pageSize=50, search?, sortBy?) : account[]   // GET api/accounts/wallet-summary
  ──────────────────────────────────────────────
    chuẩn hoá pageSize (<=0 hoặc >100 → 50)
    chuẩn hoá page (<=0 → 1)
    result = accountService.GetWalletSummaryAsync(
                 GetUserId(), page, pageSize, search, sortBy)   // sortBy vd "balance-desc"
    TRẢ VỀ 200 OK(result)

## AccountService

SERVICE AccountService  implements IAccountService
  phụ thuộc: accountRepo, budgetRepo, journalRepo, recurringRepo, transactionService

  HẰNG SỐ:
    DefaultPageSize = 20
    Loại tài khoản:  Assets=1, Liabilities=2, Equity=3, Revenue=4, Expense=5
    MaxNameLength = 50

  ════════════════════════════════════════════════════
  GetAllAsync(userId) : AccountDto[]
  ════════════════════════════════════════════════════
    accounts = accountRepo.GetByUserIdAsync(userId)
    TRẢ VỀ accounts.map(MapToDto)

  ════════════════════════════════════════════════════
  GetAllPagedAsync(userId, page, pageSize) : PaginatedResult<AccountDto>
  ════════════════════════════════════════════════════
    result = accountRepo.GetByUserIdPagedAsync(userId, page, pageSize)
    TRẢ VỀ PaginatedResult {
        Items      = result.Items.map(MapToDto),
        TotalCount = result.TotalCount,
        Page       = result.Page,
        PageSize   = result.PageSize }

  ════════════════════════════════════════════════════
  GetByTypeAsync(userId, typeId) : AccountDto[]
  ════════════════════════════════════════════════════
    accounts = accountRepo.GetByUserAndTypeAsync(userId, typeId)
    TRẢ VỀ accounts.map(MapToDto)

  ════════════════════════════════════════════════════
  GetByTypePagedAsync(userId, typeId, page, pageSize) : PaginatedResult<AccountDto>
  ════════════════════════════════════════════════════
    result = accountRepo.GetByUserAndTypePagedAsync(userId, typeId, page, pageSize)
    TRẢ VỀ PaginatedResult { Items=map(MapToDto), TotalCount, Page, PageSize }

  ════════════════════════════════════════════════════
  GetByIdAsync(userId, accountId) : AccountDto
  ════════════════════════════════════════════════════
    account = accountRepo.GetWithDetailsAsync(accountId)
    NẾU account == null            → NÉM KeyNotFoundException("Không tìm thấy tài khoản.")
    NẾU account.UserId != userId   → NÉM UnauthorizedAccessException("Không có quyền truy cập.")
    TRẢ VỀ MapToDto(account)

  ════════════════════════════════════════════════════
  CreateAsync(userId, request: CreateAccountDto) : AccountDto
  ════════════════════════════════════════════════════
    NẾU request.Name không rỗng VÀ len(trim(Name)) > 50
        → NÉM ArgumentException("Tên không được vượt quá 50 ký tự.")

    account = NEW Account {
        UserId   = userId
        TypeId   = request.TypeId
        Name     = request.Name
        IconName = request.IconName ?? "Landmark"      // mặc định
        Color    = request.Color    ?? "blue"          // mặc định
        GradientFrom/GradientTo = request.*
        Balance        = request.Balance ?? 0
        InitialBalance = request.InitialBalance ?? request.Balance ?? 0  // fallback
        CardNumber, CurrencyCode = request.*
        IsActive  = true
        CreatedAt = now (UTC) }

    created = accountRepo.CreateAsync(account)
    TRẢ VỀ MapToDto(created)

  ════════════════════════════════════════════════════
  UpdateAsync(userId, accountId, request: UpdateAccountDto) : AccountDto
  ════════════════════════════════════════════════════
    account = accountRepo.GetByIdAsync(accountId)
    NẾU null          → NÉM KeyNotFoundException
    NẾU UserId khác   → NÉM UnauthorizedAccessException
    NẾU Name > 50 ký tự → NÉM ArgumentException

    // Cập nhật từng field theo kiểu "giữ nguyên nếu request null" (??=)
    account.Name/IconName/Color/GradientFrom/GradientTo
           /CardNumber/CurrencyCode/IsActive = request.* ?? giá trị cũ
    // (KHÔNG cho sửa TypeId, Balance, InitialBalance qua đây)

    updated = accountRepo.UpdateAsync(account)
    TRẢ VỀ MapToDto(updated)

  ════════════════════════════════════════════════════
  DeleteAsync(userId, accountId, transferToAccountId?, force=false) : bool
  ════════════════════════════════════════════════════
    account = accountRepo.GetByIdAsync(accountId)
    NẾU null        → NÉM KeyNotFoundException
    NẾU UserId khác → NÉM UnauthorizedAccessException

    // (a) Ví của lợn tiết kiệm: cấm xóa trực tiếp
    NẾU budgetRepo.HasSavingsGoalByAccountIdAsync(accountId)
        → NÉM InvalidOperationException("Đây là ví của lợn tiết kiệm...")

    balance = account.Balance ?? 0
    hadTransaction = journalRepo.HasTransaction(accountId)   // kiểm tra TRƯỚC, tránh tác dụng phụ

    // (b) Còn số dư nhưng chưa chọn ví nhận
    NẾU balance != 0 VÀ transferToAccountId == null
        → NÉM InvalidOperationException("Ví còn số dư. Vui lòng chọn ví khác...")

    // (c) Có giao dịch mà chưa xác nhận
    NẾU hadTransaction VÀ KHÔNG force
        → NÉM InvalidOperationException("Ví có giao dịch liên quan. Vui lòng xác nhận...")

    // (d) Chuyển hết số dư sang ví nhận (double-entry)
    NẾU balance != 0 THÌ
        target = accountRepo.GetByIdAsync(transferToAccountId)
        NẾU target null         → NÉM KeyNotFoundException("Không tìm thấy ví nhận.")
        NẾU target.UserId khác  → NÉM UnauthorizedAccessException
        NẾU target == account   → NÉM InvalidOperationException("Ví nhận phải khác ví đang xóa.")

        transfer = CreateTransactionDto {
            Amount = |balance|,
            Description = "Chuyển số dư khi xóa ví: {name}",
            // balance>0: tiền từ ví-xóa → ví-nhận; balance<0: ngược lại
            DebitAccountId  = (balance>0) ? target : accountId,
            CreditAccountId = (balance>0) ? accountId : target }
        transactionService.CreateAsync(userId, transfer)   // tự cập nhật số dư 2 bên

    // (e) Quyết định xóa cứng hay xóa mềm
    NẾU hadTransaction HOẶC balance != 0 THÌ   // còn dính sổ cái → ẩn ví (soft delete)
        account.IsActive = false
        res = accountRepo.UpdateAsync(account)
        TRẢ VỀ (res != null)
    NGƯỢC LẠI                                   // sạch → xóa cứng
        TRẢ VỀ accountRepo.DeleteAsync(accountId)

  ════════════════════════════════════════════════════
  GetWalletSummaryAsync(userId, page=1, pageSize=50, search?, sortBy?) : WalletSummaryDto
  ════════════════════════════════════════════════════
    allAccounts = accountRepo.GetByUserIdAsync(userId)   // toàn bộ, chưa lọc

    // 1) Tổng tính trên FULL list để summary luôn đúng (chỉ tài khoản đang active)
    totalAssets      = Σ Balance      với TypeId==Assets      & IsActive
    totalLiabilities = Σ |Balance|    với TypeId==Liabilities & IsActive
    totalSavings     = Σ Balance      với TypeId==Equity      & IsActive

    // 2) Danh sách hiển thị: chỉ Assets / Liabilities / Equity
    displayAccounts = allAccounts.filter(TypeId ∈ {Assets, Liabilities, Equity})

    // 3) Lọc theo search (server-side, không phân biệt hoa thường)
    NẾU search không rỗng
        displayAccounts = lọc Name.toLower chứa search.toLower

    // 4) Sắp xếp (server-side)
    displayAccounts = THEO sortBy:
        "balance-desc" → Balance giảm dần, rồi AccountId
        "balance-asc"  → Balance tăng dần, rồi AccountId
        "name"         → Name A→Z, rồi AccountId
        mặc định       → TypeId, rồi Name

    // 5) Map DTO + đánh dấu ví lợn tiết kiệm
    savingsAccountIds = budgetRepo.GetSavingsGoalsAsync(userId).map(AccountId) → HashSet
    allDto = displayAccounts.map(MapToDto)
    với mỗi dto: dto.IsSavingsWallet = savingsAccountIds chứa dto.AccountId

    // 6) Phân trang cho card grid (cùng tham chiếu object → giữ cờ vừa gán)
    paginated = allDto.skip((page-1)*pageSize).take(pageSize)

    TRẢ VỀ WalletSummaryDto {
        TotalAssets, TotalLiabilities, TotalSavings,
        NetWorth   = totalAssets + totalSavings - totalLiabilities,
        AllAccounts = allDto,        // full để FE tính/hiển thị
        Accounts    = paginated,     // trang hiện tại
        TotalCount  = allDto.Count, Page, PageSize }

  ════════════════════════════════════════════════════
  ReconcileBalancesAsync(userId, repair) : ReconcileResultDto
  // Đối soát số dư lưu trong DB với số dư tính lại từ sổ cái
  ════════════════════════════════════════════════════
    accounts = accountRepo.GetAllByUserAsync(userId)
    sums     = accountRepo.GetLedgerSumsAsync(userId)   // tổng phát sinh sổ cái theo accountId
    result   = NEW ReconcileResultDto { Repaired = repair }

    VỚI MỖI a TRONG accounts:
        result.Checked++
        // Quy ước dấu giống TransactionService: 1/2/5 → +1 ; 3/4 → −1
        factor   = (a.TypeId ∈ {Assets, Liabilities, Expense}) ? +1 : −1
        ledger   = sums[a.AccountId] ?? 0
        computed = (a.InitialBalance ?? 0) + factor * ledger   // số dư đúng theo sổ cái
        stored   = a.Balance ?? 0
        diff     = stored − computed

        NẾU diff == 0  → BỎ QUA (khớp)

        result.MismatchCount++
        result.Mismatches.add({ AccountId, Name, TypeId,
                                StoredBalance=stored, ComputedBalance=computed,
                                Difference=diff })

        NẾU repair                                       // sửa lệch
            accountRepo.UpdateBalanceAsync(a.AccountId, computed − stored)  // delta đưa stored về computed

    TRẢ VỀ result

  ════════════════════════════════════════════════════
  (private) MapToDto(account) : AccountDto
  ════════════════════════════════════════════════════
    TRẢ VỀ AccountDto sao chép:
        AccountId, TypeId, TypeName = a.AccountType?.TypeName,
        Name, IconName, Color, GradientFrom, GradientTo,
        Balance ?? 0, InitialBalance ?? 0,
        CardNumber, CurrencyCode,
        IsActive ?? true, CreatedAt

## AccountRepository

REPOSITORY AccountRepository : BaseRepository<Account>, IAccountRepository
  kế thừa: _context (DbContext), _dbSet = context.Set<Account>()
  // GHI CHÚ: truy vấn EF Core (LINQ → SQL); Include nạp kèm navigation AccountType.

  ═══════════ Kế thừa từ BaseRepository<Account> ═══════════

  GetByIdAsync(id) : Account?
    TRẢ VỀ _dbSet.FindAsync(id)            // tìm theo khóa chính, có thể null

  GetAllAsync() : Account[]
    TRẢ VỀ _dbSet.ToListAsync()

  CreateAsync(entity) : Account
    _dbSet.Add(entity)
    _context.SaveChangesAsync()            // INSERT, gán AccountId tự tăng
    TRẢ VỀ entity

  UpdateAsync(entity) : Account
    _dbSet.Update(entity)
    _context.SaveChangesAsync()            // UPDATE toàn bộ cột
    TRẢ VỀ entity

  DeleteAsync(id) : bool                   // XÓA CỨNG
    entity = _dbSet.FindAsync(id)
    NẾU entity == null  → TRẢ VỀ false
    _dbSet.Remove(entity)
    _context.SaveChangesAsync()            // DELETE
    TRẢ VỀ true

  ═══════════ Riêng của AccountRepository ═══════════

  ─────────────────────────────────────────────
  GetByUserIdAsync(userId) : Account[]
  ─────────────────────────────────────────────
    TRẢ VỀ _dbSet
        .WHERE  UserId == userId
            VÀ IsActive == true
            VÀ KHÔNG (TypeId==3 VÀ Name=="Initial")   // ẩn TK hệ thống Equity "Initial"
        .Include(AccountType)
        .OrderBy(TypeId).ThenBy(Name)

  ─────────────────────────────────────────────
  GetByUserIdPagedAsync(userId, page, pageSize) : PaginatedResult<Account>
  ─────────────────────────────────────────────
    query = _dbSet
        .WHERE UserId==userId VÀ IsActive==true
        .Include(AccountType)
        .OrderBy(TypeId).ThenBy(Name)
        // LƯU Ý: bản phân trang KHÔNG loại TK "Initial" (khác GetByUserIdAsync)

    totalCount = query.CountAsync()                        // đếm trước khi cắt trang
    items      = query.Skip((page-1)*pageSize).Take(pageSize)
    TRẢ VỀ PaginatedResult { Items=items, TotalCount, Page, PageSize }

  ─────────────────────────────────────────────
  GetByUserAndTypeAsync(userId, typeId) : Account[]
  ─────────────────────────────────────────────
    TRẢ VỀ _dbSet
        .WHERE UserId==userId VÀ TypeId==typeId VÀ IsActive==true
        .Include(AccountType)
        .OrderBy(Name)

  ─────────────────────────────────────────────
  GetByUserAndTypePagedAsync(userId, typeId, page, pageSize) : PaginatedResult<Account>
  ─────────────────────────────────────────────
    query = _dbSet
        .WHERE UserId==userId VÀ TypeId==typeId VÀ IsActive==true
        .Include(AccountType)
        .OrderBy(Name)
    totalCount = query.CountAsync()
    items      = query.Skip((page-1)*pageSize).Take(pageSize)
    TRẢ VỀ PaginatedResult { Items, TotalCount, Page, PageSize }

  ─────────────────────────────────────────────
  GetWithDetailsAsync(accountId) : Account?
  ─────────────────────────────────────────────
    TRẢ VỀ _dbSet.Include(AccountType)
                 .FirstOrDefault(AccountId == accountId)   // KÈM type, dùng cho GetById ở service

  ─────────────────────────────────────────────
  FindByUserAndNameAsync(userId, typeId, name) : Account?
  ─────────────────────────────────────────────
    TRẢ VỀ _dbSet.FirstOrDefault(
        UserId==userId VÀ TypeId==typeId VÀ Name==name VÀ IsActive==true)
    // dùng để chống trùng tên / tra cứu TK theo tên

  ─────────────────────────────────────────────
  UpdateBalanceAsync(accountId, delta) : void
  ─────────────────────────────────────────────
    // ExecuteUpdate: UPDATE thẳng xuống DB, KHÔNG load entity → tránh race condition
    _dbSet.WHERE(AccountId == accountId)
          .ExecuteUpdate( SET Balance = (Balance ?? 0) + delta )
    // delta có thể âm/dương; dùng trong Reconcile và cập nhật số dư khi có giao dịch

  ─────────────────────────────────────────────
  GetAllByUserAsync(userId) : Account[]
  ─────────────────────────────────────────────
    TRẢ VỀ _dbSet.WHERE(UserId == userId)     // LẤY HẾT, kể cả IsActive==false
    // service Reconcile cần soi cả ví đã ẩn

  ─────────────────────────────────────────────
  GetLedgerSumsAsync(userId) : Dictionary<accountId, decimal>
  // Tổng phát sinh (Debit − Credit) mỗi account, tính thẳng từ Journal_Details
  ─────────────────────────────────────────────
    sums = _context.Set<JournalDetail>()
        .WHERE  d.Account.UserId == userId
        .GroupBy(d.AccountId)
        .Select( g => { AccountId = g.Key,
                        Sum = Σ (d.Debit ?? 0) − (d.Credit ?? 0) } )
    TRẢ VỀ sums → Dictionary(AccountId → Sum)
    // service nhân với factor theo loại TK để ra số dư đúng



---

## 1. AuthController (`api/auth`) — [ApiController], không [Authorize] mặc định

```
phụ thuộc: authService, env (môi trường web)
hằng số:  RefreshCookieName = "refresh_token"
          RefreshTokenLifetime = 2 ngày
ghi chú:  refresh token KHÔNG trả trong body — lưu trong cookie HttpOnly, path=/api/auth

POST signup(request: RegisterRequestDto)              [AllowAnonymous]
    THỬ   result = authService.RegisterAsync(request)
          TRẢ VỀ OkWithRefreshCookie(result)          // set cookie + xoá token khỏi body
    BẮT InvalidOperationException → 409 Conflict(message)   // trùng tài khoản
    BẮT ArgumentException        → 400 BadRequest(message)  // mật khẩu yếu

POST signin(request: LoginRequestDto)                 [AllowAnonymous]
    THỬ   result = authService.LoginAsync(request)
          TRẢ VỀ OkWithRefreshCookie(result)
    BẮT UnauthorizedAccessException → 401 Unauthorized(message)

POST refresh(request?: RefreshTokenRequestDto)        [AllowAnonymous]
    token = Cookies[RefreshCookieName]
    NẾU token rỗng → token = request?.RefreshToken     // fallback client cũ
    NẾU token rỗng → TRẢ VỀ 401 "Thiếu refresh token."
    THỬ   result = authService.RefreshTokenAsync(token)
          TRẢ VỀ OkWithRefreshCookie(result)
    BẮT UnauthorizedAccessException → ClearRefreshCookie(); 401(message)

POST logout()                                         [AllowAnonymous]
    ClearRefreshCookie()
    TRẢ VỀ 200 "Đã đăng xuất."

GET profile()                                         [Authorize]
    TRẢ VỀ 200 authService.GetProfileAsync(GetUserId())

PUT profile(request: UpdateProfileDto)                [Authorize]
    TRẢ VỀ 200 authService.UpdateProfileAsync(GetUserId(), request)

PUT password(request: ChangePasswordDto)              [Authorize]
    THỬ   authService.ChangePasswordAsync(GetUserId(), request)
          TRẢ VỀ 200 "Đổi mật khẩu thành công."
    BẮT UnauthorizedAccessException → 401(message)    // mật khẩu cũ sai
    BẮT ArgumentException          → 400(message)     // mật khẩu mới yếu

── Cookie helpers (private) ──
OkWithRefreshCookie(result):
    SetRefreshCookie(result.RefreshToken)             // cookie HttpOnly
    result.RefreshToken = ""                          // token bí mật không chạm JS
    TRẢ VỀ Ok(result)
BuildRefreshCookieOptions(expires):
    isProd = KHÔNG env.IsDevelopment()
    TRẢ VỀ { HttpOnly=true,
             Secure = isProd,
             SameSite = isProd ? None : Lax,           // prod HTTPS cross-site / dev localhost
             Path="/api/auth", Expires=expires, IsEssential=true }
SetRefreshCookie(token)  → append cookie hết hạn sau RefreshTokenLifetime
ClearRefreshCookie()     → append cookie rỗng, hết hạn hôm qua (xoá)
```

---

## 2. AuthService

```
phụ thuộc: userRepo, accountRepo, config (JWT)
hằng số:  AccountConstants.InitialEquity = "Initial"  (TK Equity hệ thống, ẩn khỏi UI)

RegisterAsync(request) : AuthResponseDto
    NẾU userRepo.ExistsAsync(request.Account)
        → NÉM InvalidOperationException("Tên đăng nhập đã tồn tại.")
    check = PasswordStrengthValidator.Validate(request.Password)
    NẾU KHÔNG check.IsValid → NÉM ArgumentException(gộp các lỗi)

    user = NEW User {
        UserAccount = request.Account,
        PasswordHash = BCrypt.HashPassword(request.Password),
        UserName = request.UserName ?? request.Account,
        Email, AvatarInitials = 2 ký tự đầu (in hoa),
        Theme="light", Currency="VND",
        NotifyEmail=true, NotifyPush=true, NotifySms=false, CreatedAt=now }
    created = userRepo.CreateAsync(user)

    // Dựng sẵn 3 account mặc định cho user mới:
    accountRepo.CreateAsync( Revenue(4) "Thu nhập chính" )
    accountRepo.CreateAsync( Expense(5) "Ăn uống" )
    accountRepo.CreateAsync( Equity(3)  "Initial" )       // TK cân đối, ẩn

    (access, refresh) = GenerateTokens(created)
    TRẢ VỀ AuthResponseDto { AccessToken, RefreshToken, UserId, UserName, Email }

LoginAsync(request) : AuthResponseDto
    user = userRepo.GetByAccountAsync(request.Account)
    NẾU null → NÉM UnauthorizedAccessException("Sai tên đăng nhập hoặc mật khẩu.")
    NẾU KHÔNG BCrypt.Verify(request.Password, user.PasswordHash)
        → NÉM UnauthorizedAccessException("Sai tên đăng nhập hoặc mật khẩu.")
    (access, refresh) = GenerateTokens(user)
    TRẢ VỀ AuthResponseDto { ... }

RefreshTokenAsync(refreshToken) : AuthResponseDto
    userIdStr = ValidateToken(refreshToken)
    NẾU null → NÉM UnauthorizedAccessException("Phiên đăng nhập không hợp lệ.")
    user = userRepo.GetByIdAsync(int(userIdStr))
    NẾU null → NÉM UnauthorizedAccessException("Không tìm thấy người dùng.")
    (access, newRefresh) = GenerateTokens(user)         // cấp cặp token mới
    TRẢ VỀ AuthResponseDto { ... }

GetProfileAsync(userId) : UserProfileDto
    user = userRepo.GetByIdAsync(userId) ?? NÉM KeyNotFoundException
    TRẢ VỀ MapToProfileDto(user)

UpdateProfileAsync(userId, request) : UserProfileDto
    user = userRepo.GetByIdAsync(userId) ?? NÉM KeyNotFoundException
    cập nhật UserName/Email/AvatarInitials/Theme/Currency
            /NotifyEmail/NotifyPush/NotifySms = request.* ?? giá trị cũ
    updated = userRepo.UpdateAsync(user)
    TRẢ VỀ MapToProfileDto(updated)

ChangePasswordAsync(userId, request) : bool
    user = userRepo.GetByIdAsync(userId) ?? NÉM KeyNotFoundException
    NẾU KHÔNG BCrypt.Verify(request.OldPassword, user.PasswordHash)
        → NÉM UnauthorizedAccessException("Mật khẩu hiện tại không đúng.")
    check = PasswordStrengthValidator.Validate(request.NewPassword)
    NẾU KHÔNG check.IsValid → NÉM ArgumentException(...)
    user.PasswordHash = BCrypt.HashPassword(request.NewPassword)
    userRepo.UpdateAsync(user); TRẢ VỀ true

── private ──
GenerateTokens(user) : (access, refresh)
    key = SymmetricKey(config["Jwt:Key"])  // thiếu → NÉM InvalidOperationException
    claims = [ NameIdentifier=UserId, Name=UserAccount, Jti=GUID ]
    access  = JWT(issuer, audience, claims, hết hạn +5 giờ,  ký HMAC-SHA256)
    refresh = JWT(issuer, audience, claims, hết hạn +2 ngày, ký HMAC-SHA256)
    TRẢ VỀ (write(access), write(refresh))

ValidateToken(token) : string?  // trả userId hoặc null
    THỬ  validate chữ ký bằng Jwt:Key (KHÔNG check issuer/audience, ClockSkew=0)
         TRẢ VỀ claim NameIdentifier
    BẮT bất kỳ lỗi → TRẢ VỀ null

MapToProfileDto(user) → copy UserId, Account, UserName, Email, AvatarInitials,
                              Theme, Currency, Notify*, CreatedAt
```

---

## 3. UserRepository : BaseRepository<User>

```
// Kế thừa BaseRepository: GetByIdAsync, GetAllAsync, CreateAsync, UpdateAsync, DeleteAsync

GetByAccountAsync(userAccount) : User?
    TRẢ VỀ _dbSet.FirstOrDefault(UserAccount == userAccount)

GetByEmailAsync(email) : User?
    TRẢ VỀ _dbSet.FirstOrDefault(Email == email)

ExistsAsync(userAccount) : bool
    TRẢ VỀ _dbSet.Any(UserAccount == userAccount)
```

### BaseRepository<T> (lớp cơ sở dùng chung mọi repository)

```
trường: _context (DbContext), _dbSet = context.Set<T>()
GetByIdAsync(id)   → _dbSet.FindAsync(id)              // theo khoá chính, có thể null
GetAllAsync()      → _dbSet.ToListAsync()
CreateAsync(e)     → Add(e); SaveChanges; TRẢ VỀ e     // INSERT
UpdateAsync(e)     → Update(e); SaveChanges; TRẢ VỀ e  // UPDATE
DeleteAsync(id)    → e = Find(id); NẾU null → false;
                     Remove(e); SaveChanges; TRẢ VỀ true   // DELETE cứng
```

---

## 4. Common — PasswordStrengthValidator (static)

```
hằng số: MinLength = 8, MaxLength = 128
record Result { IsValid: bool, Errors: string[] }
    Success()        → { IsValid=true }
    Failure(error)   → { Errors=[error] }
    Failure(errors)  → { Errors=errors }

Validate(password) : Result
    NẾU password rỗng/whitespace → Failure("Password is required.")
    errors = []
    NẾU len < 8   → thêm "Password must be at least 8 characters long."
    NẾU len > 128 → thêm "Password must not exceed 128 characters."
    NẾU KHÔNG khớp [A-Z]          → thêm "...at least one uppercase letter."
    NẾU KHÔNG khớp [ký tự đặc biệt] → thêm "...at least one special character..."
    TRẢ VỀ (errors rỗng) ? Success() : Failure(errors)
```

---

## 5. TransactionController (`api/transactions`) — [Authorize]

```
phụ thuộc: transactionService

GET ""(page=1, pageSize=20)
    TRẢ VỀ 200 transactionService.GetByUserAsync(GetUserId(), page, pageSize)

GET "range"(from, to)
    TRẢ VỀ 200 transactionService.GetByDateRangeAsync(GetUserId(), from, to)

GET "range/account"(accountId, from, to)
    TRẢ VỀ 200 transactionService.GetByDateRangeAndAccountAsync(GetUserId(), from, to, accountId)

GET "{id}"
    THỬ  TRẢ VỀ 200 transactionService.GetByIdAsync(GetUserId(), id)
    BẮT KeyNotFound → 404 ; Unauthorized → 403

GET "cashflow"(from?, to?)
    rangeFrom = from ?? ngày 1 tháng hiện tại
    rangeTo   = to   ?? cuối tháng đó
    TRẢ VỀ 200 transactionService.GetCashFlowAsync(GetUserId(), rangeFrom, rangeTo)

POST ""(request: CreateTransactionDto)
    THỬ  result = transactionService.CreateAsync(GetUserId(), request)
         TRẢ VỀ 201 CreatedAtAction(GetById, id=result.JournalId, result)
    BẮT KeyNotFound → 404 ; Unauthorized → 403
    BẮT DbUpdateException → nếu lỗi FK → 400 "...tài khoản liên quan không tồn tại..."
                           ngược lại → 500

PUT "{id}"(request: UpdateTransactionDto)
    THỬ  TRẢ VỀ 200 transactionService.UpdateAsync(GetUserId(), id, request)
    BẮT KeyNotFound → 404 ; Unauthorized → 403 ; DbUpdate(FK) → 400 ; else 500

DELETE "{id}"
    THỬ  transactionService.DeleteAsync(GetUserId(), id); TRẢ VỀ 204
    BẮT KeyNotFound → 404 ; Unauthorized → 403 ; DbUpdate(FK) → 400 ; else 500
```

---

## 6. TransactionService

```
phụ thuộc: journalRepo, accountRepo, budgetService
hằng số:  TypeRevenue=4, TypeExpense=5

GetByUserAsync(userId, page, pageSize) : TransactionDto[]
    entries = journalRepo.GetByUserIdAsync(userId, page, pageSize)
    TRẢ VỀ entries.map(MapToDto)

GetByDateRangeAsync(userId, from, to)              → map(journalRepo.GetByDateRangeAsync)
GetByDateRangeAndAccountAsync(userId, from, to, accountId)
                                                   → map(journalRepo.GetByDateRangeAndAccountAsync)

GetByIdAsync(userId, journalId) : TransactionDto
    entry = journalRepo.GetWithDetailsAsync(journalId) ?? NÉM KeyNotFound
    NẾU entry.UserId != userId → NÉM Unauthorized
    TRẢ VỀ MapToDto(entry)

CreateAsync(userId, request) : TransactionDto
    // (a) Chi tiêu: nếu có ExpenseCategoryName → lấy TK Debit, KHÔNG có thì TẠO MỚI Expense
    NẾU request.ExpenseCategoryName không rỗng
        expenseAcct = accountRepo.GetByIdAsync(request.DebitAccountId)
                      ?? accountRepo.CreateAsync(NEW Expense{Name=..., Icon="Coffee", red})
        request.DebitAccountId = expenseAcct.AccountId
    // (b) Thu nhập: tương tự cho Revenue (Credit)
    NẾU request.IncomeCategoryName không rỗng
        revenueAcct = GetByIdAsync(CreditAccountId) ?? CreateAsync(NEW Revenue{...})
        request.CreditAccountId = revenueAcct.AccountId

    // (c) Validate 2 account thuộc user
    debit  = accountRepo.GetByIdAsync(request.DebitAccountId)  ?? NÉM KeyNotFound("...ghi nợ")
    credit = accountRepo.GetByIdAsync(request.CreditAccountId) ?? NÉM KeyNotFound("...ghi có")
    NẾU debit.UserId != userId HOẶC credit.UserId != userId → NÉM Unauthorized

    // (d) Tạo bút toán kép
    entry = NEW JournalEntry { UserId, TransactionDate ?? now, Description ?? "Unknown",
                               Notes, Tags, BillId, CreatedAt=now }
    details = [ { Debit account:  Debit=Amount, Credit=0 },
                { Credit account: Credit=Amount, Debit=0 } ]
    created = journalRepo.CreateWithDetailsAsync(entry, details)

    // (e) Cập nhật số dư (xem UpdateAccountBalanceAsync)
    UpdateAccountBalanceAsync(debit,  +Amount)
    UpdateAccountBalanceAsync(credit, -Amount)

    // (f) Nếu debit là Expense → cộng spent vào budget
    NẾU debit.TypeId == TypeExpense
        budgetService.UpdateSpentAmountAsync(debit.AccountId, request.Amount)

    TRẢ VỀ MapToDto(created)

UpdateAsync(userId, journalId, request) : TransactionDto
    entry = journalRepo.GetWithDetailsAsync(journalId) ?? NÉM KeyNotFound
    NẾU entry.UserId != userId → NÉM Unauthorized
    // metadata
    journalRepo.UpdateEntryAsync(journalId, Description, Notes, Tags, TransactionDate)
    // nếu đổi số tiền
    NẾU request.Amount có giá trị
        oldAmount = Σ Debit của details
        NẾU |Amount - oldAmount| > 0.01
            delta = Amount - oldAmount
            journalRepo.UpdateEntryAmountAsync(journalId, Amount)
            VỚI MỖI detail:
                account = accountRepo.GetByIdAsync(detail.AccountId); bỏ qua nếu null
                NẾU detail.Debit>0  → UpdateAccountBalanceAsync(account, +delta)
                NGƯỢC LẠI Credit>0  → UpdateAccountBalanceAsync(account, -delta)
                NẾU account là Expense & detail.Debit>0
                    budgetService.UpdateSpentAmountAsync(detail.AccountId, delta)
    updated = journalRepo.GetWithDetailsAsync(journalId)
    TRẢ VỀ MapToDto(updated)

DeleteAsync(userId, journalId) : bool
    entry = journalRepo.GetWithDetailsAsync(journalId) ?? NÉM KeyNotFound
    NẾU entry.UserId != userId → NÉM Unauthorized
    // (a) hoàn budget: trừ phần chi của các detail Expense
    VỚI MỖI detail là Expense & Debit>0:
        budgetService.UpdateSpentAmountAsync(detail.AccountId, -(Debit))
    // (b) đảo số dư (ngược chiều lúc tạo)
    VỚI MỖI detail:
        account = accountRepo.GetByIdAsync(detail.AccountId); bỏ qua nếu null
        delta = (Credit) - (Debit)
        UpdateAccountBalanceAsync(account, delta)
    TRẢ VỀ journalRepo.DeleteAsync(journalId)

GetCashFlowAsync(userId, from, to) : CashFlowSummaryDto
    entries = journalRepo.GetByDateRangeAsync(userId, from, to)
    totalIncome=0, totalExpense=0
    VỚI MỖI detail trong entries:
        NẾU account.TypeId==Revenue → totalIncome  += Credit
        NẾU account.TypeId==Expense → totalExpense += Debit
    TRẢ VỀ { TotalIncome, TotalExpense, NetCashFlow=income-expense, From, To }

── private ──
UpdateAccountBalanceAsync(account, delta):
    // Assets(1)/Liabilities(2)/Expense(5): debit = tăng → factor +1
    // Equity(3)/Revenue(4): credit = tăng → factor -1
    factor = account.TypeId ∈ {1,2,5} ? +1 : -1
    accountRepo.UpdateBalanceAsync(account.AccountId, delta * factor)

MapToDto(e): JournalId, TransactionDate(UTC), Description, Notes, Tags, CreatedAt,
    Details = e.JournalDetails.map( DetailId, AccountId, AccountName, TypeId, Debit, Credit )
```

---

## 7. JournalRepository : BaseRepository<JournalEntry>

```
GetByUserIdAsync(userId, page, pageSize) : JournalEntry[]
    TRẢ VỀ JournalEntries
        .WHERE UserId==userId
        .Include(JournalDetails → Account)
        .OrderByDescending(TransactionDate)
        .Skip((page-1)*pageSize).Take(pageSize)

GetByDateRangeAsync(userId, from, to) : JournalEntry[]
    .WHERE UserId==userId VÀ TransactionDate trong [from, to]
    .Include(details → Account).OrderByDescending(TransactionDate)

GetByDateRangeAndAccountAsync(userId, from, to, accountId) : JournalEntry[]
    .WHERE UserId==userId VÀ trong [from,to] VÀ details.Any(AccountId==accountId)
    .Include(details → Account).OrderByDescending(TransactionDate)

GetWithDetailsAsync(journalId) : JournalEntry?
    .Include(details → Account → AccountType).FirstOrDefault(JournalId==journalId)

CreateWithDetailsAsync(entry, details) : JournalEntry
    // GIAO DỊCH DB: entry + details lưu cùng nhau (atomic)
    BEGIN TRANSACTION
        Add(entry); SaveChanges                      // có JournalId
        VỚI MỖI detail: detail.JournalId = entry.JournalId; Add(detail)
        SaveChanges; COMMIT
        TRẢ VỀ GetWithDetailsAsync(entry.JournalId) ?? entry
    LỖI → ROLLBACK; ném lại

UpdateEntryAsync(journalId, description?, notes?, tags?, transactionDate?) : bool
    entry = Find(journalId); NẾU null → false
    cập nhật field nào KHÁC null (chỉ ghi đè khi có giá trị)
    SaveChanges; TRẢ VỀ true

HasTransaction(accountId) : bool
    TRẢ VỀ JournalDetails.Any(AccountId==accountId)

UpdateEntryAmountAsync(journalId, newAmount) : bool
    details = JournalDetails.WHERE(JournalId==journalId)
    NẾU rỗng → false
    VỚI MỖI detail:
        NẾU là dòng Debit (Debit>0, Credit==0)  → Debit  = newAmount
        NẾU là dòng Credit(Credit>0, Debit==0)  → Credit = newAmount
    SaveChanges; TRẢ VỀ true

HasDetailsForAccountAsync(accountId) : bool
    TRẢ VỀ JournalDetails.Any(AccountId==accountId)   // (giống HasTransaction)
```

---

## 8. BillController (`api/bills`) — [Authorize]

```
phụ thuộc: billService

GET ""(page=1, pageSize=50)
    chuẩn hoá page/pageSize (pageSize<=0 hoặc >100 → 50; page<=0 → 1)
    TRẢ VỀ 200 billService.GetAllPagedAsync(GetUserId(), page, pageSize)

GET "{id}"
    THỬ  TRẢ VỀ 200 billService.GetByIdAsync(GetUserId(), id)
    BẮT KeyNotFound → 404 ; Unauthorized → Forbid

POST ""(request: CreateBillDto)
    THỬ  result = billService.CreateAsync(GetUserId(), request)
         TRẢ VỀ 201 CreatedAtAction(GetById, id=result.BillId, result)
    BẮT DbUpdate(FK) → 400 ; else 500

PUT "{id}"(request: UpdateBillDto)
    THỬ  TRẢ VỀ 200 billService.UpdateAsync(GetUserId(), id, request)
    BẮT KeyNotFound → 404 ; Unauthorized → Forbid ; DbUpdate(FK) → 400 ; else 500

DELETE "{id}"
    THỬ  billService.DeleteAsync(GetUserId(), id); TRẢ VỀ 204
    BẮT KeyNotFound → 404 ; Unauthorized → Forbid ; DbUpdate(FK) → 400 ; else 500

POST "{id}/rescan"
    THỬ  TRẢ VỀ 200 billService.RescanAsync(GetUserId(), id)
    BẮT KeyNotFound → 404 ; InvalidOperation → 400 ; Unauthorized → Forbid

POST "{id}/pay"(request: PayBillDto)
    THỬ  TRẢ VỀ 200 billService.PayAsync(GetUserId(), id, request)
    BẮT KeyNotFound → 404 ; InvalidOperation/Argument → 400 ;
        Unauthorized → Forbid ; DbUpdate(FK) → 400 ; else 500
```

---

## 9. BillService

```
phụ thuộc: billRepo, transactionService

GetAllAsync(userId) : BillDto[]
    bills = billRepo.GetByUserIdAsync(userId)
    linked = billRepo.GetLinkedEntriesForUserAsync(userId)     // 1 query cho mọi bill
    byBill = group linked theo BillId
    TRẢ VỀ bills.map(b → MapToDto(b, today, byBill[b.BillId] ?? [], includeTx=false))

GetAllPagedAsync(userId, page, pageSize) : PaginatedResult<BillDto>
    linked = billRepo.GetLinkedEntriesForUserAsync(userId); byBill = group theo BillId
    result = billRepo.GetByUserIdPagedAsync(userId, page, pageSize)
    TRẢ VỀ PaginatedResult { Items=result.Items.map(MapToDto), TotalCount, Page, PageSize }

GetByIdAsync(userId, billId) : BillDto
    bill = billRepo.GetByIdAsync(billId) ?? NÉM KeyNotFound
    NẾU bill.UserId != userId → NÉM Unauthorized
    entries = billRepo.GetLinkedEntriesAsync(billId)
    TRẢ VỀ MapToDto(bill, today, entries, includeTx=true)     // kèm danh sách giao dịch

CreateAsync(userId, request) : BillDto
    bill = NEW Bill { UserId, Name(trim), AmountMin, AmountMax, Date(.Date),
                      EndDate?, ExtensionDate?, RepeatFreq, Skip, Active=true,
                      Notes(trim), ObjectGroup(trim), CreatedAt=now }
    created = billRepo.CreateAsync(bill)
    TRẢ VỀ MapToDto(created, today, [], false)

UpdateAsync(userId, billId, request) : BillDto
    bill = billRepo.GetByIdAsync(billId) ?? NÉM KeyNotFound
    NẾU bill.UserId != userId → NÉM Unauthorized
    // field bắt buộc: giữ giá trị cũ nếu null (form luôn gửi)
    Name/AmountMin/AmountMax/Date/RepeatFreq/Skip/Active = request.* ?? cũ
    // field tuỳ chọn: GÁN TRỰC TIẾP (null = người dùng xoá → cho phép wipe)
    EndDate/ExtensionDate/Notes/ObjectGroup = request.*
    updated = billRepo.UpdateAsync(bill)
    entries = billRepo.GetLinkedEntriesAsync(billId)
    TRẢ VỀ MapToDto(updated, today, entries, false)

DeleteAsync(userId, billId) : bool
    bill = billRepo.GetByIdAsync(billId) ?? NÉM KeyNotFound
    NẾU bill.UserId != userId → NÉM Unauthorized
    billRepo.UnlinkAllEntriesAsync(billId)               // gỡ liên kết giao dịch trước
    TRẢ VỀ billRepo.DeleteAsync(billId)

RescanAsync(userId, billId) : BillDto
    bill = billRepo.GetByIdAsync(billId) ?? NÉM KeyNotFound
    NẾU UserId khác → NÉM Unauthorized
    NẾU KHÔNG bill.Active → NÉM InvalidOperation("Không thể quét lại hóa đơn đã tắt.")
    billRepo.UnlinkAllEntriesAsync(billId)
    billRepo.LinkEntriesByAmountAsync(billId, userId, AmountMin, AmountMax, Name)  // tự dò khớp
    entries = billRepo.GetLinkedEntriesAsync(billId)
    TRẢ VỀ MapToDto(bill, today, entries, false)

PayAsync(userId, billId, request: PayBillDto) : BillDto
    bill = billRepo.GetByIdAsync(billId) ?? NÉM KeyNotFound
    NẾU UserId khác → NÉM Unauthorized
    NẾU KHÔNG Active → NÉM InvalidOperation("...hóa đơn đã tắt.")
    NẾU Amount <= 0 → NÉM Argument("Số tiền phải lớn hơn 0.")
    NẾU WalletAccountId <= 0 → NÉM Argument("Vui lòng chọn ví để trả.")
    NẾU (ExpenseAccountId null/<=0) VÀ ExpenseCategoryName rỗng
        → NÉM Argument("Vui lòng chọn danh mục chi.")
    // Thanh toán = 1 giao dịch chi tiêu gắn BillId → uỷ thác TransactionService (tái dùng logic kép)
    txRequest = CreateTransactionDto {
        DebitAccountId = ExpenseAccountId ?? 0, CreditAccountId = WalletAccountId,
        ExpenseCategoryName, Amount, Description=bill.Name, Notes,
        TransactionDate = request.Date ?? now, BillId = billId }
    transactionService.CreateAsync(userId, txRequest)
    entries = billRepo.GetLinkedEntriesAsync(billId)
    TRẢ VỀ MapToDto(bill, today, entries, false)

── helpers (private, tính chu kỳ) ──
MapToDto(b, today, entries, includeTransactions):
    next       = ComputeNextExpectedMatch(b, today)
    paidStatus = ComputePaidStatus(b, today, entries)
    periodTxId = GetCurrentPeriodTransactionId(b, today, entries)
    paidPeriod = GetPaidAmountThisPeriod(b, today, entries)
    avgAmount  = (AmountMin + AmountMax)/2
    dto = BillDto { ...các field bill, AverageAmount, NextExpectedMatch,
                    PaidStatus, PaidTransactionId, PaidAmountThisPeriod,
                    MatchedCount=entries.Count }
    NẾU includeTransactions
        dto.MatchedTransactions = entries.map( JournalId, Date, Description,
                                  Amount=Σ Debit ).orderByDesc(Date)
    TRẢ VỀ dto

ComputeNextExpectedMatch(b, today):
    NẾU KHÔNG Active → null
    NẾU EndDate < today → null
    current = b.Date; interval = Skip+1
    LẶP current cho tới khi >= today bằng AdvanceDate(current, RepeatFreq, interval)
    TRẢ VỀ current

ComputePaidStatus(b, today, entries):
    NẾU KHÔNG Active → "inactive"
    NẾU EndDate < today → "not_expected"
    periodStart = GetPeriodStart(b, today); NẾU null → "not_expected" (chưa bắt đầu)
    periodEnd = AdvanceDate(periodStart, RepeatFreq, Skip+1)   // tính từ periodStart, không từ next
    hasPaid = entries.Any(Date ∈ [periodStart, periodEnd))
    TRẢ VỀ hasPaid ? "paid" : "expected_unpaid"

GetCurrentPeriodTransactionId / GetPaidAmountThisPeriod:
    xác định cửa sổ kỳ hiện tại [periodStart, periodEnd) rồi lấy giao dịch đầu / tổng Debit

GetPeriodStart(b, today):
    current = b.Date; NẾU current > today → null (chưa bắt đầu)
    LẶP tiến current tới mốc cuối cùng <= today; TRẢ VỀ mốc đó

AdvanceDate(date, freq, times):
    daily→+times ngày; weekly→+7*times; monthly→+times tháng;
    quarterly→+3*times tháng; half-year→+6*times tháng; yearly→+times năm;
    mặc định→+times tháng
```

---

## 10. BudgetController (`api/budgets`) — [Authorize]

```
phụ thuộc: budgetService

── Ngân sách chi tiêu (expense) ──
GET "expense"(page=1, pageSize=50, search?, filterStatus?, sortBy?)
    chuẩn hoá page/pageSize
    TRẢ VỀ 200 budgetService.GetExpenseBudgetsPagedAsync(userId, page, pageSize, search, filterStatus, sortBy)

GET "expense/{id}"
    THỬ  TRẢ VỀ 200 budgetService.GetExpenseBudgetByIdAsync(userId, id)
    BẮT KeyNotFound → 404

POST "expense"(request: CreateBudgetDto)
    THỬ  result = budgetService.CreateExpenseBudgetAsync(userId, request)
         TRẢ VỀ 201 CreatedAtAction(GetExpenseBudgetById, id=result.BudgetId, result)
    BẮT Argument → 400 ; KeyNotFound → 404 ; Unauthorized → Forbid ; DbUpdate(FK) → 400 ; else 500

PUT "expense/{id}"(request: UpdateBudgetDto)
    THỬ  TRẢ VỀ 200 budgetService.UpdateExpenseBudgetAsync(userId, id, request)
    BẮT KeyNotFound → 404 ; Unauthorized → 403 ; DbUpdate(FK) → 400 ; else 500

DELETE "{id}"
    THỬ  budgetService.DeleteBudgetAsync(userId, id); TRẢ VỀ 204
    BẮT KeyNotFound → 404 ; Unauthorized → 403 ; DbUpdate(FK) → 400 ; else 500

── Lợn tiết kiệm (savings) ──
GET "savings"                      → 200 budgetService.GetSavingsGoalsAsync(userId)
GET "savings/{id}"                 → 200 GetSavingsGoalByIdAsync ; KeyNotFound → 404
POST "savings"(CreateSavingsGoalDto)
    result = budgetService.CreateSavingsGoalAsync(userId, request)
    TRẢ VỀ 201 CreatedAtAction(GetSavingsGoalById, id=result.BudgetId, result)
POST "savings/{id}/add"(AddRemoveMoneyDto)
    NẾU SourceAccountId <= 0 → 400 "Vui lòng chọn ví nguồn..."
    THỬ  TRẢ VỀ 200 AddMoneyAsync(userId, id, Amount, Notes, SourceAccountId)
    BẮT KeyNotFound → 404 ; Argument → 400 ; Unauthorized → Forbid
POST "savings/{id}/remove"(AddRemoveMoneyDto)
    NẾU DestinationAccountId <= 0 → 400 "Vui lòng chọn ví đích..."
    THỬ  TRẢ VỀ 200 RemoveMoneyAsync(userId, id, Amount, Notes, DestinationAccountId)
    BẮT KeyNotFound → 404 ; Argument → 400 ; Unauthorized → Forbid
POST "savings/{id}/reset"
    THỬ  ResetHistoryAsync(userId, id); TRẢ VỀ 204
    BẮT KeyNotFound → 404 ; Unauthorized → Forbid
GET "savings/{id}/events"          → 200 GetEventsAsync ; KeyNotFound → 404 ; Unauthorized → Forbid
PUT "savings/{id}"(UpdateSavingsGoalDto)
    THỬ  TRẢ VỀ 200 UpdateSavingsGoalAsync(userId, id, request)
    BẮT KeyNotFound → 404 ; Unauthorized → 403 ; DbUpdate(FK) → 400 ; else 500
```

---

## 11. BudgetService

```
phụ thuộc: budgetRepo, accountRepo, journalRepo
hằng số:  TypeExpenseAccount=5, TypeSavingsAccount=1

── Expense budgets ──
GetExpenseBudgetsAsync(userId)          → map(budgetRepo.GetExpenseBudgetsAsync) → BudgetDto
GetExpenseBudgetsPagedAsync(userId, page, pageSize, search?, filterStatus?, sortBy?)
    result = budgetRepo.GetExpenseBudgetsPagedAsync(...)
    TRẢ VỀ PaginatedResult { Items=map(MapToBudgetDto), TotalCount, Page, PageSize }

GetExpenseBudgetByIdAsync(userId, budgetId) : BudgetDto
    budget = budgetRepo.GetByIdAsync(budgetId) ?? NÉM KeyNotFound
    NẾU UserId khác → NÉM Unauthorized
    TRẢ VỀ MapToBudgetDto(budget)

CreateExpenseBudgetAsync(userId, request) : BudgetDto
    NẾU request.AccountId <= 0 → NÉM Argument("Phải chọn danh mục chi tiêu...")
    expenseAccount = accountRepo.GetWithDetailsAsync(request.AccountId) ?? NÉM KeyNotFound
    NẾU UserId khác → NÉM Unauthorized
    NẾU TypeId != Expense → NÉM Argument("...phải là danh mục chi tiêu (Expense).")
    // cộng dồn chi tiêu đã phát sinh từ StartDate → nay làm CurrentAmount khởi điểm
    pastTx = journalRepo.GetByDateRangeAndAccountAsync(userId, StartDate, now, accountId)
    pastExpenseTotal = Σ Debit của các detail thuộc account này (Debit>0)
    budget = NEW Budget { UserId, AccountId, Title, BudgetType="expense",
                          TargetAmount, CurrentAmount=pastExpenseTotal,
                          PeriodType ?? "monthly", StartDate, EndDate,
                          IconName/Color kế thừa từ account, IsActive=true, CreatedAt=now }
    TRẢ VỀ MapToBudgetDto(budgetRepo.CreateAsync(budget))

UpdateExpenseBudgetAsync(userId, budgetId, request) : BudgetDto
    budget = budgetRepo.GetByIdAsync(budgetId) ?? NÉM KeyNotFound
    NẾU UserId khác → NÉM Unauthorized
    Title/TargetAmount/PeriodType/StartDate/EndDate/IconName/Color/IsActive = request.* ?? cũ
    TRẢ VỀ MapToBudgetDto(budgetRepo.UpdateAsync(budget))

DeleteBudgetAsync(userId, budgetId) : bool
    budget = budgetRepo.GetByIdAsync(budgetId) ?? NÉM KeyNotFound
    NẾU UserId khác → NÉM Unauthorized
    TRẢ VỀ budgetRepo.DeleteAsync(budgetId)

── Savings goals (lợn tiết kiệm) ──
GetSavingsGoalsAsync(userId)            → map(budgetRepo.GetSavingsGoalsAsync) → SavingsGoalDto
GetSavingsGoalByIdAsync(userId, budgetId):
    goal = budgetRepo.GetByIdAsync(budgetId) ?? NÉM KeyNotFound
    NẾU UserId khác → NÉM Unauthorized; TRẢ VỀ MapToSavingsDto(goal)

CreateSavingsGoalAsync(userId, request) : SavingsGoalDto
    // 1) Tạo "ví lợn" (account Assets) làm nơi giữ tiền
    piggyAccount = NEW Account { TypeId=Savings(1), Name="Ví lợn – {Title}",
                   Icon/Color, Balance=InitialAmount, InitialBalance=InitialAmount, ... }
    createdAccount = accountRepo.CreateAsync(piggyAccount)
    // 2) Tạo Budget loại "savings" trỏ tới ví lợn
    goal = NEW Budget { UserId, AccountId=createdAccount.AccountId, Title,
                        BudgetType="savings", TargetAmount, CurrentAmount=InitialAmount,
                        MonthlyContribution, PeriodType="monthly", StartDate=now,
                        Deadline=TargetDate, Icon/Color, IsActive=true }
    TRẢ VỀ MapToSavingsDto(budgetRepo.CreateAsync(goal))

UpdateSavingsGoalAsync(userId, budgetId, request) : SavingsGoalDto
    goal = budgetRepo.GetByIdAsync(budgetId) ?? NÉM KeyNotFound
    NẾU UserId khác → NÉM Unauthorized
    Title/TargetAmount/MonthlyContribution/Deadline/Icon/Color/IsActive = request.* ?? cũ
    NẾU đổi Title VÀ goal.AccountId>0       // đồng bộ tên ví lợn
        account = accountRepo.GetWithDetailsAsync(goal.AccountId)
        NẾU account là Savings → đổi Name="Ví lợn – {Title}", Icon/Color; UpdateAsync
    TRẢ VỀ MapToSavingsDto(budgetRepo.UpdateAsync(goal))

AddMoneyAsync(userId, budgetId, amount, notes, sourceAccountId) : SavingsGoalDto
    goal = budgetRepo.GetByIdAsync(budgetId) ?? NÉM KeyNotFound; check UserId
    NẾU amount <= 0 → NÉM Argument
    source = accountRepo.GetByIdAsync(sourceAccountId) ?? NÉM KeyNotFound; check UserId
    NẾU amount > source.Balance → NÉM Argument("...vượt quá số dư ví nguồn.")
    piggy = accountRepo.GetByIdAsync(goal.AccountId) ?? NÉM KeyNotFound
    // Bút toán: Debit ví lợn (+), Credit ví nguồn (-)
    entry = JournalEntry { Description="Nạp tiền vào lợn: {Title}", Notes, ... }
    details = [ {piggy: Debit=amount}, {source: Credit=amount} ]
    journalRepo.CreateWithDetailsAsync(entry, details)
    accountRepo.UpdateBalanceAsync(piggy,  +amount)
    accountRepo.UpdateBalanceAsync(source, -amount)
    newAmount = (goal.CurrentAmount ?? 0) + amount       // KHÔNG kẹp theo target
    budgetRepo.UpdateCurrentAmountAsync(budgetId, newAmount)
    budgetRepo.AddEventAsync(budgetId, amount, notes)    // ghi lịch sử
    goal.CurrentAmount = newAmount                       // đồng bộ entity để DTO trả về đúng
    TRẢ VỀ MapToSavingsDto(goal)

RemoveMoneyAsync(userId, budgetId, amount, notes, destinationAccountId) : SavingsGoalDto
    goal = budgetRepo.GetByIdAsync(budgetId) ?? NÉM KeyNotFound; check UserId
    NẾU amount <= 0 → NÉM Argument
    NẾU amount > goal.CurrentAmount → NÉM Argument("...vượt quá số dư trong lợn.")
    destination = accountRepo.GetByIdAsync(destinationAccountId) ?? NÉM KeyNotFound; check UserId
    piggy = accountRepo.GetByIdAsync(goal.AccountId) ?? NÉM KeyNotFound
    // Bút toán: Debit ví đích (+), Credit ví lợn (-)
    details = [ {destination: Debit=amount}, {piggy: Credit=amount} ]
    journalRepo.CreateWithDetailsAsync(entry, details)
    accountRepo.UpdateBalanceAsync(destination, +amount)
    accountRepo.UpdateBalanceAsync(piggy,       -amount)
    newAmount = max(0, CurrentAmount - amount)
    budgetRepo.UpdateCurrentAmountAsync(budgetId, newAmount)
    budgetRepo.AddEventAsync(budgetId, -amount, notes)
    goal.CurrentAmount = newAmount
    TRẢ VỀ MapToSavingsDto(goal)

ResetHistoryAsync(userId, budgetId) : bool
    goal = budgetRepo.GetByIdAsync(budgetId) ?? NÉM KeyNotFound; check UserId
    current = goal.CurrentAmount ?? 0
    budgetRepo.DeleteEventsByBudgetIdAsync(budgetId)     // xoá lịch sử
    budgetRepo.UpdateCurrentAmountAsync(budgetId, 0)
    NẾU current>0 VÀ AccountId>0 → accountRepo.UpdateBalanceAsync(AccountId, -current)  // rút sạch ví lợn
    TRẢ VỀ true

GetEventsAsync(userId, budgetId) : PiggyBankEventDto[]
    goal = budgetRepo.GetByIdAsync(budgetId) ?? NÉM KeyNotFound; check UserId
    events = budgetRepo.GetEventsByBudgetIdAsync(budgetId)
    TRẢ VỀ events.map( EventId, Amount, EventDate, Notes )

UpdateSpentAmountAsync(accountId, delta) : void     // gọi từ TransactionService
    budget = budgetRepo.GetActiveByAccountIdAsync(accountId)  // budget expense đang chạy của TK chi
    NẾU budget != null → UpdateCurrentAmountAsync(budget.BudgetId, CurrentAmount + delta)

ResetExpiredPeriodsAsync() : void     // tác vụ định kỳ
    budgets = budgetRepo.GetExpenseBudgetsNeedingResetAsync()
    today, yesterday
    VỚI MỖI budget:
        periodsToday     = CalculatePeriodsElapsed(StartDate, periodType, today)
        periodsYesterday = CalculatePeriodsElapsed(StartDate, periodType, yesterday)
        NẾU periodsToday > periodsYesterday → UpdateCurrentAmountAsync(budgetId, 0)  // sang kỳ mới

── helpers (private) ──
CalculatePeriodsElapsed(startDate, periodType, now):
    weekly → (now - start).days / 7 ; monthly → CalcMonthlyPeriods ;
    yearly → chênh lệch năm (điều chỉnh nếu chưa tới mốc) ; mặc định → 0
CalcMonthlyPeriods(start, now): số tháng chênh, lùi 1 nếu chưa qua mốc ngày; max(0,...)
MapToBudgetDto(b): ...fields, CurrentAmount ?? 0,
    Percentage = TargetAmount>0 ? round(Current/Target*100, 1) : 0
MapToSavingsDto(b): ...fields, SavePerMonth=MonthlyContribution,
    Percentage tương tự, MonthsRemaining = monthly>0 ? ceil(leftToSave/monthly) : null,
    Events = b.PiggyBankEvents.map(...)
```

---

## 12. BudgetRepository : BaseRepository<Budget>

```
GetByUserIdAsync(userId) : Budget[]
    .WHERE UserId==userId VÀ IsActive==true .Include(Account)
    .OrderBy(BudgetType).ThenBy(Title)

GetExpenseBudgetsAsync(userId) : Budget[]
    .WHERE UserId==userId VÀ BudgetType=="expense" VÀ IsActive .Include(Account).OrderBy(Title)

GetExpenseBudgetsPagedAsync(userId, page, pageSize, search?, filterStatus?, sortBy?) : PaginatedResult<Budget>
    query = .WHERE UserId==userId VÀ BudgetType=="expense" VÀ IsActive .Include(Account)
    NẾU search → .WHERE Title chứa search
    LỌC theo filterStatus:
        "over"     → CurrentAmount > TargetAmount
        "warning"  → CurrentAmount ∈ [0.8*Target, Target]
        "on-track" → CurrentAmount < 0.8*Target
    SẮP theo sortBy:
        "pct-desc"/"pct-asc" → theo tỉ lệ Current/Target (Target>0 ? Target : 1)
        "amount" → TargetAmount giảm ; "name" → Title ; mặc định → Title
    totalCount = query.Count
    items = query.Skip((page-1)*pageSize).Take(pageSize)
    TRẢ VỀ PaginatedResult { Items, TotalCount, Page, PageSize }

GetSavingsGoalsAsync(userId) : Budget[]
    .WHERE UserId==userId VÀ BudgetType=="savings" VÀ IsActive .Include(Account).OrderBy(Title)

GetSavingsGoalsPagedAsync(userId, page, pageSize) : PaginatedResult<Budget>
    tương tự bản phân trang (không filter/sort tuỳ chọn)

GetActiveByAccountIdAsync(accountId) : Budget?
    .WHERE AccountId==accountId VÀ BudgetType=="expense" VÀ IsActive .FirstOrDefault()

HasSavingsGoalByAccountIdAsync(accountId) : bool
    .Any(AccountId==accountId VÀ BudgetType=="savings")

UpdateCurrentAmountAsync(budgetId, amount) : void
    .WHERE(BudgetId==budgetId).ExecuteUpdate( SET CurrentAmount = amount )  // ghi thẳng DB

GetExpenseBudgetsNeedingResetAsync() : Budget[]
    .WHERE BudgetType=="expense" VÀ IsActive VÀ CurrentAmount>0

GetByIdAsync(id) : Budget?   // OVERRIDE base — kèm Account + PiggyBankEvents (sắp theo EventDate)
    .Include(Account).Include(PiggyBankEvents orderBy EventDate).FirstOrDefault(BudgetId==id)

AddEventAsync(budgetId, amount, notes) : void
    PiggyBankEvents.Add({ BudgetId, Amount, EventDate=now, Notes }); SaveChanges

GetEventsByBudgetIdAsync(budgetId) : PiggyBankEvent[]
    PiggyBankEvents.WHERE(BudgetId==budgetId).OrderByDescending(EventDate)

DeleteByAccountIdAsync(accountId) : void
    .WHERE(AccountId==accountId).ExecuteDelete()

DeleteEventsByBudgetIdAsync(budgetId) : void
    PiggyBankEvents.WHERE(BudgetId==budgetId).ExecuteDelete()
```

---

## 13. AttachmentsController (`api/attachments`) — [Authorize]

```
phụ thuộc: service (IAttachmentService)

GET ""                                 → 200 service.GetAllAsync(GetUserId())

GET "by/{type}/{id}"
    THỬ  TRẢ VỀ 200 service.GetByAttachableAsync(userId, type, id)
    BẮT Argument → 400 (loại không hợp lệ)

GET "{id}"
    THỬ  TRẢ VỀ 200 service.GetByIdAsync(userId, id)
    BẮT KeyNotFound → 404 ; Unauthorized → Forbid

POST ""  [multipart/form-data, giới hạn 60 MB]
    fields: attachable_type, attachable_id, title?, notes?, file (IFormFile)
    THỬ  NẾU file null → 400 "File is required."
         meta = CreateAttachmentDto { AttachableType, AttachableId, Title, Notes }
         input = AttachmentUploadInput { Content=stream, Filename, Mime, Size }
         result = service.CreateAsync(userId, meta, input)
         TRẢ VỀ 201 CreatedAtAction(GetById, id=result.AttachmentId, result)
    BẮT Argument → 400

PUT "{id}"(request: UpdateAttachmentDto)
    THỬ  TRẢ VỀ 200 service.UpdateAsync(userId, id, request)
    BẮT KeyNotFound → 404 ; Unauthorized → Forbid

DELETE "{id}"
    THỬ  service.DeleteAsync(userId, id); TRẢ VỀ 204
    BẮT KeyNotFound → 404 ; Unauthorized → Forbid

GET "{id}/download"
    THỬ  (stream, mime, filename) = service.DownloadAsync(userId, id)
         TRẢ VỀ File(stream, mime, filename)
    BẮT KeyNotFound → 404 ; FileNotFound → 404 "Tập tin không còn trên máy chủ." ; Unauthorized → Forbid
```

---

## 14. AttachmentService

```
phụ thuộc: repo, config
trường:   _root = config["Attachments:Root"] ?? {BaseDir}/attachments  (tạo thư mục nếu chưa có)
hằng số:  ValidTypes = { transaction, bill, budget, account, piggy, tag }  (không phân biệt hoa thường)

GetAllAsync(userId)               → map(repo.GetByUserAsync(userId)) → AttachmentDto
GetByAttachableAsync(userId, type, id):
    NẾU type ∉ ValidTypes → NÉM Argument("Loại đính kèm không hợp lệ.")
    TRẢ VỀ map(repo.GetByAttachableAsync(userId, type.lower, id))

GetByIdAsync(userId, attachmentId):
    a = repo.GetByIdAsync(attachmentId) ?? NÉM KeyNotFound
    NẾU a.UserId != userId → NÉM Unauthorized; TRẢ VỀ MapToDto(a)

CreateAsync(userId, metadata, file: AttachmentUploadInput) : AttachmentDto
    NẾU file null HOẶC Size==0 HOẶC Content null → NÉM Argument("Vui lòng chọn tệp.")
    type = metadata.AttachableType.lower
    NẾU type ∉ ValidTypes → NÉM Argument("Loại đính kèm không hợp lệ.")
    NẾU Size > 50 MB → NÉM Argument("Tệp quá lớn (tối đa 50 MB).")
    userDir = _root/{userId}  (tạo nếu chưa có)
    safeName = "{GUID}{ext}"                  // tên ngẫu nhiên tránh trùng/đường dẫn độc hại
    fullPath = userDir/safeName
    relPath  = "{userId}/{safeName}"          // lưu vào DB (dùng dấu /)
    GHI file.Content → fullPath               // copy stream ra đĩa
    entity = Attachment { UserId, AttachableType=type, AttachableId, Title(trim), Notes(trim),
                          Filename=tên gốc, Mime, Size, FilePath=relPath, UploadedAt=now }
    TRẢ VỀ MapToDto(repo.CreateAsync(entity))

UpdateAsync(userId, attachmentId, request) : AttachmentDto
    a = repo.GetByIdAsync(attachmentId) ?? NÉM KeyNotFound
    NẾU a.UserId != userId → NÉM Unauthorized
    NẾU request.Title != null → a.Title = Title.trim
    NẾU request.Notes != null → a.Notes = Notes.trim
    TRẢ VỀ MapToDto(repo.UpdateAsync(a))      // chỉ sửa metadata, KHÔNG đụng file

DeleteAsync(userId, attachmentId) : bool
    a = repo.GetByIdAsync(attachmentId) ?? NÉM KeyNotFound
    NẾU a.UserId != userId → NÉM Unauthorized
    full = _root/a.FilePath
    NẾU file tồn tại → THỬ xoá file (bỏ qua lỗi)
    TRẢ VỀ repo.DeleteAsync(attachmentId)      // xoá bản ghi DB

DownloadAsync(userId, attachmentId) : (Stream, Mime, Filename)
    a = repo.GetByIdAsync(attachmentId) ?? NÉM KeyNotFound
    NẾU a.UserId != userId → NÉM Unauthorized
    full = _root/a.FilePath
    NẾU KHÔNG tồn tại → NÉM FileNotFoundException
    TRẢ VỀ (OpenRead(full), Mime ?? "application/octet-stream", Filename)

MapToDto(a): AttachmentId, AttachableType, AttachableId, Title, Notes,
             Filename, Mime, Size, UploadedAt   // KHÔNG lộ FilePath ra ngoài
```

---

## 15. AttachmentRepository : BaseRepository<Attachment>

```
GetByUserAsync(userId) : Attachment[]
    .WHERE UserId==userId .OrderByDescending(UploadedAt)

GetByAttachableAsync(userId, type, id) : Attachment[]
    .WHERE UserId==userId VÀ AttachableType==type VÀ AttachableId==id
    .OrderByDescending(UploadedAt)
```

---

## Ghi chú kiến trúc chung

- **Phân lớp nghiêm ngặt:** Controller (chuẩn hoá tham số + map exception → HTTP) → Service (logic nghiệp vụ + phân quyền) → Repository (truy vấn EF Core). Không lớp nào nhảy cóc.
- **Kế toán kép xuyên suốt:** mọi thay đổi số dư đều đi qua `JournalEntry` + 2 `JournalDetail`; số dư account cập nhật bằng `UpdateBalanceAsync` (ExecuteUpdate, chống race condition). `factor` theo loại TK quyết định dấu.
- **Tái sử dụng logic:** `BillService.PayAsync` và `AccountService` (tạo TK từ nguồn / xoá ví) đều uỷ thác `TransactionService.CreateAsync` thay vì lặp lại logic số dư + budget.
- **Xoá mềm vs xoá cứng:** account còn dính sổ cái → `IsActive=false`; attachment/transaction/bill xoá cứng nhưng dọn liên kết trước.
- **Bảo mật:** mật khẩu băm BCrypt; JWT access 5h + refresh 2 ngày trong cookie HttpOnly; upload đính kèm dùng tên GUID + whitelist loại + giới hạn 50 MB.
```
