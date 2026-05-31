-- =============================================
-- SEED DATA: User demophuc
-- Password: Hohoho@123
-- 87 transactions across Jan-Jul 2026
-- Budgets, savings goals, recurring bills
-- =============================================
-- Run this script after csdl_sqlserver.sql
-- Assume BudgetManagement database already exists
-- =============================================

USE BudgetManagement;
GO

-- =============================================
-- 1. CREATE USER
-- =============================================
IF NOT EXISTS (SELECT 1 FROM Users WHERE user_account = 'demophuc')
BEGIN
    INSERT INTO Users (user_account, password_hash, user_name, email, avatar_initials, theme, currency, notify_email, notify_push, notify_sms, created_at)
    VALUES (
        'demophuc',
        '$2b$10$AYDvZyqAAP1z/zFk5dsnMeDejCsrwlCz15Ug6ShTrZIKnolch9o2K',
        'Demo Phúc',
        'demophuc@example.com',
        'DP',
        'light',
        'VND',
        1, 1, 0,
        '2026-01-01'
    );
END
GO

-- Declare user ID
DECLARE @userId INT = (SELECT user_id FROM Users WHERE user_account = 'demophuc');

-- =============================================
-- 2. CREATE ACCOUNTS
-- =============================================
-- Account_Types: 1=Assets, 2=Liabilities, 3=Equity, 4=Revenue, 5=Expense

-- Assets (type_id=1)
IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'MB Bank')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, initial_balance, card_number, currency_code, is_active, created_at)
    VALUES (@userId, 1, 'MB Bank', 'Landmark', 'blue', '#3b82f6', '#1d4ed8', 103355000, 15000000, '•••• 4892', 'VND', 1, '2026-01-01');

IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Tiền mặt')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, initial_balance, card_number, currency_code, is_active, created_at)
    VALUES (@userId, 1, 'Tiền mặt', 'Wallet', 'green', '#22c55e', '#15803d', 870000, 2000000, '•••• 7231', 'VND', 1, '2026-01-01');

IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Ví điện tử')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, initial_balance, card_number, currency_code, is_active, created_at)
    VALUES (@userId, 1, 'Ví điện tử', 'Smartphone', 'orange', '#f97316', '#c2410c', 1000000, 1000000, '•••• 9845', 'VND', 1, '2026-01-01');

-- Liabilities (type_id=2)
IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Thẻ tín dụng')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, initial_balance, card_number, currency_code, is_active, created_at)
    VALUES (@userId, 2, 'Thẻ tín dụng', 'CreditCard', 'purple', '#a855f7', '#7e22ce', 0, 0, '•••• 3421', 'VND', 1, '2026-01-01');

-- Equity (type_id=3)
IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Quỹ tiết kiệm')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, initial_balance, card_number, currency_code, is_active, created_at)
    VALUES (@userId, 3, 'Quỹ tiết kiệm', 'PiggyBank', 'emerald', '#10b981', '#047857', 19000000, 5000000, '•••• 1122', 'VND', 1, '2026-01-01');

IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Đầu tư')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, initial_balance, card_number, currency_code, is_active, created_at)
    VALUES (@userId, 3, 'Đầu tư', 'TrendingUp', 'indigo', '#6366f1', '#4338ca', 3000000, 3000000, '•••• 5567', 'VND', 1, '2026-01-01');

-- Revenue / Income (type_id=4)
IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Lương chính')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, currency_code, is_active, created_at)
    VALUES (@userId, 4, 'Lương chính', 'DollarSign', 'green', '#22c55e', '#15803d', 75000000, 'VND', 1, '2026-01-01');

IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Freelance')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, currency_code, is_active, created_at)
    VALUES (@userId, 4, 'Freelance', 'Briefcase', 'emerald', '#10b981', '#047857', 13000000, 'VND', 1, '2026-01-01');

-- Expense (type_id=5)
IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Ăn uống')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, balance, currency_code, is_active, created_at)
    VALUES (@userId, 5, 'Ăn uống', 'Pizza', 'red', 5675000, 'VND', 1, '2026-01-01');

IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Di chuyển')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, balance, currency_code, is_active, created_at)
    VALUES (@userId, 5, 'Di chuyển', 'Car', 'blue', 2260000, 'VND', 1, '2026-01-01');

IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Mua sắm')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, balance, currency_code, is_active, created_at)
    VALUES (@userId, 5, 'Mua sắm', 'ShoppingBag', 'pink', 10080000, 'VND', 1, '2026-01-01');

IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Hóa đơn & Dịch vụ')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, balance, currency_code, is_active, created_at)
    VALUES (@userId, 5, 'Hóa đơn & Dịch vụ', 'Zap', 'yellow', 6410000, 'VND', 1, '2026-01-01');

IF NOT EXISTS (SELECT 1 FROM Accounts WHERE user_id = @userId AND name = 'Giải trí')
    INSERT INTO Accounts (user_id, type_id, name, icon_name, color, balance, currency_code, is_active, created_at)
    VALUES (@userId, 5, 'Giải trí', 'Heart', 'purple', 1850000, 'VND', 1, '2026-01-01');

GO

-- =============================================
-- 3. CAPTURE ACCOUNT IDs
-- =============================================
DECLARE @userId INT = (SELECT user_id FROM Users WHERE user_account = 'demophuc');

DECLARE @mbBank       INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'MB Bank');
DECLARE @tienMat      INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Tiền mặt');
DECLARE @viDienTu     INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Ví điện tử');
DECLARE @theTinDung   INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Thẻ tín dụng');
DECLARE @quyTK        INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Quỹ tiết kiệm');
DECLARE @dauTu        INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Đầu tư');
DECLARE @luongChinh   INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Lương chính');
DECLARE @freelance    INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Freelance');
DECLARE @anUong       INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Ăn uống');
DECLARE @diChuyen     INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Di chuyển');
DECLARE @muaSam       INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Mua sắm');
DECLARE @hoaDon       INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Hóa đơn & Dịch vụ');
DECLARE @giaiTri      INT = (SELECT account_id FROM Accounts WHERE user_id = @userId AND name = 'Giải trí');

-- =============================================
-- 4. INSERT TRANSACTIONS — JANUARY 2026
-- =============================================

-- Helper: Income transaction (Credit Revenue → Debit Asset)
-- Format: INSERT Journal_Entry, then 2 Journal_Details

-- Tx 1: Lương tháng 1 (05/01)
DECLARE @jid INT;

-- Tx 1: Lương tháng 1 (05/01)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-05 08:00:00', N'Lương tháng 1', '2026-01-05 08:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     15000000, 0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @luongChinh, 0,        15000000);

-- Tx 2: Ăn sáng (07/01)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-07 07:30:00', N'Ăn sáng', '2026-01-07 07:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  45000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,      45000);

-- Tx 3: Đổ xăng (08/01)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-08 09:15:00', N'Đổ xăng', '2026-01-08 09:15:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  200000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       200000);

-- Tx 4: Mua sắm Tết (10/01)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-10 14:00:00', N'Mua sắm Tết', '2026-01-10 14:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  1500000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,        1500000);

-- Tx 5: Tiền điện tháng 12 (12/01)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-12 10:00:00', N'Tiền điện tháng 12', '2026-01-12 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  650000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       650000);

-- Tx 6: Ăn tối gia đình (15/01) — paid from Tiền mặt
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-15 19:00:00', N'Ăn tối gia đình', '2026-01-15 19:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,   350000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @tienMat,  0,       350000);

-- Tx 7: Grab đi làm (18/01)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-18 08:20:00', N'Grab đi làm', '2026-01-18 08:20:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  80000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,      80000);

-- Tx 8: Mua quần áo (20/01)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-20 16:30:00', N'Mua quần áo', '2026-01-20 16:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  1200000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,        1200000);

-- Tx 9: Tiền nước (22/01)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-22 10:00:00', N'Tiền nước', '2026-01-22 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  250000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       250000);

-- Tx 10: Đi chợ (25/01) — paid from Tiền mặt
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-25 08:00:00', N'Đi chợ', '2026-01-25 08:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,   400000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @tienMat,  0,       400000);

