-- =============================================
-- FIX: Chuyển khoản #4003 bị sai debit/credit
-- 
-- Bug: QuickTransferModal gửi debitAccountId=fromId, creditAccountId=toId
--      (ngược với nguyên tắc kế toán)
--
-- Transfer #4003: "Chuyển khoản: MB Bank → Tiền mặt"  400,000 VND
--   Hiện tại:  Debit MB Bank (+400k)  ❌
--              Credit Tiền mặt (-400k) ❌
--   Đúng là:   Debit Tiền mặt (+400k)  ✓
--              Credit MB Bank (-400k)  ✓
-- =============================================

USE BudgetManagement;
GO

BEGIN TRANSACTION;
BEGIN TRY
    PRINT '══════════════════════════════════════════════════';
    PRINT '  BẮT ĐẦU FIX TRANSFER #4003';
    PRINT '══════════════════════════════════════════════════';

    -- =============================================
    -- 1. Hiển trạng thái trước khi fix
    -- =============================================
    PRINT '';
    PRINT '--- TRẠNG THÁI TRƯỚC KHI FIX ---';

    SELECT 
        'TRANSFER #4003' AS label,
        jd1.detail_id AS debit_detail_id,
        jd1.account_id AS debit_account_id,
        a1.name AS debit_account_name,
        jd1.debit AS debit_amount,
        jd2.detail_id AS credit_detail_id,
        jd2.account_id AS credit_account_id,
        a2.name AS credit_account_name,
        jd2.credit AS credit_amount
    FROM Journal_Entries je
    JOIN Journal_Details jd1 ON jd1.journal_id = je.journal_id AND jd1.debit > 0
    JOIN Journal_Details jd2 ON jd2.journal_id = je.journal_id AND jd2.credit > 0
    JOIN Accounts a1 ON a1.account_id = jd1.account_id
    JOIN Accounts a2 ON a2.account_id = jd2.account_id
    WHERE je.journal_id = 4003;

    SELECT 
        'BALANCE TRUOC FIX' AS label,
        account_id,
        name,
        balance
    FROM Accounts
    WHERE account_id IN (1005, 1006);

    -- =============================================
    -- 2. Swap debit/credit account_ids
    -- =============================================
    PRINT '';
    PRINT '--- DANG SWAP DEBIT/CREDIT ACCOUNT_IDS ---';

    DECLARE @debit_detail_id INT, @credit_detail_id INT;
    DECLARE @debit_account_id INT, @credit_account_id INT;

    SELECT 
        @debit_detail_id = jd1.detail_id,
        @credit_detail_id = jd2.detail_id,
        @debit_account_id = jd1.account_id,
        @credit_account_id = jd2.account_id
    FROM Journal_Entries je
    JOIN Journal_Details jd1 ON jd1.journal_id = je.journal_id AND jd1.debit > 0
    JOIN Journal_Details jd2 ON jd2.journal_id = je.journal_id AND jd2.credit > 0
    WHERE je.journal_id = 4003;

    PRINT '  Debit detail ID: ' + CAST(@debit_detail_id AS VARCHAR);
    PRINT '  Credit detail ID: ' + CAST(@credit_detail_id AS VARCHAR);
    PRINT '  Swapping account_ids...';

    UPDATE Journal_Details SET account_id = @credit_account_id WHERE detail_id = @debit_detail_id;
    UPDATE Journal_Details SET account_id = @debit_account_id WHERE detail_id = @credit_detail_id;

    PRINT '  ✓ Swapped successfully!';

    -- =============================================
    -- 3. Fix balances
    --    Can: MB Bank -400k, Tien mat +400k
    --    Adjustment: MB Bank: -(400k) - (400k) = -800k
    --                Tien mat: +400k + 400k = +800k
    -- =============================================
    PRINT '';
    PRINT '--- DANG SUA BALANCE ---';

    DECLARE @amount DECIMAL(18,2) = 400000;

    UPDATE Accounts 
    SET balance = balance - (@amount * 2)
    WHERE account_id = 1005;

    UPDATE Accounts 
    SET balance = balance + (@amount * 2)
    WHERE account_id = 1006;

    PRINT '  ✓ MB Bank: -' + CAST(@amount * 2 AS VARCHAR);
    PRINT '  ✓ Tien mat: +' + CAST(@amount * 2 AS VARCHAR);

    -- =============================================
    -- 4. Hien thi ket qua sau fix
    -- =============================================
    PRINT '';
    PRINT '--- TRANG THAI SAU KHI FIX ---';

    SELECT 
        'TRANSFER #4003' AS label,
        jd1.detail_id AS debit_detail_id,
        jd1.account_id AS debit_account_id,
        a1.name AS debit_account_name,
        jd1.debit AS debit_amount,
        jd2.detail_id AS credit_detail_id,
        jd2.account_id AS credit_account_id,
        a2.name AS credit_account_name,
        jd2.credit AS credit_amount
    FROM Journal_Entries je
    JOIN Journal_Details jd1 ON jd1.journal_id = je.journal_id AND jd1.debit > 0
    JOIN Journal_Details jd2 ON jd2.journal_id = je.journal_id AND jd2.credit > 0
    JOIN Accounts a1 ON a1.account_id = jd1.account_id
    JOIN Accounts a2 ON a2.account_id = jd2.account_id
    WHERE je.journal_id = 4003;

    SELECT 
        'BALANCE SAU FIX' AS label,
        account_id,
        name,
        balance
    FROM Accounts
    WHERE account_id IN (1005, 1006);

    PRINT '';
    PRINT '══════════════════════════════════════════════════';
    PRINT '  FIX HOAN TAT!';
    PRINT '══════════════════════════════════════════════════';

    COMMIT TRANSACTION;
    PRINT '✓ COMMIT thanh cong!';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '✗ LOI: ' + ERROR_MESSAGE();
    PRINT '  Rollback hoan tat.';
END CATCH;
GO
