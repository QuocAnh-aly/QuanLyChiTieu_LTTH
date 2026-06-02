using System.Globalization;
using System.Text;
using System.Text.Json;
using BudgetManagement.Entities;
using BudgetManagement.Repository;
using BudgetManagement.Services.Implementations;
using BudgetManagement.Services.Interfaces;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Tests;

public class ExportServiceTests : IDisposable
{
    private readonly BudgetManagementDbContext _db;
    private readonly ExportService _service;
    private readonly int _userId = 1;

    public ExportServiceTests()
    {
        var opts = new Microsoft.EntityFrameworkCore.DbContextOptionsBuilder<BudgetManagementDbContext>()
            .UseInMemoryDatabase($"ExportTest_{Guid.NewGuid():N}")
            .Options;

        _db = new BudgetManagementDbContext(opts);
        SeedDatabase();
        _service = new ExportService(_db);
    }

    private void SeedDatabase()
    {
        _db.AccountTypes.AddRange(
            new AccountType { TypeId = 1, TypeName = "Assets" },
            new AccountType { TypeId = 4, TypeName = "Revenue" },
            new AccountType { TypeId = 5, TypeName = "Expense" }
        );

        var now = DateTime.UtcNow;

        _db.Accounts.AddRange(
            new Account
            {
                AccountId = 1, UserId = _userId, TypeId = 1, Name = "Checking",
                Balance = 5000000m, InitialBalance = 10000000m,
                CurrencyCode = "VND", IsActive = true, CreatedAt = now,
            },
            new Account
            {
                AccountId = 2, UserId = _userId, TypeId = 4, Name = "Salary",
                CurrencyCode = "VND", IsActive = true, CreatedAt = now,
            },
            new Account
            {
                AccountId = 3, UserId = _userId, TypeId = 5, Name = "Food",
                CurrencyCode = "VND", IsActive = true, CreatedAt = now,
            }
        );

        _db.JournalEntries.AddRange(
            new JournalEntry
            {
                JournalId = 1, UserId = _userId,
                TransactionDate = new DateTime(2026, 1, 15),
                Description = "Grocery", Tags = "food",
                ForeignAmount = 10m, ForeignCurrencyCode = "USD",
                CreatedAt = now,
            },
            new JournalEntry
            {
                JournalId = 2, UserId = _userId,
                TransactionDate = new DateTime(2026, 1, 20),
                Description = "Bus pass", Tags = "transport",
                CreatedAt = now,
            }
        );

        _db.JournalDetails.AddRange(
            new JournalDetail { DetailId = 1, JournalId = 1, AccountId = 3, Debit = 200000, Credit = 0 },
            new JournalDetail { DetailId = 2, JournalId = 1, AccountId = 1, Debit = 0, Credit = 200000 },
            new JournalDetail { DetailId = 3, JournalId = 2, AccountId = 3, Debit = 100000, Credit = 0 },
            new JournalDetail { DetailId = 4, JournalId = 2, AccountId = 1, Debit = 0, Credit = 100000 }
        );

        _db.Budgets.AddRange(
            new Budget
            {
                BudgetId = 1, UserId = _userId, AccountId = 3, Title = "Food Budget",
                BudgetType = "expense", TargetAmount = 3000000m, CurrentAmount = 200000m,
                PeriodType = "monthly", StartDate = new DateTime(2026, 1, 1),
                IsActive = true, CreatedAt = now,
            },
            new Budget
            {
                BudgetId = 2, UserId = _userId, AccountId = 1, Title = "Car Savings",
                BudgetType = "savings", TargetAmount = 20000000m, CurrentAmount = 5000000m,
                PeriodType = "monthly", StartDate = new DateTime(2026, 1, 1),
                IsActive = true, CreatedAt = now,
            }
        );

        _db.SaveChanges();
    }

    public void Dispose()
    {
        _db.Database.EnsureDeleted();
        _db.Dispose();
    }

    // ─── ExportTransactionsCsvAsync ────────────────────────────────────────

    [Fact]
    public async Task ExportTransactionsCsvAsync_ReturnsCsvContent()
    {
        var (csv, filename) = await _service.ExportTransactionsCsvAsync(_userId, null, null);

        csv.Should().NotBeNullOrEmpty();
        filename.Should().StartWith("transactions_").And.EndWith(".csv");

        var lines = csv.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
        lines.Should().HaveCount(3);  // 1 header + 2 data rows

        // Header
        lines[0].Should().Contain("journal_id").And.Contain("description");

        // First data row
        lines[1].Should().Contain("Grocery");
        lines[1].Should().Contain("200000");
    }

    [Fact]
    public async Task ExportTransactionsCsvAsync_FiltersByDateRange()
    {
        var from = new DateTime(2026, 1, 19);
        var to   = new DateTime(2026, 1, 31);

        var (csv, _) = await _service.ExportTransactionsCsvAsync(_userId, from, to);

        var lines = csv.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
        lines.Should().HaveCount(2);  // 1 header + 1 data row
        lines[1].Should().Contain("Bus pass");
    }

