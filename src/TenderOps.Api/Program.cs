using System.Security.Claims;
using System.Text.Json;
using Azure.Identity;
using Azure.Security.KeyVault.Certificates;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using TenderOps.Core;
using TenderOps.Infrastructure;
using Resource = TenderOps.Core.Resource;

var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders().AddConsole();
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 128 * 1024);
var local = builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing");
var demo = local && builder.Configuration.GetValue<bool>("Demo:Enabled");
var mode = builder.Configuration["Storage:Mode"] ?? "Dataverse";
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "__Host-TenderOps.Csrf";
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
});
var authentication = builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "__Host-TenderOps.Session";
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
        options.SlidingExpiration = false;
        options.Events.OnRedirectToLogin = context => { context.Response.StatusCode = 401; return Task.CompletedTask; };
        options.Events.OnRedirectToAccessDenied = context => { context.Response.StatusCode = 403; return Task.CompletedTask; };
    });
if (!demo)
{
    var tenant = Required("Entra:TenantId");
    if (!Guid.TryParse(tenant, out _)) throw new InvalidOperationException("Invalid Entra tenant ID");
    authentication.AddOpenIdConnect("Entra", options =>
    {
        options.Authority = $"https://login.microsoftonline.com/{tenant}/v2.0";
        options.ClientId = Required("Entra:ClientId");
        options.ClientSecret = Required("Entra:ClientSecret");
        options.ResponseType = "code";
        options.UsePkce = true;
        options.SaveTokens = false;
        options.MapInboundClaims = false;
        options.GetClaimsFromUserInfoEndpoint = false;
        options.TokenValidationParameters.NameClaimType = "name";
        options.Events.OnTokenValidated = context =>
        {
            if (context.Principal?.FindFirstValue("tid") != tenant || !Guid.TryParse(context.Principal.FindFirstValue("oid"), out _))
                context.Fail("Invalid identity");
            return Task.CompletedTask;
        };
    });
}
builder.Services.AddAuthorization();
if (!local)
{
    var trustedNetworks = builder.Configuration.GetSection("ReverseProxy:KnownNetworks").Get<string[]>() ?? [];
    if (trustedNetworks.Length == 0) throw new InvalidOperationException("Trusted reverse proxy networks must be configured");
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
        foreach (var cidr in trustedNetworks) options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(cidr));
    });
}
builder.Services.AddSingleton<ProfileService>();
var dataProtection = builder.Services.AddDataProtection().SetApplicationName("TenderOps");
if (demo) dataProtection.UseEphemeralDataProtectionProvider();
if (!local)
{
    var credential = new DefaultAzureCredential();
    dataProtection.PersistKeysToAzureBlobStorage(new Uri(Required("DataProtection:BlobUri")), credential)
        .ProtectKeysWithAzureKeyVault(new Uri(Required("DataProtection:KeyUri")), credential);
}
if (mode == "Memory")
{
    if (!local) throw new InvalidOperationException("Memory storage is restricted to Development/Testing");
    builder.Services.AddSingleton<MemoryStore>();
    builder.Services.AddSingleton<IBusinessStore>(services => services.GetRequiredService<MemoryStore>());
}
else if (mode == "Dataverse")
{
    var url = Required("Dataverse:Url");
    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != "https" || uri.AbsolutePath != "/") throw new InvalidOperationException("Dataverse requires an HTTPS origin");
    var prefix = Required("Dataverse:Prefix");
    if (!System.Text.RegularExpressions.Regex.IsMatch(prefix, "^[a-z][a-z0-9]{1,7}$")) throw new InvalidOperationException("Invalid publisher prefix");
    if (!builder.Configuration.GetValue<bool>("Dataverse:MetadataVerified")) throw new InvalidOperationException("Dataverse metadata verification is required");
    var certificateClient = new CertificateClient(new Uri(Required("Dataverse:KeyVaultUri")), new DefaultAzureCredential());
    var certificate = await certificateClient.DownloadCertificateAsync(Required("Dataverse:CertificateName"));
    var credential = new ClientCertificateCredential(Required("Dataverse:TenantId"), Required("Dataverse:ClientId"), certificate.Value);
    builder.Services.AddSingleton<Azure.Core.TokenCredential>(credential);
    builder.Services.AddSingleton(new DataverseOptions(url, prefix, true));
    builder.Services.AddSingleton(new DataverseOwnership(Guid.Parse(Required("Dataverse:BusinessUnitId")), Guid.Parse(Required("Dataverse:CompanyRoleId"))));
    builder.Services.AddHttpClient<DataverseClient>().ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
    builder.Services.AddSingleton<IBusinessStore, DataverseStore>();
}
else throw new InvalidOperationException("Unsupported storage mode");
builder.Services.AddOpenTelemetry().ConfigureResource(resource => resource.AddService("TenderOps.Api"))
    .WithTracing(traces => traces.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddOtlpExporter())
    .WithMetrics(metrics => metrics.AddAspNetCoreInstrumentation().AddHttpClientInstrumentation().AddOtlpExporter());
