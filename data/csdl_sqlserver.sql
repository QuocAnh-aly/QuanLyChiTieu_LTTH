-- =============================================
-- DATABASE: Budget Management (MoneyFlow)
-- Script for SQL Server (MSSQLLocalDB)
-- Mô hình: Kế toán 5 loại Account
--   Assets, Liabilities, Equity, Revenue, Expense
-- Savings + Budget gộp chung thành Budgets
-- =============================================

-- =============================================
-- 1. NGƯỜI DÙNG (Users)
-- Frontend: Layout.jsx (tên, email, avatar)
--           Profile.jsx / Preferences.jsx (theme, currency, notifications)
-- =============================================
CREATE DATABASE BudgetManagement
GO

USE BudgetManagement
GO 

CREATE TABLE Users (
	user_id INT IDENTITY(1,1) PRIMARY KEY,
	user_account NVARCHAR(50) NOT NULL UNIQUE,
	password_hash NVARCHAR(255) NOT NULL,
	user_name NVARCHAR(100) DEFAULT 'BonSpark',
	email NVARCHAR(100),
	avatar_initials NVARCHAR(5) DEFAULT 'JD',
	theme NVARCHAR(10) DEFAULT 'light',
	currency NVARCHAR(10) DEFAULT 'USD',
	notify_email BIT DEFAULT 1,
	notify_push BIT DEFAULT 1,
	notify_sms BIT DEFAULT 0,
	created_at DATETIME2 DEFAULT GETDATE(),
	CONSTRAINT CHK_Theme CHECK (theme IN ('light', 'dark', 'auto'))
);

-- =============================================
-- 2. LOẠI TÀI KHOẢN KẾ TOÁN (Account_Types)
-- 5 loại cơ bản theo nguyên tắc kế toán:
--   1. Assets      (Tài sản)   → Checking, Business, Cash
--   2. Liabilities (Nợ)        → Credit Card, Loan
--   3. Equity      (Vốn chủ)   → Tiết kiệm, Investment
--   4. Revenue     (Thu nhập)  → Lương, Freelance
--   5. Expense     (Chi phí)   → Food, Shopping, Bills...
-- =============================================
CREATE TABLE Account_Types (
	type_id INT IDENTITY(1,1) PRIMARY KEY,
	type_name NVARCHAR(50) NOT NULL UNIQUE
);

SET IDENTITY_INSERT Account_Types ON;
INSERT INTO Account_Types (type_id, type_name) VALUES
(1, 'Assets'),
(2, 'Liabilities'),
(3, 'Equity'),
(4, 'Revenue'),
(5, 'Expense');
SET IDENTITY_INSERT Account_Types OFF;

-- =============================================
-- 3. TÀI KHOẢN (Accounts)
-- Mỗi account thuộc 1 trong 5 loại trên
-- Frontend AssetAccounts.jsx    : hiển thị tài khoản Assets
--          Liabilities.jsx      : tài khoản Liabilities
--          ExpenseAccounts.jsx  : danh mục chi tiêu (Expense)
--          RevenueAccounts.jsx  : nguồn thu nhập (Revenue)
--          Dashboard.jsx        : tổng hợp từ Revenue/Expense
-- =============================================
CREATE TABLE Accounts (
	account_id INT IDENTITY(1,1) PRIMARY KEY,
	user_id INT NOT NULL,
	type_id INT NOT NULL,
	name NVARCHAR(100) NOT NULL,
	icon_name NVARCHAR(30) DEFAULT 'Landmark',
	color NVARCHAR(20) DEFAULT 'blue',
	gradient_from NVARCHAR(10) DEFAULT '#3b82f6',
	gradient_to NVARCHAR(10) DEFAULT '#1d4ed8',
	balance DECIMAL(18,2) DEFAULT 0,
	initial_balance DECIMAL(18,2) DEFAULT 0,
	card_number NVARCHAR(20) DEFAULT '•••• ••••',
	currency_code NVARCHAR(10) NOT NULL DEFAULT 'USD',
	is_active BIT DEFAULT 1,
	created_at DATETIME2 DEFAULT GETDATE(),
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
	FOREIGN KEY (type_id) REFERENCES Account_Types(type_id)
);

