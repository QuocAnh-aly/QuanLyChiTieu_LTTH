using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Xml;
using BudgetManagement.Repository;
using BudgetManagement.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Services.Implementations;

public class ExportService : IExportService
{
    private readonly BudgetManagementDbContext _db;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        Encoder       = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public ExportService(BudgetManagementDbContext db) { _db = db; }

    // ─── Row collectors (one source of truth, reused by CSV/JSON/XLSX) ───────

    private async Task<(string[] Headers, List<object?[]> Rows)> CollectTransactionsAsync(int userId, DateTime? from, DateTime? to)
    {
        var query = _db.JournalEntries
            .Include(e => e.JournalDetails)
                .ThenInclude(d => d.Account)
            .Where(e => e.UserId == userId);
        if (from.HasValue) query = query.Where(e => e.TransactionDate >= from.Value);
        if (to.HasValue)   query = query.Where(e => e.TransactionDate <= to.Value);

        var entries = await query.OrderBy(e => e.TransactionDate).ToListAsync();

        var headers = new[] { "journal_id","date","description","notes","tags","source_account","destination_account","amount","foreign_amount","foreign_currency" };
        var rows = entries.Select(e =>
        {
            var debit  = e.JournalDetails.FirstOrDefault(d => (d.Debit  ?? 0) > 0);
            var credit = e.JournalDetails.FirstOrDefault(d => (d.Credit ?? 0) > 0);
            return new object?[]
            {
                e.JournalId,
                e.TransactionDate,
                e.Description,
                e.Notes,
                e.Tags,
                credit?.Account?.Name,
                debit?.Account?.Name,
                debit?.Debit ?? 0m,
                e.ForeignAmount ?? 0m,
                e.ForeignCurrencyCode,
            };
        }).ToList();

        return (headers, rows);
    }

    private async Task<(string[] Headers, List<object?[]> Rows)> CollectAccountsAsync(int userId)
    {
        var accounts = await _db.Accounts
            .Include(a => a.AccountType)
            .Where(a => a.UserId == userId)
            .OrderBy(a => a.TypeId).ThenBy(a => a.Name)
            .ToListAsync();

        var headers = new[] { "account_id","name","type","balance","initial_balance","currency_code","is_active","created_at" };
        var rows = accounts.Select(a => new object?[]
        {
            a.AccountId,
            a.Name,
            a.AccountType?.TypeName,
            a.Balance ?? 0m,
            a.InitialBalance ?? 0m,
            a.CurrencyCode,
            a.IsActive ?? true,
            a.CreatedAt,
        }).ToList();

        return (headers, rows);
    }

    private async Task<(string[] Headers, List<object?[]> Rows)> CollectBudgetsAsync(int userId)
    {
        var budgets = await _db.Budgets
            .Include(b => b.Account)
            .Where(b => b.UserId == userId)
            .OrderBy(b => b.BudgetType).ThenBy(b => b.Title)
            .ToListAsync();

        var headers = new[] { "budget_id","title","type","account","target","current","period","start_date","end_date","is_active" };
        var rows = budgets.Select(b => new object?[]
        {
            b.BudgetId,
            b.Title,
            b.BudgetType,
            b.Account?.Name,
            b.TargetAmount,
            b.CurrentAmount ?? 0m,
            b.PeriodType,
            b.StartDate,
            b.EndDate,
            b.IsActive ?? true,
        }).ToList();

        return (headers, rows);
    }

    // ─── Legacy CSV-only entry points ────────────────────────────────────────

    public async Task<(string Csv, string Filename)> ExportTransactionsCsvAsync(int userId, DateTime? from, DateTime? to)
    {
        var (h, r) = await CollectTransactionsAsync(userId, from, to);
        return (ToCsv(h, r), $"transactions_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv");
    }

    public async Task<(string Csv, string Filename)> ExportAccountsCsvAsync(int userId)
    {
        var (h, r) = await CollectAccountsAsync(userId);
        return (ToCsv(h, r), $"accounts_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv");
    }

    public async Task<(string Csv, string Filename)> ExportBudgetsCsvAsync(int userId)
    {
        var (h, r) = await CollectBudgetsAsync(userId);
        return (ToCsv(h, r), $"budgets_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv");
    }

    // ─── Format-aware entry points ──────────────────────────────────────────

    public async Task<(byte[] Bytes, string Mime, string Filename)> ExportTransactionsAsync(int userId, DateTime? from, DateTime? to, ExportFormat format)
    {
        var (h, r) = await CollectTransactionsAsync(userId, from, to);
        return Pack(h, r, "transactions", format);
    }

    public async Task<(byte[] Bytes, string Mime, string Filename)> ExportAccountsAsync(int userId, ExportFormat format)
    {
        var (h, r) = await CollectAccountsAsync(userId);
        return Pack(h, r, "accounts", format);
    }

    public async Task<(byte[] Bytes, string Mime, string Filename)> ExportBudgetsAsync(int userId, ExportFormat format)
    {
        var (h, r) = await CollectBudgetsAsync(userId);
        return Pack(h, r, "budgets", format);
    }

    // ─── Formatters ──────────────────────────────────────────────────────────

