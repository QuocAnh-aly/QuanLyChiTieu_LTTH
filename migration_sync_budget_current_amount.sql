-- =============================================
-- MIGRATION: Sync Budget CurrentAmount from transactions
-- Date: 2026-06-11 (v2 — fix period filter bug)
--
-- Lý do: Trước đây fallback UpdateSpentAmountAsync
-- cập nhật CurrentAmount của budget khi transaction
-- không có BudgetId (phantom tracking). Sau khi xoá
-- fallback, cần sync lại số liệu đúng với giao dịch
-- thực tế có BudgetId gắn với budget.
--
-- ⚠ Quan trọng: Script tính SUM tất cả linked transactions
-- KHÔNG filter theo period. Period reset được xử lý riêng
-- bởi ResetExpiredPeriodsAsync trong application code.
-- Lọc period ở đây gây sai số (UTC vs timezone, daily budgets...)
-- =============================================

USE BudgetManagement;
GO

-- =============================================
-- 1. TÍNH TOÁN LẠI CurrentAmount CHO TỪNG BUDGET
-- =============================================

PRINT '=== Đồng bộ CurrentAmount cho Expense Budgets ===';
PRINT '';
GO

DECLARE @updated INT = 0;
DECLARE @skipped INT = 0;

DECLARE budget_cursor CURSOR FOR
SELECT 
    b.budget_id,
    b.current_amount AS old_amount
FROM Budgets b
WHERE b.budget_type = 'expense'
  AND b.is_active = 1;

OPEN budget_cursor;

DECLARE 
    @budget_id INT,
    @old_amount DECIMAL(18,2);

FETCH NEXT FROM budget_cursor INTO @budget_id, @old_amount;

WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @new_amount DECIMAL(18,2);

    -- Tính SUM tất cả debit từ transactions link budget này
    -- (Không filter period — period reset đã được xử lý riêng)
    SELECT @new_amount = ISNULL(SUM(jd.debit), 0)
    FROM Journal_Entries je
    INNER JOIN Journal_Details jd ON jd.journal_id = je.journal_id
    WHERE je.budget_id = @budget_id
      AND jd.debit > 0;

    IF @old_amount != @new_amount
    BEGIN
        UPDATE Budgets
        SET current_amount = @new_amount
        WHERE budget_id = @budget_id;

        PRINT '  ✓ Budget ' + CAST(@budget_id AS NVARCHAR(10)) +
              ': ' + CAST(ROUND(@old_amount, 0) AS NVARCHAR(20)) +
              ' → ' + CAST(ROUND(@new_amount, 0) AS NVARCHAR(20)) +
              ' (chênh lệch ' + CAST(ROUND(@new_amount - @old_amount, 0) AS NVARCHAR(20)) + ')';
        SET @updated = @updated + 1;
    END
    ELSE
    BEGIN
        PRINT '  – Budget ' + CAST(@budget_id AS NVARCHAR(10)) +
              ': không thay đổi (' + CAST(ROUND(@old_amount, 0) AS NVARCHAR(20)) + ')';
        SET @skipped = @skipped + 1;
    END

    FETCH NEXT FROM budget_cursor INTO @budget_id, @old_amount;
END

CLOSE budget_cursor;
DEALLOCATE budget_cursor;

PRINT '';
PRINT '=== Kết quả ===';
PRINT '  Updated: ' + CAST(@updated AS NVARCHAR(10)) + ' budgets';
PRINT '  Skipped: ' + CAST(@skipped AS NVARCHAR(10)) + ' budgets (không thay đổi)';
GO


-- =============================================
-- 2. KIỂM TRA: Budget có CurrentAmount > 0
--    nhưng KHÔNG có transaction nào link?
--    (Dấu hiệu của phantom tracking còn sót)
-- =============================================

PRINT '';
PRINT '=== Kiểm tra phantom tracking còn sót ===';
GO

SELECT 
    b.budget_id,
    b.title,
    b.current_amount,
    b.account_id,
    a.name AS category_name,
    COUNT(je.journal_id) AS linked_transactions
FROM Budgets b
LEFT JOIN Accounts a ON a.account_id = b.account_id
LEFT JOIN Journal_Entries je ON je.budget_id = b.budget_id
WHERE b.budget_type = 'expense'
  AND b.is_active = 1
  AND b.current_amount > 0
GROUP BY b.budget_id, b.title, b.current_amount, b.account_id, a.name
HAVING COUNT(je.journal_id) = 0
ORDER BY b.title;

IF @@ROWCOUNT = 0
    PRINT '✓ Không có phantom tracking nào còn sót';
ELSE
    PRINT '⚠ Còn ' + CAST(@@ROWCOUNT AS NVARCHAR(10)) + ' budget(s) có phantom tracking (cần kiểm tra thủ công)';
GO


-- =============================================
-- 3. KIỂM TRA: Transaction không có BudgetId
--    nhưng thuộc category có budget active
--    (Có thể gán thủ công từ UI)
-- =============================================

PRINT '';
PRINT '=== Thống kê giao dịch chưa gán budget ===';
PRINT '(Những giao dịch này sẽ hiển thị với badge "Chưa theo dõi" trên UI)';
GO

SELECT 
    b.budget_id,
    b.title AS budget_name,
    a.name AS category_name,
    COUNT(DISTINCT je.journal_id) AS untracked_count,
    ISNULL(SUM(jd.debit), 0) AS untracked_amount
FROM Budgets b
INNER JOIN Accounts a ON a.account_id = b.account_id
CROSS APPLY (
    SELECT je2.journal_id
    FROM Journal_Entries je2
    WHERE je2.budget_id IS NULL
      AND je2.journal_id IN (
          SELECT jd3.journal_id 
          FROM Journal_Details jd3 
          WHERE jd3.account_id = b.account_id AND jd3.debit > 0
      )
) je
LEFT JOIN Journal_Details jd 
    ON jd.journal_id = je.journal_id 
    AND jd.account_id = b.account_id 
    AND jd.debit > 0
WHERE b.budget_type = 'expense'
  AND b.is_active = 1
GROUP BY b.budget_id, b.title, a.name
HAVING COUNT(DISTINCT je.journal_id) > 0
ORDER BY b.title;

PRINT '';
PRINT '═══════════════════════════════════════';
PRINT '  Migration complete!';
PRINT '═══════════════════════════════════════';
PRINT '';
PRINT 'Lưu ý: Sau migration, nếu cần chạy period reset ngay lập tức,';
PRINT 'hãy khởi động lại API service để RecurringHostedService chạy.';
PRINT 'Hoặc chạy thủ công: dotnet run --project DbTester với lệnh reset.';
GO
