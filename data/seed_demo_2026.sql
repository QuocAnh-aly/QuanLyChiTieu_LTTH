-- =====================================================================
--  SEED DỮ LIỆU MẪU 2026 — 1 tài khoản demo, đầy đủ chức năng, 12 tháng
--  User: demo2026 / mật khẩu: Demo@2026   (BCrypt)
--  Chạy:  sqlcmd -S "(localdb)\MSSQLLocalDB" -d BudgetManagement -f 65001 -i seed_demo_2026.sql
--  Idempotent: tự xóa user demo2026 cũ (CASCADE) rồi dựng lại từ đầu.
-- =====================================================================
USE BudgetManagement;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

-- ─── 0. Xóa user demo cũ (nếu có) ───────────────────────────────────
DECLARE @old INT = (SELECT user_id FROM Users WHERE user_account = N'demo2026');
IF @old IS NOT NULL
BEGIN
    -- Gỡ liên kết bill_id trên journal trước (FK NO ACTION)
    UPDATE Journal_Entries SET bill_id = NULL WHERE user_id = @old;
    DELETE FROM Users WHERE user_id = @old;   -- CASCADE xóa accounts/journals/bills/budgets/...
    PRINT N'• Đã xóa user demo2026 cũ';
END
GO

BEGIN TRAN;

-- ─── 1. Tạo user demo ───────────────────────────────────────────────
DECLARE @uid INT;
INSERT INTO Users (user_account, password_hash, user_name, email,
                   avatar_initials, theme, currency, notify_email, notify_push, notify_sms)
VALUES (N'demo2026',
        N'$2a$11$85APM1an3CHpFpXy3XI7tOY2K.3tfvUrmAmntuKN3Wbtn9OXO1Cz.',  -- = Demo@2026
        N'Demo MoneyFlow', N'demo2026@moneyflow.test',
        N'DM', N'light', N'VND', 1, 1, 0);
SET @uid = SCOPE_IDENTITY();
PRINT N'• user_id mới = ' + CAST(@uid AS NVARCHAR(10));

-- ─── 2. Tiền tệ (VND chính) ─────────────────────────────────────────
INSERT INTO Currencies (user_id, code, name, symbol, decimal_places, is_enabled, is_primary) VALUES
(@uid, N'VND', N'Vietnamese Dong', N'₫', 0, 1, 1),
(@uid, N'USD', N'US Dollar',       N'$', 2, 1, 0),
(@uid, N'EUR', N'Euro',            N'€', 2, 1, 0),
(@uid, N'JPY', N'Japanese Yen',    N'¥', 0, 1, 0);

-- ─── 3. Tỷ giá (1 from = rate * to) — 2 mốc ngày để thấy lịch sử ────
INSERT INTO Exchange_Rates (user_id, from_currency, to_currency, rate, rate_date) VALUES
(@uid, N'USD', N'VND', 25200, '2026-01-01'),
(@uid, N'EUR', N'VND', 27300, '2026-01-01'),
(@uid, N'JPY', N'VND',   165, '2026-01-01'),
(@uid, N'USD', N'VND', 25400, '2026-06-01'),
(@uid, N'EUR', N'VND', 27600, '2026-06-01'),
(@uid, N'JPY', N'VND',   168, '2026-06-01');

-- ─── 4. Tài khoản (Accounts) — lấy id vào biến ──────────────────────
DECLARE @aChecking INT, @aCash INT, @aBiz INT;          -- Assets (1)
DECLARE @aCard INT;                                      -- Liabilities (2)
DECLARE @aSavings INT, @aInvest INT;                     -- Equity (3)
DECLARE @rSalary INT, @rFreelance INT, @rBonus INT;      -- Revenue (4)
DECLARE @eFood INT, @eShopping INT, @eTransport INT, @eFun INT,
        @eBills INT, @eHousing INT, @eHealth INT, @eEdu INT;  -- Expense (5)

