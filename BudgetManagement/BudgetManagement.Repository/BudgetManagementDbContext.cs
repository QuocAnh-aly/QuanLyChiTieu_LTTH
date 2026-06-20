using BudgetManagement.Entities;
using Microsoft.EntityFrameworkCore;

namespace BudgetManagement.Repository;

public class BudgetManagementDbContext : DbContext
{
    public BudgetManagementDbContext(DbContextOptions<BudgetManagementDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<AccountType> AccountTypes { get; set; } = null!;
    public DbSet<Account> Accounts { get; set; } = null!;
    public DbSet<JournalEntry> JournalEntries { get; set; } = null!;
    public DbSet<JournalDetail> JournalDetails { get; set; } = null!;
    public DbSet<Budget> Budgets { get; set; } = null!;
    public DbSet<RecurringJournal> RecurringJournals { get; set; } = null!;
    public DbSet<RecurringInstance> RecurringInstances { get; set; } = null!;
    public DbSet<PiggyBankEvent> PiggyBankEvents { get; set; } = null!;
    public DbSet<Bill> Bills { get; set; } = null!;
    public DbSet<Currency> Currencies { get; set; } = null!;
    public DbSet<ExchangeRate> ExchangeRates { get; set; } = null!;
    public DbSet<RuleGroup> RuleGroups { get; set; } = null!;
    public DbSet<Rule> Rules { get; set; } = null!;
    public DbSet<RuleTrigger> RuleTriggers { get; set; } = null!;
    public DbSet<RuleAction> RuleActions { get; set; } = null!;
    public DbSet<Webhook> Webhooks { get; set; } = null!;
    public DbSet<WebhookMessage> WebhookMessages { get; set; } = null!;
    public DbSet<Attachment> Attachments { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ─── Entity Primary Keys ──────────────────────────────────────────────────
        modelBuilder.Entity<User>().HasKey(u => u.UserId);
        modelBuilder.Entity<AccountType>().HasKey(at => at.TypeId);
        modelBuilder.Entity<Account>().HasKey(a => a.AccountId);
        modelBuilder.Entity<JournalEntry>().HasKey(j => j.JournalId);
        modelBuilder.Entity<JournalDetail>().HasKey(jd => jd.DetailId);
        modelBuilder.Entity<Budget>().HasKey(b => b.BudgetId);
        modelBuilder.Entity<RecurringJournal>().HasKey(rj => rj.RecurringId);
        modelBuilder.Entity<RecurringInstance>().HasKey(ri => ri.InstanceId);
        modelBuilder.Entity<PiggyBankEvent>().HasKey(pe => pe.EventId);
        modelBuilder.Entity<Bill>().HasKey(b => b.BillId);
        modelBuilder.Entity<Currency>().HasKey(c => c.CurrencyId);
        modelBuilder.Entity<ExchangeRate>().HasKey(r => r.RateId);
        modelBuilder.Entity<RuleGroup>().HasKey(g => g.GroupId);
        modelBuilder.Entity<Rule>().HasKey(r => r.RuleId);
        modelBuilder.Entity<RuleTrigger>().HasKey(t => t.TriggerId);
        modelBuilder.Entity<RuleAction>().HasKey(a => a.ActionId);
        modelBuilder.Entity<Webhook>().HasKey(w => w.WebhookId);
        modelBuilder.Entity<WebhookMessage>().HasKey(m => m.MessageId);
        modelBuilder.Entity<Attachment>().HasKey(a => a.AttachmentId);

        // ─── Snake Case Mapping ───────────────────────────────────────────────────
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            // Keep table names as PascalCase (default EF behavior) to match SQL script "Users", "Accounts"
            // But map columns to snake_case to match "user_account", "password_hash"
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }
        }