-- Tx 11: Chuyển tiết kiệm (28/01) — Transfer MB Bank → Quỹ tiết kiệm
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-28 09:00:00', N'Chuyển tiết kiệm tháng 1', '2026-01-28 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @quyTK,  2000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank, 0,        2000000);

-- Tx 12: Xem phim (30/01)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-01-30 19:30:00', N'Xem phim', '2026-01-30 19:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @giaiTri,  120000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,   0,       120000);

PRINT N'✓ Tháng 1: 12 giao dịch';

-- =============================================
-- 5. TRANSACTIONS — FEBRUARY 2026
-- =============================================

-- Tx 13: Freelance (02/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-02 10:00:00', N'Thanh toán Freelance tháng 1', '2026-02-02 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     3000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @freelance,  0,        3000000);

-- Tx 14: Lương tháng 2 (05/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-05 08:00:00', N'Lương tháng 2', '2026-02-05 08:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     15000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @luongChinh, 0,         15000000);

-- Tx 15: Ăn trưa (07/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-07 12:00:00', N'Ăn trưa', '2026-02-07 12:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  150000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       150000);

-- Tx 16: Shopping online (10/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-10 15:00:00', N'Shopping online', '2026-02-10 15:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  800000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       800000);

-- Tx 17: Đổ xăng (12/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-12 09:00:00', N'Đổ xăng', '2026-02-12 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  200000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       200000);

-- Tx 18: Tiền internet (15/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-15 10:00:00', N'Tiền internet tháng 2', '2026-02-15 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  350000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       350000);

-- Tx 19: Ăn tối (18/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-18 19:00:00', N'Ăn tối', '2026-02-18 19:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  350000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       350000);

-- Tx 20: Grab (20/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-20 08:30:00', N'Grab đi làm', '2026-02-20 08:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  120000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       120000);

-- Tx 21: Mua sách (22/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-22 11:00:00', N'Mua sách', '2026-02-22 11:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  200000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       200000);

-- Tx 22: Chuyển tiết kiệm (25/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-25 09:00:00', N'Chuyển tiết kiệm tháng 2', '2026-02-25 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @quyTK,  2000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank, 0,        2000000);

-- Tx 23: Gym membership (28/02)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-02-28 07:00:00', N'Tập gym tháng 3', '2026-02-28 07:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @giaiTri,  500000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,   0,       500000);

PRINT N'✓ Tháng 2: 11 giao dịch';

-- =============================================
-- 6. TRANSACTIONS — MARCH 2026
-- =============================================

-- Tx 24: Internet (01/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-01 10:00:00', N'Internet tháng 3', '2026-03-01 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  300000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       300000);

-- Tx 25: Lương tháng 3 (05/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-05 08:00:00', N'Lương tháng 3', '2026-03-05 08:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     15000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @luongChinh, 0,         15000000);

-- Tx 26: Ăn trưa (08/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-08 12:00:00', N'Ăn trưa', '2026-03-08 12:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  180000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       180000);

-- Tx 27: Mua sắm (10/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-10 16:00:00', N'Mua sắm', '2026-03-10 16:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  650000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       650000);

-- Tx 28: Đổ xăng (12/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-12 09:00:00', N'Đổ xăng', '2026-03-12 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  220000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       220000);

-- Tx 29: Ăn tối (15/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-15 19:00:00', N'Ăn tối', '2026-03-15 19:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  420000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       420000);

-- Tx 30: Bảo hiểm (18/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-18 10:00:00', N'Bảo hiểm sức khỏe', '2026-03-18 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  1500000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,        1500000);

-- Tx 31: Chuyển tiết kiệm (20/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-20 09:00:00', N'Chuyển tiết kiệm tháng 3', '2026-03-20 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @quyTK,  2000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank, 0,        2000000);

-- Tx 32: Grab (22/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-22 08:30:00', N'Grab đi làm', '2026-03-22 08:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  90000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,      90000);

-- Tx 33: Ăn uống (25/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-25 12:00:00', N'Ăn trưa', '2026-03-25 12:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  300000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       300000);

