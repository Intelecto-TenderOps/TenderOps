using System.Globalization;
using System.Text.Json;
using TenderOps.Core;

namespace TenderOps.Infrastructure;

public sealed class DataverseStore(DataverseClient client, DataverseOwnership ownership) : IBusinessStore
{
    private string P => client.Prefix;
    private string Table(string kind) => $"{P}_{kind}s";
    private string Field(string name) => $"{P}_{name}";
    private static string Escape(string value) => value.Replace("'", "''", StringComparison.Ordinal);
    private static string Text(JsonElement row, string field) => row.GetProperty(field).GetString()!;
    private string CompanyFilter(Guid companyId) => $"{Field("companykey")} eq '{companyId}'";
    private static Resource ReadResource(JsonElement row, string payload) => JsonSerializer.Deserialize<Resource>(Text(row, payload), Json.Options)!;

    public async Task<Resource?> Get(Guid companyId, string kind, Guid id, CancellationToken ct = default)
    {
        var rows = await Query(Table(kind), $"{CompanyFilter(companyId)} and {P}_{kind}id eq {id}", 0, 1, ct);
        return rows.Count == 0 ? null : ReadResource(rows[0], Field("payload"));
    }
    public async Task<IReadOnlyList<Resource>> List(Guid companyId, string kind, int offset = 0, int limit = 100, CancellationToken ct = default) =>
        (await Query(Table(kind), CompanyFilter(companyId), offset, limit, ct)).Select(x => ReadResource(x, Field("payload"))).ToArray();
    public async Task<IReadOnlyList<Resource>> Memberships(Actor actor, CancellationToken ct = default)
    {
        if (!Guid.TryParse(actor.TenantId, out _) || !Guid.TryParse(actor.ObjectId, out _)) return [];
        var rows = await Query(Table("membership"), $"{Field("tenantid")} eq '{Escape(actor.TenantId)}' and {Field("objectid")} eq '{Escape(actor.ObjectId)}'", 0, 100, ct);
        return rows.Select(x => ReadResource(x, Field("payload"))).Where(r => Json.Read<Membership>(r.Data).Active).ToArray();
    }
    public async Task<CommandReceipt?> Receipt(Guid companyId, Guid commandId, CancellationToken ct = default)
    {
        var rows = await Query(Table("command"), $"{CompanyFilter(companyId)} and {P}_commandid eq {StableId.From($"command:{companyId}:{commandId}")}", 0, 1, ct);
        return rows.Count == 0 ? null : JsonSerializer.Deserialize<CommandReceipt>(Text(rows[0], Field("payload")), Json.Options);
    }
    public async Task Apply(Commit commit, CancellationToken ct = default)
    {
        var writes = new List<DataverseWrite>();
        var creatingCompany = commit.Writes.Any(w => w.Value.Kind == "company" && w.ExpectedVersion is null);
        if (creatingCompany)
        {
            var teamId = OwnerTeam(commit.Receipt.CompanyId);
            writes.Add(new("POST", "teams", JsonSerializer.Serialize(new Dictionary<string, object?>
            {
                ["teamid"] = teamId, ["name"] = "TenderOps " + commit.Receipt.CompanyId, ["teamtype"] = 0,
                ["businessunitid@odata.bind"] = $"/businessunits({ownership.BusinessUnitId})"
            })));
            writes.Add(new("POST", $"teams({teamId})/teamroles_association/$ref", JsonSerializer.Serialize(new Dictionary<string, string>
            { ["@odata.id"] = client.BaseUrl + $"roles({ownership.CompanyRoleId})" })));
        }
        foreach (var write in commit.Writes)
        {
            if (write.Value.CompanyId != commit.Receipt.CompanyId) throw new DomainError(400, "invalid_company_reference");
            string? etag = null;
            if (write.ExpectedVersion is not null)
            {
                var existing = await Query(Table(write.Value.Kind), $"{CompanyFilter(write.Value.CompanyId)} and {P}_{write.Value.Kind}id eq {write.Value.Id}", 0, 1, ct);
                if (existing.Count == 0) throw new DomainError(404, "resource_not_found");
                if (ReadResource(existing[0], Field("payload")).Version != write.ExpectedVersion) throw new DomainError(412, "version_conflict");
                etag = Text(existing[0], "@odata.etag");
            }
            writes.Add(ResourceWrite(write.Value, etag));
        }
        writes.Add(Create("command", StableId.From($"command:{commit.Receipt.CompanyId}:{commit.Receipt.Id}"), commit.Receipt.CompanyId, commit.Receipt));
        writes.Add(Create("audit", commit.Audit.Id, commit.Audit.CompanyId, commit.Audit));
        writes.Add(Create("outbox", commit.Event.EventId, commit.Event.CompanyId, new OutboxItem(commit.Event),
            new() { [Field("published")] = false, [Field("leaseuntil")] = null, [Field("version")] = 1 }));
        try { await client.Changeset(writes, ct); }
        catch (DomainError error) when (error.Status is 409 or 412)
        {
            var receipt = await Receipt(commit.Receipt.CompanyId, commit.Receipt.Id, ct);
            if (receipt is null || receipt.Fingerprint != commit.Receipt.Fingerprint) throw;
        }
    }
    public async Task<IReadOnlyList<AuditEntry>> Audit(Guid companyId, int offset, int limit, CancellationToken ct = default) =>
        (await Query(Table("audit"), CompanyFilter(companyId), offset, limit, ct))
            .Select(x => JsonSerializer.Deserialize<AuditEntry>(Text(x, Field("payload")), Json.Options)!).ToArray();
    public async Task<IReadOnlyList<OutboxItem>> Pending(DateTimeOffset now, CancellationToken ct = default) =>
        (await Query(Table("outbox"), $"{Field("published")} eq false and ({Field("leaseuntil")} eq null or {Field("leaseuntil")} le {now:yyyy-MM-ddTHH:mm:ssZ})", 0, 100, ct))
            .Select(x => JsonSerializer.Deserialize<OutboxItem>(Text(x, Field("payload")), Json.Options)!).ToArray();
    public async Task<OutboxItem?> Lease(OutboxItem item, string owner, DateTimeOffset now, CancellationToken ct = default)
    {
        var rows = await Query(Table("outbox"), $"{CompanyFilter(item.Event.CompanyId)} and {P}_outboxid eq {item.Event.EventId}", 0, 1, ct);
        if (rows.Count == 0) return null;
        var current = JsonSerializer.Deserialize<OutboxItem>(Text(rows[0], Field("payload")), Json.Options)!;
        if (current.Version != item.Version || current.Published || current.LeaseUntil > now) return null;
        var lease = current with { Version = current.Version + 1, LeaseOwner = owner, LeaseUntil = now.AddMinutes(2) };
        try
        {
            await client.Changeset([UpdateOutbox(lease, Text(rows[0], "@odata.etag"))], ct);
            return lease;
        }
        catch (DomainError error) when (error.Status == 412) { return null; }
    }
    public async Task MarkPublished(OutboxItem leased, CancellationToken ct = default)
    {
        var rows = await Query(Table("outbox"), $"{CompanyFilter(leased.Event.CompanyId)} and {P}_outboxid eq {leased.Event.EventId}", 0, 1, ct);
        if (rows.Count == 0) throw new DomainError(412, "lease_lost");
        var current = JsonSerializer.Deserialize<OutboxItem>(Text(rows[0], Field("payload")), Json.Options)!;
        if (current.Version != leased.Version || current.LeaseOwner != leased.LeaseOwner) throw new DomainError(412, "lease_lost");
        await client.Changeset([UpdateOutbox(current with { Published = true, Version = current.Version + 1 }, Text(rows[0], "@odata.etag"))], ct);
    }
    // Consumers call this only after validating schema/company/entityVersion; external effects need reconciliation.
    public async Task ConsumeAtomically(IntegrationEvent evt, string consumer, IReadOnlyList<DataverseWrite> businessWrites, CancellationToken ct)
    {
        var id = StableId.From($"inbox:{evt.CompanyId}:{consumer}:{evt.EventId}");
        var rows = await Query(Table("inbox"), $"{CompanyFilter(evt.CompanyId)} and {P}_inboxid eq {id}", 0, 1, ct);
        if (rows.Count != 0) return;
        await client.Changeset([Create("inbox", id, evt.CompanyId, new { consumer, evt.EventId, evt.EntityVersion }), ..businessWrites], ct);
    }
    private async Task<IReadOnlyList<JsonElement>> Query(string table, string filter, int offset, int limit, CancellationToken ct)
    {
        // Dataverse does not support $skip. Follow opaque server paging; never invent offsets.
        var result = new List<JsonElement>();
        var relative = $"{table}?$filter={Uri.EscapeDataString(filter)}&$orderby=createdon asc,{table[..^1]}id asc";
        var seen = 0;
        while (true)
        {
            var data = await client.Get(relative, ct);
            foreach (var row in data.GetProperty("value").EnumerateArray())
            {
                if (seen++ < offset) continue;
                result.Add(row.Clone());
                if (result.Count >= limit) return result;
            }
            if (!data.TryGetProperty("@odata.nextLink", out var next)) return result;
            var link = next.GetString()!;
            if (!link.StartsWith(client.BaseUrl, StringComparison.Ordinal)) throw new DomainError(502, "invalid_paging_origin");
            relative = link[client.BaseUrl.Length..];
        }
    }
    private static Guid OwnerTeam(Guid companyId) => StableId.From($"ownerteam:{companyId}");
    private DataverseWrite ResourceWrite(Resource resource, string? etag)
    {
        var fields = Base(resource.CompanyId, resource);
        fields[Field("version")] = resource.Version;
        if (resource.Kind != "company") fields[$"{Field("company")}@odata.bind"] = $"/{Table("company")}({resource.CompanyId})";
        if (resource.Kind == "membership")
        {
            var membership = Json.Read<Membership>(resource.Data);
            fields[Field("tenantid")] = membership.TenantId; fields[Field("objectid")] = membership.ObjectId;
        }
        return new("PATCH", $"{Table(resource.Kind)}({resource.Id})", JsonSerializer.Serialize(fields), etag, etag is null);
    }
    private Dictionary<string, object?> Base(Guid companyId, object value) => new()
    {
        [Field("name")] = value.GetType().Name, [Field("companykey")] = companyId.ToString(),
        [Field("payload")] = JsonSerializer.Serialize(value, Json.Options), ["ownerid@odata.bind"] = $"/teams({OwnerTeam(companyId)})"
    };
    private DataverseWrite Create(string kind, Guid id, Guid companyId, object value, Dictionary<string, object?>? extra = null)
    {
        var data = Base(companyId, value);
        data[$"{Field("company")}@odata.bind"] = $"/{Table("company")}({companyId})";
        if (extra is not null) foreach (var pair in extra) data[pair.Key] = pair.Value;
        return new("PATCH", $"{Table(kind)}({id})", JsonSerializer.Serialize(data), CreateOnly: true);
    }
    private DataverseWrite UpdateOutbox(OutboxItem value, string etag) => new("PATCH", $"{Table("outbox")}({value.Event.EventId})",
        JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            [Field("payload")] = JsonSerializer.Serialize(value, Json.Options), [Field("version")] = value.Version,
            [Field("published")] = value.Published, [Field("leaseuntil")] = value.LeaseUntil
        }), etag);
}
public sealed record DataverseOwnership(Guid BusinessUnitId, Guid CompanyRoleId);