        // ─── Decimal precision ────────────────────────────────────────────────────
        // Cố định precision cho mọi cột tiền tệ thành (19,4) — đủ cho số tiền có
        // quy đổi ngoại tệ, tránh để EF ngầm mặc định (18,2) gây nhập nhằng/cảnh báo.
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                if (property.ClrType == typeof(decimal) || property.ClrType == typeof(decimal?))
                {
                    property.SetPrecision(19);
                    property.SetScale(4);
                }
            }
        }
        // Tỷ giá hối đoái cần nhiều chữ số lẻ hơn số tiền.
        modelBuilder.Entity<ExchangeRate>().Property(r => r.Rate).HasPrecision(18, 8);

        // Special mapping for tables with underscores in SQL script
        modelBuilder.Entity<AccountType>().ToTable("Account_Types");
        modelBuilder.Entity<PiggyBankEvent>().ToTable("Piggy_Bank_Events");
        modelBuilder.Entity<JournalEntry>().ToTable("Journal_Entries");
        modelBuilder.Entity<JournalDetail>().ToTable("Journal_Details");
        modelBuilder.Entity<RecurringJournal>().ToTable("Recurring_Journals");
        modelBuilder.Entity<RecurringInstance>().ToTable("Recurring_Instances");
        modelBuilder.Entity<ExchangeRate>().ToTable("Exchange_Rates");
        modelBuilder.Entity<RuleGroup>().ToTable("Rule_Groups");
        modelBuilder.Entity<RuleTrigger>().ToTable("Rule_Triggers");
        modelBuilder.Entity<RuleAction>().ToTable("Rule_Actions");
        modelBuilder.Entity<WebhookMessage>().ToTable("Webhook_Messages");


        // ─── Relationships ────────────────────────────────────────────────────────
        modelBuilder.Entity<JournalDetail>()
            .HasOne(d => d.JournalEntry)
            .WithMany(p => p.JournalDetails)
            .HasForeignKey(d => d.JournalId);

        modelBuilder.Entity<JournalDetail>()
            .HasOne(d => d.Account)
            .WithMany(p => p.JournalDetails)
            .HasForeignKey(d => d.AccountId);

        modelBuilder.Entity<Budget>()
            .HasOne(d => d.Account)
            .WithMany(p => p.Budgets)
            .HasForeignKey(d => d.AccountId);

        modelBuilder.Entity<Account>()
            .HasOne(d => d.AccountType)
            .WithMany(p => p.Accounts)
            .HasForeignKey(d => d.TypeId);

        modelBuilder.Entity<RecurringJournal>()
            .HasOne(d => d.DebitAccount)
            .WithMany()
            .HasForeignKey(d => d.DebitAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<RecurringJournal>()
            .HasOne(d => d.CreditAccount)
            .WithMany()
            .HasForeignKey(d => d.CreditAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PiggyBankEvent>()
            .HasOne(e => e.Budget)
            .WithMany(b => b.PiggyBankEvents)
            .HasForeignKey(e => e.BudgetId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Bill>()
            .HasOne(b => b.User)
            .WithMany()
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ClientSetNull: no SQL-level cascade rule (avoids multi-path conflict via Users→Bills and Users→JournalEntries)
        // Service always calls UnlinkAllEntriesAsync before deleting a Bill
        modelBuilder.Entity<JournalEntry>()
            .HasOne(j => j.Bill)
            .WithMany(b => b.JournalEntries)
            .HasForeignKey(j => j.BillId)
            .OnDelete(DeleteBehavior.ClientSetNull);

        modelBuilder.Entity<Currency>()
            .HasOne(c => c.User)
            .WithMany()
            .HasForeignKey(c => c.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ExchangeRate>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RuleGroup>()
            .HasOne(g => g.User)
            .WithMany()
            .HasForeignKey(g => g.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Rule>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Rule>()
            .HasOne(r => r.Group)
            .WithMany(g => g.Rules)
            .HasForeignKey(r => r.GroupId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<RuleTrigger>()
            .HasOne(t => t.Rule)
            .WithMany(r => r.Triggers)
            .HasForeignKey(t => t.RuleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RuleAction>()
            .HasOne(a => a.Rule)
            .WithMany(r => r.Actions)
            .HasForeignKey(a => a.RuleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Webhook>()
            .HasOne(w => w.User)
            .WithMany()
            .HasForeignKey(w => w.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<WebhookMessage>()
            .HasOne(m => m.Webhook)
            .WithMany(w => w.Messages)
            .HasForeignKey(m => m.WebhookId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Attachment>()
            .HasOne(a => a.User)
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private string ToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        var startUnderscore = System.Text.RegularExpressions.Regex.Replace(input, @"([a-z0-9])([A-Z])", "$1_$2").ToLower();
        return startUnderscore;
    }
}