var app = builder.Build();
if (!local) app.UseForwardedHeaders();
app.Use(async (context, next) =>
{
    context.TraceIdentifier = Guid.NewGuid().ToString("N");
    context.Response.Headers["X-Correlation-ID"] = context.TraceIdentifier;
    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "same-origin";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
    try
    {
        await next();
        if (context.Response.StatusCode is 401 or 403 && !context.Response.HasStarted)
            await Problem(context, context.Response.StatusCode, context.Response.StatusCode == 401 ? "authentication_required" : "permission_denied");
    }
    catch (Exception error) when (!context.Response.HasStarted)
    {
        var (status, code) = error switch
        {
            DomainError domain => (domain.Status, domain.Code),
            AntiforgeryValidationException => (400, "csrf_invalid"),
            JsonException or BadHttpRequestException => (400, "invalid_body"),
            _ => (500, "unexpected_error")
        };
        if (status >= 500) app.Logger.LogError("Request failed with code {Code}; correlation {CorrelationId}", code, context.TraceIdentifier);
        await Problem(context, status, code);
    }
});
if (!local) app.UseHsts();
app.UseAuthentication();
app.UseAuthorization();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api") && !HttpMethods.IsGet(context.Request.Method) && !HttpMethods.IsHead(context.Request.Method))
        await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context);
    await next();
});
app.MapGet("/health/live", () => Results.Ok(new { status = "alive" }));
app.MapGet("/api/csrf", (HttpContext context, IAntiforgery csrf) => Results.Ok(new { token = csrf.GetAndStoreTokens(context).RequestToken, demo }));
app.MapGet("/auth/login", () => demo ? Results.Redirect("/") : Results.Challenge(new AuthenticationProperties { RedirectUri = "/" }, ["Entra"]));
app.MapPost("/api/logout", () => demo ? Results.SignOut(new AuthenticationProperties { RedirectUri = "/" }, [CookieAuthenticationDefaults.AuthenticationScheme])
    : Results.SignOut(new AuthenticationProperties { RedirectUri = "/" }, [CookieAuthenticationDefaults.AuthenticationScheme, "Entra"])).RequireAuthorization();
if (demo)
{
    await DemoSeed.Initialize(app.Services.GetRequiredService<ProfileService>());
    app.MapPost("/api/demo/login/{alias}", async (string alias, HttpContext context) =>
    {
        var actor = DemoSeed.Actor(alias);
        var claims = new[] { new Claim("tid", actor.TenantId), new Claim("oid", actor.ObjectId), new Claim("name", "Demostración · " + alias) };
        await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme)));
        return Results.Ok();
    });
}
app.MapGet("/api/session", async (HttpContext context, IBusinessStore store, IAntiforgery csrf, CancellationToken ct) =>
{
    var actor = Current(context);
    var memberships = await store.Memberships(actor, ct);
    var companies = new List<object>();
    foreach (var membership in memberships)
    {
        var company = await store.Get(membership.CompanyId, "company", membership.CompanyId, ct);
        if (company is not null) companies.Add(new { id = company.Id, name = Json.Read<Company>(company.Data).LegalName, permissions = Permissions.For(Json.Read<Membership>(membership.Data)) });
    }
    return Results.Ok(new { name = context.User.Identity?.Name ?? "Usuario", companies, csrfToken = csrf.GetAndStoreTokens(context).RequestToken, mode = demo ? "Demo local · datos efímeros" : "Entra / Dataverse" });
}).RequireAuthorization();
var api = app.MapGroup("/api/v1").RequireAuthorization();
api.MapPost("/companies", async (Company input, HttpContext context, ProfileService service, CancellationToken ct) =>
    Entity(context, await service.CreateCompany(Current(context), input, Command(context), context.TraceIdentifier, ct), 201));
