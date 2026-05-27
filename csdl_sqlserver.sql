-- =============================================
-- DATABASE: Budget Management (MoneyFlow)
-- Script for SQL Server (MSSQLLocalDB)
-- =============================================

-- 1. NGƯỜI DÙNG (Users)
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

-- 2. LOẠI TÀI KHOẢN KẾ TOÁN (Account_Types)
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

-- 3. TÀI KHOẢN (Accounts)
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
	is_active BIT DEFAULT 1,
	created_at DATETIME2 DEFAULT GETDATE(),
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
	FOREIGN KEY (type_id) REFERENCES Account_Types(type_id)
);

-- 4. GIAO DỊCH KÉP (Journal_Entries + Journal_Details)
CREATE TABLE Journal_Entries (
	journal_id INT IDENTITY(1,1) PRIMARY KEY,
	user_id INT NOT NULL,
	transaction_date DATETIME2 NOT NULL,
	description NVARCHAR(500) DEFAULT 'Unknown',
	notes NVARCHAR(MAX) NULL,
	tags NVARCHAR(1000) NULL,
	bill_id INT NULL,
	created_at DATETIME2 DEFAULT GETDATE(),
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
	-- FK to Bills added after Bills table: see section 9
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

-- 5. NGÂN SÁCH + MỤC TIÊU TIẾT KIỆM (Budgets)
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

-- 6. GIAO DỊCH ĐỊNH KỲ (Recurring_Journals)
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

-- 7. LỊCH SỬ THỰC HIỆN GIAO DỊCH ĐỊNH KỲ
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

-- 8. LỊCH SỬ LỢN TIẾT KIỆM (Piggy_Bank_Events)
CREATE TABLE Piggy_Bank_Events (
	event_id INT IDENTITY(1,1) PRIMARY KEY,
	budget_id INT NOT NULL,
	amount DECIMAL(18,2) NOT NULL,    -- dương = nạp, âm = rút
	event_date DATETIME2 DEFAULT GETDATE(),
	notes NVARCHAR(500) NULL,
	FOREIGN KEY (budget_id) REFERENCES Budgets(budget_id) ON DELETE CASCADE
);

CREATE INDEX idx_piggy_event_budget ON Piggy_Bank_Events (budget_id);

-- 9. HÓAĐƠN ĐỊNH KỲ / SUBSCRIPTIONS (Bills)
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

-- No cascade here: avoids SQL Server multi-path conflict (Users→Bills and Users→JournalEntries both cascade)
-- The service manually unlinks entries before deleting a Bill
ALTER TABLE Journal_Entries ADD CONSTRAINT FK_JournalEntries_Bills
    FOREIGN KEY (bill_id) REFERENCES Bills(bill_id) ON DELETE NO ACTION;

-- ─── Alter existing DB (run once if tables were already created) ─────────────
-- ALTER TABLE Journal_Entries ADD notes NVARCHAR(MAX) NULL;
-- ALTER TABLE Journal_Entries ADD tags  NVARCHAR(1000) NULL;
-- ALTER TABLE Journal_Entries ADD bill_id INT NULL;
-- ALTER TABLE Journal_Entries ADD CONSTRAINT FK_JournalEntries_Bills
--     FOREIGN KEY (bill_id) REFERENCES Bills(bill_id) ON DELETE NO ACTION;
