namespace TenderOps.Core;

public sealed class OutboxPublisher(IBusinessStore store, IEventTransport transport)
{
    public async Task<int> RunOnce(string owner, CancellationToken ct = default)
    {
        var count = 0;
        foreach (var item in await store.Pending(DateTimeOffset.UtcNow, ct))
        {
            var lease = await store.Lease(item, owner, DateTimeOffset.UtcNow, ct);
            if (lease is null) continue;
            await transport.Publish(lease.Event, ct);
            // A crash here leaves an expiring lease. Re-publication is intentional; inbox deduplicates.
            try { await store.MarkPublished(lease, ct); }
            catch (DomainError conflict) when (conflict.Status == 412) { continue; }
            count++;
        }
        return count;
    }
}

public static class RetryPolicy
{
    public static bool IsTransient(int status) => status is 408 or 429 or >= 500 and <= 599;
    public static TimeSpan Delay(int attempt, TimeSpan? retryAfter = null) => retryAfter ??
        TimeSpan.FromMilliseconds(Math.Min(30000, Math.Pow(2, attempt) * 250) + Random.Shared.Next(50, 250));
}
