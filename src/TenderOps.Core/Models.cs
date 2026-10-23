using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TenderOps.Core;

public static class Json
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    { UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow, RespectRequiredConstructorParameters = true, RespectNullableAnnotations = true };
    public static JsonElement Element<T>(T value) => JsonSerializer.SerializeToElement(value, Options);
    public static T Read<T>(JsonElement value) => value.Deserialize<T>(Options) ?? throw new DomainError(400, "invalid_body");
}
public sealed class DomainError(int status, string code, bool transient = false, TimeSpan? retryAfter = null) : Exception(code)
{
    public int Status { get; } = status;
    public string Code { get; } = code;
    public bool Transient { get; } = transient;
    public TimeSpan? RetryAfter { get; } = retryAfter;
}
public sealed record Actor(string TenantId, string ObjectId)
{
    public string Key => $"{TenantId}:{ObjectId}";
}
public sealed record Resource(Guid Id, Guid CompanyId, string Kind, long Version, JsonElement Data)
{
    public string ETag => $"\"{Version}\"";
}
public sealed record Company(string LegalName, string CountryCode, string TaxId);
public sealed record Capability(string Name, string Description, string CountryCode, DateOnly ValidUntil, bool Active);
public sealed record Experience(string Client, string Subject, DateOnly Start, DateOnly End, string Amount, string Currency, string Status = "PendingEvidence");
public sealed record Evidence(Guid ExperienceId, string FileName, string Sha256, string Locator, string Status = "PendingUpload");
public sealed record Financial(DateOnly PeriodStart, DateOnly PeriodEnd, DateOnly ValidUntil, string Currency, string Assets, string Liabilities,
    string CurrentAssets, string CurrentLiabilities, string Revenue, string Source, string Status = "Draft", string? ApprovedBy = null, string? CreatedBy = null);
public sealed record Coverage(string CountryCode, string Subdivision, bool Excluded, DateOnly EffectiveFrom);
public sealed record ParticipationRule(string Name, int Priority, DateOnly EffectiveFrom, DateOnly ValidUntil, string Field, string Operator, string Value, bool Blocking, string Status = "Draft");
public sealed record Membership(string TenantId, string ObjectId, string[] Roles, bool Active = true);
public sealed record Team(string Name, Guid[] MemberIds);
public sealed record SourcePolicy(string Source, string TermsVersion, string LegalBasis, DateOnly ReviewedOn, bool Authorized);
public sealed record Job(string JobType, string Status, string? SafeError = null);
public sealed record IntegrationEvent(Guid EventId, string EventType, int SchemaVersion, Guid CompanyId, Guid EntityId,
    long EntityVersion, DateTimeOffset OccurredAt, string Source, string CorrelationId);
public sealed record AuditEntry(Guid Id, Guid CompanyId, Guid EntityId, string Actor, string Action, DateTimeOffset OccurredAt,
    string CorrelationId, Resource? Before, Resource After);
public sealed record CommandReceipt(Guid Id, Guid CompanyId, string Fingerprint, Guid ResourceId, string Kind);
public sealed record Write(Resource Value, long? ExpectedVersion);
public sealed record Commit(CommandReceipt Receipt, IReadOnlyList<Write> Writes, AuditEntry Audit, IntegrationEvent Event);
public sealed record OutboxItem(IntegrationEvent Event, long Version = 1, DateTimeOffset? LeaseUntil = null, string? LeaseOwner = null, bool Published = false);
public sealed record Page<T>(IReadOnlyList<T> Items, int Offset, int Limit, bool HasMore);

public static class StableId
{
    public static Guid From(string text) => new(SHA256.HashData(Encoding.UTF8.GetBytes(text)).AsSpan(0, 16));
    public static string Hash(string text) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text)));
}

public interface IBusinessStore
{
    Task<Resource?> Get(Guid companyId, string kind, Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Resource>> List(Guid companyId, string kind, int offset = 0, int limit = 100, CancellationToken ct = default);
    Task<IReadOnlyList<Resource>> Memberships(Actor actor, CancellationToken ct = default);
    Task<CommandReceipt?> Receipt(Guid companyId, Guid commandId, CancellationToken ct = default);
    Task Apply(Commit commit, CancellationToken ct = default);
    Task<IReadOnlyList<AuditEntry>> Audit(Guid companyId, int offset, int limit, CancellationToken ct = default);
    Task<IReadOnlyList<OutboxItem>> Pending(DateTimeOffset now, CancellationToken ct = default);
    Task<OutboxItem?> Lease(OutboxItem item, string owner, DateTimeOffset now, CancellationToken ct = default);
    Task MarkPublished(OutboxItem leased, CancellationToken ct = default);
}

public interface IEventTransport
{
    Task Publish(IntegrationEvent message, CancellationToken ct);
}
