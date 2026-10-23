using TenderOps.Core;
using TenderOps.Infrastructure;
using Xunit;

namespace TenderOps.Tests;

public sealed class DomainTests
{
    private static readonly Actor Admin = new(DemoSeed.Tenant, "22222222-2222-2222-2222-222222222222");
    private static readonly Actor Other = new(DemoSeed.Tenant, "66666666-6666-6666-6666-666666666666");
    private static Capability Capability(string name = "Consultoría tecnológica") => new(name, "Implementación de plataformas empresariales", "CO", new(2030, 12, 31), true);
    private static async Task<(MemoryStore, ProfileService)> Setup()
    {
        var store = new MemoryStore(); var service = new ProfileService(store);
        await DemoSeed.Initialize(service); return (store, service);
    }
    [Fact]
    public async Task TwoCompaniesCannotReadWriteRelateOrDownloadEachOthersResources()
    {
        var (store, service) = await Setup();
        var resource = await service.Save(Admin, DemoSeed.CompanyA, "capability", null, Json.Element(Capability()), null, Guid.NewGuid(), "test");
        await Error(403, () => service.Get(Other, DemoSeed.CompanyA, "capability", resource.Id));
        await Error(403, () => service.Save(Other, DemoSeed.CompanyA, "capability", resource.Id, Json.Element(Capability("Ajena")), resource.ETag, Guid.NewGuid(), "test"));
        Assert.Null(await store.Get(DemoSeed.CompanyB, "capability", resource.Id));
        var exp = await service.Save(Admin, DemoSeed.CompanyA, "experience", null, Json.Element(new Experience("Cliente", "Contrato de servicios", new(2020, 1, 1), new(2021, 1, 1), "1000000.1234", "COP")), null, Guid.NewGuid(), "test");
        await Error(400, () => service.Save(Other, DemoSeed.CompanyB, "evidence", null, Json.Element(new Evidence(exp.Id, "Contrato.pdf", new string('a', 64), "Sección 2")), null, Guid.NewGuid(), "test"));
    }
    [Fact]
    public async Task PermissionsRevocationAndUnknownRolesAreDenied()
    {
        var (_, service) = await Setup();
        await Error(403, () => service.Save(DemoSeed.Actor("analyst"), DemoSeed.CompanyA, "financial", null, Json.Element(Financial()), null, Guid.NewGuid(), "test"));
        await Error(403, () => service.List(Admin, DemoSeed.CompanyA, "financial", 0, 20));
        var memberId = StableId.From($"member:{DemoSeed.CompanyA}:{DemoSeed.Tenant}:{DemoSeed.Actor("analyst").ObjectId}");
        var member = await service.Get(Admin, DemoSeed.CompanyA, "membership", memberId);
        await service.Save(Admin, DemoSeed.CompanyA, "membership", memberId, Json.Element(Json.Read<Membership>(member.Data) with { Active = false }), member.ETag, Guid.NewGuid(), "test");
        await Error(403, () => service.Get(DemoSeed.Actor("analyst"), DemoSeed.CompanyA, "company", DemoSeed.CompanyA));
    }
    [Fact]
    public async Task ConcurrentCommandsAndStaleVersionsDoNotOverwriteChanges()
    {
        var (store, service) = await Setup();
        var key = Guid.NewGuid(); var body = Json.Element(Capability());
        var results = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => Task.Run(() => service.Save(Admin, DemoSeed.CompanyA, "capability", null, body, null, key, "test"))));
        Assert.Single(results.Select(r => r.Id).Distinct());
        Assert.Single(await store.List(DemoSeed.CompanyA, "capability"));
        var created = results[0];
        await service.Save(Admin, DemoSeed.CompanyA, "capability", created.Id, Json.Element(Capability("Actualizada")), created.ETag, Guid.NewGuid(), "test");
        await Error(412, () => service.Save(Admin, DemoSeed.CompanyA, "capability", created.Id, body, created.ETag, Guid.NewGuid(), "test"));
        await Error(428, () => service.Save(Admin, DemoSeed.CompanyA, "capability", created.Id, body, null, Guid.NewGuid(), "test"));
        await Error(409, () => service.Save(Admin, DemoSeed.CompanyA, "capability", null, Json.Element(Capability("Distinta")), null, key, "test"));
    }
    [Fact]
    public async Task BusinessAuditAndOutboxRollbackTogetherAndSurvivePostCommitCrash()
    {
        var (store, service) = await Setup();
        var before = (await store.Pending(DateTimeOffset.UtcNow)).Count;
        store.FailBeforeCommit = true;
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.Save(Admin, DemoSeed.CompanyA, "capability", null, Json.Element(Capability()), null, Guid.NewGuid(), "test"));
        Assert.Empty(await store.List(DemoSeed.CompanyA, "capability"));
        Assert.Equal(before, (await store.Pending(DateTimeOffset.UtcNow)).Count);
        store.FailBeforeCommit = false;
        var key = Guid.NewGuid();
        var saved = await service.Save(Admin, DemoSeed.CompanyA, "capability", null, Json.Element(Capability()), null, key, "test");
        // Simulate lost HTTP response after commit, then replay the command.
        var replay = await service.Save(Admin, DemoSeed.CompanyA, "capability", null, Json.Element(Capability()), null, key, "test");
        Assert.Equal(saved.Id, replay.Id);
        Assert.Equal(before + 1, (await store.Pending(DateTimeOffset.UtcNow)).Count);
    }
    [Fact]
    public async Task LeaseRecoversAndInboxDeduplicatesAtomicEffects()
    {
        var (store, _) = await Setup();
        var now = DateTimeOffset.UtcNow;
        var item = (await store.Pending(now))[0];
        var first = await store.Lease(item, "worker-1", now);
        Assert.NotNull(first);
        Assert.Null(await store.Lease(item, "worker-2", now));
        var expired = (await store.Pending(now.AddMinutes(3))).Single(x => x.Event.EventId == item.Event.EventId);
        var second = await store.Lease(expired, "worker-2", now.AddMinutes(3));
        Assert.NotNull(second);
        await Error(412, () => store.MarkPublished(first));
        await store.MarkPublished(second);
        Assert.True(await store.ConsumeAtomically(item.Event, "consumer-v1", []));
        Assert.False(await store.ConsumeAtomically(item.Event, "consumer-v1", []));
        var other = new Resource(Guid.NewGuid(), DemoSeed.CompanyB, "job", 1, Json.Element(new Job("test", "Pending")));
        await Error(400, () => store.ConsumeAtomically(item.Event, "consumer-v2", [new(other, null)]));
    }
    [Fact]
    public async Task OnlyApprovedFinancialVersionsAreEligibleAndApproverMustBeDifferent()
    {
        var (_, service) = await Setup();
        var finance = DemoSeed.Actor("finance"); var approver = DemoSeed.Actor("approver");
        var snapshot = await service.Save(finance, DemoSeed.CompanyA, "financial", null, Json.Element(Financial()), null, Guid.NewGuid(), "test");
        Assert.Empty(await service.EligibleFinancial(finance, DemoSeed.CompanyA));
        var approved = await service.Transition(approver, DemoSeed.CompanyA, "financial", snapshot.Id, snapshot.ETag, Guid.NewGuid(), "test");
        Assert.Single(await service.EligibleFinancial(finance, DemoSeed.CompanyA));
        await Error(409, () => service.Save(finance, DemoSeed.CompanyA, "financial", snapshot.Id, Json.Element(Financial()), approved.ETag, Guid.NewGuid(), "test"));
        await Error(400, () => service.Save(finance, DemoSeed.CompanyA, "financial", null, Json.Element(Financial() with { Status = "Approved" }), null, Guid.NewGuid(), "test"));
        var financeMembershipId = StableId.From($"member:{DemoSeed.CompanyA}:{finance.Key}");
        var membership = await service.Get(Admin, DemoSeed.CompanyA, "membership", financeMembershipId);
        await service.Save(Admin, DemoSeed.CompanyA, "membership", membership.Id, Json.Element(Json.Read<Membership>(membership.Data) with { Roles = ["Financial", "Approver"] }), membership.ETag, Guid.NewGuid(), "test");
        var another = await service.Save(finance, DemoSeed.CompanyA, "financial", null, Json.Element(Financial()), null, Guid.NewGuid(), "test");
        await Error(403, () => service.Transition(finance, DemoSeed.CompanyA, "financial", another.Id, another.ETag, Guid.NewGuid(), "test"));
    }
    [Theory]
    [InlineData(400, false)] [InlineData(401, false)] [InlineData(403, false)] [InlineData(408, true)] [InlineData(429, true)] [InlineData(503, true)]
    public void RetryOnlyTransientErrors(int status, bool expected) => Assert.Equal(expected, RetryPolicy.IsTransient(status));
    private static Financial Financial() => new(new(2025, 1, 1), new(2025, 12, 31), new(2030, 12, 31), "COP", "1000000.1234", "100", "500000", "0", "1000", "Balance firmado");
    private static async Task Error(int status, Func<Task> action) => Assert.Equal(status, (await Assert.ThrowsAsync<DomainError>(action)).Status);
}
