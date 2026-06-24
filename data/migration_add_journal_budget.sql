-- =============================================
-- MIGRATION: Thêm liên kết giao dịch → ngân sách
-- Date: 2026-06-23
--
-- Mục đích: Mỗi giao dịch chi tiêu có thể được gán vào MỘT ngân sách cụ thể
-- (một danh mục có thể có nhiều ngân sách). Cột budget_id cho phép khi sửa/xóa
-- giao dịch trừ đúng ngân sách đã chọn.
-- =============================================

USE BudgetManagement;
GO

-- 1. Thêm cột budget_id vào Journal_Entries
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Journal_Entries' AND COLUMN_NAME = 'budget_id'
)
BEGIN
    ALTER TABLE Journal_Entries ADD budget_id INT NULL;
    PRINT '✓ Added budget_id to Journal_Entries';
END
ELSE
    PRINT '– budget_id already exists in Journal_Entries';
GO

-- 2. Thêm FK Journal_Entries.budget_id → Budgets (NO ACTION, service tự unlink)
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_JournalEntries_Budgets'
)
BEGIN
    ALTER TABLE Journal_Entries ADD CONSTRAINT FK_JournalEntries_Budgets
        FOREIGN KEY (budget_id) REFERENCES Budgets(budget_id) ON DELETE NO ACTION;
    PRINT '✓ Added FK_JournalEntries_Budgets';
END
ELSE
    PRINT '– FK_JournalEntries_Budgets already exists';
GO

-- 3. Index cho cột budget_id
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'idx_journal_budget' AND object_id = OBJECT_ID('Journal_Entries')
)
BEGIN
    CREATE INDEX idx_journal_budget ON Journal_Entries (budget_id);
    PRINT '✓ Created index idx_journal_budget';
END
ELSE
    PRINT '– idx_journal_budget already exists';
GO

PRINT '';
PRINT '═══════════════════════════════════════';
PRINT '  Migration complete!';
PRINT '═══════════════════════════════════════';
GO
