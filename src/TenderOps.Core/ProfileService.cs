using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace TenderOps.Core;

public sealed partial class ProfileService(IBusinessStore store)
{
    public static readonly string[] Kinds = ["company", "capability", "experience", "evidence", "financial", "coverage", "rule", "membership", "team", "sourcepolicy", "job"];
    public async Task<Membership> Authorize(Actor actor, Guid companyId, string permission, CancellationToken ct = default)
    {
        var memberships = await store.Memberships(actor, ct);
        var membership = memberships.SingleOrDefault(m => m.CompanyId == companyId);
        if (membership is null) throw new DomainError(403, "company_access_denied");
        var data = Json.Read<Membership>(membership.Data);
        if (!Permissions.For(data).Contains(permission)) throw new DomainError(403, "permission_denied");
        return data;
    }

    public async Task<Resource> Get(Actor actor, Guid companyId, string kind, Guid id, CancellationToken ct = default)
    {
        CheckKind(kind);
        await Authorize(actor, companyId, Permissions.Read(kind), ct);
        return await store.Get(companyId, kind, id, ct) ?? throw new DomainError(404, "resource_not_found");
    }
    public async Task<Page<Resource>> List(Actor actor, Guid companyId, string kind, int offset, int limit, CancellationToken ct = default)
    {
        CheckKind(kind);
        if (offset < 0 || offset > 10000 || limit is < 1 or > 100) throw new DomainError(400, "invalid_pagination");
        await Authorize(actor, companyId, Permissions.Read(kind), ct);
        var rows = await store.List(companyId, kind, offset, limit + 1, ct);
        return new(rows.Take(limit).ToArray(), offset, limit, rows.Count > limit);
    }

    public async Task<Resource> CreateCompany(Actor actor, Company data, Guid commandId, string correlation, CancellationToken ct = default)
    {
        Text(data.LegalName, 200); Country(data.CountryCode); Text(data.TaxId, 50);
        // Country + normalized tax ID is global identity; never expose existing company data on collision.
        var id = StableId.From($"company:{data.CountryCode}:{data.TaxId.Trim().ToUpperInvariant()}");
        var fingerprint = StableId.Hash(actor.Key + Json.Element(data).GetRawText());
        var replay = await Replay(id, commandId, fingerprint, ct);
        if (replay is not null) return replay;
        if (await store.Get(id, "company", id, ct) is not null) throw new DomainError(409, "company_already_registered");
        var company = new Resource(id, id, "company", 1, Json.Element(data));
        var member = new Resource(StableId.From($"member:{id}:{actor.Key}"), id, "membership", 1,
            Json.Element(new Membership(actor.TenantId, actor.ObjectId, ["Administrator"])));
        await Commit(actor, company, null, commandId, fingerprint, correlation, [new(member, null)], ct);
        return company;
    }

    public async Task<Resource> Save(Actor actor, Guid companyId, string kind, Guid? id, JsonElement input, string? etag,
        Guid commandId, string correlation, CancellationToken ct = default)
    {
        CheckKind(kind);
        if (kind == "job" || (kind == "company" && id is null)) throw new DomainError(405, "operation_not_supported");
        await Authorize(actor, companyId, Permissions.Write(kind), ct);
        var fingerprint = StableId.Hash($"{actor.Key}:{kind}:{id}:{etag}:{input.GetRawText()}");
        var replay = await Replay(companyId, commandId, fingerprint, ct);
        if (replay is not null) return replay;
        Resource? previous = null;
        if (id is not null)
        {
            previous = await store.Get(companyId, kind, id.Value, ct) ?? throw new DomainError(404, "resource_not_found");
            if (etag is null) throw new DomainError(428, "if_match_required");
            if (etag != previous.ETag) throw new DomainError(412, "version_conflict");
        }
        var data = await Validate(actor, companyId, kind, input, previous, ct);
        var resourceId = id ?? StableId.From($"resource:{companyId}:{kind}:{commandId}");
        if (kind == "membership" && id is null)
        {
            var member = Json.Read<Membership>(data);
            resourceId = StableId.From($"member:{companyId}:{member.TenantId}:{member.ObjectId}");
        }
        var result = new Resource(resourceId, companyId, kind, (previous?.Version ?? 0) + 1, data);
        await Commit(actor, result, previous, commandId, fingerprint, correlation, [], ct);
        return result;
    }