    [Fact]
    public async Task ExportTransactionsCsvAsync_NoData_ReturnsHeaderOnly()
    {
        var from = new DateTime(2025, 1, 1);
        var to   = new DateTime(2025, 12, 31);

        var (csv, _) = await _service.ExportTransactionsCsvAsync(_userId, from, to);

        var lines = csv.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
        lines.Should().ContainSingle();  // only header
        lines[0].Should().Contain("journal_id");
    }

    [Fact]
    public async Task ExportTransactionsCsvAsync_IncludesForeignCurrency()
    {
        var (csv, _) = await _service.ExportTransactionsCsvAsync(_userId, null, null);

        csv.Should().Contain("10");          // foreign_amount
        csv.Should().Contain("USD");         // foreign_currency
    }

    // ─── ExportAccountsCsvAsync ────────────────────────────────────────────

    [Fact]
    public async Task ExportAccountsCsvAsync_ReturnsCsvContent()
    {
        var (csv, filename) = await _service.ExportAccountsCsvAsync(_userId);

        csv.Should().NotBeNullOrEmpty();
        filename.Should().StartWith("accounts_").And.EndWith(".csv");

        var lines = csv.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
        lines.Should().HaveCount(4);  // 1 header + 3 accounts

        lines[0].Should().Contain("account_id").And.Contain("type");
        lines[1].Should().Contain("Checking");
        lines[1].Should().Contain("5000000");
    }

    [Fact]
    public async Task ExportAccountsCsvAsync_IncludesTypeName()
    {
        var (csv, _) = await _service.ExportAccountsCsvAsync(_userId);

        csv.Should().Contain("Assets");
        csv.Should().Contain("Revenue");
        csv.Should().Contain("Expense");
    }

    // ─── ExportBudgetsCsvAsync ─────────────────────────────────────────────

    [Fact]
    public async Task ExportBudgetsCsvAsync_ReturnsCsvContent()
    {
        var (csv, filename) = await _service.ExportBudgetsCsvAsync(_userId);

        csv.Should().NotBeNullOrEmpty();
        filename.Should().StartWith("budgets_").And.EndWith(".csv");

        var lines = csv.Split(Environment.NewLine, StringSplitOptions.RemoveEmptyEntries);
        lines.Should().HaveCount(3);  // 1 header + 2 budgets

        lines[0].Should().Contain("budget_id").And.Contain("title");
        lines[1].Should().Contain("Food Budget");
        lines[2].Should().Contain("Car Savings");
    }

    // ─── ExportTransactionsAsync (format-aware) ────────────────────────────

    [Fact]
    public async Task ExportTransactionsAsync_CsvFormat_ReturnsCorrectMime()
    {
        var (bytes, mime, filename) = await _service.ExportTransactionsAsync(
            _userId, null, null, ExportFormat.Csv);

        mime.Should().Be("text/csv; charset=utf-8");
        filename.Should().EndWith(".csv");
        bytes.Should().NotBeEmpty();

        var content = Encoding.UTF8.GetString(bytes);
        content.Should().Contain("Grocery");
    }

    [Fact]
    public async Task ExportTransactionsAsync_JsonFormat_ReturnsValidJson()
    {
        var (bytes, mime, filename) = await _service.ExportTransactionsAsync(
            _userId, null, null, ExportFormat.Json);

        mime.Should().Be("application/json; charset=utf-8");
        filename.Should().EndWith(".json");
        bytes.Should().NotBeEmpty();

        var content = Encoding.UTF8.GetString(bytes);
        var docs = JsonSerializer.Deserialize<System.Text.Json.JsonElement[]>(content);
        docs.Should().HaveCount(2);
        docs[0].GetProperty("description").GetString().Should().Be("Grocery");
        docs[0].GetProperty("amount").GetDecimal().Should().Be(200000m);
    }

    [Fact]
    public async Task ExportTransactionsAsync_XlsxFormat_ReturnsSpreadsheet()
    {
        var (bytes, mime, filename) = await _service.ExportTransactionsAsync(
            _userId, null, null, ExportFormat.Xlsx);

        mime.Should().Be("application/vnd.ms-excel");
        filename.Should().EndWith(".xls");
        bytes.Should().NotBeEmpty();

        // Verify it's valid XML (SpreadsheetML 2003)
        var content = Encoding.UTF8.GetString(bytes);
        content.Should().Contain("<?xml");
        content.Should().Contain("<Workbook");
        content.Should().Contain("<Worksheet");
        content.Should().Contain("Grocery");
    }

    // ─── ExportAccountsAsync (format-aware) ────────────────────────────────

    [Fact]
    public async Task ExportAccountsAsync_CsvFormat_ReturnsCsv()
    {
        var (bytes, mime, filename) = await _service.ExportAccountsAsync(
            _userId, ExportFormat.Csv);

        mime.Should().Be("text/csv; charset=utf-8");
        filename.Should().EndWith(".csv");
        var content = Encoding.UTF8.GetString(bytes);
        content.Should().Contain("Checking");
    }

