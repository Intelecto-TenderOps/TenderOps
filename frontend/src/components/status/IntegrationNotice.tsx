import { findIntegration } from "@/lib/integration";
import type { IntegrationStatus } from "@/contracts";

export function IntegrationNotice({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <aside className="glass-panel rounded-[20px] px-4 py-3 text-sm" role="status">
      <p className="font-medium">{title}</p>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </aside>
  );
}

export function IntegrationGate({
  items,
  system,
  connectedTitle,
  disconnectedTitle,
  disconnectedDetail,
}: {
  items?: IntegrationStatus[];
  system: IntegrationStatus["system"];
  connectedTitle?: string;
  disconnectedTitle: string;
  disconnectedDetail?: string;
}) {
  const item = findIntegration(items, system);
  const connected = item?.configured === true && item.status !== "desconectada";
  if (connected) {
    return connectedTitle ? <IntegrationNotice title={connectedTitle} detail={item?.note} /> : null;
  }
  return <IntegrationNotice title={disconnectedTitle} detail={disconnectedDetail ?? item?.note} />;
}
