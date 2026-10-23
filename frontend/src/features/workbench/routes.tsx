import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useWorkbench } from "./hooks";
import {
  Alerts,
  Comparison,
  Dashboard,
  Opportunities,
  SavedSearches,
  Sources,
} from "./discovery";
import { Dossier } from "./dossier";
import { Tasks } from "./preparation";
import { CompanyDocuments } from "./company-documents";
import { Analytics, Audit, Dynamics, Operations, Settings } from "./governance";
import { Busy, Empty, ServiceState } from "./ui";
import type { WorkbenchContext } from "./types";

export function WorkbenchRoutes({
  context,
}: {
  context: WorkbenchContext;
}): ReactElement {
  const query = useWorkbench(context);
  if (query.isPending) return <Busy />;
  if (query.isError)
    return (
      <ServiceState
        context={context}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const props = { context, data: query.data };
  return (
    <Routes>
      <Route
        index
        element={<Navigate to={context.base + "/overview"} replace />}
      />
      <Route path="overview" element={<Dashboard {...props} />} />
      <Route path="opportunities" element={<Opportunities {...props} />} />
      <Route path="opportunities/:id/*" element={<Dossier {...props} />} />
      <Route path="compare" element={<Comparison {...props} />} />
      <Route path="saved-searches" element={<SavedSearches {...props} />} />
      <Route path="alerts" element={<Alerts {...props} />} />
      <Route path="sources" element={<Sources {...props} />} />
      <Route path="tasks" element={<Tasks {...props} />} />
      <Route
        path="company-documents"
        element={<CompanyDocuments {...props} />}
      />
      <Route path="dynamics" element={<Dynamics {...props} />} />
      <Route path="analytics" element={<Analytics {...props} />} />
      <Route path="operations" element={<Operations {...props} />} />
      <Route path="settings" element={<Settings {...props} />} />
      <Route path="audit" element={<Audit {...props} />} />
      <Route
        path="*"
        element={
          <Empty title="No encontramos esta página">
            Usa la navegación para volver al espacio de trabajo.
          </Empty>
        }
      />
    </Routes>
  );
}