    [Fact]
    public async Task ExportAccountsAsync_JsonFormat_ReturnsJson()
    {
        var (bytes, mime, _) = await _service.ExportAccountsAsync(
            _userId, ExportFormat.Json);

        var content = Encoding.UTF8.GetString(bytes);
        var docs = JsonSerializer.Deserialize<System.Text.Json.JsonElement[]>(content);
        docs.Should().HaveCount(3);
        docs[0].GetProperty("name").GetString().Should().Be("Checking");
    }

    [Fact]
    public async Task ExportAccountsAsync_XlsxFormat_ReturnsXlsx()
    {
        var (bytes, mime, _) = await _service.ExportAccountsAsync(
            _userId, ExportFormat.Xlsx);

        var content = Encoding.UTF8.GetString(bytes);
        content.Should().Contain("<Workbook");
        content.Should().Contain("Assets");
    }

    // ─── ExportBudgetsAsync (format-aware) ─────────────────────────────────

    [Fact]
    public async Task ExportBudgetsAsync_CsvFormat_ReturnsCsv()
    {
        var (bytes, mime, filename) = await _service.ExportBudgetsAsync(
            _userId, ExportFormat.Csv);

        mime.Should().Be("text/csv; charset=utf-8");
        filename.Should().EndWith(".csv");
        var content = Encoding.UTF8.GetString(bytes);
        content.Should().Contain("Food Budget");
    }

    [Fact]
    public async Task ExportBudgetsAsync_JsonFormat_ReturnsJson()
    {
        var (bytes, _, _) = await _service.ExportBudgetsAsync(
            _userId, ExportFormat.Json);

        var content = Encoding.UTF8.GetString(bytes);
        var docs = JsonSerializer.Deserialize<System.Text.Json.JsonElement[]>(content);
        docs.Should().HaveCount(2);
        docs.Any(d => d.GetProperty("title").GetString() == "Food Budget").Should().BeTrue();
    }

    [Fact]
    public async Task ExportBudgetsAsync_XlsxFormat_ReturnsXlsx()
    {
        var (bytes, _, _) = await _service.ExportBudgetsAsync(
            _userId, ExportFormat.Xlsx);

        var content = Encoding.UTF8.GetString(bytes);
        content.Should().Contain("Food Budget");
        content.Should().Contain("Car Savings");
    }

    // ─── Empty data edge cases ─────────────────────────────────────────────

    [Fact]
    public async Task ExportTransactionsAsync_NoData_AllFormatsWork()
    {
        var from = new DateTime(2025, 1, 1);
        var to   = new DateTime(2025, 12, 31);

        // CSV
        var (csvBytes, csvMime, csvFilename) = await _service.ExportTransactionsAsync(
            _userId, from, to, ExportFormat.Csv);
        csvMime.Should().Be("text/csv; charset=utf-8");
        csvFilename.Should().EndWith(".csv");
        var csv = Encoding.UTF8.GetString(csvBytes);
        csv.Should().Contain("journal_id");  // header only

        // JSON
        var (jsonBytes, jsonMime, _) = await _service.ExportTransactionsAsync(
            _userId, from, to, ExportFormat.Json);
        jsonMime.Should().Be("application/json; charset=utf-8");
        var json = Encoding.UTF8.GetString(jsonBytes);
        json.Should().Be("[]");  // empty array

        // XLSX
        var (xlsxBytes, xlsxMime, _) = await _service.ExportTransactionsAsync(
            _userId, from, to, ExportFormat.Xlsx);
        xlsxMime.Should().Be("application/vnd.ms-excel");
        var xlsx = Encoding.UTF8.GetString(xlsxBytes);
        xlsx.Should().Contain("<Row>");  // header row only
    }

    // ─── Legacy CSV-only methods match format-aware methods ────────────────

    [Fact]
    public async Task ExportTransactionsAsync_LegacyCsv_MatchesFormatCsv()
    {
        var (legacyCsv, _) = await _service.ExportTransactionsCsvAsync(_userId, null, null);
        var (bytes, _, _) = await _service.ExportTransactionsAsync(
            _userId, null, null, ExportFormat.Csv);
        var formatCsv = Encoding.UTF8.GetString(bytes);

        // Format method prepends BOM preamble, legacy returns raw string
        var boms = Encoding.UTF8.GetPreamble();
        formatCsv.StartsWith(Encoding.UTF8.GetString(boms)).Should().BeTrue();
        formatCsv.Substring(Encoding.UTF8.GetString(boms).Length).Should().Be(legacyCsv);
    }

    [Fact]
    public async Task ExportAccountsAsync_LegacyCsv_MatchesFormatCsv()
    {
        var (legacyCsv, _) = await _service.ExportAccountsCsvAsync(_userId);
        var (bytes, _, _) = await _service.ExportAccountsAsync(_userId, ExportFormat.Csv);
        var formatCsv = Encoding.UTF8.GetString(bytes);

        // Legacy CSV returns raw string without BOM
        // Format CSV returns bytes with preamble (BOM)
        // The BOM is the UTF-8 BOM (3 bytes) prepended
        var boms = Encoding.UTF8.GetPreamble();
        formatCsv.StartsWith(Encoding.UTF8.GetString(boms)).Should().BeTrue();
        formatCsv.Substring(Encoding.UTF8.GetString(boms).Length).Should().Be(legacyCsv);
    }
}
