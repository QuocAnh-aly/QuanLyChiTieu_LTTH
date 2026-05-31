using Microsoft.Data.SqlClient;

// ─── Configuration ───────────────────────────────────────────────────────────
string? connectionString = null;

// 1. Try command-line argument
if (args.Length > 0)
{
    connectionString = args[0];
    Console.WriteLine("Using connection string from command-line argument.");
}
// 2. Try reading from appsettings.json sibling paths
else
{
    var searchPaths = new[]
    {
        Path.Combine("..", "BudgetManagement.APIService", "appsettings.json"),
        Path.Combine("..", "BudgetManagement.AuthService", "appsettings.Development.json"),
    };

    foreach (var relativePath in searchPaths)
    {
        var fullPath = Path.GetFullPath(relativePath);
        if (File.Exists(fullPath))
        {
            try
            {
                var json = File.ReadAllText(fullPath);
                var doc = System.Text.Json.JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("ConnectionStrings", out var connSection)
                    && connSection.TryGetProperty("DefaultConnection", out var connValue))
                {
                    connectionString = connValue.GetString();
                    Console.WriteLine($"Read connection string from: {fullPath}");
                    break;
                }
            }
            catch { /* skip */ }
        }
    }
}

if (string.IsNullOrEmpty(connectionString))
{
    Console.Error.WriteLine("ERROR: No connection string found.");
    Console.Error.WriteLine();
    Console.Error.WriteLine("Usage: dotnet run -- <connection_string>");
    Console.Error.WriteLine("   or  dotnet run   (reads from appsettings.json automatically)");
    return 1;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
string MaskPassword(string cs)
{
    var builder = new SqlConnectionStringBuilder(cs);
    if (!string.IsNullOrEmpty(builder.Password))
        builder.Password = new string('*', builder.Password.Length);
    return builder.ConnectionString;
}

void WriteHeader(string title)
{
    Console.WriteLine();
    Console.WriteLine($"╔═══ {title} ═══");
}

void WriteOk(string label, string value)
{
    Console.WriteLine($"  \u2705 {label}: {value}");
}

void WriteInfo(string label, string value)
{
    Console.WriteLine($"  \u2139 {label}: {value}");
}

void WriteError(string label, string value)
{
    Console.WriteLine($"  \u274c {label}: {value}");
}

// ─── Main Logic ──────────────────────────────────────────────────────────────
Console.BackgroundColor = ConsoleColor.DarkBlue;
Console.ForegroundColor = ConsoleColor.White;
Console.WriteLine("  BudgetManagement - Database Connection Tester  ");
Console.ResetColor();
Console.WriteLine();

WriteInfo("Connection String (masked)", MaskPassword(connectionString));
Console.WriteLine();

// ─── Test Connection ─────────────────────────────────────────────────────────
WriteHeader("1. Connection Test");

try
{
    using var conn = new SqlConnection(connectionString);
    await conn.OpenAsync();

    var sb = new SqlConnectionStringBuilder(connectionString);
    WriteOk("Server", sb.DataSource);
    WriteOk("Database", sb.InitialCatalog);
    WriteOk("Status", "Connected successfully!");
    Console.WriteLine();
}
catch (Exception ex)
{
    WriteError("Connection Failed", ex.Message);
    Console.WriteLine();
    Console.Error.WriteLine("Possible causes:");
    Console.Error.WriteLine("  - SQL Server is not running");
    Console.Error.WriteLine("  - Firewall blocking port 1434");
    Console.Error.WriteLine("  - Incorrect credentials");
    Console.Error.WriteLine("  - Database does not exist");
    return 1;
}

// ─── Server Info ─────────────────────────────────────────────────────────────
WriteHeader("2. Server Information");

try
{
    using var conn = new SqlConnection(connectionString);
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();
    cmd.CommandText = @"
        SELECT
            SERVERPROPERTY('ProductVersion') AS Version,
            SERVERPROPERTY('Edition') AS Edition,
            DB_NAME() AS CurrentDB,
            @@VERSION AS FullVersion";

    using var reader = await cmd.ExecuteReaderAsync();
    if (await reader.ReadAsync())
    {
        WriteOk("SQL Server Version", reader["Version"]?.ToString() ?? "N/A");
        WriteOk("Edition", reader["Edition"]?.ToString() ?? "N/A");
    }
}
catch (Exception ex)
{
    WriteError("Could not retrieve server info", ex.Message);
}

// ─── Database Info ───────────────────────────────────────────────────────────
WriteHeader("3. Database Information");

try
{
    using var conn = new SqlConnection(connectionString);
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();
    cmd.CommandText = @"
        SELECT
            DB_NAME() AS DatabaseName,
            SUM(size * 8 / 1024) AS SizeMB
        FROM sys.database_files
        WHERE type = 0";

    using var reader = await cmd.ExecuteReaderAsync();
    if (await reader.ReadAsync())
    {
        WriteOk("Database Name", reader["DatabaseName"]?.ToString() ?? "N/A");
        WriteInfo("Data File Size", $"{reader["SizeMB"]} MB");
    }
}
catch (Exception ex)
{
    WriteError("Could not retrieve database info", ex.Message);
}

// ─── List Tables ─────────────────────────────────────────────────────────────
WriteHeader("4. Tables & Row Counts");

try
{
    using var conn = new SqlConnection(connectionString);
    await conn.OpenAsync();

    using var cmd = conn.CreateCommand();
    cmd.CommandText = @"
        SELECT
            t.name AS [TableName],
            s.name AS [SchemaName],
            p.[rows] AS [RowCount]
        FROM sys.tables t
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        INNER JOIN sys.partitions p ON t.object_id = p.object_id
        WHERE p.index_id IN (0, 1)
        ORDER BY t.name";

    using var reader = await cmd.ExecuteReaderAsync();
    var tables = new List<(string Schema, string Name, long Rows)>();
    while (await reader.ReadAsync())
    {
        tables.Add((
            reader["SchemaName"]?.ToString() ?? "dbo",
            reader["TableName"]?.ToString() ?? "?",
            Convert.ToInt64(reader["RowCount"])
        ));
    }

    if (tables.Count == 0)
    {
        Console.WriteLine("  (No tables found - database may be empty)");
    }
    else
    {
        Console.WriteLine($"  Found {tables.Count} tables:");
        Console.WriteLine();
        long totalRows = 0;
        foreach (var (schema, name, rows) in tables)
        {
            totalRows += rows;
            var rowStr = rows.ToString("N0");
            Console.WriteLine($"    {schema}.{name,-30} {rowStr,10} rows");
        }
        Console.WriteLine();
        WriteInfo("Total Rows", $"{totalRows:N0}");
    }
}
catch (Exception ex)
{
    WriteError("Could not list tables", ex.Message);
}

// ─── Quick Record Counts from Key Tables ────────────────────────────────────
WriteHeader("5. Key Entity Counts");

try
{
    using var conn = new SqlConnection(connectionString);
    await conn.OpenAsync();

    var queries = new Dictionary<string, string>
    {
        ["Users"]           = "SELECT COUNT(*) FROM Users",
        ["Accounts"]        = "SELECT COUNT(*) FROM Accounts",
        ["Account Types"]   = "SELECT COUNT(*) FROM Account_Types",
        ["Journal Entries"] = "SELECT COUNT(*) FROM Journal_Entries",
        ["Journal Details"] = "SELECT COUNT(*) FROM Journal_Details",
        ["Budgets"]         = "SELECT COUNT(*) FROM Budgets",
        ["Bills"]           = "SELECT COUNT(*) FROM Bills",
        ["Recurring"]       = "SELECT COUNT(*) FROM Recurring_Journals",
        ["Currencies"]      = "SELECT COUNT(*) FROM Currencies",
        ["Exchange Rates"]  = "SELECT COUNT(*) FROM Exchange_Rates",
        ["Rules"]           = "SELECT COUNT(*) FROM Rules",
        ["Rule Groups"]     = "SELECT COUNT(*) FROM Rule_Groups",
        ["Webhooks"]        = "SELECT COUNT(*) FROM Webhooks",
        ["Attachments"]     = "SELECT COUNT(*) FROM Attachments",
    };

    var missingTables = new List<string>();
    foreach (var (label, sql) in queries)
    {
        try
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            Console.WriteLine($"    {label,-20} {count,10:N0} records");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"    {label,-20} {'?',10} (error: {ex.Message})");
            missingTables.Add(label);
        }
    }

    if (missingTables.Count > 0)
    {
        Console.WriteLine();
        Console.WriteLine("  \u26a0 Note: The following expected tables were not found:");
        foreach (var tbl in missingTables)
            Console.WriteLine($"    - {tbl}");
        Console.WriteLine();
        Console.WriteLine("  This may mean the SQL seed script (csdl_sqlserver.sql) was only partially applied.");
        Console.WriteLine("  Run the full script against the database to create all tables.");
    }
}
catch (Exception ex)
{
    WriteError("Could not query tables", ex.Message);
}

// ─── Summary ────────────────────────────────────────────────────────────────
Console.WriteLine();
Console.BackgroundColor = ConsoleColor.DarkGreen;
Console.ForegroundColor = ConsoleColor.White;
Console.WriteLine("  Database connection test completed.  ");
Console.ResetColor();
Console.WriteLine();

return 0;