-- Dữ liệu mẫu (bỏ comment để INSERT):
-- Assets (type_id=1):
-- INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, initial_balance, card_number) VALUES
-- (1, 1, 'Main Checking', 'Landmark', 'blue', '#3b82f6', '#1d4ed8', 8450.50, 8450.50, '•••• 4892'),
-- (1, 1, 'Business Account', 'Landmark', 'orange', '#f97316', '#c2410c', 15200.00, 15200.00, '•••• 3421');
-- Liabilities (type_id=2):
-- INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, card_number) VALUES
-- (1, 2, 'Credit Card', 'CreditCard', 'purple', '#a855f7', '#7e22ce', -1250.00, '•••• 9845');
-- Equity / Tiết kiệm (type_id=3):
-- INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, card_number) VALUES
-- (1, 3, 'Savings Account', 'WalletIcon', 'green', '#22c55e', '#15803d', 25300.00, '•••• 7231'),
-- (1, 3, 'Investment Account', 'TrendingUp', 'emerald', '#10b981', '#047857', 5000.00, '•••• 1122');
-- Revenue (type_id=4):
-- INSERT INTO Accounts (user_id, type_id, name, icon_name, color) VALUES
-- (1, 4, 'Salary', 'DollarSign', 'green'),
-- (1, 4, 'Freelance', 'DollarSign', 'emerald');
-- Expense (type_id=5):
-- INSERT INTO Accounts (user_id, type_id, name, icon_name, color) VALUES
-- (1, 5, 'Food & Dining', 'Coffee', 'orange'),
-- (1, 5, 'Shopping', 'ShoppingBag', 'pink'),
-- (1, 5, 'Transportation', 'Car', 'blue'),
-- (1, 5, 'Entertainment', 'Heart', 'purple'),
-- (1, 5, 'Bills & Utilities', 'Zap', 'yellow'),
-- (1, 5, 'Housing', 'Home', 'green'),
-- (1, 5, 'Healthcare', 'Heart', 'red'),
-- (1, 5, 'Education', 'GraduationCap', 'indigo');

-- =============================================
-- 4. GIAO DỊCH KÉP (Journal_Entries + Journal_Details)
-- Mỗi giao dịch tạo ít nhất 2 bút toán (debit + credit)
-- Frontend Transactions.jsx  : danh sách giao dịch
--          Withdrawal.jsx     : giao dịch chi tiêu
--          Deposit.jsx        : giao dịch thu nhập
--          Transfers.jsx      : chuyển khoản nội bộ
--          Dashboard.jsx      : recent transactions, income vs expense
--
-- Ví dụ giao dịch kép:
--   1) Nhận lương $5000 vào Checking:
--      Debit  Checking (Assets)       $5000
--      Credit Salary (Revenue)        $5000
--   2) Mua đồ ăn $85.50 từ Checking:
--      Debit  Food & Dining (Expense) $85.50
--      Credit Checking (Assets)       $85.50
--   3) Chuyển $1000 Checking → Savings:
--      Debit  Savings Account (Equity) $1000
--      Credit Checking (Assets)        $1000
--   4) Trả Credit Card $500 từ Checking:
--      Debit  Credit Card (Liabilities) $500
--      Credit Checking (Assets)         $500
-- =============================================
CREATE TABLE Journal_Entries (
	journal_id INT IDENTITY(1,1) PRIMARY KEY,
	user_id INT NOT NULL,
	transaction_date DATETIME2 NOT NULL,
	description NVARCHAR(500) DEFAULT 'Unknown',
	notes NVARCHAR(MAX) NULL,
	tags NVARCHAR(1000) NULL,
	bill_id INT NULL,                    -- liên kết subscription (Bills)
	budget_id INT NULL,                  -- ngân sách mà giao dịch chi tiêu này được tính vào (FK thêm ở section 5)
	foreign_amount DECIMAL(18,2) NULL,           -- amount in original currency (when different from primary)
	foreign_currency_code NVARCHAR(10) NULL,     -- original currency code (e.g. 'USD' for "85.50 USD ≈ 2,176,000 VND")
	created_at DATETIME2 DEFAULT GETDATE(),
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
	-- FK bill_id → Bills được thêm ở section 9 (sau khi tạo bảng Bills)
);