api.MapPost("/companies/{companyId:guid}/select", async (Guid companyId, HttpContext context, ProfileService service, CancellationToken ct) =>
{
    await service.Authorize(Current(context), companyId, "profile.read", ct);
    return Results.Ok(new { companyId });
});
api.MapGet("/companies/{companyId:guid}/financial/eligible", async (Guid companyId, HttpContext context, ProfileService service, CancellationToken ct) =>
    Results.Ok(await service.EligibleFinancial(Current(context), companyId, ct)));
api.MapGet("/companies/{companyId:guid}/audit", async (Guid companyId, int? offset, int? limit, HttpContext context, ProfileService service, IBusinessStore store, CancellationToken ct) =>
{
    await service.Authorize(Current(context), companyId, "audit.read", ct);
    var start = offset ?? 0; var size = limit ?? 25;
    if (start < 0 || start > 10000 || size is < 1 or > 100) throw new DomainError(400, "invalid_pagination");
    var member = await service.Authorize(Current(context), companyId, "audit.read", ct);
    var permissions = Permissions.For(member);
    var entries = await store.Audit(companyId, start, size, ct);
    return Results.Ok(entries.Select(entry => permissions.Contains(Permissions.Read(entry.After.Kind)) ? entry :
        entry with { Before = entry.Before is null ? null : entry.Before with { Data = Json.Element(new { redacted = true }) }, After = entry.After with { Data = Json.Element(new { redacted = true }) } }));
});
api.MapGet("/companies/{companyId:guid}/{kind}", async (Guid companyId, string kind, int? offset, int? limit, HttpContext context, ProfileService service, CancellationToken ct) =>
    Results.Ok(await service.List(Current(context), companyId, kind, offset ?? 0, limit ?? 25, ct)));
api.MapGet("/companies/{companyId:guid}/{kind}/{id:guid}", async (Guid companyId, string kind, Guid id, HttpContext context, ProfileService service, CancellationToken ct) =>
    Entity(context, await service.Get(Current(context), companyId, kind, id, ct)));
api.MapPost("/companies/{companyId:guid}/{kind}", async (Guid companyId, string kind, JsonElement input, HttpContext context, ProfileService service, CancellationToken ct) =>
    Entity(context, await service.Save(Current(context), companyId, kind, null, input, null, Command(context), context.TraceIdentifier, ct), 201));
api.MapPut("/companies/{companyId:guid}/{kind}/{id:guid}", async (Guid companyId, string kind, Guid id, JsonElement input, HttpContext context, ProfileService service, CancellationToken ct) =>
    Entity(context, await service.Save(Current(context), companyId, kind, id, input, context.Request.Headers.IfMatch.FirstOrDefault(), Command(context), context.TraceIdentifier, ct)));
api.MapPost("/companies/{companyId:guid}/{kind}/{id:guid}/approve", async (Guid companyId, string kind, Guid id, HttpContext context, ProfileService service, CancellationToken ct) =>
    Entity(context, await service.Transition(Current(context), companyId, kind, id, context.Request.Headers.IfMatch.FirstOrDefault(), Command(context), context.TraceIdentifier, ct)));
api.MapGet("/companies/{companyId:guid}/evidence/{id:guid}/download", async (Guid companyId, Guid id, HttpContext context, ProfileService service, CancellationToken ct) =>
{
    await service.Get(Current(context), companyId, "evidence", id, ct);
    throw new DomainError(503, "secure_file_pipeline_pending");
});
app.MapOpenApi().RequireAuthorization();
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");
app.Run();

string Required(string key) => builder.Configuration[key] is { Length: > 0 } value ? value : throw new InvalidOperationException("Missing configuration: " + key);
static Actor Current(HttpContext context) => new(context.User.FindFirstValue("tid") ?? throw new DomainError(401, "authentication_required"),
    context.User.FindFirstValue("oid") ?? throw new DomainError(401, "authentication_required"));
static Guid Command(HttpContext context) => Guid.TryParse(context.Request.Headers["Idempotency-Key"], out var command) && command != Guid.Empty
    ? command : throw new DomainError(400, "idempotency_key_required");
static IResult Entity(HttpContext context, Resource resource, int status = 200)
{
    context.Response.Headers.ETag = resource.ETag;
    return Results.Json(resource, Json.Options, statusCode: status);
}
static Task Problem(HttpContext context, int status, string code) => Results.Problem(statusCode: status, title: code,
    type: "urn:tenderops:problem:" + code, extensions: new Dictionary<string, object?> { ["code"] = code, ["correlationId"] = context.TraceIdentifier }).ExecuteAsync(context);
public partial class Program;