-- Tx 34: Freelance (28/03)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-03-28 10:00:00', N'Thanh toán Freelance tháng 3', '2026-03-28 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     2500000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @freelance,  0,        2500000);

PRINT N'✓ Tháng 3: 11 giao dịch';

-- =============================================
-- 7. TRANSACTIONS — APRIL 2026
-- =============================================

-- Tx 35: Tiền điện (02/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-02 10:00:00', N'Tiền điện tháng 3', '2026-04-02 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  650000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       650000);

-- Tx 36: Lương tháng 4 (05/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-05 08:00:00', N'Lương tháng 4', '2026-04-05 08:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     15000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @luongChinh, 0,         15000000);

-- Tx 37: Ăn trưa (08/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-08 12:00:00', N'Ăn trưa', '2026-04-08 12:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  200000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       200000);

-- Tx 38: Shopping (10/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-10 15:00:00', N'Shopping', '2026-04-10 15:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  900000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       900000);

-- Tx 39: Đổ xăng (12/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-12 09:00:00', N'Đổ xăng', '2026-04-12 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  200000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       200000);

-- Tx 40: Ăn tối (15/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-15 19:00:00', N'Ăn tối', '2026-04-15 19:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  380000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       380000);

-- Tx 41: Chuyển tiết kiệm (18/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-18 09:00:00', N'Chuyển tiết kiệm tháng 4', '2026-04-18 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @quyTK,  2000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank, 0,        2000000);

-- Tx 42: Grab (20/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-20 08:30:00', N'Grab đi làm', '2026-04-20 08:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  150000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       150000);

-- Tx 43: Tiền nước (22/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-22 10:00:00', N'Tiền nước', '2026-04-22 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  250000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       250000);

-- Tx 44: Ăn uống (25/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-25 12:00:00', N'Ăn trưa', '2026-04-25 12:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  280000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       280000);

-- Tx 45: Freelance (28/04)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-04-28 10:00:00', N'Thanh toán Freelance tháng 4', '2026-04-28 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     4000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @freelance,  0,        4000000);

PRINT N'✓ Tháng 4: 11 giao dịch';

-- =============================================
-- 8. TRANSACTIONS — MAY 2026 (Current month)
-- =============================================

-- Tx 46: Internet (02/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-02 10:00:00', N'Internet tháng 5', '2026-05-02 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  300000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       300000);

-- Tx 47: Ăn sáng (03/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-03 07:30:00', N'Ăn sáng', '2026-05-03 07:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  50000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,      50000);

-- Tx 48: Lương tháng 5 (05/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-05 08:00:00', N'Lương tháng 5', '2026-05-05 08:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     15000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @luongChinh, 0,         15000000);

-- Tx 49: Mua sắm (08/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-08 15:00:00', N'Mua sắm', '2026-05-08 15:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  550000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       550000);

-- Tx 50: Đổ xăng (10/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-10 09:00:00', N'Đổ xăng', '2026-05-10 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  200000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       200000);

-- Tx 51: Ăn tối (12/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-12 19:00:00', N'Ăn tối', '2026-05-12 19:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  450000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       450000);

-- Tx 52: Grab (15/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-15 08:30:00', N'Grab đi làm', '2026-05-15 08:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  100000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       100000);

-- Tx 53: Chuyển tiết kiệm (17/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-17 09:00:00', N'Chuyển tiết kiệm tháng 5', '2026-05-17 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @quyTK,  2000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank, 0,        2000000);

-- Tx 54: Ăn trưa (19/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-19 12:00:00', N'Ăn trưa', '2026-05-19 12:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  320000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       320000);

-- Tx 55: Mua sắm (21/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-21 16:00:00', N'Mua sắm', '2026-05-21 16:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  750000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       750000);

-- Tx 56: Tiền điện (23/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-23 10:00:00', N'Tiền điện tháng 4', '2026-05-23 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  600000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       600000);

-- Tx 57: Freelance (25/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-25 10:00:00', N'Thanh toán Freelance tháng 5', '2026-05-25 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     3500000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @freelance,  0,        3500000);

