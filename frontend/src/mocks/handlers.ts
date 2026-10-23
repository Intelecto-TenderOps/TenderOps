import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/v1/health/demo", () =>
    HttpResponse.json({
      source: "demo",
      simulated: true,
      message: "Adaptador MSW listo para Azure Functions",
    }),
  ),
];
