using Azure.Identity;
using Azure.Messaging.ServiceBus;
using Azure.Security.KeyVault.Certificates;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TenderOps.Core;
using TenderOps.Infrastructure;

var builder = Host.CreateApplicationBuilder(args);
string Required(string key) => builder.Configuration[key] is { Length: > 0 } value ? value : throw new InvalidOperationException("Missing configuration: " + key);
if (builder.Configuration["Storage:Mode"] == "Memory") throw new InvalidOperationException("A separate worker cannot share the API's memory store. Use Dataverse.");
if (builder.Configuration["Dataverse:MetadataVerified"] != "true") throw new InvalidOperationException("Verify Dataverse metadata first");
var certificate = await new CertificateClient(new Uri(Required("Dataverse:KeyVaultUri")), new DefaultAzureCredential()).DownloadCertificateAsync(Required("Dataverse:CertificateName"));
builder.Services.AddSingleton<Azure.Core.TokenCredential>(new ClientCertificateCredential(Required("Dataverse:TenantId"), Required("Dataverse:ClientId"), certificate.Value));
builder.Services.AddSingleton(new DataverseOptions(Required("Dataverse:Url"), Required("Dataverse:Prefix"), true));
builder.Services.AddSingleton(new DataverseOwnership(Guid.Parse(Required("Dataverse:BusinessUnitId")), Guid.Parse(Required("Dataverse:CompanyRoleId"))));
builder.Services.AddHttpClient<DataverseClient>().ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
builder.Services.AddSingleton<IBusinessStore, DataverseStore>();
builder.Services.AddSingleton(new ServiceBusClient(Required("ServiceBus:Namespace"), new DefaultAzureCredential()));
builder.Services.AddSingleton(services => services.GetRequiredService<ServiceBusClient>().CreateSender(Required("ServiceBus:Queue")));
builder.Services.AddSingleton<IEventTransport, ServiceBusTransport>();
builder.Services.AddSingleton<OutboxPublisher>();
builder.Services.AddHostedService<PublisherWorker>();
await builder.Build().RunAsync();

public sealed class PublisherWorker(OutboxPublisher publisher, ILogger<PublisherWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var owner = Guid.NewGuid().ToString("N");
        var attempt = 0;
        while (!stoppingToken.IsCancellationRequested)
        {
            var delay = TimeSpan.FromSeconds(10);
            try { await publisher.RunOnce(owner, stoppingToken); attempt = 0; }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception error)
            {
                var code = error is DomainError domain ? domain.Code : "publish_failed";
                var transient = error is DomainError { Transient: true } || error is ServiceBusException { IsTransient: true };
                if (!transient)
                {
                    logger.LogCritical("Publisher stopped for operator review: {Code}", code);
                    throw;
                }
                logger.LogError("Outbox publication failed: {Code}; retry after lease expiry", code);
                delay = RetryPolicy.Delay(Math.Min(++attempt, 10), (error as DomainError)?.RetryAfter);
            }
            await Task.Delay(delay, stoppingToken);
        }
    }
}
