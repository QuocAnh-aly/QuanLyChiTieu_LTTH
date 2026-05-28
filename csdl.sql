-- =============================================
-- DATABASE: Budget Management (MoneyFlow)
-- Mô hình: Kế toán 5 loại Account
--   Assets, Liabilities, Equity, Revenue, Expense
-- Savings + Budget gộp chung thành Budgets
-- Tiền tiết kiệm = Account loại Equity
-- =============================================

-- =============================================
-- 1. NGƯỜI DÙNG (Users)
-- Frontend: Layout.jsx (tên, email, avatar)
--           Account.jsx Settings (theme, currency, notifications)
-- =============================================
CREATE TABLE Users (
	user_id INT AUTO_INCREMENT PRIMARY KEY,
	user_account VARCHAR(50) NOT NULL UNIQUE,
	password_hash VARCHAR(255) NOT NULL,
	user_name VARCHAR(100) DEFAULT 'BonSpark',
	email VARCHAR(100),
	avatar_initials VARCHAR(5) DEFAULT 'JD',
	theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
	currency VARCHAR(10) DEFAULT 'USD',
	notify_email BOOLEAN DEFAULT TRUE,
	notify_push BOOLEAN DEFAULT TRUE,
	notify_sms BOOLEAN DEFAULT FALSE,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2. LOẠI TÀI KHOẢN KẾ TOÁN (Account_Types)
-- 5 loại cơ bản theo nguyên tắc kế toán:
--   1. Assets (Tài sản)       → Checking, Business, Cash
--   2. Liabilities (Nợ)       → Credit Card, Loan
--   3. Equity (Vốn chủ)       → Tiết kiệm, Investment
--   4. Revenue (Thu nhập)      → Lương, Freelance
--   5. Expense (Chi phí)       → Food, Shopping, Bills...
-- =============================================
CREATE TABLE Account_Types (
	type_id INT AUTO_INCREMENT PRIMARY KEY,
	type_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO Account_Types (type_name) VALUES
('Assets'),
('Liabilities'),
('Equity'),
('Revenue'),
('Expense');

-- =============================================
-- 3. TÀI KHOẢN (Accounts)
-- Mỗi account thuộc 1 trong 5 loại trên
-- Frontend Wallet.jsx: hiển thị tài khoản Assets/Liabilities/Equity
--          Dashboard.jsx: tổng hợp từ Revenue/Expense
-- =============================================
CREATE TABLE Accounts (
	account_id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	type_id INT NOT NULL,
	name VARCHAR(100) NOT NULL,
	icon_name VARCHAR(30) DEFAULT 'Landmark',
	color VARCHAR(20) DEFAULT 'blue',
	gradient_from VARCHAR(10) DEFAULT '#3b82f6',
	gradient_to VARCHAR(10) DEFAULT '#1d4ed8',
	balance DECIMAL(18,2) DEFAULT 0,
	card_number VARCHAR(20) DEFAULT '•••• ••••',
	is_active BOOLEAN DEFAULT TRUE,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
	FOREIGN KEY (type_id) REFERENCES Account_Types(type_id)
);

-- =============================================
-- Dữ liệu mẫu Accounts
-- 
-- Assets (type_id=1): Checking, Business → Wallet.jsx cards
-- Liabilities (type_id=2): Credit Card → Wallet.jsx cards (balance âm)
-- Equity (type_id=3): Savings Account, Investment → Tiền tiết kiệm!
-- Revenue (type_id=4): Salary, Freelance → nguồn thu
-- Expense (type_id=5): Food, Shopping... → danh mục chi tiêu
-- =============================================

-- >> Assets (Tài sản) — hiển thị trên Wallet.jsx
-- INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, card_number) VALUES
-- (1, 1, 'Main Checking', 'Landmark', 'blue', '#3b82f6', '#1d4ed8', 8450.50, '•••• 4892'),
-- (1, 1, 'Business Account', 'Landmark', 'orange', '#f97316', '#c2410c', 15200.00, '•••• 3421');

-- >> Liabilities (Nợ) — hiển thị trên Wallet.jsx (balance âm)
-- INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, card_number) VALUES
-- (1, 2, 'Credit Card', 'CreditCard', 'purple', '#a855f7', '#7e22ce', -1250.00, '•••• 9845');

-- >> Equity (Vốn chủ / Tiết kiệm) — hiển thị trên Wallet.jsx & Savings.jsx
-- INSERT INTO Accounts (user_id, type_id, name, icon_name, color, gradient_from, gradient_to, balance, card_number) VALUES
-- (1, 3, 'Savings Account', 'WalletIcon', 'green', '#22c55e', '#15803d', 25300.00, '•••• 7231'),
-- (1, 3, 'Investment Account', 'TrendingUp', 'emerald', '#10b981', '#047857', 5000.00, '•••• 1122');

-- >> Revenue (Thu nhập) — dùng cho categorize giao dịch thu
-- INSERT INTO Accounts (user_id, type_id, name, icon_name, color) VALUES
-- (1, 4, 'Salary', 'DollarSign', 'green'),
-- (1, 4, 'Freelance', 'DollarSign', 'emerald');

