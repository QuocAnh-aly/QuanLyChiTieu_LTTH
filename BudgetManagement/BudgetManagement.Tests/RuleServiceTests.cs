using BudgetManagement.Dto;
using BudgetManagement.Entities;
using BudgetManagement.Repository.Interfaces;
using BudgetManagement.Services.Implementations;
using FluentAssertions;
using Moq;

namespace BudgetManagement.Tests;

public class RuleServiceTests
{
    private readonly Mock<IRuleRepository> _ruleRepoMock;
    private readonly Mock<IJournalRepository> _journalRepoMock;
    private readonly RuleService _service;
    private readonly int _userId = 1;

    public RuleServiceTests()
    {
        _ruleRepoMock    = new Mock<IRuleRepository>();
        _journalRepoMock = new Mock<IJournalRepository>();
        _service = new RuleService(_ruleRepoMock.Object, _journalRepoMock.Object);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private static Rule MakeRule(int ruleId = 1, int userId = 1,
        string title = "Test Rule", int? groupId = null)
    {
        return new Rule
        {
            RuleId         = ruleId,
            UserId         = userId,
            GroupId        = groupId,
            Title          = title,
            Description    = "Description",
            Order          = 1,
            IsActive       = true,
            Strict         = true,
            StopProcessing = false,
            Runs           = 0,
            CreatedAt      = DateTime.UtcNow,
            Triggers       = new List<RuleTrigger>(),
            Actions        = new List<RuleAction>(),
        };
    }

    private static RuleGroup MakeGroup(int groupId = 1, int userId = 1,
        string title = "Test Group")
    {
        return new RuleGroup
        {
            GroupId     = groupId,
            UserId      = userId,
            Title       = title,
            Description = "Group description",
            Order       = 1,
            IsActive    = true,
            CreatedAt   = DateTime.UtcNow,
        };
    }

    private static JournalEntry MakeEntry(int journalId = 1, int userId = 1,
        string desc = "Coffee shop", decimal amount = 100m,
        string tags = "", int expenseAccId = 5)
    {
        return new JournalEntry
        {
            JournalId       = journalId,
            UserId          = userId,
            TransactionDate = DateTime.UtcNow,
            Description     = desc,
            Tags            = tags,
            CreatedAt       = DateTime.UtcNow,
            JournalDetails  = new List<JournalDetail>
            {
                new()
                {
                    DetailId  = journalId * 10 + 1,
                    AccountId = expenseAccId,
                    Debit     = amount,
                    Credit    = 0,
                    Account   = new Account
                    {
                        AccountId = expenseAccId,
                        TypeId    = 5,
                        Name      = "Expense Account",
                    },
                },
                new()
                {
                    DetailId  = journalId * 10 + 2,
                    AccountId = 2,
                    Debit     = 0,
                    Credit    = amount,
                    Account   = new Account
                    {
                        AccountId = 2,
                        TypeId    = 1,
                        Name      = "Checking",
                    },
                },
            },
        };
    }

    // ─── GetAllAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_ReturnsAllRules()
    {
        var rules = new[] { MakeRule(1), MakeRule(2, title: "Rule 2") };
        _ruleRepoMock.Setup(r => r.GetByUserAsync(_userId)).ReturnsAsync(rules);

        var result = await _service.GetAllAsync(_userId);

        result.Should().HaveCount(2);
        result.First().Title.Should().Be("Test Rule");
    }

    [Fact]
    public async Task GetAllAsync_Empty_ReturnsEmpty()
    {
        _ruleRepoMock.Setup(r => r.GetByUserAsync(_userId))
            .ReturnsAsync(Array.Empty<Rule>());

        var result = await _service.GetAllAsync(_userId);

        result.Should().BeEmpty();
    }

    // ─── GetByIdAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_OwnRule_ReturnsDto()
    {
        var rule = MakeRule(42);
        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(42)).ReturnsAsync(rule);

        var result = await _service.GetByIdAsync(_userId, 42);

        result.RuleId.Should().Be(42);
        result.Title.Should().Be("Test Rule");
    }

    [Fact]
    public async Task GetByIdAsync_OtherUser_ThrowsUnauthorized()
    {
        var rule = MakeRule(1, userId: 99);
        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(1)).ReturnsAsync(rule);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task GetByIdAsync_NonExistent_ThrowsKeyNotFound()
    {
        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(999))
            .ReturnsAsync((Rule?)null);

