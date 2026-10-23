using TenderOps.Core;

public static class DemoSeed
{
    public const string Tenant = "11111111-1111-1111-1111-111111111111";
    public static readonly Guid CompanyA = StableId.From("company:CO:DEMO-A");
    public static readonly Guid CompanyB = StableId.From("company:CO:DEMO-B");
    private static readonly Dictionary<string, string> Ids = new()
    {
        ["admin"] = "22222222-2222-2222-2222-222222222222", ["analyst"] = "33333333-3333-3333-3333-333333333333",
        ["finance"] = "44444444-4444-4444-4444-444444444444", ["approver"] = "55555555-5555-5555-5555-555555555555",
        ["other"] = "66666666-6666-6666-6666-666666666666"
    };
    public static Actor Actor(string alias) => Ids.TryGetValue(alias, out var id) ? new(Tenant, id) : throw new DomainError(400, "invalid_demo_user");
    public static async Task Initialize(ProfileService service)
    {
        await service.CreateCompany(Actor("admin"), new("Empresa demostración A", "CO", "DEMO-A"), StableId.From("seed-a"), "demo-seed");
        await service.CreateCompany(Actor("other"), new("Empresa demostración B", "CO", "DEMO-B"), StableId.From("seed-b"), "demo-seed");
        foreach (var (alias, roles) in new[] { ("analyst", new[] { "Analyst" }), ("finance", new[] { "Financial" }), ("approver", new[] { "Approver" }) })
            await service.Save(Actor("admin"), CompanyA, "membership", null, Json.Element(new Membership(Tenant, Ids[alias], roles)), null, StableId.From("seed-" + alias), "demo-seed");
    }
}