-- >> Expense (Chi phí) — dùng cho Budget.jsx & Dashboard.jsx categories
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
-- Frontend Account.jsx: hiển thị danh sách giao dịch
--          Dashboard.jsx: recent transactions, income vs expense
-- =============================================
CREATE TABLE Journal_Entries (
	journal_id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	transaction_date DATETIME NOT NULL,
	description VARCHAR(500) DEFAULT 'Unknown',
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_journal_user_date ON Journal_Entries (user_id, transaction_date);

CREATE TABLE Journal_Details (
	detail_id INT AUTO_INCREMENT PRIMARY KEY,
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
-- Ví dụ giao dịch kép:
--
-- 1) Nhận lương $5000 vào Checking:
--    Debit  Checking (Assets)     $5000
--    Credit Salary (Revenue)      $5000
--
-- 2) Mua đồ ăn $85.50 từ Checking:
--    Debit  Food & Dining (Expense) $85.50
--    Credit Checking (Assets)       $85.50
--
-- 3) Chuyển $1000 từ Checking sang Savings (Equity):
--    Debit  Savings Account (Equity) $1000
--    Credit Checking (Assets)        $1000
--
-- 4) Trả Credit Card $500 từ Checking:
--    Debit  Credit Card (Liabilities) $500
--    Credit Checking (Assets)         $500
-- =============================================

-- =============================================
-- 5. NGÂN SÁCH + MỤC TIÊU TIẾT KIỆM (Budgets) — GỘP CHUNG
-- Frontend Budget.jsx: ngân sách chi tiêu per category
--          Savings.jsx: mục tiêu tiết kiệm
--
-- budget_type:
--   'expense'  → Ngân sách chi tiêu (Budget.jsx)
--               account_id trỏ đến account Expense (Food, Shopping...)
--   'savings'  → Mục tiêu tiết kiệm (Savings.jsx) 
--               account_id trỏ đến account Equity (Savings, Investment...)
-- =============================================
CREATE TABLE Budgets (
	budget_id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	account_id INT NOT NULL,
	title VARCHAR(100) NOT NULL,
	budget_type ENUM('expense', 'savings') NOT NULL DEFAULT 'expense',
	target_amount DECIMAL(18,2) NOT NULL,
	current_amount DECIMAL(18,2) DEFAULT 0,
	monthly_contribution DECIMAL(18,2) DEFAULT 0,
	period_type ENUM('daily', 'weekly', 'monthly', 'yearly') DEFAULT 'monthly',
	start_date DATE NOT NULL,
	end_date DATE NULL,
	deadline VARCHAR(20) NULL,
	icon_name VARCHAR(30) DEFAULT 'Coffee',
	color VARCHAR(20) DEFAULT 'orange',
	is_active BOOLEAN DEFAULT TRUE,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
	FOREIGN KEY (account_id) REFERENCES Accounts(account_id)
);

CREATE INDEX idx_budget_user_type ON Budgets (user_id, budget_type);

-- =============================================
-- Ví dụ Budgets:
--
-- budget_type = 'expense' (Budget.jsx):
-- INSERT INTO Budgets (user_id, account_id, title, budget_type, target_amount, current_amount, start_date) VALUES
-- (1, <food_account_id>, 'Food & Dining', 'expense', 1500, 1200, '2026-05-01'),
-- (1, <shopping_account_id>, 'Shopping', 'expense', 1000, 800, '2026-05-01');
--   → target_amount = ngân sách giới hạn
--   → current_amount = đã chi (spent)
--
-- budget_type = 'savings' (Savings.jsx):
-- INSERT INTO Budgets (user_id, account_id, title, budget_type, target_amount, current_amount, monthly_contribution, deadline) VALUES
-- (1, <savings_account_id>, 'Vacation to Europe', 'savings', 5000, 3200, 300, 'Dec 2026'),
-- (1, <investment_account_id>, 'House Down Payment', 'savings', 50000, 12000, 1500, 'Jan 2028');
--   → target_amount = mục tiêu tiết kiệm
--   → current_amount = đã tiết kiệm (saved)
--   → monthly_contribution = đóng góp hàng tháng
-- =============================================

-- =============================================
-- 6. GIAO DỊCH ĐỊNH KỲ (Recurring_Journals)
-- Lương hàng tháng, tiền thuê, subscription...
-- =============================================
CREATE TABLE Recurring_Journals (
	recurring_id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	debit_account_id INT NOT NULL,
	credit_account_id INT NOT NULL,
	amount DECIMAL(18,2) NOT NULL,
	title VARCHAR(100),
	description VARCHAR(500),
	frequency ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
	interval_value INT DEFAULT 1,
	next_run_date DATETIME NOT NULL,
	is_active BOOLEAN DEFAULT TRUE,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
	FOREIGN KEY (debit_account_id) REFERENCES Accounts(account_id),
	FOREIGN KEY (credit_account_id) REFERENCES Accounts(account_id)
);

-- =============================================
-- 7. LỊCH SỬ THỰC HIỆN GIAO DỊCH ĐỊNH KỲ
-- =============================================
CREATE TABLE Recurring_Instances (
	instance_id INT AUTO_INCREMENT PRIMARY KEY,
	recurring_id INT NOT NULL,
	due_date DATETIME NOT NULL,
	status ENUM('pending', 'completed', 'skipped') DEFAULT 'pending',
	journal_id INT NULL,
	FOREIGN KEY (recurring_id) REFERENCES Recurring_Journals(recurring_id) ON DELETE CASCADE,
	FOREIGN KEY (journal_id) REFERENCES Journal_Entries(journal_id)
);
