import { handleApiRequest } from "../../packages/backend/src/http/handler.js";

export const config = { runtime: "nodejs" };

export default async function handler(request: Request) {
  const url = new URL(request.url);
  let body: unknown;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
  }
  const response = await handleApiRequest({
    method: request.method,
    path: url.pathname,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    query: Object.fromEntries(url.searchParams.entries()),
    body,
  });
  return new Response(response.body == null ? null : JSON.stringify(response.body), {
    status: response.status,
    headers: response.headers,
  });
}