    private static (byte[] Bytes, string Mime, string Filename) Pack(
        string[] headers, List<object?[]> rows, string nameStem, ExportFormat format)
    {
        var stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        return format switch
        {
            ExportFormat.Json => (
                System.Text.Encoding.UTF8.GetBytes(ToJson(headers, rows)),
                "application/json; charset=utf-8",
                $"{nameStem}_{stamp}.json"
            ),
            ExportFormat.Xlsx => (
                ToXlsxSpreadsheetML(headers, rows, nameStem),
                "application/vnd.ms-excel",           // SpreadsheetML 2003 — Excel opens this fine
                $"{nameStem}_{stamp}.xls"             // .xls so Excel doesn't reject the strict .xlsx mime
            ),
            _ => (
                System.Text.Encoding.UTF8.GetPreamble()
                    .Concat(System.Text.Encoding.UTF8.GetBytes(ToCsv(headers, rows)))
                    .ToArray(),
                "text/csv; charset=utf-8",
                $"{nameStem}_{stamp}.csv"
            ),
        };
    }

    private static string ToCsv(string[] headers, List<object?[]> rows)
    {
        var sb = new StringBuilder();
        sb.AppendLine(string.Join(',', headers));
        foreach (var row in rows)
        {
            sb.AppendLine(string.Join(',', row.Select(CsvCell)));
        }
        return sb.ToString();
    }

    private static string CsvCell(object? v)
    {
        if (v is null) return "";
        switch (v)
        {
            case DateTime dt:    return dt.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture);
            case decimal d:      return d.ToString(CultureInfo.InvariantCulture);
            case bool b:         return b ? "true" : "false";
            case string s:       return Q(s);
            default:             return Q(v.ToString());
        }
    }

    /// <summary>RFC-4180 quoting: wrap in quotes and double any inner quotes.</summary>
    private static string Q(string? s)
    {
        if (string.IsNullOrEmpty(s)) return "";
        if (s.IndexOfAny(new[] { ',', '"', '\n', '\r' }) < 0) return s;
        return "\"" + s.Replace("\"", "\"\"") + "\"";
    }

    private static string ToJson(string[] headers, List<object?[]> rows)
    {
        var list = new List<Dictionary<string, object?>>(rows.Count);
        foreach (var row in rows)
        {
            var dict = new Dictionary<string, object?>(headers.Length);
            for (int i = 0; i < headers.Length; i++)
            {
                dict[headers[i]] = NormalizeForJson(row[i]);
            }
            list.Add(dict);
        }
        return JsonSerializer.Serialize(list, JsonOpts);
    }

    private static object? NormalizeForJson(object? v) => v switch
    {
        DateTime dt => dt.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture),
        _ => v,
    };

    /// <summary>
    /// Minimal SpreadsheetML 2003 — a single XML file Excel opens natively.
    /// Avoids needing ClosedXML / EPPlus while still giving "Excel" output.
    /// </summary>
    private static byte[] ToXlsxSpreadsheetML(string[] headers, List<object?[]> rows, string sheetName)
    {
        using var ms = new MemoryStream();
        var settings = new XmlWriterSettings { Encoding = new UTF8Encoding(false), Indent = false };
        using (var xw = XmlWriter.Create(ms, settings))
        {
            xw.WriteStartDocument();
            xw.WriteProcessingInstruction("mso-application", "progid=\"Excel.Sheet\"");
            xw.WriteStartElement("Workbook", "urn:schemas-microsoft-com:office:spreadsheet");
            xw.WriteAttributeString("xmlns", "ss", null, "urn:schemas-microsoft-com:office:spreadsheet");

            xw.WriteStartElement("Worksheet");
            xw.WriteAttributeString("ss", "Name", null, Capitalize(sheetName));

            xw.WriteStartElement("Table");

            // Header row
            xw.WriteStartElement("Row");
            foreach (var h in headers)
            {
                xw.WriteStartElement("Cell");
                xw.WriteStartElement("Data");
                xw.WriteAttributeString("ss", "Type", null, "String");
                xw.WriteString(h);
                xw.WriteEndElement(); // Data
                xw.WriteEndElement(); // Cell
            }
            xw.WriteEndElement(); // Row

            // Data rows
            foreach (var row in rows)
            {
                xw.WriteStartElement("Row");
                foreach (var v in row)
                {
                    xw.WriteStartElement("Cell");
                    xw.WriteStartElement("Data");
                    string type, text;
                    switch (v)
                    {
                        case null:
                            type = "String"; text = "";
                            break;
                        case decimal dec:
                            type = "Number"; text = dec.ToString(CultureInfo.InvariantCulture);
                            break;
                        case int    i:
                            type = "Number"; text = i.ToString(CultureInfo.InvariantCulture);
                            break;
                        case double d:
                            type = "Number"; text = d.ToString(CultureInfo.InvariantCulture);
                            break;
                        case bool b:
                            type = "Boolean"; text = b ? "1" : "0";
                            break;
                        case DateTime dt:
                            type = "DateTime"; text = dt.ToString("yyyy-MM-ddTHH:mm:ss.fff", CultureInfo.InvariantCulture);
                            break;
                        default:
                            type = "String"; text = v.ToString() ?? "";
                            break;
                    }
                    xw.WriteAttributeString("ss", "Type", null, type);
                    xw.WriteString(text);
                    xw.WriteEndElement(); // Data
                    xw.WriteEndElement(); // Cell
                }
                xw.WriteEndElement(); // Row
            }

            xw.WriteEndElement(); // Table
            xw.WriteEndElement(); // Worksheet
            xw.WriteEndElement(); // Workbook
            xw.WriteEndDocument();
        }
        return ms.ToArray();
    }

    private static string Capitalize(string s) =>
        string.IsNullOrEmpty(s) ? s : char.ToUpperInvariant(s[0]) + s.Substring(1);
}
