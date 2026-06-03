using BudgetManagement.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BudgetManagement.APIService;

/// <summary>
/// Chạy ngầm mỗi ngày lúc nửa đêm — tự động xử lý giao dịch định kỳ.
/// </summary>
public class RecurringHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RecurringHostedService> _logger;

    // Chạy mỗi 24 giờ
    private readonly TimeSpan _interval = TimeSpan.FromHours(24);

    public RecurringHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<RecurringHostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger       = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("RecurringHostedService started.");

        // Chờ đến nửa đêm lần đầu tiên
        await WaitUntilMidnightAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Tạo scope mới vì IRecurringService là Scoped
                using var scope = _scopeFactory.CreateScope();
                var recurringService = scope.ServiceProvider
                    .GetRequiredService<IRecurringService>();

                _logger.LogInformation("Processing due recurring transactions at {Time}", DateTime.UtcNow);
                await recurringService.ProcessDueRecurringsAsync();

                // Reset expired budget periods (CurrentAmount = 0 for new cycle)
                var budgetService = scope.ServiceProvider.GetRequiredService<IBudgetService>();
                await budgetService.ResetExpiredPeriodsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing recurring transactions.");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private static async Task WaitUntilMidnightAsync(CancellationToken cancellationToken)
    {
        var now       = DateTime.Now;
        var midnight  = now.Date.AddDays(1); // nửa đêm ngày mai
        var delay     = midnight - now;
        await Task.Delay(delay, cancellationToken);
    }
}