    public async Task<Resource> Transition(Actor actor, Guid companyId, string kind, Guid id, string? etag,
        Guid commandId, string correlation, CancellationToken ct = default)
    {
        if (kind is not ("financial" or "rule")) throw new DomainError(405, "operation_not_supported");
        await Authorize(actor, companyId, kind == "financial" ? "financial.approve" : "rules.publish", ct);
        var fingerprint = StableId.Hash($"{actor.Key}:approve:{kind}:{id}:{etag}");
        var replay = await Replay(companyId, commandId, fingerprint, ct);
        if (replay is not null) return replay;
        var previous = await store.Get(companyId, kind, id, ct) ?? throw new DomainError(404, "resource_not_found");
        if (etag is null) throw new DomainError(428, "if_match_required");
        if (etag != previous.ETag) throw new DomainError(412, "version_conflict");
        JsonElement data;
        if (kind == "financial")
        {
            var f = Json.Read<Financial>(previous.Data);
            if (f.Status != "Draft") throw new DomainError(409, "immutable_approved_version");
            if (f.CreatedBy == actor.Key) throw new DomainError(403, "separate_approver_required");
            if (f.ValidUntil < DateOnly.FromDateTime(DateTime.UtcNow)) throw new DomainError(400, "expired_snapshot");
            data = Json.Element(f with { Status = "Approved", ApprovedBy = actor.Key });
        }
        else
        {
            var rule = Json.Read<ParticipationRule>(previous.Data);
            if (rule.Status != "Draft") throw new DomainError(409, "immutable_published_version");
            data = Json.Element(rule with { Status = "Published" });
        }
        var result = previous with { Version = previous.Version + 1, Data = data };
        await Commit(actor, result, previous, commandId, fingerprint, correlation, [], ct);
        return result;
    }

    public async Task<IReadOnlyList<Resource>> EligibleFinancial(Actor actor, Guid companyId, CancellationToken ct = default)
    {
        await Authorize(actor, companyId, "financial.read", ct);
        var snapshots = new List<Resource>();
        for (var offset = 0; ; offset += 100)
        {
            if (offset > 10000) throw new DomainError(413, "financial_history_limit");
            var batch = await store.List(companyId, "financial", offset, 100, ct);
            snapshots.AddRange(batch);
            if (batch.Count < 100) break;
        }
        return snapshots.Where(row =>
        {
            var f = Json.Read<Financial>(row.Data);
            return f.Status == "Approved" && f.ValidUntil >= DateOnly.FromDateTime(DateTime.UtcNow);
        }).ToArray();
    }