CREATE INDEX idx_journal_user_date ON Journal_Entries (user_id, transaction_date);

CREATE TABLE Journal_Details (
	detail_id INT IDENTITY(1,1) PRIMARY KEY,
	journal_id INT NOT NULL,
	account_id INT NOT NULL,
	debit DECIMAL(18,2) DEFAULT 0,
	credit DECIMAL(18,2) DEFAULT 0,
	FOREIGN KEY (journal_id) REFERENCES Journal_Entries(journal_id) ON DELETE CASCADE,
	FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
);

CREATE INDEX idx_detail_journal ON Journal_Details (journal_id);
CREATE INDEX idx_detail_account ON Journal_Details (account_id);

-- =============================================
-- 5. NGÂN SÁCH + MỤC TIÊU TIẾT KIỆM (Budgets)
-- Frontend Budgets.jsx    : ngân sách chi tiêu theo danh mục
--          PiggyBanks.jsx : mục tiêu / heo đất tiết kiệm
--
-- budget_type:
--   'expense' → Ngân sách chi tiêu (Budgets.jsx)
--               account_id → Expense account (Food, Shopping...)
--               target_amount = giới hạn ngân sách
--               current_amount = đã chi (spent)
--   'savings' → Mục tiêu tiết kiệm (PiggyBanks.jsx)
--               account_id → Equity account (Savings, Investment...)
--               target_amount = mục tiêu tiết kiệm
--               current_amount = đã tiết kiệm (saved)
--               monthly_contribution = đóng góp hàng tháng
-- =============================================
CREATE TABLE Budgets (
	budget_id INT IDENTITY(1,1) PRIMARY KEY,
	user_id INT NOT NULL,
	account_id INT NOT NULL,
	title NVARCHAR(100) NOT NULL,
	budget_type NVARCHAR(20) NOT NULL DEFAULT 'expense',
	target_amount DECIMAL(18,2) NOT NULL,
	current_amount DECIMAL(18,2) DEFAULT 0,
	monthly_contribution DECIMAL(18,2) DEFAULT 0,
	period_type NVARCHAR(20) DEFAULT 'monthly',
	start_date DATE NOT NULL,
	end_date DATE NULL,
	deadline NVARCHAR(20) NULL,
	icon_name NVARCHAR(30) DEFAULT 'Coffee',
	color NVARCHAR(20) DEFAULT 'orange',
	is_active BIT DEFAULT 1,
	created_at DATETIME2 DEFAULT GETDATE(),
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
	FOREIGN KEY (account_id) REFERENCES Accounts(account_id),
	CONSTRAINT CHK_BudgetType CHECK (budget_type IN ('expense', 'savings')),
	CONSTRAINT CHK_PeriodType CHECK (period_type IN ('daily', 'weekly', 'monthly', 'yearly'))
);

CREATE INDEX idx_budget_user_type ON Budgets (user_id, budget_type);

-- FK Journal_Entries.budget_id → Budgets. Dùng NO ACTION (tránh multi-path cascade
-- giống bill_id); Service tự set budget_id = NULL cho các giao dịch trước khi xóa Budget.
ALTER TABLE Journal_Entries ADD CONSTRAINT FK_JournalEntries_Budgets
	FOREIGN KEY (budget_id) REFERENCES Budgets(budget_id) ON DELETE NO ACTION;
CREATE INDEX idx_journal_budget ON Journal_Entries (budget_id);

