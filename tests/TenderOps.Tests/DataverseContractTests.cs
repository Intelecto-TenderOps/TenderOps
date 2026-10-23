using System.Net;
using Azure.Core;
using TenderOps.Core;
using TenderOps.Infrastructure;
using Xunit;

namespace TenderOps.Tests;

public sealed class DataverseContractTests
{
    private sealed class Credential : TokenCredential
    {
        public override AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken) => new("synthetic-test-token", DateTimeOffset.UtcNow.AddHours(1));
        public override ValueTask<AccessToken> GetTokenAsync(TokenRequestContext requestContext, CancellationToken cancellationToken) => ValueTask.FromResult(GetToken(requestContext, cancellationToken));
    }
    private sealed class Handler(string responseBody) : HttpMessageHandler
    {
        public string? RequestBody { get; private set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Assert.Equal("sandbox.example.invalid", request.RequestUri!.Host);
            RequestBody = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
            return new(HttpStatusCode.OK) { Content = new StringContent(responseBody) };
        }
    }
    [Fact]
    public async Task BusinessAndOutboxUseOneChangesetWithPhysicalEtagAndCreateOnlyReceipt()
    {
        using var handler = new Handler("HTTP/1.1 204 No Content\r\n\r\nHTTP/1.1 204 No Content\r\n\r\nHTTP/1.1 204 No Content\r\n");
        var client = new DataverseClient(new HttpClient(handler), new Credential(), new("https://sandbox.example.invalid", "tpo", true));
        await client.Changeset([
            new("PATCH", "tpo_capabilitys(11111111-1111-1111-1111-111111111111)", "{}", "W/\"12345\""),
            new("PATCH", "tpo_commands(22222222-2222-2222-2222-222222222222)", "{}", CreateOnly: true),
            new("PATCH", "tpo_outboxs(33333333-3333-3333-3333-333333333333)", "{}", CreateOnly: true)], CancellationToken.None);
        Assert.Contains("If-Match: W/\"12345\"", handler.RequestBody);
        Assert.Contains("If-None-Match: *", handler.RequestBody);
        Assert.Contains("Content-ID: 3", handler.RequestBody);
    }
    [Fact]
    public async Task Outer200DoesNotHideInnerTransactionFailure()
    {
        using var handler = new Handler("HTTP/1.1 412 Precondition Failed\r\n");
        var client = new DataverseClient(new HttpClient(handler), new Credential(), new("https://sandbox.example.invalid", "tpo", true));
        var error = await Assert.ThrowsAsync<DomainError>(() => client.Changeset([new("PATCH", "tpo_outboxs(11111111-1111-1111-1111-111111111111)", "{}")], CancellationToken.None));
        Assert.Equal(412, error.Status);
    }
    [Fact]
    public async Task UnverifiedMetadataAndAbsoluteDestinationsAreRejected()
    {
        using var handler = new Handler("{}");
        var blocked = new DataverseClient(new HttpClient(handler), new Credential(), new("https://sandbox.example.invalid", "tpo", false));
        Assert.Equal(503, (await Assert.ThrowsAsync<DomainError>(() => blocked.Get("tpo_companys"))).Status);
        var verified = new DataverseClient(new HttpClient(handler), new Credential(), new("https://sandbox.example.invalid", "tpo", true));
        await Assert.ThrowsAsync<InvalidOperationException>(() => verified.Get("https://untrusted.example.invalid/"));
    }
}
