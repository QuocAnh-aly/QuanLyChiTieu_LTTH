namespace BudgetManagement.Services.Interfaces;

public enum ExportFormat { Csv, Json, Xlsx }

public interface IExportService
{
    // Legacy CSV-only entry points (kept so existing callers stay green)
    Task<(string Csv, string Filename)> ExportTransactionsCsvAsync(int userId, DateTime? from, DateTime? to);
    Task<(string Csv, string Filename)> ExportAccountsCsvAsync(int userId);
    Task<(string Csv, string Filename)> ExportBudgetsCsvAsync(int userId);

    // Format-aware variants — return bytes + MIME + filename.
    Task<(byte[] Bytes, string Mime, string Filename)> ExportTransactionsAsync(int userId, DateTime? from, DateTime? to, ExportFormat format);
    Task<(byte[] Bytes, string Mime, string Filename)> ExportAccountsAsync(int userId, ExportFormat format);
    Task<(byte[] Bytes, string Mime, string Filename)> ExportBudgetsAsync(int userId, ExportFormat format);
}
