using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Interfaces;

namespace BudgetManagement.Services.Implementations;

public class WebhookService : IWebhookService
{
    private readonly IWebhookRepository _webhookRepo;
    private readonly IHttpClientFactory _httpFactory;

    private static readonly HashSet<string> ValidTriggers = new(StringComparer.OrdinalIgnoreCase)
    {
        "STORE_TRANSACTION", "UPDATE_TRANSACTION", "DESTROY_TRANSACTION"
    };
    private static readonly HashSet<string> ValidResponses = new(StringComparer.OrdinalIgnoreCase)
    {
        "TRANSACTIONS", "ACCOUNTS", "NONE"
    };

    public WebhookService(IWebhookRepository webhookRepo, IHttpClientFactory httpFactory)
    {
        _webhookRepo = webhookRepo;
        _httpFactory = httpFactory;
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    public async Task<IEnumerable<WebhookDto>> GetAllAsync(int userId)
        => (await _webhookRepo.GetByUserAsync(userId)).Select(MapToDto);

    public async Task<WebhookDto> GetByIdAsync(int userId, int webhookId)
    {
        var w = await _webhookRepo.GetByIdAsync(webhookId)
                ?? throw new KeyNotFoundException("Không tìm thấy webhook.");
        if (w.UserId != userId) throw new UnauthorizedAccessException();
        return MapToDto(w);
    }

    public async Task<WebhookDto> CreateAsync(int userId, CreateWebhookDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new ArgumentException("Vui lòng nhập tiêu đề.");
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out _))
            throw new ArgumentException("URL phải là đường dẫn HTTP/HTTPS đầy đủ.");

        var trig = (request.TriggerType ?? "STORE_TRANSACTION").ToUpperInvariant();
        if (!ValidTriggers.Contains(trig))
            throw new ArgumentException($"Loại kích hoạt phải là một trong: {string.Join(", ", ValidTriggers)}");
        var resp = (request.Response ?? "TRANSACTIONS").ToUpperInvariant();
        if (!ValidResponses.Contains(resp))
            throw new ArgumentException($"Phản hồi phải là một trong: {string.Join(", ", ValidResponses)}");

