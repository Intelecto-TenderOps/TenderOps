using Azure.Messaging.ServiceBus;
using TenderOps.Core;

namespace TenderOps.Infrastructure;

public sealed class ServiceBusTransport(ServiceBusSender sender) : IEventTransport
{
    public Task Publish(IntegrationEvent message, CancellationToken ct) => sender.SendMessageAsync(new ServiceBusMessage(BinaryData.FromObjectAsJson(message, Json.Options))
    {
        MessageId = message.EventId.ToString(), CorrelationId = message.CorrelationId,
        Subject = message.EventType, ContentType = "application/json",
        ApplicationProperties = { ["companyId"] = message.CompanyId.ToString(), ["schemaVersion"] = message.SchemaVersion }
    }, ct);
}
