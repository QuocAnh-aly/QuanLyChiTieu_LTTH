-- =============================================
-- MIGRATION: Sync Budget CurrentAmount from transactions
-- Date: 2026-06-11
--
-- Lý do: Trước đây fallback UpdateSpentAmountAsync
-- cập nhật CurrentAmount của budget khi transaction
-- không có BudgetId (phantom tracking). Sau khi xoá
-- fallback, cần sync lại số liệu đúng với giao dịch
-- thực tế có BudgetId gắn với budget.
--
-- Quan trọng: Script tính toán dựa trên period type
-- để chỉ lấy giao dịch trong kỳ hiện tại, tránh
-- inflate số liệu cho budgets đã qua period reset.
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
DECLARE @now DATETIME2 = GETUTCDATE();

DECLARE budget_cursor CURSOR FOR
SELECT 
    b.budget_id,
    b.account_id,
    b.current_amount AS old_amount,
    b.period_type,
    b.start_date,
    b.end_date,
    -- Tính ngày bắt đầu của kỳ hiện tại
    CASE 
        WHEN b.period_type = 'weekly' THEN 
            DATEADD(WEEK, DATEDIFF(WEEK, b.start_date, @now), b.start_date)
        WHEN b.period_type = 'monthly' THEN 
            DATEADD(MONTH, DATEDIFF(MONTH, b.start_date, @now), b.start_date)
        WHEN b.period_type = 'yearly' THEN 
            DATEADD(YEAR, DATEDIFF(YEAR, b.start_date, @now), b.start_date)
        ELSE b.start_date  -- daily, custom, NULL → tính từ start_date
    END AS period_start
FROM Budgets b
WHERE b.budget_type = 'expense'
  AND b.is_active = 1;

OPEN budget_cursor;

DECLARE 
    @budget_id INT,
    @account_id INT,
    @old_amount DECIMAL(18,2),
    @period_type NVARCHAR(20),
    @start_date DATETIME2,
    @end_date DATETIME2,
    @period_start DATETIME2;

FETCH NEXT FROM budget_cursor INTO @budget_id, @account_id, @old_amount, @period_type, @start_date, @end_date, @period_start;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- ⚠ Fix: Nếu period_start trong tương lai, lùi về kỳ trước
    -- (DATEDIFF đếm số mốc đã vượt qua, không phải số kỳ đã hoàn thành)
    IF @period_start > @now
    BEGIN
        SET @period_start = CASE @period_type
            WHEN 'weekly'  THEN DATEADD(WEEK,  -1, @period_start)
            WHEN 'monthly' THEN DATEADD(MONTH, -1, @period_start)
            WHEN 'yearly'  THEN DATEADD(YEAR,  -1, @period_start)
            ELSE @period_start
        END;
    END

    -- Chỉ tính transactions trong kỳ hiện tại và trong budget date range
    DECLARE @new_amount DECIMAL(18,2);

    SELECT @new_amount = ISNULL(SUM(jd.debit), 0)
    FROM Journal_Entries je
    INNER JOIN Journal_Details jd ON jd.journal_id = je.journal_id
    WHERE je.budget_id = @budget_id
      AND jd.account_id = @account_id
      AND jd.debit > 0
      AND je.transaction_date >= @period_start
      AND je.transaction_date >= @start_date
      AND je.transaction_date <= ISNULL(@end_date, DATEADD(YEAR, 10, @now))
      AND je.transaction_date <= @now;

    IF @old_amount != @new_amount
    BEGIN
        UPDATE Budgets
        SET current_amount = @new_amount
        WHERE budget_id = @budget_id;

        PRINT '  ✓ Budget ' + CAST(@budget_id AS NVARCHAR(10)) +
              ' (' + @period_type + '): ' + 
              CAST(ROUND(@old_amount, 0) AS NVARCHAR(20)) +
              ' → ' + CAST(ROUND(@new_amount, 0) AS NVARCHAR(20)) +
              ' (chênh lệch ' + CAST(ROUND(@new_amount - @old_amount, 0) AS NVARCHAR(20)) + ')';
        SET @updated = @updated + 1;
    END
    ELSE
    BEGIN
        PRINT '  – Budget ' + CAST(@budget_id AS NVARCHAR(10)) +
              ' (' + @period_type + '): không thay đổi (' + 
              CAST(ROUND(@old_amount, 0) AS NVARCHAR(20)) + ')';
        SET @skipped = @skipped + 1;
    END

    FETCH NEXT FROM budget_cursor INTO @budget_id, @account_id, @old_amount, @period_type, @start_date, @end_date, @period_start;
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