-- Tx 58: Ăn tối (28/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-28 19:00:00', N'Ăn tối', '2026-05-28 19:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  250000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       250000);

-- Tx 59: Xem phim (30/05)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-05-30 20:00:00', N'Xem phim', '2026-05-30 20:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @giaiTri,  200000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,   0,       200000);

PRINT N'✓ Tháng 5: 14 giao dịch';

-- =============================================
-- 9. TRANSACTIONS — JUNE 2026
-- =============================================

-- Tx 60: Internet (01/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-01 10:00:00', N'Internet tháng 6', '2026-06-01 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  300000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       300000);

-- Tx 61: Ăn sáng (02/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-02 07:30:00', N'Ăn sáng', '2026-06-02 07:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  55000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,      55000);

-- Tx 62: Lương tháng 6 (05/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-05 08:00:00', N'Lương tháng 6', '2026-06-05 08:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     15000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @luongChinh, 0,         15000000);

-- Tx 63: Ăn trưa (08/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-08 12:00:00', N'Ăn trưa', '2026-06-08 12:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  160000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       160000);

-- Tx 64: Đổ xăng (10/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-10 09:00:00', N'Đổ xăng', '2026-06-10 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  210000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       210000);

-- Tx 65: Mua sắm (12/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-12 15:00:00', N'Mua sắm online', '2026-06-12 15:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  480000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       480000);

-- Tx 66: Ăn tối (15/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-15 19:00:00', N'Ăn tối gia đình', '2026-06-15 19:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,   380000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @tienMat,  0,       380000);

-- Tx 67: Netflix (16/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-16 08:00:00', N'Netflix tháng 6', '2026-06-16 08:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @giaiTri,  150000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,   0,       150000);

-- Tx 68: Grab (18/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-18 08:30:00', N'Grab đi làm', '2026-06-18 08:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  110000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       110000);

-- Tx 69: Chuyển tiết kiệm (20/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-20 09:00:00', N'Chuyển tiết kiệm tháng 6', '2026-06-20 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @quyTK,  2000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank, 0,        2000000);

-- Tx 70: Tiền nước (22/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-22 10:00:00', N'Tiền nước', '2026-06-22 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  270000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       270000);

-- Tx 71: Ăn trưa (25/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-25 12:00:00', N'Ăn trưa', '2026-06-25 12:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  220000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       220000);

-- Tx 72: Freelance (28/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-28 10:00:00', N'Thanh toán Freelance tháng 6', '2026-06-28 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     3000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @freelance,  0,        3000000);

-- Tx 73: Xem phim (30/06)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-06-30 20:00:00', N'Xem phim', '2026-06-30 20:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @giaiTri,  180000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,   0,       180000);

PRINT N'✓ Tháng 6: 14 giao dịch';

-- =============================================
-- 10. TRANSACTIONS — JULY 2026
-- =============================================

-- Tx 74: Internet (01/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-01 10:00:00', N'Internet tháng 7', '2026-07-01 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  300000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       300000);

-- Tx 75: Ăn sáng (02/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-02 07:30:00', N'Ăn sáng', '2026-07-02 07:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  45000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,      45000);

-- Tx 76: Lương tháng 7 (05/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-05 08:00:00', N'Lương tháng 7', '2026-07-05 08:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     15000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @luongChinh, 0,         15000000);

-- Tx 77: Ăn trưa (08/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-08 12:00:00', N'Ăn trưa', '2026-07-08 12:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  190000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       190000);

-- Tx 78: Đổ xăng (10/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-10 09:00:00', N'Đổ xăng', '2026-07-10 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  200000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       200000);

-- Tx 79: Mua sắm (12/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-12 15:00:00', N'Mua sắm', '2026-07-12 15:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  1200000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       1200000);

-- Tx 80: Tiền điện (14/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-14 10:00:00', N'Tiền điện tháng 6', '2026-07-14 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @hoaDon,  720000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       720000);

-- Tx 81: Ăn tối (16/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-16 19:00:00', N'Ăn tối', '2026-07-16 19:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  420000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       420000);

