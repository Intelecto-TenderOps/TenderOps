using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using TenderOps.Core;
using Xunit;

namespace TenderOps.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder.UseEnvironment("Testing").ConfigureAppConfiguration((_, configuration) =>
        configuration.AddInMemoryCollection(new Dictionary<string, string?> { ["Storage:Mode"] = "Memory", ["Demo:Enabled"] = "true", ["AllowedHosts"] = "localhost" }));
}
public sealed class ApiTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory factory;
    public ApiTests(ApiFactory factory) => this.factory = factory;
    private HttpClient Client() => factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false });
    private static async Task Login(HttpClient client, string alias)
    {
        var csrf = await client.GetFromJsonAsync<JsonElement>("/api/csrf");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", csrf.GetProperty("token").GetString());
        (await client.PostAsJsonAsync("/api/demo/login/" + alias, new { })).EnsureSuccessStatusCode();
        var session = await client.GetFromJsonAsync<JsonElement>("/api/session");
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", session.GetProperty("csrfToken").GetString());
    }
    [Fact]
    public async Task AnonymousAccessReturnsSafeProblemAndSessionCookieIsSecure()
    {
        using var client = Client();
        var denied = await client.GetAsync("/api/session");
        Assert.Equal(HttpStatusCode.Unauthorized, denied.StatusCode);
        var problem = await denied.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("authentication_required", problem.GetProperty("code").GetString());
        Assert.True(problem.TryGetProperty("correlationId", out _));
        var csrf = await client.GetAsync("/api/csrf");
        Assert.Contains(csrf.Headers.GetValues("Set-Cookie"), cookie => cookie.Contains("secure", StringComparison.OrdinalIgnoreCase) && cookie.Contains("httponly", StringComparison.OrdinalIgnoreCase));
    }
    [Fact]
    public async Task CsrfIsRequiredForLoginLogoutAndMutations()
    {
        using var client = Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/demo/login/admin", new { })).StatusCode);
        await Login(client, "admin");
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/logout", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync($"/api/v1/companies/{DemoSeed.CompanyA}/capability", new { })).StatusCode);
    }
    [Fact]
    public async Task ApiEnforcesCompanyIsolationReferencesAndETags()
    {
        using var admin = Client(); await Login(admin, "admin");
        using var other = Client(); await Login(other, "other");
        var path = $"/api/v1/companies/{DemoSeed.CompanyA}/capability";
        admin.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var body = new Capability("Ciberseguridad", "Auditoría técnica", "CO", new(2030, 1, 1), true);
        var created = await admin.PostAsJsonAsync(path, body);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var resource = await created.Content.ReadFromJsonAsync<Resource>(Json.Options);
        var location = path + "/" + resource!.Id;
        Assert.Equal(HttpStatusCode.Forbidden, (await other.GetAsync(location)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await other.GetAsync($"/api/v1/companies/{DemoSeed.CompanyA}/evidence/{Guid.NewGuid()}/download")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.GetAsync($"/api/v1/companies/{DemoSeed.CompanyA}/financial")).StatusCode);
        admin.DefaultRequestHeaders.Remove("Idempotency-Key"); admin.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        Assert.Equal((HttpStatusCode)428, (await admin.PutAsJsonAsync(location, body)).StatusCode);
        admin.DefaultRequestHeaders.IfMatch.ParseAdd("\"999\"");
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await admin.PutAsJsonAsync(location, body)).StatusCode);
    }
    [Fact]
    public async Task AuditRedactsFinancialPayloadForAdministratorWithoutFinancialRead()
    {
        using var finance = Client(); await Login(finance, "finance");
        finance.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var snapshot = new Financial(new(2025, 1, 1), new(2025, 12, 31), new(2030, 12, 31), "COP", "1234567.8901", "100", "500", "0", "1000", "Sensitive balance");
        (await finance.PostAsJsonAsync($"/api/v1/companies/{DemoSeed.CompanyA}/financial", snapshot)).EnsureSuccessStatusCode();
        using var admin = Client(); await Login(admin, "admin");
        var audit = await admin.GetFromJsonAsync<JsonElement>($"/api/v1/companies/{DemoSeed.CompanyA}/audit?limit=100");
        var financialRows = audit.EnumerateArray().Where(row => row.GetProperty("after").GetProperty("kind").GetString() == "financial").ToArray();
        Assert.NotEmpty(financialRows);
        Assert.All(financialRows, row => Assert.True(row.GetProperty("after").GetProperty("data").GetProperty("redacted").GetBoolean()));
        Assert.DoesNotContain("Sensitive balance", audit.GetRawText());
    }
    [Fact]
    public async Task InvalidPayloadPaginationAndOpenApiContract()
    {
        using var admin = Client(); await Login(admin, "admin");
        admin.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var invalid = await admin.PostAsJsonAsync($"/api/v1/companies/{DemoSeed.CompanyA}/capability", new { name = "Missing other required fields" });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync($"/api/v1/companies/{DemoSeed.CompanyA}/capability?limit=101")).StatusCode);
        var contract = await admin.GetFromJsonAsync<JsonElement>("/openapi/v1.json");
        Assert.True(contract.GetProperty("paths").TryGetProperty("/api/session", out _));
        if (Environment.GetEnvironmentVariable("TENDEROPS_CONTRACT_OUTPUT") is { Length: > 0 } output)
            await File.WriteAllTextAsync(output, JsonSerializer.Serialize(contract, new JsonSerializerOptions { WriteIndented = true }));
    }
}