-- Dữ liệu mẫu:
-- budget_type = 'expense':
-- INSERT INTO Budgets (user_id, account_id, title, budget_type, target_amount, current_amount, start_date) VALUES
-- (1, <food_account_id>,     'Food & Dining', 'expense', 1500, 1200, '2026-05-01'),
-- (1, <shopping_account_id>, 'Shopping',      'expense', 1000,  800, '2026-05-01');
-- budget_type = 'savings':
-- INSERT INTO Budgets (user_id, account_id, title, budget_type, target_amount, current_amount, monthly_contribution, deadline) VALUES
-- (1, <savings_account_id>,    'Vacation to Europe',  'savings', 5000,  3200, 300,  'Dec 2026'),
-- (1, <investment_account_id>, 'House Down Payment',  'savings', 50000, 12000, 1500, 'Jan 2028');

-- =============================================
-- 6. GIAO DỊCH ĐỊNH KỲ (Recurring_Journals)
-- Lương hàng tháng, tiền thuê, subscription...
-- Frontend Recurrences.jsx: quản lý giao dịch tự động
-- =============================================
CREATE TABLE Recurring_Journals (
	recurring_id INT IDENTITY(1,1) PRIMARY KEY,
	user_id INT NOT NULL,
	debit_account_id INT NOT NULL,
	credit_account_id INT NOT NULL,
	amount DECIMAL(18,2) NOT NULL,
	title NVARCHAR(100),
	description NVARCHAR(500),
	frequency NVARCHAR(20) NOT NULL,
	interval_value INT DEFAULT 1,
	next_run_date DATETIME2 NOT NULL,
	is_active BIT DEFAULT 1,
	created_at DATETIME2 DEFAULT GETDATE(),
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
	FOREIGN KEY (debit_account_id) REFERENCES Accounts(account_id),
	FOREIGN KEY (credit_account_id) REFERENCES Accounts(account_id),
	CONSTRAINT CHK_Frequency CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'))
);

-- =============================================
-- 7. LỊCH SỬ THỰC HIỆN GIAO DỊCH ĐỊNH KỲ
-- =============================================
CREATE TABLE Recurring_Instances (
	instance_id INT IDENTITY(1,1) PRIMARY KEY,
	recurring_id INT NOT NULL,
	due_date DATETIME2 NOT NULL,
	status NVARCHAR(20) DEFAULT 'pending',
	journal_id INT NULL,
	FOREIGN KEY (recurring_id) REFERENCES Recurring_Journals(recurring_id) ON DELETE CASCADE,
	FOREIGN KEY (journal_id) REFERENCES Journal_Entries(journal_id),
	CONSTRAINT CHK_Status CHECK (status IN ('pending', 'completed', 'skipped'))
);

-- =============================================
-- 8. LỊCH SỬ HEO ĐẤT (Piggy_Bank_Events)
-- Ghi lại từng lần nạp/rút tiền vào heo đất
-- amount > 0 = nạp vào, amount < 0 = rút ra
-- Frontend PiggyBankDetail.jsx: timeline sự kiện
-- =============================================
CREATE TABLE Piggy_Bank_Events (
	event_id INT IDENTITY(1,1) PRIMARY KEY,
	budget_id INT NOT NULL,
	amount DECIMAL(18,2) NOT NULL,
	event_date DATETIME2 DEFAULT GETDATE(),
	notes NVARCHAR(500) NULL,
	FOREIGN KEY (budget_id) REFERENCES Budgets(budget_id) ON DELETE CASCADE
);

CREATE INDEX idx_piggy_event_budget ON Piggy_Bank_Events (budget_id);

