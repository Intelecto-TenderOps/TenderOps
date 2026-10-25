import { describe, expect, it } from "vitest";
import { buildPanoramaPulse, dateKey, daysFromToday, initials } from "@/features/panorama/panoramaPulse";
import { createSeed } from "@/mocks/seed";

describe("panoramaPulse", () => {
  it("compone actores, tareas vencidas y procesos vivos", () => {
    const workspace = createSeed();
    const pulse = buildPanoramaPulse(
      {
        tenders: workspace.tenders,
        tasks: workspace.tasks,
        memberships: workspace.memberships,
        alerts: workspace.alerts,
        opportunities: workspace.opportunities,
      },
      "2026-10-25",
    );

    expect(pulse.liveTenders.length).toBeGreaterThan(0);
    expect(pulse.overdueTasks.some((task) => task.title.includes("matriz financiera"))).toBe(true);
    expect(pulse.actors[0]?.openTasks).toBeGreaterThan(0);
    expect(pulse.closingSoon[0]?.secopId).toMatch(/^SECOP-/);
    expect(pulse.loadedActors.length).toBeGreaterThan(0);
  });

  it("calcula días y iniciales en zona Bogotá", () => {
    expect(dateKey("2026-11-04T17:00:00-05:00")).toBe("2026-11-04");
    expect(daysFromToday("2026-10-27", "2026-10-25")).toBe(2);
    expect(daysFromToday("2026-10-23", "2026-10-25")).toBe(-2);
    expect(initials("Laura Méndez")).toBe("LM");
  });
});
