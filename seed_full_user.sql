-- =====================================================================
--  SEED DỮ LIỆU MẪU — User mới, đầy đủ các thành phần
--  User: nguyenvana / mật khẩu: Abc@123456   (BCrypt)
--  Chạy:  sqlcmd -S 127.0.0.1,1434 -U sa -P '<password>' -d BudgetManagement -i seed_full_user.sql -C
--  Idempotent: tự xóa user cũ (CASCADE) rồi dựng lại từ đầu.
-- =====================================================================
USE BudgetManagement;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

-- ─── 0. Xóa user cũ (nếu có) ───────────────────────────────────
DECLARE @old INT = (SELECT user_id FROM Users WHERE user_account = N'nguyenvana');
IF @old IS NOT NULL
BEGIN
    UPDATE Journal_Entries SET bill_id = NULL WHERE user_id = @old;
    DELETE FROM Users WHERE user_id = @old;
    PRINT N'• Đã xóa user nguyenvana cũ';
END
GO

BEGIN TRAN;

-- ─── 1. Tạo user mới ───────────────────────────────────────────
DECLARE @uid INT;
INSERT INTO Users (user_account, password_hash, user_name, email,
                   avatar_initials, theme, currency, notify_email, notify_push, notify_sms)
VALUES (N'nguyenvana',
        N'$2b$11$mcBJFodnc18eXAJIRdgH1OWMXbm6psb467jSfUJOt.S1TkoWr.78K',  -- = Abc@123456
        N'Nguyễn Văn A', N'nguyenvana@email.com',
        N'NA', N'light', N'VND', 1, 1, 0);
SET @uid = SCOPE_IDENTITY();
PRINT N'• user_id mới = ' + CAST(@uid AS NVARCHAR(10));

-- ─── 2. Tiền tệ (VND chính) ─────────────────────────────────────
INSERT INTO Currencies (user_id, code, name, symbol, decimal_places, is_enabled, is_primary) VALUES
(@uid, N'VND', N'Vietnamese Dong', N'₫', 0, 1, 1),
(@uid, N'USD', N'US Dollar',       N'$', 2, 1, 0),
(@uid, N'EUR', N'Euro',            N'€', 2, 1, 0),
(@uid, N'JPY', N'Japanese Yen',    N'¥', 0, 1, 0);

-- ─── 3. Tỷ giá hối đoái ─────────────────────────────────────────
INSERT INTO Exchange_Rates (user_id, from_currency, to_currency, rate, rate_date) VALUES
(@uid, N'USD', N'VND', 25200, '2026-01-01'),
(@uid, N'EUR', N'VND', 27300, '2026-01-01'),
(@uid, N'JPY', N'VND',   165, '2026-01-01'),
(@uid, N'USD', N'VND', 25400, '2026-06-01'),
(@uid, N'EUR', N'VND', 27600, '2026-06-01'),
(@uid, N'JPY', N'VND',   168, '2026-06-01');

-- ─── 4. Tài khoản (Accounts) ────────────────────────────────────
DECLARE @aChecking INT, @aCash INT, @aBiz INT;          -- Assets (1)
DECLARE @aCard INT;                                      -- Liabilities (2)
DECLARE @aSavings INT, @aInvest INT;                     -- Equity (3)
DECLARE @rSalary INT, @rFreelance INT, @rBonus INT;      -- Revenue (4)
DECLARE @eFood INT, @eShopping INT, @eTransport INT, @eFun INT,
        @eBills INT, @eHousing INT, @eHealth INT, @eEdu INT;  -- Expense (5)

-- Assets (type_id=1)
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,1,N'Tài khoản chính','Landmark','blue','#3b82f6','#1d4ed8',25000000,25000000,N'•••• 4892','VND'); SET @aChecking=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,1,N'Tiền mặt','WalletIcon','green','#22c55e','#15803d',1500000,1500000,N'••••','VND'); SET @aCash=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,1,N'Tài khoản phụ','Landmark','orange','#f97316','#c2410c',10000000,10000000,N'•••• 5678','VND'); SET @aBiz=SCOPE_IDENTITY();

