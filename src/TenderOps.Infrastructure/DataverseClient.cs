using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Azure.Core;
using TenderOps.Core;

namespace TenderOps.Infrastructure;

public sealed record DataverseOptions(string Url, string Prefix, bool MetadataVerified);

/// <summary>Server-only client; never accepts browser-provided OData or destinations.</summary>
public sealed class DataverseClient(HttpClient http, TokenCredential credential, DataverseOptions options)
{
    public string Prefix => options.Prefix;
    public string BaseUrl => options.Url.TrimEnd('/') + "/api/data/v9.2/";
    public async Task<JsonElement> Get(string relative, CancellationToken ct = default)
    {
        using var response = await Send(HttpMethod.Get, relative, null, null, ct);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        return document.RootElement.Clone();
    }
    public async Task<HttpResponseMessage> Send(HttpMethod method, string relative, HttpContent? content, string? etag, CancellationToken ct)
    {
        if (!options.MetadataVerified) throw new DomainError(503, "dataverse_metadata_unverified");
        if (Uri.TryCreate(relative, UriKind.Absolute, out _)) throw new InvalidOperationException("Relative paths only");
        var token = await credential.GetTokenAsync(new TokenRequestContext([options.Url.TrimEnd('/') + "/.default"]), ct);
        using var request = new HttpRequestMessage(method, BaseUrl + relative) { Content = content };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
        request.Headers.Add("OData-Version", "4.0");
        request.Headers.Add("OData-MaxVersion", "4.0");
        if (etag is not null) request.Headers.TryAddWithoutValidation("If-Match", etag);
        var response = await http.SendAsync(request, ct);
        if (response.IsSuccessStatusCode) return response;
        var status = (int)response.StatusCode;
        var retryAfter = response.Headers.RetryAfter?.Delta ??
            (response.Headers.RetryAfter?.Date is { } retryDate ? retryDate - DateTimeOffset.UtcNow : (TimeSpan?)null);
        if (retryAfter < TimeSpan.Zero) retryAfter = TimeSpan.Zero;
        response.Dispose();
        // Do not leak Dataverse response text (can contain business data). Caller decides safe retry.
        throw new DomainError(status switch { 401 or 403 => 503, 404 => 404, 412 => 412, 409 => 409, 429 => 503, _ => 502 },
            status is 401 or 403 ? "dataverse_permission_denied" : $"dataverse_http_{status}", RetryPolicy.IsTransient(status), retryAfter);
    }
    public async Task Changeset(IReadOnlyList<DataverseWrite> writes, CancellationToken ct)
    {
        var batch = "batch_" + Guid.NewGuid().ToString("N");
        var change = "changeset_" + Guid.NewGuid().ToString("N");
        var body = new StringBuilder($"--{batch}\r\nContent-Type: multipart/mixed; boundary={change}\r\n\r\n");
        for (var index = 0; index < writes.Count; index++)
        {
            var w = writes[index];
            body.Append($"--{change}\r\nContent-Type: application/http\r\nContent-Transfer-Encoding: binary\r\nContent-ID: {index + 1}\r\n\r\n");
            body.Append($"{w.Method} {BaseUrl}{w.Path} HTTP/1.1\r\nContent-Type: application/json\r\n");
            if (w.ETag is not null) body.Append($"If-Match: {w.ETag}\r\n");
            if (w.CreateOnly) body.Append("If-None-Match: *\r\n");
            body.Append("\r\n" + w.Json + "\r\n");
        }
        body.Append($"--{change}--\r\n--{batch}--\r\n");
        var content = new StringContent(body.ToString(), Encoding.UTF8);
        content.Headers.ContentType = MediaTypeHeaderValue.Parse($"multipart/mixed; boundary={batch}");
        using var response = await Send(HttpMethod.Post, "$batch", content, null, ct);
        var result = await response.Content.ReadAsStringAsync(ct);
        // The outer response can be 200 while an operation in the transaction failed.
        var statuses = System.Text.RegularExpressions.Regex.Matches(result, @"HTTP/1\.[01] (\d{3})")
            .Select(m => int.Parse(m.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture)).ToArray();
        if (statuses.Length == 0) throw new DomainError(502, "invalid_changeset_response");
        var failed = statuses.FirstOrDefault(s => s >= 400);
        if (failed != 0) throw new DomainError(failed is 409 or 412 ? failed : 502, "changeset_rejected", RetryPolicy.IsTransient(failed));
        if (statuses.Length != writes.Count) throw new DomainError(502, "incomplete_changeset_response");
    }
}
public sealed record DataverseWrite(string Method, string Path, string Json, string? ETag = null, bool CreateOnly = false);
