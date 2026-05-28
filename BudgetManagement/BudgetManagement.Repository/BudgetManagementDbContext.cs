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

        // Special mapping for tables with underscores in SQL script
        modelBuilder.Entity<AccountType>().ToTable("Account_Types");
        modelBuilder.Entity<PiggyBankEvent>().ToTable("Piggy_Bank_Events");
        modelBuilder.Entity<JournalEntry>().ToTable("Journal_Entries");
        modelBuilder.Entity<JournalDetail>().ToTable("Journal_Details");
        modelBuilder.Entity<RecurringJournal>().ToTable("Recurring_Journals");
        modelBuilder.Entity<RecurringInstance>().ToTable("Recurring_Instances");


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
    }

    private string ToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        var startUnderscore = System.Text.RegularExpressions.Regex.Replace(input, @"([a-z0-9])([A-Z])", "$1_$2").ToLower();
        return startUnderscore;
    }
}

