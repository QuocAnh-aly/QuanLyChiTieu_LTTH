-- ============================================================================
-- FIX: Recalculate all data for user QuocAnh (user_id=2)
-- ============================================================================
-- Accounting rules (from TransactionService.UpdateAccountBalanceAsync):
--   Type 1 (Asset):      factor = 1  → debit: +balance, credit: -balance
--   Type 2 (Liability):  factor = 1  → debit: +balance, credit: -balance
--   Type 3 (Equity):     factor = -1 → debit: -balance, credit: +balance
--   Type 4 (Revenue):    factor = -1 → debit: -balance, credit: +balance
--   Type 5 (Expense):    factor = 1  → debit: +balance, credit: -balance
-- ============================================================================

DECLARE @UserId INT = 2;

BEGIN TRANSACTION;

-- ============================================================================
-- STEP 1: Reset all account balances to their initial_balance
-- ============================================================================
UPDATE Accounts
SET balance = COALESCE(initial_balance, 0)
WHERE user_id = @UserId;

-- ============================================================================
-- STEP 2: Recalculate balances from journal details
-- ============================================================================
UPDATE a
SET a.balance = a.balance + calculated.delta
FROM Accounts a
JOIN (
    SELECT
        jd.account_id,
        SUM(
            CASE
                WHEN ac.type_id IN (1, 2, 5) THEN  -- Asset, Liability, Expense
                    CASE
                        WHEN jd.debit > 0 THEN jd.debit    -- debit tăng balance
                        WHEN jd.credit > 0 THEN -jd.credit -- credit giảm balance
                        ELSE 0
                    END
                WHEN ac.type_id IN (3, 4) THEN  -- Equity, Revenue
                    CASE
                        WHEN jd.debit > 0 THEN -jd.debit    -- debit giảm balance
                        WHEN jd.credit > 0 THEN jd.credit   -- credit tăng balance
                        ELSE 0
                    END
                ELSE 0
            END
        ) AS delta
    FROM Journal_Details jd
    JOIN Accounts ac ON jd.account_id = ac.account_id
    WHERE ac.user_id = @UserId
    GROUP BY jd.account_id
) calculated ON a.account_id = calculated.account_id;

-- ============================================================================
-- STEP 3: Recalculate budget current_amount from actual expense transactions
-- ============================================================================
-- For expense budgets: current_amount = sum of debits to the account within budget period
-- For savings budgets: current_amount = sum of debits to the account within budget period
UPDATE b
SET b.current_amount = COALESCE((
    SELECT SUM(jd.debit)
    FROM Journal_Details jd
    JOIN Journal_Entries je ON jd.journal_id = je.journal_id
    WHERE jd.account_id = b.account_id
      AND je.user_id = b.user_id
      AND je.transaction_date >= b.start_date
      AND (b.end_date IS NULL OR je.transaction_date <= b.end_date)
      AND jd.debit > 0
), 0)
FROM Budgets b
WHERE b.user_id = @UserId;

-- ============================================================================
-- STEP 4: Verify results
-- ============================================================================
PRINT '=== Account Balances After Fix ===';
SELECT a.account_id, a.name, a.type_id, a.balance, a.initial_balance
FROM Accounts a
WHERE a.user_id = @UserId
ORDER BY a.type_id, a.account_id;

PRINT '=== Budget Current Amounts After Fix ===';
SELECT b.budget_id, b.title, a.name AS account_name, b.target_amount, b.current_amount
FROM Budgets b
LEFT JOIN Accounts a ON b.account_id = a.account_id
WHERE b.user_id = @UserId
ORDER BY b.budget_id;

PRINT '=== Verification: Transactions Drill-down ===';
SELECT
    je.journal_id,
    je.transaction_date,
    je.description,
    jd.account_id,
    a.name AS account_name,
    a.type_id,
    jd.debit,
    jd.credit,
    CASE
        WHEN a.type_id IN (1, 2, 5) THEN
            CASE WHEN jd.debit > 0 THEN jd.debit WHEN jd.credit > 0 THEN -jd.credit ELSE 0 END
        WHEN a.type_id IN (3, 4) THEN
            CASE WHEN jd.debit > 0 THEN -jd.debit WHEN jd.credit > 0 THEN jd.credit ELSE 0 END
        ELSE 0
    END AS balance_impact
FROM Journal_Entries je
JOIN Journal_Details jd ON je.journal_id = jd.journal_id
JOIN Accounts a ON jd.account_id = a.account_id
WHERE je.user_id = @UserId
ORDER BY je.journal_id, jd.detail_id;

COMMIT TRANSACTION;

PRINT '=== DONE ===';