        await FluentActions.Invoking(() => _service.GetByIdAsync(_userId, 999))
            .Should().ThrowAsync<KeyNotFoundException>();
    }

    // ─── CreateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesRule()
    {
        var request = new CreateRuleDto
        {
            Title     = "New Rule",
            Strict    = true,
            Triggers  = new List<TriggerInputDto>
            {
                new() { Type = "description_contains", Value = "coffee" },
            },
            Actions   = new List<ActionInputDto>
            {
                new() { Type = "add_tag", Value = "coffee" },
            },
        };

        _ruleRepoMock.Setup(r => r.CreateAsync(It.IsAny<Rule>()))
            .ReturnsAsync((Rule r) => { r.RuleId = 10; return r; });
        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(10))
            .ReturnsAsync(MakeRule(10, title: "New Rule"));

        var result = await _service.CreateAsync(_userId, request);

        result.RuleId.Should().Be(10);
        result.Title.Should().Be("New Rule");
        _ruleRepoMock.Verify(r => r.ReplaceTriggersAsync(10, It.IsAny<IEnumerable<RuleTrigger>>()), Times.Once);
        _ruleRepoMock.Verify(r => r.ReplaceActionsAsync(10, It.IsAny<IEnumerable<RuleAction>>()), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_EmptyTitle_ThrowsArgumentException()
    {
        var request = new CreateRuleDto { Title = "   " };

        await FluentActions.Invoking(() => _service.CreateAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>();
    }

    // ─── UpdateAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_OwnRule_UpdatesFields()
    {
        var existing = MakeRule(1);
        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(1)).ReturnsAsync(existing);
        _ruleRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Rule>()))
            .ReturnsAsync((Rule r) => r);
        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(1))
            .ReturnsAsync(MakeRule(1, title: "Updated Rule"));

        var result = await _service.UpdateAsync(_userId, 1, new UpdateRuleDto
        {
            Title = "Updated Rule",
        });

        result.Title.Should().Be("Updated Rule");
    }

    [Fact]
    public async Task UpdateAsync_OtherUser_ThrowsUnauthorized()
    {
        var existing = MakeRule(1, userId: 99);
        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(1)).ReturnsAsync(existing);

        await FluentActions.Invoking(() =>
            _service.UpdateAsync(_userId, 1, new UpdateRuleDto()))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ─── DeleteAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_OwnRule_DeletesAndReturnsTrue()
    {
        var existing = MakeRule(1);
        _ruleRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
        _ruleRepoMock.Setup(r => r.DeleteAsync(1)).ReturnsAsync(true);

        var result = await _service.DeleteAsync(_userId, 1);

        result.Should().BeTrue();
        _ruleRepoMock.Verify(r => r.DeleteAsync(1), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_OtherUser_ThrowsUnauthorized()
    {
        var existing = MakeRule(1, userId: 99);
        _ruleRepoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

        await FluentActions.Invoking(() => _service.DeleteAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();

        _ruleRepoMock.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
    }

    // ─── ToggleActiveAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task ToggleActiveAsync_TogglesIsActive()
    {
        var rule = MakeRule(1);
        rule.IsActive = true;
        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(1)).ReturnsAsync(rule);
        _ruleRepoMock.Setup(r => r.UpdateAsync(It.IsAny<Rule>()))
            .ReturnsAsync((Rule r) => r);

        var result = await _service.ToggleActiveAsync(_userId, 1);

        result.IsActive.Should().BeFalse();  // toggled from true
    }

    // ─── TestAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task TestAsync_ReturnsMatchedCount()
    {
        var rule = MakeRule(1);
        rule.Triggers = new List<RuleTrigger>
        {
            new() { TriggerId = 1, RuleId = 1, TriggerType = "description_contains", TriggerValue = "coffee", IsActive = true },
        };

        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(1)).ReturnsAsync(rule);
        _journalRepoMock
            .Setup(r => r.GetByUserIdAsync(_userId, 1, 1_000))
            .ReturnsAsync(new[]
            {
                MakeEntry(1, desc: "Coffee shop"),
                MakeEntry(2, desc: "Lunch"),
                MakeEntry(3, desc: "Coffee beans"),
            });

        var result = await _service.TestAsync(_userId, 1);

        result.MatchedCount.Should().Be(2);  // entries 1 and 3 match "coffee"
        result.MatchedTransactions.Should().HaveCount(2);
    }

    [Fact]
    public async Task TestAsync_NoMatches_ReturnsZero()
    {
        var rule = MakeRule(1);
        rule.Triggers = new List<RuleTrigger>
        {
            new() { TriggerId = 1, RuleId = 1, TriggerType = "description_contains", TriggerValue = "pizza", IsActive = true },
        };

        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(1)).ReturnsAsync(rule);
        _journalRepoMock
            .Setup(r => r.GetByUserIdAsync(_userId, 1, 1_000))
            .ReturnsAsync(new[] { MakeEntry(1, desc: "Coffee") });

        var result = await _service.TestAsync(_userId, 1);

        result.MatchedCount.Should().Be(0);
        result.MatchedTransactions.Should().BeEmpty();
    }

    // ─── Groups ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetGroupsAsync_ReturnsGroupsWithCounts()
    {
        var groups = new[] { MakeGroup(1), MakeGroup(2, title: "Group 2") };
        _ruleRepoMock.Setup(r => r.GetGroupsByUserAsync(_userId)).ReturnsAsync(groups);
        _ruleRepoMock.Setup(r => r.GetByUserAsync(_userId))
            .ReturnsAsync(Array.Empty<Rule>());

        var result = await _service.GetGroupsAsync(_userId);

        result.Should().HaveCount(2);
        result.All(g => g.RuleCount == 0).Should().BeTrue();
    }

    [Fact]
    public async Task CreateGroupAsync_ValidRequest_CreatesGroup()
    {
        var request = new CreateRuleGroupDto { Title = "New Group", Description = "Desc" };
        _ruleRepoMock.Setup(r => r.CreateGroupAsync(It.IsAny<RuleGroup>()))
            .ReturnsAsync((RuleGroup g) => { g.GroupId = 5; return g; });

        var result = await _service.CreateGroupAsync(_userId, request);

        result.GroupId.Should().Be(5);
        result.Title.Should().Be("New Group");
        result.RuleCount.Should().Be(0);
    }

    [Fact]
    public async Task CreateGroupAsync_EmptyTitle_ThrowsArgumentException()
    {
        var request = new CreateRuleGroupDto { Title = "" };

        await FluentActions.Invoking(() => _service.CreateGroupAsync(_userId, request))
            .Should().ThrowAsync<ArgumentException>();
    }

    [Fact]
    public async Task DeleteGroupAsync_OwnGroup_DeletesSuccessfully()
    {
        var group = MakeGroup(1);
        _ruleRepoMock.Setup(r => r.GetGroupByIdAsync(1)).ReturnsAsync(group);
        _ruleRepoMock.Setup(r => r.DeleteGroupAsync(1)).ReturnsAsync(true);

        var result = await _service.DeleteGroupAsync(_userId, 1);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteGroupAsync_OtherUser_ThrowsUnauthorized()
    {
        var group = MakeGroup(1, userId: 99);
        _ruleRepoMock.Setup(r => r.GetGroupByIdAsync(1)).ReturnsAsync(group);

        await FluentActions.Invoking(() => _service.DeleteGroupAsync(_userId, 1))
            .Should().ThrowAsync<UnauthorizedAccessException>();
    }

    // ─── Trigger matching logic ────────────────────────────────────────────

    [Fact]
    public async Task TriggerAsync_AppliesActionsToMatchedEntries()
    {
        var rule = MakeRule(1);
        rule.Triggers = new List<RuleTrigger>
        {
            new() { TriggerId = 1, RuleId = 1, TriggerType = "description_contains", TriggerValue = "coffee", IsActive = true },
        };
        rule.Actions = new List<RuleAction>
        {
            new() { ActionId = 1, RuleId = 1, ActionType = "add_tag", ActionValue = "drink", IsActive = true },
        };

        var entries = new[] { MakeEntry(1, desc: "Coffee shop", tags: "food") };

        _ruleRepoMock.Setup(r => r.GetByIdFullAsync(1)).ReturnsAsync(rule);
        _journalRepoMock
            .Setup(r => r.GetByUserIdAsync(_userId, 1, 1_000))
            .ReturnsAsync(entries);
        _journalRepoMock
            .Setup(r => r.UpdateEntryAsync(1, "Coffee shop", null, "food,drink", null))
            .ReturnsAsync(true);
        _ruleRepoMock
            .Setup(r => r.RecordRunAsync(1, 1))
            .Returns(Task.CompletedTask);

        var result = await _service.TriggerAsync(_userId, 1);

        result.RuleId.Should().Be(1);
        result.MatchedCount.Should().Be(1);
        result.AppliedCount.Should().Be(1);
    }
}