-- Assets
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,1,N'Tài khoản chính','Landmark','blue','#3b82f6','#1d4ed8',30000000,30000000,N'•••• 4892','VND'); SET @aChecking=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,1,N'Tiền mặt','WalletIcon','green','#22c55e','#15803d',2000000,2000000,N'••••','VND'); SET @aCash=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,1,N'Tài khoản kinh doanh','Landmark','orange','#f97316','#c2410c',50000000,50000000,N'•••• 3421','VND'); SET @aBiz=SCOPE_IDENTITY();
-- Liabilities
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,2,N'Thẻ tín dụng','CreditCard','purple','#a855f7','#7e22ce',0,0,N'•••• 9845','VND'); SET @aCard=SCOPE_IDENTITY();
-- Equity / tiết kiệm (số dư dương, không bị giao dịch chạm vào)
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,3,N'Quỹ tiết kiệm','WalletIcon','emerald','#10b981','#047857',80000000,80000000,N'•••• 7231','VND'); SET @aSavings=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,3,N'Đầu tư',         'TrendingUp','teal',   '#14b8a6','#0f766e',120000000,120000000,N'•••• 1122','VND'); SET @aInvest=SCOPE_IDENTITY();
-- Revenue
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,4,N'Lương','DollarSign','green','VND'); SET @rSalary=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,4,N'Freelance','Briefcase','emerald','VND'); SET @rFreelance=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,4,N'Thưởng','Gift','yellow','VND'); SET @rBonus=SCOPE_IDENTITY();
-- Expense
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Ăn uống','Coffee','orange','VND'); SET @eFood=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Mua sắm','ShoppingBag','pink','VND'); SET @eShopping=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Di chuyển','Car','blue','VND'); SET @eTransport=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Giải trí','Heart','purple','VND'); SET @eFun=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Hóa đơn & Tiện ích','Zap','yellow','VND'); SET @eBills=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Nhà ở','Home','green','VND'); SET @eHousing=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Sức khỏe','Heart','red','VND'); SET @eHealth=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Giáo dục','GraduationCap','indigo','VND'); SET @eEdu=SCOPE_IDENTITY();

-- ─── 5. Hóa đơn định kỳ (Bills) ─────────────────────────────────────
DECLARE @bRent INT, @bUtil INT, @bNetflix INT, @bSpotify INT, @bGym INT, @bInsurance INT;
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Tiền thuê nhà',6000000,6000000,'2026-01-02','monthly',0,1,N'Thanh toán đầu tháng',N'Nhà ở'); SET @bRent=SCOPE_IDENTITY();
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Điện & Nước',600000,800000,'2026-01-06','monthly',0,1,N'Hóa đơn tiện ích',N'Tiện ích'); SET @bUtil=SCOPE_IDENTITY();
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Netflix',260000,260000,'2026-01-10','monthly',0,1,N'Gói Premium',N'Giải trí'); SET @bNetflix=SCOPE_IDENTITY();
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Spotify',59000,59000,'2026-01-10','monthly',0,1,N'Gói cá nhân',N'Giải trí'); SET @bSpotify=SCOPE_IDENTITY();
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Phòng Gym',500000,500000,'2026-01-01','monthly',0,1,N'Thẻ tập hàng tháng',N'Sức khỏe'); SET @bGym=SCOPE_IDENTITY();
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,end_date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Bảo hiểm nhân thọ',3000000,3000000,'2026-03-15','2026-12-31','quarterly',0,1,N'Đóng theo quý',N'Bảo hiểm'); SET @bInsurance=SCOPE_IDENTITY();

-- ─── 6. Thủ tục tạm để thêm 1 giao dịch (journal + 2 bút toán) ───────
IF OBJECT_ID('tempdb..#AddTx') IS NOT NULL DROP PROCEDURE #AddTx;
GO
CREATE PROCEDURE #AddTx
    @uid INT, @date DATETIME2, @desc NVARCHAR(500),
    @debit INT, @credit INT, @amount DECIMAL(18,2),
    @notes NVARCHAR(MAX) = NULL, @tags NVARCHAR(1000) = NULL,
    @billId INT = NULL, @fAmount DECIMAL(18,2) = NULL, @fCur NVARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @jid INT;
    INSERT INTO Journal_Entries (user_id,transaction_date,description,notes,tags,bill_id,foreign_amount,foreign_currency_code,created_at)
    VALUES (@uid,@date,@desc,@notes,@tags,@billId,@fAmount,@fCur,@date);
    SET @jid = SCOPE_IDENTITY();
    INSERT INTO Journal_Details (journal_id,account_id,debit,credit) VALUES
        (@jid,@debit, @amount,0),
        (@jid,@credit,0,@amount);
