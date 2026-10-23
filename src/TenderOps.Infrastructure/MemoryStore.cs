using TenderOps.Core;

namespace TenderOps.Infrastructure;

/// <summary>Explicit ephemeral double. Never registered outside Development or Testing.</summary>
public sealed class MemoryStore : IBusinessStore
{
    private readonly object gate = new();
    private readonly Dictionary<(Guid, string, Guid), Resource> rows = [];
    private readonly Dictionary<(Guid, Guid), CommandReceipt> receipts = [];
    private readonly List<AuditEntry> audits = [];
    private readonly Dictionary<Guid, OutboxItem> outbox = [];
    private readonly HashSet<(Guid, string, Guid)> inbox = [];
    public bool FailBeforeCommit { get; set; }
    public Task<Resource?> Get(Guid companyId, string kind, Guid id, CancellationToken ct = default)
    { lock (gate) return Task.FromResult(rows.GetValueOrDefault((companyId, kind, id))); }
    public Task<IReadOnlyList<Resource>> List(Guid companyId, string kind, int offset = 0, int limit = 100, CancellationToken ct = default)
    { lock (gate) return Task.FromResult<IReadOnlyList<Resource>>(rows.Values.Where(x => x.CompanyId == companyId && x.Kind == kind).OrderBy(x => x.Id).Skip(offset).Take(limit).ToArray()); }
    public Task<IReadOnlyList<Resource>> Memberships(Actor actor, CancellationToken ct = default)
    {
        lock (gate) return Task.FromResult<IReadOnlyList<Resource>>(rows.Values.Where(x => x.Kind == "membership")
            .Where(x => { var m = Json.Read<Membership>(x.Data); return m.Active && m.TenantId == actor.TenantId && m.ObjectId == actor.ObjectId; }).ToArray());
    }
    public Task<CommandReceipt?> Receipt(Guid companyId, Guid commandId, CancellationToken ct = default)
    { lock (gate) return Task.FromResult(receipts.GetValueOrDefault((companyId, commandId))); }
    public Task Apply(Commit commit, CancellationToken ct = default)
    {
        lock (gate)
        {
            var key = (commit.Receipt.CompanyId, commit.Receipt.Id);
            if (receipts.TryGetValue(key, out var existing))
            {
                if (existing.Fingerprint != commit.Receipt.Fingerprint) throw new DomainError(409, "idempotency_conflict");
                return Task.CompletedTask;
            }
            foreach (var write in commit.Writes)
            {
                if (write.Value.CompanyId != commit.Receipt.CompanyId) throw new DomainError(400, "invalid_company_reference");
                rows.TryGetValue((write.Value.CompanyId, write.Value.Kind, write.Value.Id), out var old);
                if (write.ExpectedVersion != old?.Version) throw new DomainError(old is null ? 404 : 412, "version_conflict");
            }
            if (FailBeforeCommit) throw new InvalidOperationException("Injected pre-commit failure");
            foreach (var write in commit.Writes) rows[(write.Value.CompanyId, write.Value.Kind, write.Value.Id)] = write.Value;
            receipts[key] = commit.Receipt;
            audits.Add(commit.Audit);
            outbox[commit.Event.EventId] = new(commit.Event);
        }
        return Task.CompletedTask;
    }
    public Task<IReadOnlyList<AuditEntry>> Audit(Guid companyId, int offset, int limit, CancellationToken ct = default)
    { lock (gate) return Task.FromResult<IReadOnlyList<AuditEntry>>(audits.Where(a => a.CompanyId == companyId).OrderBy(a => a.OccurredAt).Skip(offset).Take(limit).ToArray()); }
    public Task<IReadOnlyList<OutboxItem>> Pending(DateTimeOffset now, CancellationToken ct = default)
    { lock (gate) return Task.FromResult<IReadOnlyList<OutboxItem>>(outbox.Values.Where(x => !x.Published && (x.LeaseUntil is null || x.LeaseUntil <= now)).Take(100).ToArray()); }
    public Task<OutboxItem?> Lease(OutboxItem item, string owner, DateTimeOffset now, CancellationToken ct = default)
    {
        lock (gate)
        {
            var current = outbox[item.Event.EventId];
            if (current.Version != item.Version || current.Published || current.LeaseUntil > now) return Task.FromResult<OutboxItem?>(null);
            var lease = current with { Version = current.Version + 1, LeaseOwner = owner, LeaseUntil = now.AddMinutes(2) };
            outbox[item.Event.EventId] = lease;
            return Task.FromResult<OutboxItem?>(lease);
        }
    }
    public Task MarkPublished(OutboxItem leased, CancellationToken ct = default)
    {
        lock (gate)
        {
            var current = outbox[leased.Event.EventId];
            if (current.Version != leased.Version || current.LeaseOwner != leased.LeaseOwner) throw new DomainError(412, "lease_lost");
            outbox[leased.Event.EventId] = current with { Published = true, Version = current.Version + 1 };
        }
        return Task.CompletedTask;
    }
    public Task<bool> ConsumeAtomically(IntegrationEvent evt, string consumer, IReadOnlyList<Write> writes)
    {
        lock (gate)
        {
            var key = (evt.CompanyId, consumer, evt.EventId);
            if (inbox.Contains(key)) return Task.FromResult(false);
            foreach (var write in writes)
            {
                if (write.Value.CompanyId != evt.CompanyId) throw new DomainError(400, "invalid_company_reference");
                rows.TryGetValue((evt.CompanyId, write.Value.Kind, write.Value.Id), out var old);
                if (old?.Version != write.ExpectedVersion) throw new DomainError(412, "version_conflict");
                if (write.Value.Version <= (old?.Version ?? 0)) throw new DomainError(409, "out_of_order_event");
            }
            if (FailBeforeCommit) throw new InvalidOperationException("Injected pre-commit failure");
            foreach (var write in writes) rows[(evt.CompanyId, write.Value.Kind, write.Value.Id)] = write.Value;
            inbox.Add(key);
            return Task.FromResult(true);
        }
    }
}
