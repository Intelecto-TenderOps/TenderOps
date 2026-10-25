import { writeFileSync } from "node:fs";
import { loadEnv } from "../config/env.js";
import { mapSecopII } from "../secop/mapper.js";
import { SocrataClient } from "../secop/socrata.js";
import { SecopSearchService } from "../secop/search.js";

async function main() {
  const client = new SocrataClient();
  const search = new SecopSearchService(client);
  const sample = await client.query<Record<string, unknown>>("p6dx-8zbt", "SECOP_II", { limit: 5, offset: 0 });
  const mapped = sample.rows.map((row) => mapSecopII(row));
  const exactId = mapped[0]?.externalProcessId;
  const exact = exactId ? await search.search({ q: exactId, pageSize: 1 }) : { items: [], warnings: ["Sin id"] };
  const page2 = await client.query<Record<string, unknown>>("p6dx-8zbt", "SECOP_II", { limit: 2, offset: 2 });
  const report = {
    fetched: mapped.length,
    ids: mapped.map((item) => item.externalProcessId),
    urls: mapped.map((item) => item.sourceUrl),
    statuses: mapped.map((item) => ({ id: item.externalProcessId, computed: item.computedStatus, reason: item.computedStatusReason })),
    exactMatch: exact.items[0]?.externalProcessId ?? null,
    paginationDistinct: page2.rows[0] && sample.rows[0] ? page2.rows[0].id_del_proceso !== sample.rows[0].id_del_proceso : false,
    lastModified: sample.lastModified,
    requestId: sample.requestId,
    tokenConfigured: Boolean(loadEnv().SOCRATA_APP_TOKEN),
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(new URL("../../../../docs/SECOP_TEST_RESULTS.json", import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