    private async Task<JsonElement> Validate(Actor actor, Guid companyId, string kind, JsonElement input, Resource? previous, CancellationToken ct)
    {
        switch (kind)
        {
            case "company":
                var company = Json.Read<Company>(input);
                Text(company.LegalName, 200); Country(company.CountryCode); Text(company.TaxId, 50);
                var oldCompany = Json.Read<Company>(previous!.Data);
                if (company.CountryCode != oldCompany.CountryCode || company.TaxId != oldCompany.TaxId) throw new DomainError(400, "immutable_company_identity");
                return Json.Element(company);
            case "capability":
                var capability = Json.Read<Capability>(input);
                Text(capability.Name, 150); Text(capability.Description, 2000); Country(capability.CountryCode); Date(capability.ValidUntil);
                return Json.Element(capability);
            case "experience":
                var experience = Json.Read<Experience>(input);
                Text(experience.Client, 200); Text(experience.Subject, 2000); Dates(experience.Start, experience.End); Money(experience.Amount); Currency(experience.Currency);
                if (experience.Status != "PendingEvidence") throw new DomainError(400, "unsupported_experience_status");
                return Json.Element(experience);
            case "evidence":
                var evidence = Json.Read<Evidence>(input);
                await Reference(companyId, "experience", evidence.ExperienceId, ct);
                Text(evidence.FileName, 200); Text(evidence.Locator, 500);
                if (!HashPattern().IsMatch(evidence.Sha256) || evidence.Status != "PendingUpload") throw new DomainError(400, "invalid_evidence");
                return Json.Element(evidence);
            case "financial":
                var financial = Json.Read<Financial>(input);
                if (previous is not null && Json.Read<Financial>(previous.Data).Status != "Draft") throw new DomainError(409, "immutable_approved_version");
                if (financial.Status != "Draft" || financial.ApprovedBy is not null || financial.CreatedBy is not null) throw new DomainError(400, "server_owned_field");
                Dates(financial.PeriodStart, financial.PeriodEnd); Date(financial.ValidUntil);
                if (financial.ValidUntil < financial.PeriodEnd) throw new DomainError(400, "invalid_financial_period");
                Currency(financial.Currency); Text(financial.Source, 500);
                foreach (var amount in new[] { financial.Assets, financial.Liabilities, financial.CurrentAssets, financial.CurrentLiabilities, financial.Revenue }) Money(amount);
                return Json.Element(financial with { CreatedBy = previous is null ? actor.Key : Json.Read<Financial>(previous.Data).CreatedBy });
            case "coverage":
                var coverage = Json.Read<Coverage>(input);
                Country(coverage.CountryCode); Text(coverage.Subdivision, 100); Date(coverage.EffectiveFrom);
                return Json.Element(coverage);
            case "rule":
                var rule = Json.Read<ParticipationRule>(input);
                Text(rule.Name, 150); Dates(rule.EffectiveFrom, rule.ValidUntil); Text(rule.Value, 100);
                if (rule.Priority is < 0 or > 1000 || rule.Status != "Draft" ||
                    !new[] { "country", "contractValue", "currentRatio", "experienceValue" }.Contains(rule.Field) ||
                    !new[] { "eq", "gte", "lte", "exclude" }.Contains(rule.Operator)) throw new DomainError(400, "invalid_rule");
                if (rule.Field != "country") Money(rule.Value); else Country(rule.Value);
                if (previous is not null && Json.Read<ParticipationRule>(previous.Data).Status != "Draft") throw new DomainError(409, "immutable_published_version");
                return Json.Element(rule);
            case "membership":
                var membership = Json.Read<Membership>(input);
                if (!Guid.TryParse(membership.TenantId, out _) || !Guid.TryParse(membership.ObjectId, out _) || membership.TenantId != actor.TenantId ||
                    membership.Roles.Length is < 1 or > 7 || membership.Roles.Any(r => !Permissions.Roles.ContainsKey(r))) throw new DomainError(400, "invalid_membership");
                if (membership.TenantId == actor.TenantId && membership.ObjectId == actor.ObjectId) throw new DomainError(409, "self_membership_change_forbidden");
                if (previous is not null)
                {
                    var old = Json.Read<Membership>(previous.Data);
                    if (old.ObjectId != membership.ObjectId || old.TenantId != membership.TenantId) throw new DomainError(400, "immutable_identity");
                }
                var membershipId = StableId.From($"member:{companyId}:{membership.TenantId}:{membership.ObjectId}");
                if (previous is null && await store.Get(companyId, "membership", membershipId, ct) is not null) throw new DomainError(409, "membership_already_exists");
                return Json.Element(membership);
            case "team":
                var team = Json.Read<Team>(input); Text(team.Name, 150);
                if (team.MemberIds.Length > 100) throw new DomainError(400, "too_many_members");
                foreach (var memberId in team.MemberIds) await Reference(companyId, "membership", memberId, ct);
                return Json.Element(team);
            case "sourcepolicy":
                var policy = Json.Read<SourcePolicy>(input);
                Text(policy.Source, 150); Text(policy.TermsVersion, 100); Text(policy.LegalBasis, 2000); Date(policy.ReviewedOn);
                return Json.Element(policy);
            default: throw new DomainError(400, "unsupported_resource");
        }
    }

