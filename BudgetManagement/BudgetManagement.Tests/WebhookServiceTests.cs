using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace BudgetManagement.Tests;

public class WebhookServiceTests
{
    private readonly Mock<IWebhookRepository> _webhookRepoMock;
    private readonly Mock<IHttpClientFactory> _httpFactoryMock;
    private readonly WebhookService _service;
    private readonly int _userId = 1;

    public WebhookServiceTests()
    {
        _webhookRepoMock  = new Mock<IWebhookRepository>();
        _httpFactoryMock  = new Mock<IHttpClientFactory>();
        _service = new WebhookService(_webhookRepoMock.Object, _httpFactoryMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static Webhook MakeWebhook(int webhookId = 1, int userId = 1,
        string title = "Test Webhook", string url = "https://example.com/hook",
        string trigger = "STORE_TRANSACTION", string response = "TRANSACTIONS")
    {
        return new Webhook
        {
            WebhookId   = webhookId,
            UserId      = userId,
            Title       = title,
            Url         = url,
            TriggerType = trigger,
            Response    = response,
            Secret      = "whsec_test123",
            IsActive    = true,
            CreatedAt   = DateTime.UtcNow,
        };
    }

    private static WebhookMessage MakeMessage(int messageId = 1, int webhookId = 1,
        bool success = true, int statusCode = 200)
    {
        return new WebhookMessage
        {
            MessageId    = messageId,
            WebhookId    = webhookId,
            StatusCode   = statusCode,
            Success      = success,
            Payload      = "{\"test\":true}",
            ResponseBody = "OK",
            SentAt       = DateTime.UtcNow,
        };
    }

    // ─── GetAllAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsAllWebhooks()
    {
        var webhooks = new[] { MakeWebhook(1), MakeWebhook(2, title: "Hook 2") };
        _webhookRepoMock.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(webhooks);

        var result = await _service.GetAllAsync(_userId);

        result.Should().HaveCount(2);
        result.First().Title.Should().Be("Test Webhook");
    }

    [Fact]
    public async Task GetAllAsync_Empty_ReturnsEmpty()
    {
        _webhookRepoMock.Setup(r => r.GetByUserAsync(_userId))
            .ReturnsAsync(Array.Empty<Webhook>());

        var result = await _service.GetAllAsync(_userId);

        result.Should().BeEmpty();
    }

    // ─── GetByIdAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_OwnWebhook_ReturnsDto()
    {
        var webhook = MakeWebhook(42);
        _webhookRepoMock.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(webhook);

        var result = await _service.GetByIdAsync(_userId, 42);

        result.WebhookId.Should().Be(42);
        result.Title.Should().Be("Test Webhook");
    }

    [Fact]
    public async Task GetByIdAsync_OtherUser_ThrowsUnauthorized()
    {
        var webhook = MakeWebhook(1, userId: 99);
        _webhookRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(webhook);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ThrowsKeyNotFound()
    {
        _webhookRepoMock.Setup(r => r.GetByIdAsync(999))
            .ReturnsAsync((Webhook?)null);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesWebhook()
    {
        var request = new CreateWebhookDto
        {
            Title       = "New Hook",
            Url         = "https://example.com/webhook",
            TriggerType = "STORE_TRANSACTION",
            Response    = "TRANSACTIONS",
        };

        _webhookRepoMock.Setup(r => r.CreateAsync(It.IsAny<Webhook>()))
            .ReturnsAsync((Webhook w) => { w.WebhookId = 10; return w; });

        var result = await _service.CreateAsync(_userId, request);

        result.WebhookId.Should().Be(10);
        result.Title.Should().Be("New Hook");
        result.Url.Should().Be("https://example.com/webhook");
        result.IsActive.Should().BeTrue();
        result.Secret.Should().NotBeNullOrEmpty();  // auto-generated
    }

    [Fact]
    public async Task CreateAsync_EmptyTitle_ThrowsArgumentException()
    {
        var request = new CreateWebhookDto
        {
            Title = "",
            Url   = "https://example.com/hook",
        };

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_InvalidUrl_ThrowsArgumentException()
    {
        // Uri.TryCreate with absolute kind rejects strings without scheme
        var request = new CreateWebhookDto
        {
            Title = "Hook",
            Url   = "not-a-valid-absolute-url",
        };

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_InvalidTriggerType_ThrowsArgumentException()
    {
        var request = new CreateWebhookDto
        {
            Title       = "Hook",
            Url         = "https://example.com/hook",
            TriggerType = "INVALID_TRIGGER",
        };

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_InvalidResponse_ThrowsArgumentException()
    {
        var request = new CreateWebhookDto
        {
            Title       = "Hook",
            Url         = "https://example.com/hook",
            TriggerType = "STORE_TRANSACTION",
            Response    = "INVALID_RESPONSE",
        };

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>();
    }

    // ─── UpdateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_OwnWebhook_UpdatesFields()
    {
        var existing = MakeWebhook(1);
        _webhookRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _webhookRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Webhook>()))
            .ReturnsAsync((Webhook w) => w);

        var result = await _service.UpdateAsync(_userId, 1, new UpdateWebhookDto
        {
            Title    = "Updated Hook",
            IsActive = false,
        });

        result.Title.Should().Be("Updated Hook");
        result.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateAsync_OtherUser_ThrowsUnauthorized()
    {
        var existing = MakeWebhook(1, userId: 99);
        _webhookRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        await FluentActions.Invoking(() =>
            _service.UpdateAsync(_userId, 1, new UpdateWebhookDto()))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ─── DeleteAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_OwnWebhook_DeletesSuccessfully()
    {
        var existing = MakeWebhook(1);
        _webhookRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _webhookRepoMock.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _service.DeleteAsync(_userId, 1);

        result.Should().BeTrue();
    }

    // ─── GetMessagesAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetMessagesAsync_ReturnsMessages()
    {
        var webhook = MakeWebhook(1);
        var messages = new[] { MakeMessage(1, 1), MakeMessage(2, 1) };

        _webhookRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(webhook);
        _webhookRepoMock.Setup(r => r.GetMessagesAsync(1, 50)).ReturnsAsync(messages);

        var result = await _service.GetMessagesAsync(_userId, 1, 50);

        result.Should().HaveCount(2);
        result.First().Success.Should().BeTrue();
    }

    [Fact]
    public async Task GetMessagesAsync_DefaultTake_Uses50()
    {
        var webhook = MakeWebhook(1);
        _webhookRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(webhook);
        _webhookRepoMock.Setup(r => r.GetMessagesAsync(1, 50))
            .ReturnsAsync(Array.Empty<WebhookMessage>());

        var result = await _service.GetMessagesAsync(_userId, 1, 0);

        result.Should().BeEmpty();
    }

    // ─── SubmitAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task SubmitAsync_OwnWebhook_SendsAndReturnsMessage()
    {
        var webhook = MakeWebhook(1);

        _webhookRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(webhook);

        // Create a real IServiceCollection to get a real IHttpClientFactory
        var services = new ServiceCollection();
        services.AddHttpClient("webhook", client => { });
        var sp = services.BuildServiceProvider();
        var realFactory = sp.GetRequiredService<IHttpClientFactory>();

        // Use a webhook service with real HttpMessageHandler (will fail to connect, but that's OK)
        var realService = new WebhookService(_webhookRepoMock.Object, realFactory);

        _webhookRepoMock
            .Setup(r => r.LogMessageAsync(It.IsAny<WebhookMessage>()))
            .ReturnsAsync((WebhookMessage m) => m);

        var result = await realService.SubmitAsync(_userId, 1, new { ping = "test" });

        result.WebhookId.Should().Be(1);
        // The HTTP call will fail (no server), but the message should still be logged
        result.Success.Should().BeFalse();
    }
}