-- Tx 82: Chuyển tiết kiệm (18/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-18 09:00:00', N'Chuyển tiết kiệm tháng 7', '2026-07-18 09:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @quyTK,  2000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank, 0,        2000000);

-- Tx 83: Grab (20/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-20 08:30:00', N'Grab đi làm', '2026-07-20 08:30:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @diChuyen,  130000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,    0,       130000);

-- Tx 84: Mua sách (22/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-22 11:00:00', N'Mua sách', '2026-07-22 11:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @muaSam,  350000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       350000);

-- Tx 85: Ăn trưa (25/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-25 12:00:00', N'Ăn trưa', '2026-07-25 12:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @anUong,  250000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,  0,       250000);

-- Tx 86: Freelance (28/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-28 10:00:00', N'Thanh toán Freelance tháng 7', '2026-07-28 10:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,     4000000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @freelance,  0,        4000000);

-- Tx 87: Gym (30/07)
INSERT INTO Journal_Entries (user_id, transaction_date, description, created_at) VALUES (@userId, '2026-07-30 07:00:00', N'Tập gym tháng 8', '2026-07-30 07:00:00');
SET @jid = SCOPE_IDENTITY();
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @giaiTri,  500000,  0);
INSERT INTO Journal_Details (journal_id, account_id, debit, credit) VALUES (@jid, @mbBank,   0,       500000);

PRINT N'✓ Tháng 7: 14 giao dịch';
PRINT N'✓ Tổng cộng: 87 giao dịch';

-- =============================================
-- 11. BUDGETS (Expense budgets)
-- =============================================
INSERT INTO Budgets (user_id, account_id, title, budget_type, target_amount, current_amount, period_type, start_date, icon_name, color, is_active, created_at)
VALUES (@userId, @anUong,   N'Ăn uống',           'expense', 3000000,  2375000,  'monthly', '2026-05-01', 'Pizza',       'red',    1, '2026-05-01');

INSERT INTO Budgets (user_id, account_id, title, budget_type, target_amount, current_amount, period_type, start_date, icon_name, color, is_active, created_at)
VALUES (@userId, @diChuyen, N'Di chuyển',         'expense', 1500000,  800000,    'monthly', '2026-05-01', 'Car',         'blue',   1, '2026-05-01');

INSERT INTO Budgets (user_id, account_id, title, budget_type, target_amount, current_amount, period_type, start_date, icon_name, color, is_active, created_at)
VALUES (@userId, @muaSam,   N'Mua sắm',           'expense', 2500000,  2050000,   'monthly', '2026-05-01', 'ShoppingBag', 'pink',   1, '2026-05-01');

INSERT INTO Budgets (user_id, account_id, title, budget_type, target_amount, current_amount, period_type, start_date, icon_name, color, is_active, created_at)
VALUES (@userId, @hoaDon,   N'Hóa đơn & Dịch vụ', 'expense', 2000000,  900000,    'monthly', '2026-05-01', 'Zap',         'yellow', 1, '2026-05-01');

INSERT INTO Budgets (user_id, account_id, title, budget_type, target_amount, current_amount, period_type, start_date, icon_name, color, is_active, created_at)
VALUES (@userId, @giaiTri,  N'Giải trí',          'expense', 1000000,  200000,    'monthly', '2026-05-01', 'Heart',       'purple', 1, '2026-05-01');

PRINT N'✓ 5 ngân sách chi tiêu';

-- =============================================
-- 12. SAVINGS GOAL (PiggyBank)
-- =============================================
INSERT INTO Budgets (user_id, account_id, title, budget_type, target_amount, current_amount, monthly_contribution, deadline, period_type, start_date, icon_name, color, is_active, created_at)
VALUES (@userId, @quyTK, N'Du lịch Nhật Bản', 'savings', 30000000, 19000000, 2000000, N'Th12 2026', 'monthly', '2026-01-28', 'Plane', 'purple', 1, '2026-01-28');

PRINT N'✓ 1 mục tiêu tiết kiệm';

