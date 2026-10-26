import { lazy, Suspense, type ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/layouts/AppShell";

const PanoramaPage = lazy(() =>
  import("@/features/panorama/PanoramaPage").then((module) => ({ default: module.PanoramaPage })),
);
const ExplorarPage = lazy(() =>
  import("@/features/explorar/ExplorarPage").then((module) => ({ default: module.ExplorarPage })),
);
const EmpresaPage = lazy(() =>
  import("@/features/empresa/EmpresaPage").then((module) => ({ default: module.EmpresaPage })),
);
const CalificacionPage = lazy(() =>
  import("@/features/calificacion/CalificacionPage").then((module) => ({ default: module.CalificacionPage })),
);
const ProcesosPage = lazy(() =>
  import("@/features/procesos/ProcesosPage").then((module) => ({ default: module.ProcesosPage })),
);
const ExpedienteLayout = lazy(() =>
  import("@/features/procesos/ExpedientePage").then((module) => ({ default: module.ExpedienteLayout })),
);
const ExpedienteResumen = lazy(() =>
  import("@/features/procesos/ExpedientePage").then((module) => ({ default: module.ExpedienteResumen })),
);
const MatrizPage = lazy(() =>
  import("@/features/procesos/MatrizPage").then((module) => ({ default: module.MatrizPage })),
);
const DecisionPage = lazy(() =>
  import("@/features/procesos/DecisionPage").then((module) => ({ default: module.DecisionPage })),
);
const DocumentosProcesoPage = lazy(() =>
  import("@/features/procesos/DocumentosProcesoPage").then((module) => ({ default: module.DocumentosProcesoPage })),
);
const RequisitosPage = lazy(() =>
  import("@/features/procesos/DocumentosProcesoPage").then((module) => ({ default: module.RequisitosPage })),
);
const ActividadPage = lazy(() =>
  import("@/features/procesos/DocumentosProcesoPage").then((module) => ({ default: module.ActividadPage })),
);
const PreparacionProcesoPage = lazy(() =>
  import("@/features/procesos/PreparacionProcesoPage").then((module) => ({ default: module.PreparacionProcesoPage })),
);
const AlertasPage = lazy(() =>
  import("@/features/alertas/AlertasPage").then((module) => ({ default: module.AlertasPage })),
);
const TareasPage = lazy(() =>
  import("@/features/tareas/TareasPage").then((module) => ({ default: module.TareasPage })),
);
const OportunidadesPage = lazy(() =>
  import("@/features/oportunidades/OportunidadesPage").then((module) => ({ default: module.OportunidadesPage })),
);
const AnaliticaPage = lazy(() =>
  import("@/features/analitica/AnaliticaPage").then((module) => ({ default: module.AnaliticaPage })),
);
const AdministracionPage = lazy(() =>
  import("@/features/administracion/AdministracionPage").then((module) => ({ default: module.AdministracionPage })),
);
const CopilotPage = lazy(() =>
  import("@/features/copilot/CopilotPage").then((module) => ({ default: module.CopilotPage })),
);
const DocumentosPage = lazy(() =>
  import("@/features/documentos/DocumentosPage").then((module) => ({ default: module.DocumentosPage })),
);
const PreparacionPage = lazy(() =>
  import("@/features/preparacion/PreparacionPage").then((module) => ({ default: module.PreparacionPage })),
);
const PerfilesPage = lazy(() =>
  import("@/features/perfiles/PerfilesPage").then((module) => ({ default: module.PerfilesPage })),
);
const PersonalPropuestoPage = lazy(() =>
  import("@/features/procesos/PersonalPropuestoPage").then((module) => ({ default: module.PersonalPropuestoPage })),
);

function Fallback(): ReactElement {
  return <p className="p-6 text-sm text-muted">Cargando el espacio de trabajo…</p>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/panorama" replace />} />
          <Route path="/panorama" element={<PanoramaPage />} />
          <Route path="/explorar" element={<ExplorarPage />} />
          <Route path="/alertas" element={<AlertasPage />} />
          <Route path="/calificacion" element={<CalificacionPage />} />
          <Route path="/procesos" element={<ProcesosPage />} />
          <Route path="/procesos/:id" element={<ExpedienteLayout />}>
            <Route index element={<ExpedienteResumen />} />
            <Route path="analisis" element={<ExpedienteResumen />} />
            <Route path="documentos" element={<DocumentosProcesoPage />} />
            <Route path="requisitos" element={<RequisitosPage />} />
            <Route path="matriz" element={<MatrizPage />} />
            <Route path="decision" element={<DecisionPage />} />
            <Route path="preparacion" element={<PreparacionProcesoPage />} />
            <Route path="personal" element={<PersonalPropuestoPage />} />
            <Route path="actividad" element={<ActividadPage />} />
            <Route path="historial" element={<ActividadPage />} />
          </Route>
          <Route path="/documentos" element={<DocumentosPage />} />
          <Route path="/perfiles" element={<PerfilesPage />} />
          <Route path="/preparacion" element={<PreparacionPage />} />
          <Route path="/oportunidades" element={<OportunidadesPage />} />
          <Route path="/tareas" element={<TareasPage />} />
          <Route path="/analitica" element={<AnaliticaPage />} />
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/administracion/*" element={<AdministracionPage />} />
          <Route path="/empresa/*" element={<EmpresaPage />} />
          <Route path="/demo/*" element={<Navigate to="/panorama" replace />} />
          <Route path="*" element={<Navigate to="/panorama" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
