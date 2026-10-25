import { DefaultAzureCredential } from "@azure/identity";
import { integrationReady, loadConfig } from "../shared/config.js";
import { DomainError } from "../shared/errors.js";
import type { CopilotMessage } from "../contracts/workspace.js";

export type CopilotAgentName = CopilotMessage["agent"];

export interface CopilotInvocation {
  agent: CopilotAgentName;
  input: Record<string, unknown>;
  companyId: string;
  actor: string;
}

export interface CopilotResult {
  agent: CopilotAgentName;
  output: Record<string, unknown>;
  evidence: string[];
  runId: string;
  configured: boolean;
}

export class CopilotClient {
  enabled(): boolean {
    return integrationReady("copilot");
  }

  agentId(agent: CopilotAgentName): string {
    return loadConfig().copilotAgents[agent] ?? "";
  }

  async invoke(request: CopilotInvocation): Promise<CopilotResult> {
    if (!this.enabled()) throw new DomainError(503, "copilot_not_configured");
    const config = loadConfig();
    const agentId = this.agentId(request.agent);
    if (!agentId) throw new DomainError(503, "copilot_agent_not_configured");
    const credential = new DefaultAzureCredential();
    const token = await credential.getToken("https://api.powerplatform.com/.default");
    if (!token?.token) throw new DomainError(503, "copilot_permission_denied");
    const url = `https://api.powerplatform.com/copilotstudio/environments/${config.copilotEnvironmentId}/bots/${agentId}/invoke`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        companyId: request.companyId,
        actor: request.actor,
        input: request.input,
      }),
    });
    if (!response.ok) throw new DomainError(502, `copilot_http_${response.status}`, true);
    const output = (await response.json()) as Record<string, unknown>;
    return {
      agent: request.agent,
      output,
      evidence: Array.isArray(output.evidence) ? output.evidence.map(String) : [],
      runId: String(output.runId ?? crypto.randomUUID()),
      configured: true,
    };
  }
}

export const copilotClient = new CopilotClient();