    private async Task Reference(Guid companyId, string kind, Guid id, CancellationToken ct)
    {
        if (await store.Get(companyId, kind, id, ct) is null) throw new DomainError(400, "invalid_company_reference");
    }
    private async Task<Resource?> Replay(Guid companyId, Guid commandId, string fingerprint, CancellationToken ct)
    {
        var receipt = await store.Receipt(companyId, commandId, ct);
        if (receipt is null) return null;
        if (receipt.Fingerprint != fingerprint) throw new DomainError(409, "idempotency_conflict");
        return await store.Get(companyId, receipt.Kind, receipt.ResourceId, ct) ?? throw new DomainError(409, "receipt_resource_missing");
    }
    private async Task Commit(Actor actor, Resource resource, Resource? previous, Guid commandId, string fingerprint, string correlation, IReadOnlyList<Write> additional, CancellationToken ct)
    {
        // Membership identity is deterministic, so races cannot create duplicate active memberships.
        if (resource.Kind == "membership" && previous is null)
        {
            var m = Json.Read<Membership>(resource.Data);
            resource = resource with { Id = StableId.From($"member:{resource.CompanyId}:{m.TenantId}:{m.ObjectId}") };
        }
        var now = DateTimeOffset.UtcNow;
        var receipt = new CommandReceipt(commandId, resource.CompanyId, fingerprint, resource.Id, resource.Kind);
        var audit = new AuditEntry(Guid.NewGuid(), resource.CompanyId, resource.Id, actor.Key, $"{resource.Kind}.changed", now, correlation, previous, resource);
        var evt = new IntegrationEvent(Guid.NewGuid(), $"{resource.Kind}.changed.v1", 1, resource.CompanyId, resource.Id, resource.Version, now, "TenderOps", correlation);
        await store.Apply(new(receipt, [new(resource, previous?.Version), ..additional], audit, evt), ct);
    }
    private static void CheckKind(string kind) { if (!Kinds.Contains(kind)) throw new DomainError(404, "resource_not_found"); }
    private static void Text(string? value, int max) { if (string.IsNullOrWhiteSpace(value) || value.Length > max) throw new DomainError(400, "invalid_field"); }
    private static void Country(string value) { if (!CountryPattern().IsMatch(value)) throw new DomainError(400, "invalid_country"); }
    private static void Currency(string value) { if (!CurrencyPattern().IsMatch(value)) throw new DomainError(400, "invalid_currency"); }
    private static void Date(DateOnly value) { if (value.Year < 1900) throw new DomainError(400, "invalid_date"); }
    private static void Dates(DateOnly start, DateOnly end) { Date(start); Date(end); if (start > end) throw new DomainError(400, "invalid_date_range"); }
    private static void Money(string value) { if (!MoneyPattern().IsMatch(value) || !decimal.TryParse(value, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out _)) throw new DomainError(400, "invalid_decimal"); }
    [GeneratedRegex("^[A-Z]{2}$")] private static partial Regex CountryPattern();
    [GeneratedRegex("^[A-Z]{3}$")] private static partial Regex CurrencyPattern();
    [GeneratedRegex("^[0-9]{1,24}(\\.[0-9]{1,4})?$")] private static partial Regex MoneyPattern();
    [GeneratedRegex("^[A-Fa-f0-9]{64}$")] private static partial Regex HashPattern();
}
