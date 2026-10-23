import { lazy, Suspense } from "react";
import type { ReactElement } from "react";
import { Busy } from "./ui";
import type { WorkbenchContext } from "./types";

export type { WorkbenchContext, ViewRole } from "./types";
export { demoRoles, roleLabels } from "./fixtures";
export { demoPermissions, profileTransport } from "./profile-demo";
export { demoCompanyIds } from "./repository";
const DeferredRoutes = lazy(() =>
  import("./routes").then((module) => ({ default: module.WorkbenchRoutes })),
);
const DeferredAudit = lazy(() =>
  import("./governance").then((module) => ({ default: module.LiveAudit })),
);
export function WorkbenchRoutes({
  context,
}: {
  context: WorkbenchContext;
}): ReactElement {
  return (
    <Suspense fallback={<Busy />}>
      <DeferredRoutes context={context} />
    </Suspense>
  );
}
export function LiveAudit({
  context,
}: {
  context: WorkbenchContext;
}): ReactElement {
  return (
    <Suspense fallback={<Busy />}>
      <DeferredAudit context={context} />
    </Suspense>
  );
}
