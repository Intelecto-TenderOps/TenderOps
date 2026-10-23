import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
            },
            { name: "validation", test: /node_modules[\\/]zod[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": { target: "https://localhost:7043", secure: false },
      "/auth": { target: "https://localhost:7043", secure: false },
    },
  },
  test: {
    pool: "threads",
    environment: "jsdom",
    setupFiles: "./src/test-setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