-- =============================================
-- 9. HÓA ĐƠN ĐỊNH KỲ / SUBSCRIPTIONS (Bills)
-- Frontend Subscriptions.jsx       : danh sách hóa đơn
--          SubscriptionDetail.jsx   : chi tiết + lịch sử thanh toán
-- =============================================
CREATE TABLE Bills (
	bill_id INT IDENTITY(1,1) PRIMARY KEY,
	user_id INT NOT NULL,
	name NVARCHAR(255) NOT NULL,
	amount_min DECIMAL(18,2) NOT NULL DEFAULT 0,
	amount_max DECIMAL(18,2) NOT NULL DEFAULT 0,
	date DATE NOT NULL,
	end_date DATE NULL,
	extension_date DATE NULL,
	repeat_freq NVARCHAR(20) NOT NULL DEFAULT 'monthly',
	skip INT NOT NULL DEFAULT 0,
	active BIT NOT NULL DEFAULT 1,
	notes NVARCHAR(MAX) NULL,
	object_group NVARCHAR(255) NULL,
	created_at DATETIME2 DEFAULT GETDATE(),
	CONSTRAINT CHK_BillRepeatFreq CHECK (repeat_freq IN ('daily','weekly','monthly','quarterly','half-year','yearly')),
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_bill_user ON Bills (user_id);

-- Dùng NO ACTION thay vì CASCADE để tránh lỗi multi-path SQL Server
-- (Users→Bills và Users→Journal_Entries đều CASCADE, thêm Bills→Journal_Entries CASCADE sẽ conflict)
-- Service sẽ tự unlink journal_entries.bill_id = NULL trước khi xóa Bill
ALTER TABLE Journal_Entries ADD CONSTRAINT FK_JournalEntries_Bills
	FOREIGN KEY (bill_id) REFERENCES Bills(bill_id) ON DELETE NO ACTION;

-- =============================================
-- 10. TIỀN TỆ (Currencies)
-- Frontend Currencies.jsx : danh sách tiền tệ của user
--          ExchangeRates.jsx : tỷ giá so với tiền tệ chính
-- is_primary = 1 → tiền tệ mặc định khi báo cáo / dashboard.
-- =============================================
CREATE TABLE Currencies (
	currency_id    INT IDENTITY(1,1) PRIMARY KEY,
	user_id        INT NOT NULL,
	code           NVARCHAR(10) NOT NULL,
	name           NVARCHAR(100) NOT NULL,
	symbol         NVARCHAR(10) NOT NULL,
	decimal_places INT DEFAULT 2,
	is_enabled     BIT DEFAULT 1,
	is_primary     BIT DEFAULT 0,
	created_at     DATETIME2 DEFAULT GETDATE(),
	CONSTRAINT FK_Currencies_Users FOREIGN KEY (user_id)
		REFERENCES Users(user_id) ON DELETE CASCADE,
	CONSTRAINT UX_Currencies_User_Code UNIQUE (user_id, code)
);

CREATE INDEX idx_currencies_user ON Currencies (user_id);

-- =============================================
-- 11. TỶ GIÁ HỐI ĐOÁI (Exchange_Rates)
-- rate = "1 from_currency = rate * to_currency"
-- rate_date = ngày hiệu lực (bản ghi mới nhất thắng khi convert).
-- =============================================
CREATE TABLE Exchange_Rates (
	rate_id       INT IDENTITY(1,1) PRIMARY KEY,
	user_id       INT NOT NULL,
	from_currency NVARCHAR(10) NOT NULL,
	to_currency   NVARCHAR(10) NOT NULL,
	rate          DECIMAL(18,8) NOT NULL,
	rate_date     DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
	created_at    DATETIME2 DEFAULT GETDATE(),
	CONSTRAINT FK_ExchangeRates_Users FOREIGN KEY (user_id)
		REFERENCES Users(user_id) ON DELETE CASCADE,
	CONSTRAINT UX_ExchangeRates_Pair_Date UNIQUE (user_id, from_currency, to_currency, rate_date)
);

CREATE INDEX idx_xrates_user_pair ON Exchange_Rates (user_id, from_currency, to_currency);
CREATE INDEX idx_xrates_user_date ON Exchange_Rates (user_id, rate_date);

-- =============================================
-- 12. QUY TẮC TỰ ĐỘNG — Rule_Groups + Rules + Rule_Triggers + Rule_Actions
-- Frontend Rules.jsx : tạo / sửa / chạy thử / áp dụng quy tắc.
-- strict          = ALL triggers phải khớp (vs ANY).
-- stop_processing = dừng các rule kế tiếp khi rule này match.
-- =============================================
CREATE TABLE Rule_Groups (
	group_id    INT IDENTITY(1,1) PRIMARY KEY,
	user_id     INT NOT NULL,
	title       NVARCHAR(255) NOT NULL,
	description NVARCHAR(1000) NULL,
	[order]     INT DEFAULT 0,
	is_active   BIT DEFAULT 1,
	created_at  DATETIME2 DEFAULT GETDATE(),
	CONSTRAINT FK_RuleGroups_Users FOREIGN KEY (user_id)
		REFERENCES Users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_rule_groups_user ON Rule_Groups (user_id);

CREATE TABLE Rules (
	rule_id         INT IDENTITY(1,1) PRIMARY KEY,
	user_id         INT NOT NULL,
	group_id        INT NULL,
	title           NVARCHAR(255) NOT NULL,
	description     NVARCHAR(1000) NULL,
	[order]         INT DEFAULT 0,
	is_active       BIT DEFAULT 1,
	strict          BIT DEFAULT 1,
	stop_processing BIT DEFAULT 0,
	runs            INT DEFAULT 0,
	last_run_at     DATETIME2 NULL,
	created_at      DATETIME2 DEFAULT GETDATE(),
	CONSTRAINT FK_Rules_Users FOREIGN KEY (user_id)
		REFERENCES Users(user_id) ON DELETE CASCADE,
	CONSTRAINT FK_Rules_Groups FOREIGN KEY (group_id)
		REFERENCES Rule_Groups(group_id) ON DELETE NO ACTION
);
CREATE INDEX idx_rules_user  ON Rules (user_id);
CREATE INDEX idx_rules_group ON Rules (group_id);

-- trigger_type values: description_contains | description_is
--                     | amount_more | amount_less | amount_exactly
--                     | source_account_is | destination_account_is
--                     | transaction_type ('withdrawal'/'deposit'/'transfer')
--                     | tag_is | date_after | date_before
--                     | has_no_category | category_is
CREATE TABLE Rule_Triggers (
	trigger_id      INT IDENTITY(1,1) PRIMARY KEY,
	rule_id         INT NOT NULL,
	trigger_type    NVARCHAR(50) NOT NULL,
	trigger_value   NVARCHAR(500) NULL,
	[order]         INT DEFAULT 0,
	is_active       BIT DEFAULT 1,
	stop_processing BIT DEFAULT 0,
	CONSTRAINT FK_RuleTriggers_Rules FOREIGN KEY (rule_id)
		REFERENCES Rules(rule_id) ON DELETE CASCADE
);
CREATE INDEX idx_rule_triggers_rule ON Rule_Triggers (rule_id);

-- action_type values: set_description | append_description
--                    | set_notes | append_notes
--                    | add_tag | remove_tag | clear_tags
--                    | link_to_bill (value = bill_id)
--                    | set_category | delete_transaction
CREATE TABLE Rule_Actions (
	action_id       INT IDENTITY(1,1) PRIMARY KEY,
	rule_id         INT NOT NULL,
	action_type     NVARCHAR(50) NOT NULL,
	action_value    NVARCHAR(1000) NULL,
	[order]         INT DEFAULT 0,
	is_active       BIT DEFAULT 1,
	stop_processing BIT DEFAULT 0,
	CONSTRAINT FK_RuleActions_Rules FOREIGN KEY (rule_id)
		REFERENCES Rules(rule_id) ON DELETE CASCADE
);
CREATE INDEX idx_rule_actions_rule ON Rule_Actions (rule_id);

-- =============================================
-- 13. WEBHOOKS — gửi sự kiện ra hệ thống ngoài
-- Frontend Webhooks.jsx
-- trigger:  STORE_TRANSACTION | UPDATE_TRANSACTION | DESTROY_TRANSACTION
-- response: TRANSACTIONS | ACCOUNTS | NONE
-- secret:   HMAC-SHA256 secret ký payload khi gửi.
-- =============================================
CREATE TABLE Webhooks (
	webhook_id   INT IDENTITY(1,1) PRIMARY KEY,
	user_id      INT NOT NULL,
	title        NVARCHAR(255) NOT NULL,
	url          NVARCHAR(1000) NOT NULL,
	trigger_type NVARCHAR(50) NOT NULL DEFAULT 'STORE_TRANSACTION',
	response     NVARCHAR(50) NOT NULL DEFAULT 'TRANSACTIONS',
	secret       NVARCHAR(255) NULL,
	is_active    BIT DEFAULT 1,
	created_at   DATETIME2 DEFAULT GETDATE(),
	CONSTRAINT FK_Webhooks_Users FOREIGN KEY (user_id)
		REFERENCES Users(user_id) ON DELETE CASCADE
);
CREATE INDEX idx_webhooks_user ON Webhooks (user_id);

CREATE TABLE Webhook_Messages (
	message_id    INT IDENTITY(1,1) PRIMARY KEY,
	webhook_id    INT NOT NULL,
	journal_id    INT NULL,
	payload       NVARCHAR(MAX) NULL,
	status_code   INT NOT NULL DEFAULT 0,    -- 0 = lỗi mạng
	success       BIT NOT NULL DEFAULT 0,
	response_body NVARCHAR(MAX) NULL,
	error_message NVARCHAR(MAX) NULL,
	sent_at       DATETIME2 DEFAULT GETDATE(),
	CONSTRAINT FK_WhMessages_Webhooks FOREIGN KEY (webhook_id)
		REFERENCES Webhooks(webhook_id) ON DELETE CASCADE
);
CREATE INDEX idx_whmessages_webhook ON Webhook_Messages (webhook_id, sent_at DESC);

-- =============================================
-- 14. ATTACHMENTS — file đính kèm (polymorphic)
-- attachable_type: 'transaction' | 'bill' | 'budget' | 'account' | 'piggy' | 'tag'
-- attachable_id:   FK trong bảng đích (không có constraint do polymorphic)
-- file_path:       đường dẫn tương đối dưới AttachmentsRoot trong appsettings.
-- =============================================
CREATE TABLE Attachments (
	attachment_id   INT IDENTITY(1,1) PRIMARY KEY,
	user_id         INT NOT NULL,
	attachable_type NVARCHAR(20) NOT NULL,
	attachable_id   INT NOT NULL,
	title           NVARCHAR(255) NULL,
	notes           NVARCHAR(1000) NULL,
	filename        NVARCHAR(255) NOT NULL,
	mime            NVARCHAR(100) NULL,
	size            BIGINT NOT NULL DEFAULT 0,
	file_path       NVARCHAR(500) NOT NULL,
	uploaded_at     DATETIME2 DEFAULT GETDATE(),
	CONSTRAINT FK_Attachments_Users FOREIGN KEY (user_id)
		REFERENCES Users(user_id) ON DELETE CASCADE,
	CONSTRAINT CHK_Attachable_Type CHECK (
		attachable_type IN ('transaction','bill','budget','account','piggy','tag')
	)
);
CREATE INDEX idx_attachments_user       ON Attachments (user_id);
CREATE INDEX idx_attachments_attachable ON Attachments (attachable_type, attachable_id);

-- =============================================
-- 15. SEED — 4 tiền tệ mặc định cho mỗi user (chạy lại an toàn)
-- Khớp với FALLBACK_CURRENCIES trong SettingsContext của frontend.
-- VND là tiền chính (is_primary=1).
-- =============================================
INSERT INTO Currencies (user_id, code, name, symbol, decimal_places, is_enabled, is_primary)
SELECT u.user_id, v.code, v.name, v.symbol, v.dp, 1, v.is_primary
FROM Users u
CROSS JOIN (VALUES
	(N'VND', N'Vietnamese Dong', N'₫', 0, CAST(1 AS BIT)),
	(N'USD', N'US Dollar',       N'$', 2, CAST(0 AS BIT)),
	(N'EUR', N'Euro',             N'€', 2, CAST(0 AS BIT)),
	(N'JPY', N'Japanese Yen',     N'¥', 0, CAST(0 AS BIT))
) AS v(code, name, symbol, dp, is_primary)
WHERE NOT EXISTS (
	SELECT 1 FROM Currencies c
	WHERE c.user_id = u.user_id AND c.code = v.code
);
