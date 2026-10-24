import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { CopilotMessage } from "@/contracts";
import { RichHtmlTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/viz/StatusBadge";

export function TenderOpsCopilot({
  messages,
  busy,
  onAsk,
  onAction,
}: {
  messages: CopilotMessage[];
  busy?: boolean;
  onAsk: (value: string) => void;
  onAction: (message: CopilotMessage) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex h-full min-h-[480px] flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[720px] rounded-[22px] px-4 py-3 ${
              message.role === "user" ? "ml-auto bg-electric text-white" : "glass-panel"
            }`}
          >
            <p className="text-[11px] uppercase tracking-[0.14em] opacity-70">{message.agent}</p>
            <p className="mt-1 text-sm">{message.body}</p>
            {message.findings?.length ? (
              <ul className="mt-2 list-disc pl-4 text-sm">
                {message.findings.map((finding) => (
                  <li key={finding}>{finding}</li>
                ))}
              </ul>
            ) : null}
            {message.table ? (
              <div className="mt-3">
                <RichHtmlTable headers={message.table.headers} rows={message.table.rows} />
              </div>
            ) : null}
            {message.recommendation ? (
              <p className="mt-2 text-sm font-medium">{message.recommendation}</p>
            ) : null}
            {message.status ? <StatusBadge value={message.status} /> : null}
            {message.proposedAction ? (
              <div className="mt-3">
                <Button size="sm" onClick={() => onAction(message)}>
                  {message.proposedAction.label}
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!value.trim()) return;
          onAsk(value.trim());
          setValue("");
        }}
      >
        <Input
          aria-label="Pregunta para Copilot"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Pregunta al orquestador de demostración"
        />
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Pensando…" : "Enviar"}
        </Button>
      </form>
    </div>
  );
}
