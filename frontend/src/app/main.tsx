import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { usesRemoteApi } from "@/lib/api";
import { hydrateWorkspace } from "@/services/workspace";
import "@/styles/tokens.css";

if (usesRemoteApi()) {
  void hydrateWorkspace().catch(() => undefined);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 8_000, retry: 0 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
