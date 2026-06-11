-- =============================================
-- MIGRATION: Add budget_id to Journal_Entries
-- Date: 2026-06-11
--
-- Lý do: Thêm cột budget_id để lưu budget được
-- chọn khi tạo giao dịch, giúp cập nhật đúng
-- budget khi có nhiều budgets cho 1 category
-- =============================================

USE BudgetManagement;
GO

-- Journal_Entries: thêm budget_id
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

PRINT '';
PRINT '═══════════════════════════════════════';
PRINT '  Migration complete!';
PRINT '═══════════════════════════════════════';
GO
