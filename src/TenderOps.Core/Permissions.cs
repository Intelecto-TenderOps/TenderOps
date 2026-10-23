namespace TenderOps.Core;

public static class Permissions
{
    private static readonly string[] ReadProfile = ["profile.read"];
    public static readonly IReadOnlyDictionary<string, string[]> Roles = new Dictionary<string, string[]>
    {
        ["Administrator"] = [..ReadProfile, "company.write", "profile.write", "members.read", "members.write", "audit.read", "rules.write"],
        ["Analyst"] = [..ReadProfile, "profile.write"],
        ["Commercial"] = [..ReadProfile, "rules.write"],
        ["Legal"] = [..ReadProfile, "sourcepolicy.write"],
        ["Financial"] = [..ReadProfile, "financial.read", "financial.write"],
        ["Approver"] = [..ReadProfile, "financial.read", "financial.approve", "rules.publish"],
        ["Auditor"] = [..ReadProfile, "financial.read", "audit.read"]
    };
    public static string[] For(Membership member) => member.Active
        ? member.Roles.Where(Roles.ContainsKey).SelectMany(role => Roles[role]).Distinct().Order().ToArray() : [];
    public static string Read(string kind) => kind switch
    { "financial" => "financial.read", "membership" or "team" => "members.read", "job" => "profile.read", _ => "profile.read" };
    public static string Write(string kind) => kind switch
    {
        "company" => "company.write", "financial" => "financial.write", "membership" or "team" => "members.write",
        "rule" => "rules.write", "sourcepolicy" => "sourcepolicy.write", _ => "profile.write"
    };
}