-- =============================================
-- 13. RECURRING BILLS (Subscriptions)
-- =============================================
INSERT INTO Bills (user_id, name, amount_min, amount_max, date, repeat_freq, active, notes, created_at)
VALUES (@userId, N'Internet VNPT', 300000, 300000, '2026-05-01', 'monthly', 1, N'Internet gia đình', '2026-05-01');

INSERT INTO Bills (user_id, name, amount_min, amount_max, date, repeat_freq, active, notes, created_at)
VALUES (@userId, N'Tập gym', 500000, 500000, '2026-05-28', 'monthly', 1, N'Gym tháng', '2026-05-28');

INSERT INTO Bills (user_id, name, amount_min, amount_max, date, repeat_freq, active, notes, created_at)
VALUES (@userId, N'Netflix', 150000, 150000, '2026-05-15', 'monthly', 1, N'Streaming', '2026-05-15');

PRINT N'✓ 3 hóa đơn định kỳ';

-- =============================================
-- 14. RECURRING JOURNALS
-- =============================================
-- Monthly salary
INSERT INTO Recurring_Journals (user_id, debit_account_id, credit_account_id, amount, title, description, frequency, interval_value, next_run_date, is_active, created_at)
VALUES (@userId, @mbBank, @luongChinh, 15000000, N'Lương tháng', N'Lương chính hàng tháng', 'monthly', 1, '2026-06-05', 1, '2026-01-05');

-- Monthly savings transfer
INSERT INTO Recurring_Journals (user_id, debit_account_id, credit_account_id, amount, title, description, frequency, interval_value, next_run_date, is_active, created_at)
VALUES (@userId, @quyTK, @mbBank, 2000000, N'Tiết kiệm hàng tháng', N'Chuyển tiết kiệm tự động', 'monthly', 1, '2026-06-17', 1, '2026-01-28');

PRINT N'✓ 2 giao dịch định kỳ';

-- =============================================
-- 15. ADD PIGGY BANK EVENTS
-- =============================================
DECLARE @savingsBudgetId INT = (SELECT budget_id FROM Budgets WHERE user_id = @userId AND title = N'Du lịch Nhật Bản');

INSERT INTO Piggy_Bank_Events (budget_id, amount, event_date, notes) VALUES (@savingsBudgetId, 2000000, '2026-01-28', N'Nạp tiết kiệm tháng 1');
INSERT INTO Piggy_Bank_Events (budget_id, amount, event_date, notes) VALUES (@savingsBudgetId, 2000000, '2026-02-25', N'Nạp tiết kiệm tháng 2');
INSERT INTO Piggy_Bank_Events (budget_id, amount, event_date, notes) VALUES (@savingsBudgetId, 2000000, '2026-03-20', N'Nạp tiết kiệm tháng 3');
INSERT INTO Piggy_Bank_Events (budget_id, amount, event_date, notes) VALUES (@savingsBudgetId, 2000000, '2026-04-18', N'Nạp tiết kiệm tháng 4');
INSERT INTO Piggy_Bank_Events (budget_id, amount, event_date, notes) VALUES (@savingsBudgetId, 2000000, '2026-05-17', N'Nạp tiết kiệm tháng 5');
INSERT INTO Piggy_Bank_Events (budget_id, amount, event_date, notes) VALUES (@savingsBudgetId, 2000000, '2026-06-20', N'Nạp tiết kiệm tháng 6');
INSERT INTO Piggy_Bank_Events (budget_id, amount, event_date, notes) VALUES (@savingsBudgetId, 2000000, '2026-07-18', N'Nạp tiết kiệm tháng 7');

PRINT N'✓ 7 sự kiện heo đất';

PRINT N'';
PRINT N'══════════════════════════════════════════════════';
PRINT N'  SEED DATA HOÀN TẤT!';
PRINT N'══════════════════════════════════════════════════';
PRINT N'  Tài khoản: demophuc';
PRINT N'  Mật khẩu:   Hohoho@123';
PRINT N'  87 giao dịch (Th1-Th7/2026)';
PRINT N'  5 ngân sách + 1 mục tiêu tiết kiệm';
PRINT N'  3 hóa đơn định kỳ + 2 giao dịch định kỳ';
PRINT N'══════════════════════════════════════════════════';
GO
