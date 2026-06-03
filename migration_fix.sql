-- =============================================
-- MIGRATION: Fix missing database schema
-- Date: 2026-05-29
--
-- Phát hiện: Database thiếu
-- nhiều cột và bảng so với csdl_sqlserver.sql
-- =============================================

USE BudgetManagement;
GO

-- =============================================
-- 1. THÊM CỘT THIẾU TRONG CÁC BẢNG HIỆN TẠI
-- =============================================

-- Accounts: thiếu currency_code
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Accounts' AND COLUMN_NAME = 'currency_code'
)
BEGIN
    ALTER TABLE Accounts ADD currency_code NVARCHAR(10) NOT NULL DEFAULT 'USD';
    PRINT '✓ Added currency_code to Accounts';
END
ELSE
    PRINT '– currency_code already exists in Accounts';
GO

-- Accounts: thêm due_date (hạn trả nợ)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Accounts' AND COLUMN_NAME = 'due_date'
)
BEGIN
    ALTER TABLE Accounts ADD due_date DATE NULL;
    PRINT '✓ Added due_date to Accounts';
END
ELSE
    PRINT '– due_date already exists in Accounts';
GO

-- Accounts: thêm interest_rate (lãi suất %)
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Accounts' AND COLUMN_NAME = 'interest_rate'
)
BEGIN
    ALTER TABLE Accounts ADD interest_rate DECIMAL(5,2) NULL;
    PRINT '✓ Added interest_rate to Accounts';
END
ELSE
    PRINT '– interest_rate already exists in Accounts';
GO

-- Journal_Entries: thiếu foreign_amount và foreign_currency_code
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Journal_Entries' AND COLUMN_NAME = 'foreign_amount'
)
BEGIN
    ALTER TABLE Journal_Entries ADD foreign_amount DECIMAL(18,2) NULL;
    PRINT '✓ Added foreign_amount to Journal_Entries';
END
ELSE
    PRINT '– foreign_amount already exists in Journal_Entries';
GO

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Journal_Entries' AND COLUMN_NAME = 'foreign_currency_code'
)
BEGIN
    ALTER TABLE Journal_Entries ADD foreign_currency_code NVARCHAR(10) NULL;
    PRINT '✓ Added foreign_currency_code to Journal_Entries';
END
ELSE
    PRINT '– foreign_currency_code already exists in Journal_Entries';
GO


-- =============================================
-- 2. BẢNG MỚI: Currencies, Exchange_Rates
-- =============================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Currencies')
BEGIN
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
    PRINT '✓ Created Currencies table';
END
ELSE
    PRINT '– Currencies table already exists';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Exchange_Rates')
BEGIN
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
    PRINT '✓ Created Exchange_Rates table';
END
ELSE
    PRINT '– Exchange_Rates table already exists';
GO


-- =============================================
-- 3. BẢNG MỚI: Rule_Groups, Rules, Rule_Triggers, Rule_Actions
-- =============================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Rule_Groups')
BEGIN
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
    PRINT '✓ Created Rule_Groups table';
END
ELSE
    PRINT '– Rule_Groups table already exists';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Rules')
BEGIN
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
    PRINT '✓ Created Rules table';
END
ELSE
    PRINT '– Rules table already exists';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Rule_Triggers')
BEGIN
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
    PRINT '✓ Created Rule_Triggers table';
END
ELSE
    PRINT '– Rule_Triggers table already exists';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Rule_Actions')
BEGIN
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
    PRINT '✓ Created Rule_Actions table';
END
ELSE
    PRINT '– Rule_Actions table already exists';
GO


-- =============================================
-- 4. BẢNG MỚI: Webhooks, Webhook_Messages
-- =============================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Webhooks')
BEGIN
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
    PRINT '✓ Created Webhooks table';
END
ELSE
    PRINT '– Webhooks table already exists';
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Webhook_Messages')
BEGIN
    CREATE TABLE Webhook_Messages (
        message_id    INT IDENTITY(1,1) PRIMARY KEY,
        webhook_id    INT NOT NULL,
        journal_id    INT NULL,
        payload       NVARCHAR(MAX) NULL,
        status_code   INT NOT NULL DEFAULT 0,
        success       BIT NOT NULL DEFAULT 0,
        response_body NVARCHAR(MAX) NULL,
        error_message NVARCHAR(MAX) NULL,
        sent_at       DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT FK_WhMessages_Webhooks FOREIGN KEY (webhook_id)
            REFERENCES Webhooks(webhook_id) ON DELETE CASCADE
    );
    CREATE INDEX idx_whmessages_webhook ON Webhook_Messages (webhook_id, sent_at DESC);
    PRINT '✓ Created Webhook_Messages table';
END
ELSE
    PRINT '– Webhook_Messages table already exists';
GO


-- =============================================
-- 5. BẢNG MỚI: Attachments
-- =============================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Attachments')
BEGIN
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
    PRINT '✓ Created Attachments table';
END
ELSE
    PRINT '– Attachments table already exists';
GO


-- =============================================
-- 6. SEED: 4 tiền tệ mặc định cho mỗi user
-- =============================================
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Currencies')
BEGIN
    PRINT '⚠ Skipped currency seed — Currencies table not found';
END
ELSE
BEGIN
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
    PRINT '✓ Seeded default currencies for all users';
END
GO

PRINT '';
PRINT '═══════════════════════════════════════';
PRINT '  Migration complete!';
PRINT '═══════════════════════════════════════';
GO