-- Liabilities (type_id=2)
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,2,N'Thẻ tín dụng VISA','CreditCard','purple','#a855f7','#7e22ce',0,0,N'•••• 9845','VND'); SET @aCard=SCOPE_IDENTITY();

-- Equity (type_id=3)
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,3,N'Quỹ tiết kiệm','WalletIcon','emerald','#10b981','#047857',50000000,50000000,N'•••• 7231','VND'); SET @aSavings=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,gradient_from,gradient_to,balance,initial_balance,card_number,currency_code)
VALUES (@uid,3,N'Đầu tư chứng khoán','TrendingUp','teal','#14b8a6','#0f766e',100000000,100000000,N'•••• 1122','VND'); SET @aInvest=SCOPE_IDENTITY();

-- Revenue (type_id=4)
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,4,N'Lương chính','DollarSign','green','VND'); SET @rSalary=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,4,N'Thu nhập thêm','Briefcase','emerald','VND'); SET @rFreelance=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,4,N'Tiền thưởng','Gift','yellow','VND'); SET @rBonus=SCOPE_IDENTITY();

-- Expense (type_id=5)
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Ăn uống','Coffee','orange','VND'); SET @eFood=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Mua sắm','ShoppingBag','pink','VND'); SET @eShopping=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Di chuyển','Car','blue','VND'); SET @eTransport=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Giải trí','Heart','purple','VND'); SET @eFun=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Hóa đơn & Tiện ích','Zap','yellow','VND'); SET @eBills=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Nhà ở','Home','green','VND'); SET @eHousing=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Sức khỏe','Heart','red','VND'); SET @eHealth=SCOPE_IDENTITY();
INSERT INTO Accounts (user_id,type_id,name,icon_name,color,currency_code) VALUES (@uid,5,N'Giáo dục','GraduationCap','indigo','VND'); SET @eEdu=SCOPE_IDENTITY();

-- ─── 5. Hóa đơn định kỳ (Bills) ─────────────────────────────────
DECLARE @bRent INT, @bUtil INT, @bNetflix INT, @bSpotify INT, @bGym INT, @bInsurance INT;
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Tiền thuê nhà',5000000,5000000,'2026-01-02','monthly',0,1,N'Thanh toán đầu tháng',N'Nhà ở'); SET @bRent=SCOPE_IDENTITY();
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Điện & Nước',500000,700000,'2026-01-06','monthly',0,1,N'Hóa đơn tiện ích',N'Tiện ích'); SET @bUtil=SCOPE_IDENTITY();
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Netflix',260000,260000,'2026-01-10','monthly',0,1,N'Gói Premium',N'Giải trí'); SET @bNetflix=SCOPE_IDENTITY();
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Spotify',59000,59000,'2026-01-10','monthly',0,1,N'Gói cá nhân',N'Giải trí'); SET @bSpotify=SCOPE_IDENTITY();
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Phòng Gym',450000,450000,'2026-01-01','monthly',0,1,N'Thẻ tập hàng tháng',N'Sức khỏe'); SET @bGym=SCOPE_IDENTITY();
INSERT INTO Bills (user_id,name,amount_min,amount_max,date,end_date,repeat_freq,skip,active,notes,object_group)
VALUES (@uid,N'Bảo hiểm sức khỏe',2500000,2500000,'2026-03-15','2026-12-31','quarterly',0,1,N'Đóng theo quý',N'Bảo hiểm'); SET @bInsurance=SCOPE_IDENTITY();

