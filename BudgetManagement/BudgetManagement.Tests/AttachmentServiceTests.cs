using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using BudgetManagement.Services.Interfaces;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Moq;

namespace BudgetManagement.Tests;

public class AttachmentServiceTests : IDisposable
{
    private readonly Mock<IAttachmentRepository> _repoMock;
    private readonly Mock<IConfiguration> _configMock;
    private readonly AttachmentService _service;
    private readonly int _userId = 1;
    private readonly string _testRoot;

    public AttachmentServiceTests()
    {
        _repoMock   = new Mock<IAttachmentRepository>();
        _configMock = new Mock<IConfiguration>();

        _testRoot = Path.Combine(Path.GetTempPath(), "bm_attach_test_" + Guid.NewGuid().ToString("N"));
        _configMock.Setup(c => c["Attachments:Root"]).Returns(_testRoot);

        _service = new AttachmentService(_repoMock.Object, _configMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static Attachment MakeAttachment(int attachmentId = 1, int userId = 1,
        string type = "transaction", int attachableId = 1,
        string filename = "receipt.pdf", long size = 1024)
    {
        return new Attachment
        {
            AttachmentId   = attachmentId,
            UserId         = userId,
            AttachableType = type,
            AttachableId   = attachableId,
            Title          = "Receipt",
            Notes          = null,
            Filename       = filename,
            Mime           = "application/pdf",
            Size           = size,
            FilePath       = $"{userId}/{Guid.NewGuid():N}.pdf",
            UploadedAt     = DateTime.UtcNow,
        };
    }

    // ─── GetAllAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsAllAttachments()
    {
        var attachments = new[] { MakeAttachment(1), MakeAttachment(2) };
        _repoMock.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(attachments);

        var result = await _service.GetAllAsync(_userId);

        result.Should().HaveCount(2);
        result.First().Filename.Should().Be("receipt.pdf");
    }

    [Fact]
    public async Task GetAllAsync_Empty_ReturnsEmpty()
    {
        _repoMock.Setup(r => r.GetByUserAsync(_userId))
            .ReturnsAsync(Array.Empty<Attachment>());

        var result = await _service.GetAllAsync(_userId);

        result.Should().BeEmpty();
    }

    // ─── GetByAttachableAsync ───────────────────────────────────────────────

    [Fact]
    public async Task GetByAttachableAsync_ReturnsFiltered()
    {
        var attachments = new[] { MakeAttachment(1, attachableId: 5) };
        _repoMock
            .Setup(r => r.GetByAttachableAsync(_userId, "transaction", 5))
            .ReturnsAsync(attachments);

        var result = await _service.GetByAttachableAsync(_userId, "transaction", 5);

        result.Should().ContainSingle();
    }

    [Fact]
    public async Task GetByAttachableAsync_InvalidType_ThrowsArgumentException()
    {
        await FluentActions.Invoking(() =>
            _service.GetByAttachableAsync(_userId, "invalid_type", 1))
            .Should().ThrowAsync<ArgumentException>();
    }

    // ─── GetByIdAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_OwnAttachment_ReturnsDto()
    {
        var attachment = MakeAttachment(42);
        _repoMock.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(attachment);

        var result = await _service.GetByIdAsync(_userId, 42);

        result.AttachmentId.Should().Be(42);
        result.Filename.Should().Be("receipt.pdf");
    }

    [Fact]
    public async Task GetByIdAsync_OtherUser_ThrowsUnauthorized()
    {
        var attachment = MakeAttachment(1, userId: 99);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(attachment);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ThrowsKeyNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Attachment?)null);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesAndWritesFile()
    {
        var content = "test file content"u8.ToArray();
        var metadata = new CreateAttachmentDto
        {
            AttachableType = "transaction",
            AttachableId   = 10,
            Title          = "My File",
        };
        var fileInput = new AttachmentUploadInput
        {
            Content  = new MemoryStream(content),
            Filename = "test.txt",
            Mime     = "text/plain",
            Size     = content.Length,
        };

        _repoMock.Setup(r => r.CreateAsync(It.IsAny<Attachment>()))
            .ReturnsAsync((Attachment a) => a);

        var result = await _service.CreateAsync(_userId, metadata, fileInput);

        result.Filename.Should().Be("test.txt");
        result.Size.Should().Be(content.Length);
        result.AttachableType.Should().Be("transaction");
        result.AttachableId.Should().Be(10);

        // Verify file was written to disk
        var userDir = Path.Combine(_testRoot, _userId.ToString());
        Directory.Exists(userDir).Should().BeTrue();
        Directory.GetFiles(userDir).Should().NotBeEmpty();
    }

    [Fact]
    public async Task CreateAsync_NullFile_ThrowsArgumentException()
    {
        var metadata = new CreateAttachmentDto
        {
            AttachableType = "transaction",
            AttachableId   = 1,
        };

        await FluentActions.Invoking(() =>
            _service.CreateAsync(_userId, metadata, null!))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_EmptyFile_ThrowsArgumentException()
    {
        var metadata = new CreateAttachmentDto
        {
            AttachableType = "transaction",
            AttachableId   = 1,
        };
        var fileInput = new AttachmentUploadInput
        {
            Content  = new MemoryStream(),
            Filename = "empty.txt",
            Mime     = "text/plain",
            Size     = 0,
        };

        await FluentActions.Invoking(() =>
            _service.CreateAsync(_userId, metadata, fileInput))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_InvalidType_ThrowsArgumentException()
    {
        var metadata = new CreateAttachmentDto
        {
            AttachableType = "invalid",
            AttachableId   = 1,
        };
        var fileInput = new AttachmentUploadInput
        {
            Content  = new MemoryStream("data"u8.ToArray()),
            Filename = "test.txt",
            Mime     = "text/plain",
            Size     = 4,
        };

        await FluentActions.Invoking(() =>
            _service.CreateAsync(_userId, metadata, fileInput))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task CreateAsync_FileTooLarge_ThrowsArgumentException()
    {
        var oversized = new byte[51 * 1024 * 1024 + 1];  // > 50 MB
        var metadata = new CreateAttachmentDto
        {
            AttachableType = "transaction",
            AttachableId   = 1,
        };
        var fileInput = new AttachmentUploadInput
        {
            Content  = new MemoryStream(oversized),
            Filename = "huge.bin",
            Mime     = "application/octet-stream",
            Size     = oversized.Length,
        };

        await FluentActions.Invoking(() =>
            _service.CreateAsync(_userId, metadata, fileInput))
            .Should().ThrowAsync<ArgumentException>();
    }

    // ─── UpdateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_OwnAttachment_UpdatesFields()
    {
        var existing = MakeAttachment(1);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _repoMock.Setup(r => r.UpdateAsync(It.IsAny<Attachment>()))
            .ReturnsAsync((Attachment a) => a);

        var result = await _service.UpdateAsync(_userId, 1, new UpdateAttachmentDto
        {
            Title = "Updated Title",
            Notes = "Some notes",
        });

        result.Title.Should().Be("Updated Title");
        result.Notes.Should().Be("Some notes");
    }

    [Fact]
    public async Task UpdateAsync_OtherUser_ThrowsUnauthorized()
    {
        var existing = MakeAttachment(1, userId: 99);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        await FluentActions.Invoking(() =>
            _service.UpdateAsync(_userId, 1, new UpdateAttachmentDto()))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ─── DeleteAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_OwnAttachment_DeletesAndReturnsTrue()
    {
        var attachment = MakeAttachment(1);
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(attachment);
        _repoMock.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _service.DeleteAsync(_userId, 1);

        result.Should().BeTrue();
    }

    // ─── DownloadAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task DownloadAsync_FileMissingOnDisk_ThrowsFileNotFound()
    {
        var attachment = MakeAttachment(1);
        attachment.FilePath = "nonexistent/file.pdf";
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(attachment);

        await FluentActions.Invoking(() => _service.DownloadAsync(_userId, 1))
            .Should().ThrowAsync<FileNotFoundException>();
    }

    // ─── Cleanup ────────────────────────────────────────────────────────────

    public void Dispose()
    {
        try { Directory.Delete(_testRoot, recursive: true); } catch { /* ignore */ }
    }
}