        var w = new Webhook
        {
            UserId      = userId,
            Title       = request.Title.Trim(),
            Url         = request.Url.Trim(),
            TriggerType = trig,
            Response    = resp,
            Secret      = string.IsNullOrWhiteSpace(request.Secret) ? GenerateSecret() : request.Secret,
            IsActive    = true,
            CreatedAt   = DateTime.UtcNow,
        };
        return MapToDto(await _webhookRepo.CreateAsync(w));
    }

    public async Task<WebhookDto> UpdateAsync(int userId, int webhookId, UpdateWebhookDto request)
    {
        var w = await _webhookRepo.GetByIdAsync(webhookId)
                ?? throw new KeyNotFoundException("Không tìm thấy webhook.");
        if (w.UserId != userId) throw new UnauthorizedAccessException();

        if (request.Title != null) w.Title = request.Title.Trim();
        if (request.Url   != null)
        {
            if (!Uri.TryCreate(request.Url, UriKind.Absolute, out _))
                throw new ArgumentException("URL phải là đường dẫn đầy đủ.");
            w.Url = request.Url.Trim();
        }
        if (request.TriggerType != null)
        {
            var t = request.TriggerType.ToUpperInvariant();
            if (!ValidTriggers.Contains(t)) throw new ArgumentException("Loại kích hoạt không hợp lệ.");
            w.TriggerType = t;
        }
        if (request.Response != null)
        {
            var r = request.Response.ToUpperInvariant();
            if (!ValidResponses.Contains(r)) throw new ArgumentException("Phản hồi không hợp lệ.");
            w.Response = r;
        }
        if (request.Secret    != null) w.Secret    = request.Secret;
        if (request.IsActive.HasValue) w.IsActive = request.IsActive;

        return MapToDto(await _webhookRepo.UpdateAsync(w));
    }

    public async Task<bool> DeleteAsync(int userId, int webhookId)
    {
        var w = await _webhookRepo.GetByIdAsync(webhookId)
                ?? throw new KeyNotFoundException("Không tìm thấy webhook.");
        if (w.UserId != userId) throw new UnauthorizedAccessException();
        return await _webhookRepo.DeleteAsync(webhookId);
    }

    // ─── Messages ────────────────────────────────────────────────────────────

    public async Task<IEnumerable<WebhookMessageDto>> GetMessagesAsync(int userId, int webhookId, int take)
    {
        var w = await _webhookRepo.GetByIdAsync(webhookId)
                ?? throw new KeyNotFoundException("Không tìm thấy webhook.");
        if (w.UserId != userId) throw new UnauthorizedAccessException();

        var msgs = await _webhookRepo.GetMessagesAsync(webhookId, take <= 0 ? 50 : take);
        return msgs.Select(MapToDto);
    }

    public async Task<WebhookMessageDto> SubmitAsync(int userId, int webhookId, object? customPayload)
    {
        var w = await _webhookRepo.GetByIdAsync(webhookId)
                ?? throw new KeyNotFoundException("Không tìm thấy webhook.");
        if (w.UserId != userId) throw new UnauthorizedAccessException();

        var payload = customPayload ?? new { ping = "manual", at = DateTime.UtcNow };
        var msg = await DeliverAsync(w, null, payload);
        return MapToDto(msg);
    }

    // ─── Dispatch (fire-and-forget on transaction events) ────────────────────

    public async Task DispatchAsync(int userId, string triggerType, int? journalId, object payload)
    {
        var hooks = await _webhookRepo.GetActiveByUserAndTriggerAsync(userId, triggerType);
        foreach (var w in hooks)
        {
            try { await DeliverAsync(w, journalId, payload); }
            catch { /* swallow — already logged in WebhookMessages with success=false */ }
        }
    }

    // ─── HTTP delivery ───────────────────────────────────────────────────────

    private async Task<WebhookMessage> DeliverAsync(Webhook w, int? journalId, object payload)
    {
        var json = JsonSerializer.Serialize(payload);
        var msg  = new WebhookMessage
        {
            WebhookId  = w.WebhookId,
            JournalId  = journalId,
            Payload    = json,
            SentAt     = DateTime.UtcNow,
        };

        try
        {
            using var client = _httpFactory.CreateClient("webhook");
            client.Timeout = TimeSpan.FromSeconds(10);

            using var req = new HttpRequestMessage(HttpMethod.Post, w.Url);
            req.Content = new StringContent(json, Encoding.UTF8, "application/json");

            if (!string.IsNullOrEmpty(w.Secret))
            {
                var signature = HmacSha256(w.Secret, json);
                req.Headers.Add("X-BM-Signature", signature);
            }
            req.Headers.Add("X-BM-Trigger", w.TriggerType);
            req.Headers.Add("X-BM-Webhook-Id", w.WebhookId.ToString());

            using var resp = await client.SendAsync(req);
            msg.StatusCode   = (int)resp.StatusCode;
            msg.Success      = resp.IsSuccessStatusCode;
            msg.ResponseBody = await resp.Content.ReadAsStringAsync();
            if (msg.ResponseBody is { Length: > 2000 })
                msg.ResponseBody = msg.ResponseBody[..2000] + "…";
        }
        catch (Exception ex)
        {
            msg.StatusCode   = 0;
            msg.Success      = false;
            msg.ErrorMessage = ex.Message;
        }

        return await _webhookRepo.LogMessageAsync(msg);
    }

    private static string HmacSha256(string secret, string payload)
    {
        using var h = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(h.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }

    private static string GenerateSecret()
    {
        var bytes = RandomNumberGenerator.GetBytes(24);
        return "whsec_" + Convert.ToHexString(bytes).ToLowerInvariant();
    }

    // ─── Mapping ─────────────────────────────────────────────────────────────

    private static WebhookDto MapToDto(Webhook w) => new()
    {
        WebhookId   = w.WebhookId,
        Title       = w.Title,
        Url         = w.Url,
        TriggerType = w.TriggerType,
        Response    = w.Response,
        Secret      = w.Secret,
        IsActive    = w.IsActive ?? true,
        CreatedAt   = w.CreatedAt,
    };

    private static WebhookMessageDto MapToDto(WebhookMessage m) => new()
    {
        MessageId    = m.MessageId,
        WebhookId    = m.WebhookId,
        JournalId    = m.JournalId,
        Payload      = m.Payload,
        StatusCode   = m.StatusCode,
        Success      = m.Success,
        ResponseBody = m.ResponseBody,
        ErrorMessage = m.ErrorMessage,
        SentAt       = m.SentAt,
    };
}