-- ─── 6. Thủ tục tạm thêm giao dịch (journal + 2 bút toán) ───────
IF OBJECT_ID('tempdb..#AddTx') IS NOT NULL DROP PROCEDURE #AddTx;
GO
CREATE PROCEDURE #AddTx
    @uid INT, @date DATETIME2, @desc NVARCHAR(500),
    @debit INT, @credit INT, @amount DECIMAL(18,2),
    @notes NVARCHAR(MAX) = NULL, @tags NVARCHAR(1000) = NULL,
    @billId INT = NULL, @fAmount DECIMAL(18,2) = NULL, @fCur NVARCHAR(10) = NULL,
    @budgetId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @jid INT;
    INSERT INTO Journal_Entries (user_id,transaction_date,description,notes,tags,bill_id,foreign_amount,foreign_currency_code,budget_id,created_at)
    VALUES (@uid,@date,@desc,@notes,@tags,@billId,@fAmount,@fCur,@budgetId,@date);
    SET @jid = SCOPE_IDENTITY();
    INSERT INTO Journal_Details (journal_id,account_id,debit,credit) VALUES
        (@jid,@debit, @amount,0),
        (@jid,@credit,0,@amount);
END
GO

-- ─── 7. Lấy lại biến ID (sau GO, biến tạm mất) ──────────────────
DECLARE @uid INT = (SELECT user_id FROM Users WHERE user_account=N'nguyenvana');
DECLARE @aChecking INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Tài khoản chính');
DECLARE @aCash     INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Tiền mặt');
DECLARE @aCard     INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Thẻ tín dụng VISA');
DECLARE @rSalary   INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Lương chính');
DECLARE @rFreelance INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Thu nhập thêm');
DECLARE @rBonus    INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Tiền thưởng');
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
DECLARE @bInsurance INT=(SELECT bill_id FROM Bills WHERE user_id=@uid AND name=N'Bảo hiểm sức khỏe');

PRINT N'• Bắt đầu tạo 12 tháng giao dịch (2026)';

