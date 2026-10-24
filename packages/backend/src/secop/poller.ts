import { loadEnv } from "../config/env.js";
import { catalogStatus } from "./catalog.js";
import { syncRecent } from "./sync.js";

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startSecopPoller() {
  const env = loadEnv();
  if (env.SECOP_SYNC_ENABLED !== "true") return;
  if (timer) return;
  void tick("startup");
  timer = setInterval(() => {
    void tick("interval");
  }, env.SECOP_POLL_INTERVAL_MS);
}

export async function tick(reason: string) {
  if (running) return { skipped: true as const, reason: "already-running" };
  running = true;
  try {
    const ii = await syncRecent("SECOP_II");
    const i = await syncRecent("SECOP_I");
    console.info(
      `SECOP sync ${reason}: II ${ii.fetched} filas (${ii.inserted}+${ii.updated}) · I ${i.fetched} filas (${i.inserted}+${i.updated})`,
    );
    return { skipped: false as const, reason, secopII: ii, secopI: i };
  } finally {
    running = false;
  }
}

export function scheduleRefreshIfStale() {
  const env = loadEnv();
  if (env.SECOP_SYNC_ENABLED !== "true") return;
  const last = Date.parse(catalogStatus().lastAttemptAt ?? "") || 0;
  if (Number.isFinite(last) && Date.now() - last < env.SECOP_POLL_INTERVAL_MS) return;
  void tick("request");
}

export function stopSecopPoller() {
  if (timer) clearInterval(timer);
  timer = null;
}
