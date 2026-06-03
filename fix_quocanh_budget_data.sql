-- =============================================
-- FIX: Cập nhật current_amount cho budgets của QuocAnh
-- Dựa trên tổng debit từ Journal_Details cho mỗi expense account
-- =============================================
USE BudgetManagement;
GO

-- 1. Kiểm tra budget data hiện tại
PRINT '=== Budgets BEFORE fix ===';
SELECT b.budget_id, b.title, b.account_id, b.target_amount, b.current_amount AS old_amount, a.name AS account_name
FROM Budgets b
JOIN Accounts a ON b.account_id = a.account_id
WHERE b.user_id = 2 AND b.budget_type = 'expense'
ORDER BY b.budget_id;

-- 2. Tính toán tổng chi tiêu thực tế cho mỗi expense account
PRINT '';
PRINT '=== Actual spending per expense account ===';
SELECT 
    a.account_id,
    a.name AS account_name,
    COALESCE(SUM(jd.debit), 0) AS actual_spent,
    COUNT(DISTINCT je.journal_id) AS transaction_count
FROM Accounts a
LEFT JOIN Journal_Details jd ON a.account_id = jd.account_id AND jd.debit > 0
LEFT JOIN Journal_Entries je ON jd.journal_id = je.journal_id AND je.user_id = 2
WHERE a.user_id = 2 AND a.type_id = 5
GROUP BY a.account_id, a.name
ORDER BY a.account_id;

-- 3. Cập nhật current_amount = actual spending
PRINT '';
PRINT '=== Updating budget current_amount ===';
UPDATE b
SET b.current_amount = COALESCE((
    SELECT SUM(jd.debit)
    FROM Journal_Details jd
    JOIN Journal_Entries je ON jd.journal_id = je.journal_id
    WHERE jd.account_id = b.account_id
      AND jd.debit > 0
      AND je.user_id = 2
), 0)
FROM Budgets b
WHERE b.user_id = 2 AND b.budget_type = 'expense';

PRINT '✓ Budget current_amount updated!';

-- 4. Kiểm tra kết quả sau fix
PRINT '';
PRINT '=== Budgets AFTER fix ===';
SELECT b.budget_id, b.title, b.account_id, b.target_amount, b.current_amount AS new_amount, a.name AS account_name
FROM Budgets b
JOIN Accounts a ON b.account_id = a.account_id
WHERE b.user_id = 2 AND b.budget_type = 'expense'
ORDER BY b.budget_id;

-- 5. Thêm giao dịch mẫu cho Nhà ở (hiện đang có 0 giao dịch)
-- Tạo giao dịch thuê nhà tháng 6
IF NOT EXISTS (
    SELECT 1 FROM Journal_Details jd
    JOIN Journal_Entries je ON jd.journal_id = je.journal_id
    WHERE jd.account_id = 2050 AND je.user_id = 2 AND jd.debit > 0
)
BEGIN
    -- Tạo journal entry mới
    DECLARE @NewJournalId INT;
    
    INSERT INTO Journal_Entries (user_id, transaction_date, description, notes, created_at)
    VALUES (2, '2026-06-01', 'Tiền thuê nhà tháng 6', 'Nhà trọ đường Nguyễn Văn Linh', GETDATE());
    
    SET @NewJournalId = SCOPE_IDENTITY();
    
    -- Thêm journal details (double-entry)
    INSERT INTO Journal_Details (journal_id, account_id, debit, credit)
    VALUES 
        (@NewJournalId, 2050, 5000000, 0),  -- Nhà ở (Expense) debit
        (@NewJournalId, 2035, 0, 5000000);  -- MB Bank (Assets) credit
    
    -- Cập nhật balance cho MB Bank
    UPDATE Accounts SET balance = balance - 5000000 WHERE account_id = 2035;
    
    -- Cập nhật budget current_amount cho Nhà ở
    UPDATE Budgets SET current_amount = current_amount + 5000000 
    WHERE account_id = 2050 AND user_id = 2;
    
    PRINT '✓ Added rent transaction for Nhà ở (5000000 VND)';
END
ELSE
    PRINT '– Nhà ở already has transactions';
GO

-- 6. Kiểm tra final state
PRINT '';
PRINT '=== Final budget data ===';
SELECT b.budget_id, b.title, b.target_amount, b.current_amount, 
       ROUND((b.current_amount / NULLIF(b.target_amount, 0)) * 100, 1) AS pct,
       a.name AS account_name
FROM Budgets b
JOIN Accounts a ON b.account_id = a.account_id
WHERE b.user_id = 2 AND b.budget_type = 'expense'
ORDER BY b.budget_id;

PRINT '';
PRINT '=== Total transactions count ===';
SELECT COUNT(*) AS total_journals FROM Journal_Entries WHERE user_id = 2;

PRINT '';
PRINT '═══════════════════════════════════════';
PRINT '  Budget data fix complete!';
PRINT '═══════════════════════════════════════';
GO
