import { DefaultAzureCredential } from "@azure/identity";
import { integrationReady, loadConfig } from "../shared/config.js";
import { DomainError } from "../shared/errors.js";

export interface SharePointItem {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  lastModifiedDateTime: string;
}

export class GraphClient {
  enabled(): boolean {
    return integrationReady("graph");
  }

  private require(): void {
    if (!this.enabled()) throw new DomainError(503, "sharepoint_not_configured");
  }

  private async token(): Promise<string> {
    this.require();
    const credential = new DefaultAzureCredential();
    const result = await credential.getToken("https://graph.microsoft.com/.default");
    if (!result?.token) throw new DomainError(503, "graph_permission_denied");
    return result.token;
  }

  folderPath(account: string, opportunity: string): string {
    return `account/${account}/opportunity/${opportunity}/Pliegos`;
  }

  async listFolder(account: string, opportunity: string): Promise<SharePointItem[]> {
    const config = loadConfig();
    const token = await this.token();
    const drive = config.sharePointDriveId || "root";
    const path = this.folderPath(account, opportunity);
    const url = `https://graph.microsoft.com/v1.0/drives/${drive}/root:/${encodeURI(path)}:/children`;
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (response.status === 404) return [];
    if (!response.ok) throw new DomainError(502, `graph_http_${response.status}`, true);
    const body = (await response.json()) as { value: SharePointItem[] };
    return body.value;
  }

  async upload(account: string, opportunity: string, fileName: string, content: Buffer): Promise<SharePointItem> {
    const config = loadConfig();
    const token = await this.token();
    const path = `${this.folderPath(account, opportunity)}/${fileName}`;
    const url = `https://graph.microsoft.com/v1.0/drives/${config.sharePointDriveId}/root:/${encodeURI(path)}:/content`;
    const response = await fetch(url, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/octet-stream" },
      body: new Uint8Array(content),
    });
    if (!response.ok) throw new DomainError(502, `graph_http_${response.status}`, true);
    return (await response.json()) as SharePointItem;
  }
}

export const graphClient = new GraphClient();