-- ─── 8. Vòng lặp 12 tháng (2026-01 .. 2026-12) ──────────────────
DECLARE @m INT = 1, @d DATETIME2, @amt DECIMAL(18,2);
WHILE @m <= 12
BEGIN
    -- THU NHẬP --------------------------------------------------------
    SET @d = DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@m,5) AS DATETIME2));
    EXEC #AddTx @uid,@d,N'Lương tháng',@aChecking,@rSalary,18000000,N'Lương cố định',N'salary,income';

    IF @m IN (3,6,9,11)
    BEGIN
        SET @d = DATEADD(HOUR,14,CAST(DATEFROMPARTS(2026,@m,20) AS DATETIME2));
        EXEC #AddTx @uid,@d,N'Thu nhập freelance',@aChecking,@rFreelance,5000000,N'Việc ngoài giờ',N'freelance,extra';
    END
    IF @m = 6
    BEGIN
        SET @d = DATEADD(HOUR,10,CAST(DATEFROMPARTS(2026,6,30) AS DATETIME2));
        EXEC #AddTx @uid,@d,N'Thưởng giữa năm',@aChecking,@rBonus,10000000,N'KPI Q2',N'bonus';
    END
    IF @m = 12
    BEGIN
        SET @d = DATEADD(HOUR,10,CAST(DATEFROMPARTS(2026,12,28) AS DATETIME2));
        EXEC #AddTx @uid,@d,N'Thưởng cuối năm',@aChecking,@rBonus,20000000,N'Lương tháng 13',N'bonus,yearly';
    END

    -- ĂN UỐNG (4-5 lần/tháng) ----------------------------------------
    SET @d=DATEADD(HOUR,12,CAST(DATEFROMPARTS(2026,@m,3)  AS DATETIME2)); EXEC #AddTx @uid,@d,N'Đi chợ hàng tuần',@eFood,@aChecking,400000,NULL,N'food,grocery';
    SET @d=DATEADD(HOUR,19,CAST(DATEFROMPARTS(2026,@m,10) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Ăn tối cùng bạn bè',@eFood,@aCard,350000,N'Nhà hàng',N'food,dining';
    SET @d=DATEADD(HOUR,8, CAST(DATEFROMPARTS(2026,@m,15) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Ăn sáng & cà phê',@eFood,@aCash,180000,NULL,N'food';
    SET @d=DATEADD(HOUR,12,CAST(DATEFROMPARTS(2026,@m,22) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Mua thực phẩm',@eFood,@aChecking,500000,NULL,N'food,grocery';
    IF @m IN (1,4,7,10)
    BEGIN
        SET @d=DATEADD(HOUR,19,CAST(DATEFROMPARTS(2026,@m,28) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Tiệc cuối tháng',@eFood,@aChecking,800000,N'Tiệc với đồng nghiệp',N'food,dining';
    END

    -- MUA SẮM ---------------------------------------------------------
    SET @amt = 800000 + @m*30000;
    SET @d=DATEADD(HOUR,15,CAST(DATEFROMPARTS(2026,@m,14) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Mua sắm cá nhân',@eShopping,@aChecking,@amt,NULL,N'shopping';
    SET @d=DATEADD(HOUR,16,CAST(DATEFROMPARTS(2026,@m,18) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Mua hàng online (thẻ)',@eShopping,@aCard,650000,N'Thanh toán online',N'shopping,card';

    -- DI CHUYỂN -------------------------------------------------------
    SET @d=DATEADD(HOUR,7,CAST(DATEFROMPARTS(2026,@m,8) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Đổ xăng',@eTransport,@aCash,400000,NULL,N'transport';
    IF @m % 2 = 0
    BEGIN
        SET @d=DATEADD(HOUR,18,CAST(DATEFROMPARTS(2026,@m,25) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Grab đi chơi',@eTransport,@aCash,150000,NULL,N'transport';
    END

    -- GIẢI TRÍ + Subscriptions ----------------------------------------
    SET @d=DATEADD(HOUR,20,CAST(DATEFROMPARTS(2026,@m,16) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Xem phim cuối tuần',@eFun,@aChecking,250000,NULL,N'entertainment';
    SET @d=DATEADD(HOUR,1, CAST(DATEFROMPARTS(2026,@m,10) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Netflix - Thuê bao',@eFun,@aChecking,260000,N'Premium',N'subscription',@bNetflix;
    SET @d=DATEADD(HOUR,1, CAST(DATEFROMPARTS(2026,@m,10) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Spotify - Premium',@eFun,@aChecking,59000, N'Nhạc',N'subscription',@bSpotify;

    -- HÓA ĐƠN & TIỆN ÍCH ---------------------------------------------
    SET @amt = 550000 + @m*10000;
    SET @d=DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@m,6) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Điện & Nước',@eBills,@aChecking,@amt,N'Tiện ích',N'bill,utility',@bUtil;

    -- NHÀ Ở -----------------------------------------------------------
    SET @d=DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@m,2) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Tiền thuê nhà',@eHousing,@aChecking,5000000,N'Thuê căn hộ',N'bill,rent',@bRent;

    -- SỨC KHỎE --------------------------------------------------------
    SET @d=DATEADD(HOUR,6,CAST(DATEFROMPARTS(2026,@m,1) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Phòng Gym',@eHealth,@aChecking,450000,N'Thẻ tập',N'health,gym',@bGym;
    IF @m IN (3,9)
    BEGIN
        SET @d=DATEADD(HOUR,10,CAST(DATEFROMPARTS(2026,@m,12) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Khám sức khỏe định kỳ',@eHealth,@aChecking,1200000,N'Khám tổng quát',N'health';
    END
    IF @m IN (3,6,9,12)
    BEGIN
        SET @d=DATEADD(HOUR,11,CAST(DATEFROMPARTS(2026,@m,15) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Bảo hiểm sức khỏe',@eHealth,@aChecking,2500000,N'Đóng quý',N'insurance',@bInsurance;
    END

    -- GIÁO DỤC --------------------------------------------------------
    IF @m IN (1,9)
    BEGIN
        SET @d=DATEADD(HOUR,18,CAST(DATEFROMPARTS(2026,@m,11) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Khóa học online',@eEdu,@aChecking,2500000,N'Kỹ năng mềm',N'education';
    END

    -- CHUYỂN TIỀN: Rút tiền mặt --------------------------------------
    SET @d=DATEADD(HOUR,11,CAST(DATEFROMPARTS(2026,@m,7) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Rút tiền mặt',@aCash,@aChecking,1000000,N'Chuyển nội bộ',N'transfer';

    -- THANH TOÁN THẺ TÍN DỤNG ----------------------------------------
    SET @d=DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@m,28) AS DATETIME2)); EXEC #AddTx @uid,@d,N'Thanh toán thẻ tín dụng',@aCard,@aChecking,1000000,N'Trả nợ thẻ',N'transfer,card';

    SET @m = @m + 1;
END

PRINT N'• Đã tạo xong giao dịch 12 tháng';

-- ─── 9. Tạo Budgets chi tiêu + link budget_id vào giao dịch tháng 6 ──
-- (Biến @uid, @aChecking, @aCash, @eHousing, @eFun... vẫn còn từ section 7)

-- Tạo budgets expense
DECLARE @budgetFood INT, @budgetShopping INT, @budgetTransport INT,
        @budgetFun INT, @budgetBills INT, @budgetHousing INT;

INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,period_type,start_date,icon_name,color)
SELECT @uid, a.account_id, a.name, 'expense', x.target, 0, 'monthly', '2026-06-11', a.icon_name, a.color
FROM Accounts a
JOIN (VALUES
    (N'Ăn uống',          2500000),
    (N'Mua sắm',          2000000),
    (N'Di chuyển',         800000),
    (N'Giải trí',         1000000),
    (N'Hóa đơn & Tiện ích',1500000),
    (N'Nhà ở',            6000000)
) x(name,target) ON x.name = a.name
WHERE a.user_id=@uid AND a.type_id=5;

-- Gán budget_id vào biến
SELECT @budgetFood     = budget_id FROM Budgets WHERE user_id=@uid AND title=N'Ăn uống';
SELECT @budgetShopping = budget_id FROM Budgets WHERE user_id=@uid AND title=N'Mua sắm';
SELECT @budgetTransport= budget_id FROM Budgets WHERE user_id=@uid AND title=N'Di chuyển';
SELECT @budgetFun      = budget_id FROM Budgets WHERE user_id=@uid AND title=N'Giải trí';
SELECT @budgetBills    = budget_id FROM Budgets WHERE user_id=@uid AND title=N'Hóa đơn & Tiện ích';
SELECT @budgetHousing  = budget_id FROM Budgets WHERE user_id=@uid AND title=N'Nhà ở';

-- Cập nhật current_amount = tổng chi tháng 6 (hiện tại)
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

-- Link budget_id vào giao dịch tháng 6 để minh họa tính năng budget tracking
-- Ăn uống
UPDATE je SET budget_id = @budgetFood
FROM Journal_Entries je
WHERE je.user_id=@uid
  AND je.journal_id IN (
    SELECT je2.journal_id FROM Journal_Entries je2
    INNER JOIN Journal_Details jd ON jd.journal_id=je2.journal_id AND jd.account_id=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Ăn uống')
    WHERE je2.transaction_date >= '2026-06-01' AND je2.transaction_date < '2026-07-01'
  );

-- Mua sắm
UPDATE je SET budget_id = @budgetShopping
FROM Journal_Entries je
WHERE je.user_id=@uid
  AND je.journal_id IN (
    SELECT je2.journal_id FROM Journal_Entries je2
    INNER JOIN Journal_Details jd ON jd.journal_id=je2.journal_id AND jd.account_id=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Mua sắm')
    WHERE je2.transaction_date >= '2026-06-01' AND je2.transaction_date < '2026-07-01'
  );

-- Giải trí (Netflix + Spotify)
UPDATE je SET budget_id = @budgetFun
FROM Journal_Entries je
WHERE je.user_id=@uid
  AND je.journal_id IN (
    SELECT je2.journal_id FROM Journal_Entries je2
    INNER JOIN Journal_Details jd ON jd.journal_id=je2.journal_id AND jd.account_id=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Giải trí')
    WHERE je2.transaction_date >= '2026-06-01' AND je2.transaction_date < '2026-07-01'
  );

-- Cập nhật lại current_amount dựa trên budget_id (không phải account_id)
UPDATE b SET current_amount = ISNULL((
    SELECT SUM(jd.debit) FROM Journal_Entries je
    INNER JOIN Journal_Details jd ON jd.journal_id=je.journal_id
    WHERE je.budget_id = b.budget_id AND jd.debit > 0
), 0)
FROM Budgets b
WHERE b.user_id=@uid AND b.budget_type='expense';

PRINT N'• Đã tạo budgets chi tiêu và link giao dịch tháng 6';

-- ─── 10. Tạo budgets chi tiêu con (Ăn sáng, trưa, tối) minh họa ──
DECLARE @aAnUong INT = (SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Ăn uống');
DECLARE @bgSang INT, @bgTrua INT, @bgToi INT;

INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,period_type,start_date,icon_name,color)
VALUES (@uid,@aAnUong,N'Ăn sáng','expense',150000,0,'daily','2026-06-11',N'Coffee',N'orange'); SET @bgSang=SCOPE_IDENTITY();
INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,period_type,start_date,icon_name,color)
VALUES (@uid,@aAnUong,N'Ăn trưa','expense',200000,0,'daily','2026-06-11',N'Coffee',N'orange'); SET @bgTrua=SCOPE_IDENTITY();
INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,period_type,start_date,icon_name,color)
VALUES (@uid,@aAnUong,N'Ăn tối','expense',250000,0,'daily','2026-06-11',N'Coffee',N'orange'); SET @bgToi=SCOPE_IDENTITY();

-- Tạo giao dịch mẫu cho budget con (ngày 11/06)
DECLARE @jid1 INT, @jid2 INT;

INSERT INTO Journal_Entries (user_id,transaction_date,description,notes,tags,budget_id,created_at)
VALUES (@uid,'2026-06-11 06:30:00',N'Ăn sáng: bánh mì + sữa',NULL,N'food',@bgSang,'2026-06-11');
SET @jid1 = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id,account_id,debit,credit) VALUES
    (@jid1,@aAnUong,35000,0),
    (@jid1,@aCash,0,35000);

INSERT INTO Journal_Entries (user_id,transaction_date,description,notes,tags,budget_id,created_at)
VALUES (@uid,'2026-06-11 11:30:00',N'Ăn trưa: cơm văn phòng',NULL,N'food',@bgTrua,'2026-06-11');
SET @jid2 = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id,account_id,debit,credit) VALUES
    (@jid2,@aAnUong,45000,0),
    (@jid2,@aCash,0,45000);

-- Update current_amount cho budget con
UPDATE Budgets SET current_amount = 35000 WHERE budget_id = @bgSang;
UPDATE Budgets SET current_amount = 45000 WHERE budget_id = @bgTrua;

PRINT N'• Đã tạo budgets con (Ăn sáng, trưa, tối)';

-- ─── 11. Mục tiêu tiết kiệm (Savings) + Piggy events ────────────
DECLARE @aSavings INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Quỹ tiết kiệm');
DECLARE @aInvest  INT=(SELECT account_id FROM Accounts WHERE user_id=@uid AND name=N'Đầu tư chứng khoán');
DECLARE @pgVacation INT, @pgHouse INT, @pgEmergency INT;

INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,monthly_contribution,start_date,deadline,icon_name,color)
VALUES (@uid,@aSavings,N'Du lịch Nhật Bản','savings',80000000,45000000,10000000,'2026-01-01',N'Dec 2026','Plane','blue'); SET @pgVacation=SCOPE_IDENTITY();
INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,monthly_contribution,start_date,deadline,icon_name,color)
VALUES (@uid,@aInvest, N'Mua xe hơi',      'savings',500000000,80000000,15000000,'2026-01-01',N'Jun 2028','Car',  'green'); SET @pgHouse=SCOPE_IDENTITY();
INSERT INTO Budgets (user_id,account_id,title,budget_type,target_amount,current_amount,monthly_contribution,start_date,deadline,icon_name,color)
VALUES (@uid,@aSavings,N'Quỹ dự phòng',    'savings',50000000,35000000,5000000,'2026-01-01',N'Dec 2026','Shield','red'); SET @pgEmergency=SCOPE_IDENTITY();

-- Sự kiện nạp tiền (Jan..Jun)
DECLARE @mm INT=1;
WHILE @mm<=6
BEGIN
    INSERT INTO Piggy_Bank_Events (budget_id,amount,event_date,notes)
    VALUES (@pgVacation,10000000,DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@mm,5) AS DATETIME2)),N'Tiết kiệm tháng '+CAST(@mm AS NVARCHAR(2)));
    INSERT INTO Piggy_Bank_Events (budget_id,amount,event_date,notes)
    VALUES (@pgEmergency,5000000,DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@mm,5) AS DATETIME2)),N'Dự phòng tháng '+CAST(@mm AS NVARCHAR(2)));
    INSERT INTO Piggy_Bank_Events (budget_id,amount,event_date,notes)
    VALUES (@pgHouse,15000000,DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,@mm,6) AS DATETIME2)),N'Tích lũy mua xe');
    SET @mm=@mm+1;
END
-- 1 lần rút
INSERT INTO Piggy_Bank_Events (budget_id,amount,event_date,notes)
VALUES (@pgVacation,-5000000,DATEADD(HOUR,9,CAST(DATEFROMPARTS(2026,4,15) AS DATETIME2)),N'Rút tạm ứng đặt tour');

PRINT N'• Đã tạo mục tiêu tiết kiệm';

-- ─── 12. Giao dịch định kỳ (Recurring) ──────────────────────────
DECLARE @recSalary INT, @recRent INT, @recNetflix INT;

INSERT INTO Recurring_Journals (user_id,debit_account_id,credit_account_id,amount,title,description,frequency,interval_value,next_run_date,is_active)
VALUES (@uid,@aChecking,@rSalary,18000000,N'Lương hàng tháng',N'Tự động ghi nhận lương',N'monthly',1,'2026-07-05',1); SET @recSalary=SCOPE_IDENTITY();
INSERT INTO Recurring_Journals (user_id,debit_account_id,credit_account_id,amount,title,description,frequency,interval_value,next_run_date,is_active)
VALUES (@uid,@eHousing,@aChecking,5000000,N'Tiền thuê nhà',N'Trừ tự động đầu tháng',N'monthly',1,'2026-07-02',1); SET @recRent=SCOPE_IDENTITY();
INSERT INTO Recurring_Journals (user_id,debit_account_id,credit_account_id,amount,title,description,frequency,interval_value,next_run_date,is_active)
VALUES (@uid,@eFun,@aChecking,260000,N'Netflix',N'Thuê bao Netflix',N'monthly',1,'2026-07-10',1); SET @recNetflix=SCOPE_IDENTITY();

INSERT INTO Recurring_Instances (recurring_id,due_date,status) VALUES
(@recSalary,'2026-05-05','completed'),(@recSalary,'2026-06-05','completed'),(@recSalary,'2026-07-05','pending'),
(@recRent,  '2026-05-02','completed'),(@recRent,  '2026-06-02','completed'),(@recRent,  '2026-07-02','pending'),
(@recNetflix,'2026-05-10','completed'),(@recNetflix,'2026-06-10','completed'),(@recNetflix,'2026-07-10','pending');

-- ─── 13. Quy tắc tự động (Rules) ────────────────────────────────
DECLARE @grp INT, @rule1 INT, @rule2 INT;
INSERT INTO Rule_Groups (user_id,title,description,[order],is_active)
VALUES (@uid,N'Phân loại tự động',N'Nhóm quy tắc gán nhãn & danh mục',0,1); SET @grp=SCOPE_IDENTITY();

INSERT INTO Rules (user_id,group_id,title,description,[order],is_active,strict,stop_processing,runs,last_run_at)
VALUES (@uid,@grp,N'Gắn nhãn Netflix',N'Netflix → tag subscription',0,1,1,0,12,'2026-06-10'); SET @rule1=SCOPE_IDENTITY();
INSERT INTO Rule_Triggers (rule_id,trigger_type,trigger_value,[order],is_active) VALUES (@rule1,N'description_contains',N'Netflix',0,1);
INSERT INTO Rule_Actions  (rule_id,action_type,action_value,[order],is_active) VALUES (@rule1,N'add_tag',N'subscription',0,1);

INSERT INTO Rules (user_id,group_id,title,description,[order],is_active,strict,stop_processing,runs,last_run_at)
VALUES (@uid,@grp,N'Chi tiêu lớn',N'Số tiền > 5.000.000 → ghi chú',1,1,1,0,5,'2026-06-02'); SET @rule2=SCOPE_IDENTITY();
INSERT INTO Rule_Triggers (rule_id,trigger_type,trigger_value,[order],is_active) VALUES (@rule2,N'amount_more',N'5000000',0,1);
INSERT INTO Rule_Actions  (rule_id,action_type,action_value,[order],is_active) VALUES (@rule2,N'append_notes',N'Chi tiêu lớn',0,1);

-- ─── 14. Webhooks ───────────────────────────────────────────────
DECLARE @wh INT;
INSERT INTO Webhooks (user_id,title,url,trigger_type,response,secret,is_active)
VALUES (@uid,N'Slack Notification',N'https://hooks.slack.com/services/DEMO2/T0000/yyyy',N'STORE_TRANSACTION',N'TRANSACTIONS',N'nguyenvana-secret',1); SET @wh=SCOPE_IDENTITY();
INSERT INTO Webhook_Messages (webhook_id,journal_id,payload,status_code,success,response_body,sent_at)
SELECT TOP 1 @wh, je.journal_id, N'{"event":"STORE_TRANSACTION","source":"seed"}', 200, 1, N'ok', je.transaction_date
FROM Journal_Entries je WHERE je.user_id=@uid ORDER BY je.transaction_date DESC;

-- ─── 15. Attachments ────────────────────────────────────────────
INSERT INTO Attachments (user_id,attachable_type,attachable_id,title,notes,filename,mime,size,file_path)
SELECT TOP 1 @uid,'transaction',je.journal_id,N'Hóa đơn ăn uống',N'Ảnh chụp hóa đơn',N'receipt_nguyenvana.jpg',N'image/jpeg',204800,N'seeds/receipt.jpg'
FROM Journal_Entries je WHERE je.user_id=@uid AND je.description=N'Đi chợ hàng tuần' ORDER BY je.transaction_date DESC;
INSERT INTO Attachments (user_id,attachable_type,attachable_id,title,notes,filename,mime,size,file_path)
SELECT @uid,'bill',b.bill_id,N'Hợp đồng thuê nhà',N'Scan hợp đồng',N'contract_rent.pdf',N'application/pdf',512000,N'seeds/contract.pdf'
FROM Bills b WHERE b.user_id=@uid AND b.name=N'Tiền thuê nhà';

-- ─── 16. Tính lại số dư tài khoản ──────────────────────────────
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

-- ─── 17. Báo cáo nhanh ─────────────────────────────────────────
DECLARE @uid INT = (SELECT user_id FROM Users WHERE user_account=N'nguyenvana');
PRINT N'═══════════════════════════════════════════';
PRINT N'  SEED HOÀN TẤT — user_id = '+CAST(@uid AS NVARCHAR(10));
PRINT N'  Đăng nhập: nguyenvana / Abc@123456';
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
