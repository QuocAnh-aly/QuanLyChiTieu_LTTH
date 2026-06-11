# Hướng dẫn Setup — Quản Lý Chi Tiêu

## Yêu cầu hệ thống

- Node.js 18+
- .NET 10 SDK
- Docker

---

## 1. Khởi động SQL Server

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=Hoangphuc@040505" \
  -p 1434:1433 --name sqlserver_2022 -d mcr.microsoft.com/mssql/server:2022-latest
```

## 2. Tạo Database + Schema

```bash
# Tạo database
/opt/mssql-tools18/bin/sqlcmd -S 127.0.0.1,1434 -U sa -P 'Hoangphuc@040505' -C -Q "CREATE DATABASE BudgetManagement"

# Áp dụng schema
/opt/mssql-tools18/bin/sqlcmd -S 127.0.0.1,1434 -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i csdl_sqlserver.sql

# Migration fixes
/opt/mssql-tools18/bin/sqlcmd -S 127.0.0.1,1434 -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i migration_fix.sql

# Thêm cột budget_id (nếu chưa có)
/opt/mssql-tools18/bin/sqlcmd -S 127.0.0.1,1434 -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i migration_add_budget_id.sql

# Sync CurrentAmount budgets (nếu cần)
/opt/mssql-tools18/bin/sqlcmd -S 127.0.0.1,1434 -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i migration_sync_budget_current_amount.sql
```

---

## 3. Seed dữ liệu mẫu

### Tuỳ chọn A: Seed user demo gốc

```bash
/opt/mssql-tools18/bin/sqlcmd -S 127.0.0.1,1434 -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i seed_demo_2026.sql
```

- **User:** `demo2026`
- **Mật khẩu:** `Demo@2026`
- 12 tháng dữ liệu (2026), đầy đủ accounts/budgets/recurring/rules

### Tuỳ chọn B: Seed user mới (đầy đủ hơn)

```bash
/opt/mssql-tools18/bin/sqlcmd -S 127.0.0.1,1434 -U sa -P 'Hoangphuc@040505' -C -d BudgetManagement -i seed_full_user.sql
```

- **User:** `nguyenvana`
- **Mật khẩu:** `Abc@123456`

**Dữ liệu bao gồm:**

| Thành phần | Số lượng | Mô tả |
|---|---|---|
| **Accounts** | 17 | 3 Assets, 1 Liability, 2 Equity, 3 Revenue, 8 Expense |
| **Bills** | 6 | Tiền thuê, điện nước, Netflix, Spotify, gym, bảo hiểm |
| **Journal Entries** | 218 | 12 tháng giao dịch (2026) |
| **Budget expense** | 6 | Ăn uống (2.5M), Mua sắm (2M), Di chuyển (800K)... |
| **Budget sub** | 3 | Ăn sáng (150K/ngày), Ăn trưa (200K/ngày), Ăn tối (250K/ngày) |
| **Budget savings** | 3 | Du lịch Nhật (80M), Mua xe (500M), Quỹ dự phòng (50M) |
| **Piggy Bank Events** | 19 | Lịch sử nạp/rút tiết kiệm |
| **Recurring** | 3 | Lương, thuê nhà, Netflix |
| **Rules** | 2 | Gắn nhãn Netflix + Chi tiêu lớn |
| **Webhooks** | 1 | Slack notification |
| **Attachments** | 2 | Hóa đơn + hợp đồng |

### Ghi chú seed
- **Idempotent**: Chạy lại an toàn — tự xoá user cũ (CASCADE) trước khi insert
- **Budget tracking**: Budgets con đã link `budget_id` vào giao dịch thực tế — dùng thử nút **"+ Theo dõi"** trên BudgetDetail

---

## 4. Khởi động Backend

### Cách 1: Dùng script (khuyên dùng)

```bash
chmod +x run.sh
./run.sh
```

### Cách 2: Manual (4 terminal)

```bash
# Terminal 1 — API Service
cd BudgetManagement/BudgetManagement.APIService && dotnet run --launch-profile http

# Terminal 2 — Auth Service
cd BudgetManagement/BudgetManagement.AuthService && dotnet run --launch-profile http

# Terminal 3 — API Gateway
cd BudgetManagement/BudgetManagement.APIGateway && dotnet run --launch-profile http
```

## 5. Khởi động Frontend

```bash
# Terminal 4
npm install
npm run dev
```

## 6. Truy cập

| Service | URL |
|---|---|
| **Frontend** | [http://localhost:5173](http://localhost:5173) |
| API Gateway | [http://localhost:5229](http://localhost:5229) |
| API Swagger | [http://localhost:5133/swagger](http://localhost:5133/swagger) |
| Auth Swagger | [http://localhost:5134/swagger](http://localhost:5134/swagger) |

---

## 7. Chạy Tests

```bash
cd BudgetManagement && dotnet test BudgetManagement.Tests/BudgetManagement.Tests.csproj
```

---

## 8. Quy trình làm việc Git

### Mỗi phiên làm việc

```bash
# 1. Kiểm tra trạng thái
git status

# 2. Stage đúng file cần commit (tránh git add -A)
git add <file1> <file2> ...

# 3. Commit
git commit -m "feat/fix/chore: mô tả ngắn gọn"

# 4. Push
git push origin <tên-nhánh>
```

### Lưu ý
- `.sh` files: đã untrack khỏi git (`.gitignore` có `*.sh`)
- `appsettings.json`: gitignored (chứa secrets)
- `migration_*.sql`: commit riêng khi cần

---

## Troubleshooting

### Port conflict
```bash
# Kiểm tra port đã dùng
lsof -i :5133
lsof -i :5173

# Kill process (thay PID)
kill -9 <PID>
```

### SQL Server không kết nối được
```bash
# Kiểm tra container
docker ps | grep sqlserver

# Restart
docker restart sqlserver_2022

# Kiểm tra log
docker logs sqlserver_2022 --tail 20
```

### Test failed
```bash
# Chạy chi tiết
cd BudgetManagement && dotnet test BudgetManagement.Tests/BudgetManagement.Tests.csproj -v n
```