END
GO

-- ─── 7. Vòng lặp 12 tháng (2026-01 .. 2026-12) ──────────────────────
DECLARE @uid INT       = (SELECT user_id FROM Users WHERE user_account=N'demo2026');
-- nạp lại id account vào biến (sau GO ở trên, biến cũ mất)
DECLARE @aChecking INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Tài khoản chính');
DECLARE @aCash     INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Tiền mặt');
DECLARE @aCard     INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Thẻ tín dụng');
DECLARE @rSalary   INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Lương');
DECLARE @rFreelance INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Freelance');
DECLARE @rBonus    INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Thưởng');
DECLARE @eFood     INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Ăn uống');
DECLARE @eShopping INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Mua sắm');
DECLARE @eTransport INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Di chuyển');
DECLARE @eFun      INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Giải trí');
DECLARE @eBills    INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Hóa đơn & Tiện ích');
DECLARE @eHousing  INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Nhà ở');
DECLARE @eHealth   INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Sức khỏe');
DECLARE @eEdu      INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Giáo dục');
DECLARE @bRent    INT=(SELECT bill_id FROM Bills WHERE user_id=@uid AND name=N'Tiền thuê nhà');
DECLARE @bUtil    INT=(SELECT bill_id FROM Bills WHERE user_id=@uid AND name=N'Điện & Nước');
DECLARE @bNetflix INT=(SELECT bill_id FROM Bills WHERE user_id=@uid AND name=N'Netflix');
DECLARE @bSpotify INT=(SELECT bill_id FROM Bills WHERE user_id=@uid AND name=N'Spotify');
DECLARE @bGym     INT=(SELECT bill_id FROM Bills WHERE user_id=@uid AND name=N'Phòng Gym');
DECLARE @bInsurance INT=(SELECT bill_id FROM Bills WHERE user_id=@uid AND name=N'Bảo hiểm nhân thọ');

