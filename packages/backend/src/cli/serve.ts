import { createServer } from "node:http";
import { handleApiRequest } from "../http/handler.js";

const port = Number(process.env.PORT ?? 8787);

createServer(async (req, res) => {
  const host = req.headers.host ?? "127.0.0.1";
  const url = new URL(req.url ?? "/", `http://${host}`);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  let body: unknown;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }
  const response = await handleApiRequest({
    method: req.method ?? "GET",
    path: url.pathname,
    url: url.toString(),
    headers: Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key, String(value ?? "")])),
    query: Object.fromEntries(url.searchParams.entries()),
    body,
  });
  const headers = response.headers ?? {};
  res.writeHead(response.status, headers);
  res.end(response.body == null ? "" : JSON.stringify(response.body));
}).listen(port, "127.0.0.1", () => {
  console.log(`TenderOps API http://127.0.0.1:${port}/api/v1/health`);
});