DECLARE @m INT = 1, @d DATETIME2, @amt DECIMAL(18,2);
WHILE @m <= 12
BEGIN
    -- THU NHẬP --------------------------------------------------------
    SET @d = DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@m,5) AS DATETIME2));
    EXEC #AddTx @uid,@d,N'Lương tháng',@aChecking,@rSalary,25000000,N'Lương cố định hàng tháng',N'salary,income';

    IF @m IN (2,5,8,11)
    BEGIN
        SET @d = DATEADD(HOUR,14,CAST(DATEFROMPARTS(2026,@m,22) AS DATETIME2));
        EXEC #AddTx @uid,@d,N'Dự án freelance',@aChecking,@rFreelance,8000000,N'Thu nhập ngoài',N'freelance';
    END
    IF @m = 6
    BEGIN
        SET @d = DATEADD(HOUR,10,CAST(DATEFROMPARTS(2026,6,30) AS DATETIME2));
        EXEC #AddTx @uid,@d,N'Thưởng giữa năm',@aChecking,@rBonus,15000000,N'Thưởng KPI Q2',N'bonus';
    END
    IF @m = 12
    BEGIN
        SET @d = DATEADD(HOUR,10,CAST(DATEFROMPARTS(2026,12,28) AS DATETIME2));
        EXEC #AddTx @uid,@d,N'Thưởng Tết',@aChecking,@rBonus,30000000,N'Lương tháng 13 + thưởng',N'bonus';
    END

    -- ĂN UỐNG (4 lần/tháng) ------------------------------------------
    SET @d=DATEADD(HOUR,12,CAST(DATEFROMPARTS(2026,@m,3)  AS DATETIME2)); EXEC #AddTx @uid,@d,N'Đi chợ siêu thị',@eFood,@aChecking,350000,NULL,N'food,grocery';
    SET @d=DATEADD(HOUR,19,CAST(DATEFROMPARTS(2026,@m,12) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Ăn nhà hàng',     @eFood,@aCard,    520000,N'Cuối tuần',N'food,dining';
    SET @d=DATEADD(HOUR,8, CAST(DATEFROMPARTS(2026,@m,19) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Cà phê & ăn sáng',@eFood,@aCash,    280000,NULL,N'food';
    SET @d=DATEADD(HOUR,20,CAST(DATEFROMPARTS(2026,@m,26) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Ăn uống cuối tháng',@eFood,@aChecking,610000,NULL,N'food';

    -- MUA SẮM ---------------------------------------------------------
    SET @amt = 1200000 + @m*50000;
    SET @d=DATEADD(HOUR,15,CAST(DATEFROMPARTS(2026,@m,15) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Mua sắm quần áo',@eShopping,@aChecking,@amt,NULL,N'shopping';
    -- mua sắm bằng thẻ tín dụng (tạo dư nợ thẻ)
    SET @d=DATEADD(HOUR,16,CAST(DATEFROMPARTS(2026,@m,18) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Mua đồ điện tử (trả thẻ)',@eShopping,@aCard,900000,N'Thanh toán bằng thẻ tín dụng',N'shopping,card';

    -- DI CHUYỂN -------------------------------------------------------
    SET @d=DATEADD(HOUR,7,CAST(DATEFROMPARTS(2026,@m,8) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Đổ xăng / Grab',@eTransport,@aCash,450000,NULL,N'transport';

    -- GIẢI TRÍ + subscriptions ---------------------------------------
    SET @d=DATEADD(HOUR,21,CAST(DATEFROMPARTS(2026,@m,20) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Xem phim & giải trí',@eFun,@aChecking,300000,NULL,N'fun';
    SET @d=DATEADD(HOUR,1, CAST(DATEFROMPARTS(2026,@m,10) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Netflix',@eFun,@aChecking,260000,N'Thuê bao Premium',N'subscription',@bNetflix;
    SET @d=DATEADD(HOUR,1, CAST(DATEFROMPARTS(2026,@m,10) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Spotify',@eFun,@aChecking,59000, N'Thuê bao nhạc',  N'subscription',@bSpotify;

    -- HÓA ĐƠN & TIỆN ÍCH ---------------------------------------------
    SET @amt = 650000 + @m*12000;
    SET @d=DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@m,6) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Điện & Nước',@eBills,@aChecking,@amt,N'Hóa đơn tiện ích',N'bill,utility',@bUtil;

    -- NHÀ Ở (tiền thuê) ----------------------------------------------
    SET @d=DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@m,2) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Tiền thuê nhà',@eHousing,@aChecking,6000000,N'Thuê căn hộ',N'bill,rent',@bRent;

    -- SỨC KHỎE (gym hàng tháng + khám occasional) --------------------
    SET @d=DATEADD(HOUR,6,CAST(DATEFROMPARTS(2026,@m,1) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Phòng Gym',@eHealth,@aChecking,500000,N'Thẻ tập',N'health,gym',@bGym;
    IF @m IN (3,9)
    BEGIN
        SET @d=DATEADD(HOUR,10,CAST(DATEFROMPARTS(2026,@m,14) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Khám sức khỏe',@eHealth,@aChecking,1500000,N'Khám định kỳ',N'health';
    END
    -- Bảo hiểm theo quý (tháng 3,6,9,12)
    IF @m IN (3,6,9,12)
    BEGIN
        SET @d=DATEADD(HOUR,11,CAST(DATEFROMPARTS(2026,@m,15) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Bảo hiểm nhân thọ',@eHealth,@aChecking,3000000,N'Đóng theo quý',N'insurance',@bInsurance;
    END

    -- GIÁO DỤC --------------------------------------------------------
    IF @m IN (1,8)
    BEGIN
        SET @d=DATEADD(HOUR,18,CAST(DATEFROMPARTS(2026,@m,11) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Khóa học online',@eEdu,@aChecking,3000000,N'Nâng cao kỹ năng',N'education';
    END

    -- GIAO DỊCH NGOẠI TỆ (tháng 4) -----------------------------------
    IF @m = 4
    BEGIN
        SET @d=DATEADD(HOUR,22,CAST(DATEFROMPARTS(2026,4,17) AS DATETIME2));
        EXEC #AddTx @uid,@d,N'Mua hàng nước ngoài (USD)',@eShopping,@aCard,3048000,N'120 USD ≈ 3.048.000 ₫',N'shopping,foreign',NULL,120,N'USD';
    END

    -- CHUYỂN KHOẢN: rút tiền mặt (Checking -> Tiền mặt) --------------
    SET @d=DATEADD(HOUR,11,CAST(DATEFROMPARTS(2026,@m,7) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Rút tiền mặt',@aCash,@aChecking,1000000,N'Chuyển nội bộ',N'transfer';

    -- THANH TOÁN THẺ TÍN DỤNG (Checking -> Thẻ): trả dư nợ trong tháng
    SET @d=DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@m,28) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Thanh toán thẻ tín dụng',@aCard,@aChecking,1420000,N'Trả nợ thẻ',N'transfer,card';

    SET @m = @m + 1;
END
GO

-- ─── 8. Ngân sách chi tiêu (Budgets type=expense) ──────────────────
DECLARE @uid INT=(SELECT user_id FROM Users WHERE user_account=N'demo2026');
INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,period_type,start_date,icon_name,color)
SELECT @uid, a.account_id, a.name, 'expense', x.target, 0, 'monthly', '2026-01-01', a.icon_name, a.color
FROM Accounts a
JOIN (VALUES
    (N'Ăn uống',          3000000),
    (N'Mua sắm',          2500000),
    (N'Di chuyển',         800000),
    (N'Giải trí',         1000000),
    (N'Hóa đơn & Tiện ích',1000000),
    (N'Nhà ở',            6000000)
) x(name,target) ON x.name = a.name
WHERE a.user_id=@uid AND a.type_id=5;

-- current_amount = tổng chi tháng 6/2026 cho từng danh mục (khớp app khi đang ở tháng 6)
UPDATE b SET current_amount = ISNULL(s.spent,0)
FROM Budgets b
OUTER APPLY (
    SELECT SUM(jd.debit) AS spent
    FROM Journal_Details jd
    JOIN Journal_Entries je ON je.journal_id=jd.journal_id
    WHERE jd.account_id=b.account_id
      AND je.transaction_date >= '2026-06-01' AND je.transaction_date < '2026-07-01'
) s
WHERE b.user_id=@uid AND b.budget_type='expense';

-- ─── 9. Mục tiêu tiết kiệm (Budgets type=savings) + Piggy events ───
DECLARE @aSavings INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Quỹ tiết kiệm');
DECLARE @aInvest  INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Đầu tư');
DECLARE @pgVacation INT, @pgHouse INT, @pgEmergency INT;

INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,monthly_contribution,start_date,deadline,icon_name,color)
VALUES (@uid,@aSavings,N'Du lịch Châu Âu','savings',150000000,90000000,15000000,'2026-01-01',N'Dec 2026','Plane','blue'); SET @pgVacation=SCOPE_IDENTITY();
INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,monthly_contribution,start_date,deadline,icon_name,color)
VALUES (@uid,@aInvest, N'Mua nhà',        'savings',2000000000,120000000,20000000,'2026-01-01',N'Jan 2030','Home','green'); SET @pgHouse=SCOPE_IDENTITY();
INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,monthly_contribution,start_date,deadline,icon_name,color)
VALUES (@uid,@aSavings,N'Quỹ khẩn cấp',   'savings',60000000,48000000,8000000,'2026-01-01',N'Aug 2026','Shield','red'); SET @pgEmergency=SCOPE_IDENTITY();

-- Sự kiện nạp/rút heo đất (Jan..Jun 2026)
DECLARE @mm INT=1;
WHILE @mm<=6
BEGIN
    INSERT INTO Piggy_Bank_Events (budget_id,amount,event_date,notes)
    VALUES (@pgVacation,15000000,DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@mm,5) AS DATETIME2)),N'Đóng góp tháng '+CAST(@mm AS NVARCHAR(2)));
    INSERT INTO Piggy_Bank_Events (budget_id,amount,event_date,notes)
    VALUES (@pgEmergency,8000000,DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@mm,5) AS DATETIME2)),N'Tích lũy khẩn cấp');
    INSERT INTO Piggy_Bank_Events (budget_id,amount,event_date,notes)
    VALUES (@pgHouse,20000000,DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@mm,6) AS DATETIME2)),N'Góp mua nhà');
    SET @mm=@mm+1;
END
-- 1 lần rút minh họa
INSERT INTO Piggy_Bank_Events (budget_id,amount,event_date,notes)
VALUES (@pgVacation,-5000000,DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,3,20) AS DATETIME2)),N'Rút tạm ứng đặt cọc tour');

-- ─── 10. Giao dịch định kỳ (Recurring_Journals + Instances) ────────
DECLARE @aChecking INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Tài khoản chính');
DECLARE @rSalary  INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Lương');
DECLARE @eHousing INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Nhà ở');
DECLARE @eFun     INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Giải trí');
DECLARE @recSalary INT, @recRent INT, @recNetflix INT;

INSERT INTO Recurring_Journals (user_id,debit_account_id,credit_account_id,amount,title,description,frequency,interval_value,next_run_date,is_active)
VALUES (@uid,@aChecking,@rSalary,25000000,N'Lương hàng tháng',N'Tự động ghi nhận lương',N'monthly',1,'2026-07-05',1); SET @recSalary=SCOPE_IDENTITY();
INSERT INTO Recurring_Journals (user_id,debit_account_id,credit_account_id,amount,title,description,frequency,interval_value,next_run_date,is_active)
VALUES (@uid,@eHousing,@aChecking,6000000,N'Tiền thuê nhà',N'Trừ tự động đầu tháng',N'monthly',1,'2026-07-02',1); SET @recRent=SCOPE_IDENTITY();
INSERT INTO Recurring_Journals (user_id,debit_account_id,credit_account_id,amount,title,description,frequency,interval_value,next_run_date,is_active)
VALUES (@uid,@eFun,@aChecking,260000,N'Netflix',N'Thuê bao Netflix',N'monthly',1,'2026-07-10',1); SET @recNetflix=SCOPE_IDENTITY();

-- Lịch sử thực hiện: tháng 5,6 completed; tháng 7 pending
INSERT INTO Recurring_Instances (recurring_id,due_date,status) VALUES
(@recSalary,'2026-05-05','completed'),(@recSalary,'2026-06-05','completed'),(@recSalary,'2026-07-05','pending'),
(@recRent,  '2026-05-02','completed'),(@recRent,  '2026-06-02','completed'),(@recRent,  '2026-07-02','pending'),
(@recNetflix,'2026-05-10','completed'),(@recNetflix,'2026-06-10','completed'),(@recNetflix,'2026-07-10','pending');

-- ─── 11. Quy tắc tự động (Rules) ───────────────────────────────────
DECLARE @grp INT, @rule1 INT, @rule2 INT;
INSERT INTO Rule_Groups (user_id,title,description,[order],is_active)
VALUES (@uid,N'Phân loại tự động',N'Nhóm quy tắc gán nhãn & danh mục',0,1); SET @grp=SCOPE_IDENTITY();

INSERT INTO Rules (user_id,group_id,title,description,[order],is_active,strict,stop_processing,runs,last_run_at)
VALUES (@uid,@grp,N'Gắn nhãn Netflix',N'Mô tả chứa "Netflix" → thêm tag subscription',0,1,1,0,12,'2026-06-10'); SET @rule1=SCOPE_IDENTITY();
INSERT INTO Rule_Triggers (rule_id,trigger_type,trigger_value,[order],is_active) VALUES (@rule1,N'description_contains',N'Netflix',0,1);
INSERT INTO Rule_Actions  (rule_id,action_type,action_value,[order],is_active) VALUES (@rule1,N'add_tag',N'subscription',0,1);

INSERT INTO Rules (user_id,group_id,title,description,[order],is_active,strict,stop_processing,runs,last_run_at)
VALUES (@uid,@grp,N'Chi tiêu lớn',N'Số tiền > 5.000.000 → ghi chú "Chi tiêu lớn"',1,1,1,0,5,'2026-06-02'); SET @rule2=SCOPE_IDENTITY();
INSERT INTO Rule_Triggers (rule_id,trigger_type,trigger_value,[order],is_active) VALUES (@rule2,N'amount_more',N'5000000',0,1);
INSERT INTO Rule_Actions  (rule_id,action_type,action_value,[order],is_active) VALUES (@rule2,N'append_notes',N'Chi tiêu lớn',0,1);

-- ─── 12. Webhooks ──────────────────────────────────────────────────
DECLARE @wh INT;
INSERT INTO Webhooks (user_id,title,url,trigger_type,response,secret,is_active)
VALUES (@uid,N'Thông báo Slack',N'https://hooks.slack.com/services/DEMO/T0000/xxxx',N'STORE_TRANSACTION',N'TRANSACTIONS',N'demo-secret-key',1); SET @wh=SCOPE_IDENTITY();
INSERT INTO Webhook_Messages (webhook_id,journal_id,payload,status_code,success,response_body,sent_at)
SELECT TOP 1 @wh, je.journal_id, N'{"event":"STORE_TRANSACTION"}', 200, 1, N'ok', je.transaction_date
FROM Journal_Entries je WHERE je.user_id=@uid ORDER BY je.transaction_date DESC;

-- ─── 13. Attachments (file đính kèm) ───────────────────────────────
INSERT INTO Attachments (user_id,attachable_type,attachable_id,title,notes,filename,mime,size,file_path)
SELECT TOP 1 @uid,'transaction',je.journal_id,N'Hóa đơn ăn uống',N'Ảnh chụp hóa đơn',N'receipt.jpg',N'image/jpeg',204800,N'demo/receipt.jpg'
FROM Journal_Entries je WHERE je.user_id=@uid AND je.description=N'Ăn nhà hàng' ORDER BY je.transaction_date DESC;
INSERT INTO Attachments (user_id,attachable_type,attachable_id,title,notes,filename,mime,size,file_path)
SELECT @uid,'bill',b.bill_id,N'Hợp đồng thuê nhà',N'Bản scan hợp đồng',N'contract.pdf',N'application/pdf',512000,N'demo/contract.pdf'
FROM Bills b WHERE b.user_id=@uid AND b.name=N'Tiền thuê nhà';

-- ─── 14. Tính lại số dư tài khoản từ bút toán ──────────────────────
UPDATE a SET balance = a.initial_balance +
    (CASE WHEN a.type_id IN (1,2,5) THEN 1 ELSE -1 END) * ISNULL(s.net,0)
FROM Accounts a
OUTER APPLY (
    SELECT SUM(ISNULL(jd.debit,0)-ISNULL(jd.credit,0)) AS net
    FROM Journal_Details jd WHERE jd.account_id=a.account_id
) s
WHERE a.user_id=@uid;

COMMIT;
GO

-- ─── 15. Báo cáo nhanh ─────────────────────────────────────────────
DECLARE @uid INT=(SELECT user_id FROM Users WHERE user_account=N'demo2026');
PRINT N'═══════════════════════════════════════════';
PRINT N'  SEED HOÀN TẤT — user_id = '+CAST(@uid AS NVARCHAR(10));
PRINT N'  Đăng nhập: demo2026 / Demo@2026';
PRINT N'═══════════════════════════════════════════';
SELECT 'Accounts' AS tbl, COUNT(*) AS n FROM Accounts WHERE user_id=@uid
UNION ALL SELECT 'Journal_Entries', COUNT(*) FROM Journal_Entries WHERE user_id=@uid
UNION ALL SELECT 'Journal_Details', COUNT(*) FROM Journal_Details jd JOIN Journal_Entries je ON je.journal_id=jd.journal_id WHERE je.user_id=@uid
UNION ALL SELECT 'Budgets', COUNT(*) FROM Budgets WHERE user_id=@uid
UNION ALL SELECT 'Bills', COUNT(*) FROM Bills WHERE user_id=@uid
UNION ALL SELECT 'Piggy_Bank_Events', COUNT(*) FROM Piggy_Bank_Events e JOIN Budgets b ON b.budget_id=e.budget_id WHERE b.user_id=@uid
UNION ALL SELECT 'Recurring_Journals', COUNT(*) FROM Recurring_Journals WHERE user_id=@uid
UNION ALL SELECT 'Recurring_Instances', COUNT(*) FROM Recurring_Instances ri JOIN Recurring_Journals r ON r.recurring_id=ri.recurring_id WHERE r.user_id=@uid
UNION ALL SELECT 'Rules', COUNT(*) FROM Rules WHERE user_id=@uid
UNION ALL SELECT 'Webhooks', COUNT(*) FROM Webhooks WHERE user_id=@uid
UNION ALL SELECT 'Attachments', COUNT(*) FROM Attachments WHERE user_id=@uid
UNION ALL SELECT 'Currencies', COUNT(*) FROM Currencies WHERE user_id=@uid
UNION ALL SELECT 'Exchange_Rates', COUNT(*) FROM Exchange_Rates WHERE user_id=@uid;
GO
