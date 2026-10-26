import { useMemo, useState } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import { DataWorkspace } from "@/components/data/DataWorkspace";
import { DataTable, RichDate, RichPrimary, RichStage, type RichColumn } from "@/components/data/DataTable";
import { ContextDetailPanel } from "@/components/data/ContextDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SelectedItemsBar, SelectionChips } from "@/components/selection";
import { KpiCard } from "@/components/viz/KpiCard";
import { StatusBadge } from "@/components/viz/StatusBadge";
import type { Professional } from "@/contracts/professional";
import { useFilterChips } from "@/hooks/useFilterChips";
import { prettyLabel } from "@/lib/format";
import { professionalsService } from "@/services/professionalsService";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";
import { useUiStore } from "@/store/ui-store";
import { matchesProfessionalFilters, professionalIndicators } from "./engine";

export function PerfilesPage() {
  const companyId = useUiStore((state) => state.companyId);
  const workspace = useDemoStore((state) => state.workspace);
  const { chips, setChips } = useFilterChips();
  const openFlow = useDrawerStore((state) => state.openFlow);
  const hideDetail = useDrawerStore((state) => state.hiddenDetail);
  const [search, setSearch] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const records = useMemo(
    () =>
      workspace.professionals
        .filter((item) => item.companyId === companyId)
        .map((professional) => ({
          professional,
          education: workspace.professionalEducation.filter((item) => item.professionalId === professional.id),
          experiences: workspace.professionalExperiences.filter((item) => item.professionalId === professional.id),
          certifications: workspace.professionalCertifications.filter((item) => item.professionalId === professional.id),
          licenses: workspace.professionalLicenses.filter((item) => item.professionalId === professional.id),
          skills: workspace.professionalSkills.filter((item) => item.professionalId === professional.id),
          attachments: workspace.professionalAttachments.filter((item) => item.professionalId === professional.id),
          consent: workspace.professionalConsents.find((item) => item.professionalId === professional.id) ?? null,
        })),
    [workspace, companyId],
  );
  const filters = useMemo(() => {
    const next: Record<string, string> = {};
    chips.forEach((chip) => {
      next[chip.field] = chip.value;
    });
    return {
      search,
      profession: next.profession,
      profile: next.profile,
      specialty: next.specialty,
      certification: next.certification,
      technology: next.technology,
      city: next.city,
      availability: next.availability as Professional["availability"] | undefined,
      minYears: next.minYears ? Number(next.minYears) : undefined,
    };
  }, [chips, search]);
  const rows = records.map((item) => item.professional).filter((item) => matchesProfessionalFilters(item, records, filters));
  const [selectedId, setSelectedId] = useState(rows[0]?.id);
  const selected = records.find((item) => item.professional.id === selectedId) ?? records[0];
  const selectedRows = rows.filter((item) => rowSelection[item.id]);
  const indicators = professionalIndicators(records, workspace.staffAssignments.filter((item) => item.companyId === companyId));
  const columns = useMemo<RichColumn<Professional>[]>(
    () => [
      {
        id: "nombre",
        header: "Profesional",
        grow: true,
        sortValue: (row) => row.fullName,
        cell: (row) => <RichPrimary kicker={row.profession} title={row.fullName} detail={`${row.primaryProfile} · ${row.specialty}`} />,
      },
      { id: "experiencia", header: "Años", sortValue: (row) => row.yearsGeneral, cell: (row) => <span className="tabular-nums">{row.yearsGeneral}</span> },
      {
        id: "certificaciones",
        header: "Certificaciones",
        sortValue: (row) => workspace.professionalCertifications.filter((item) => item.professionalId === row.id).length,
        cell: (row) => {
          const certs = workspace.professionalCertifications.filter((item) => item.professionalId === row.id);
          return certs.length ? certs.slice(0, 2).map((item) => item.name).join(" · ") : "—";
        },
      },
      { id: "disponibilidad", header: "Disponibilidad", sortValue: (row) => row.availability, cell: (row) => <RichStage label={row.availability} /> },
      { id: "verificacion", header: "Verificación", sortValue: (row) => row.verification, cell: (row) => <StatusBadge value={row.verification} /> },
      { id: "actualizacion", header: "Actualización", sortValue: (row) => row.updatedAt, cell: (row) => <RichDate value={row.updatedAt} /> },
    ],
    [workspace.professionalCertifications],
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Total" value={indicators.total} />
        <KpiCard label="Activos" value={indicators.active} tone="good" />
        <KpiCard label="Disponibles" value={indicators.available} />
        <KpiCard label="Incompletos" value={indicators.incomplete} tone={indicators.incomplete ? "warn" : "default"} />
        <KpiCard label="Cert. por vencer" value={indicators.expiringCertifications} tone={indicators.expiringCertifications ? "warn" : "default"} />
        <KpiCard label="Propuestos" value={indicators.proposed} />
        <KpiCard label="Docs pendientes" value={indicators.pendingDocuments} tone={indicators.pendingDocuments ? "warn" : "default"} />
      </div>
      <DataWorkspace
        eyebrow="Talento"
        title="Banco de perfiles"
        chips={chips}
        onRemoveChip={(id) => setChips(chips.filter((chip) => chip.id !== id))}
        onClearChips={() => setChips([])}
        toolbar={
          <>
            <Input aria-label="Buscar profesionales" placeholder="Nombre, profesión, tecnología o certificación" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button
              id="open-professional-filters"
              onClick={() =>
                openFlow(
                  {
                    type: "filters-generic",
                    title: "Filtros del banco",
                    size: "compact",
                    payload: {
                      active: chips,
                      onApply: setChips,
                      fields: [
                        { field: "profession", label: "Profesión", options: [...new Set(records.map((item) => item.professional.profession))] },
                        { field: "profile", label: "Perfil", options: [...new Set(records.map((item) => item.professional.primaryProfile))] },
                        { field: "availability", label: "Disponibilidad", options: ["disponible", "parcial", "no_disponible", "por_confirmar", "asignado"] },
                        { field: "certification", label: "Certificación", options: ["Azure", "Scrum", "PMP", "ISO"] },
                        { field: "minYears", label: "Experiencia", options: ["5"] },
                      ],
                    },
                  },
                  "open-professional-filters",
                )
              }
            >
              Filtros
            </Button>
            <Button onClick={() => openFlow({ type: "import-professionals", title: "Importar perfiles desde Excel", size: "wide", steps: ["Archivo", "Estructura", "Mapeo", "Validación", "Revisión", "Confirmación", "Resultado"] })}>
              Importar Excel
            </Button>
            <Button variant="primary" onClick={() => openFlow({ type: "create-professional", title: "Crear profesional", size: "standard", steps: ["Identidad", "Perfil", "Autorización"] })}>
              Crear profesional
            </Button>
          </>
        }
        selectionBar={
          <SelectedItemsBar
            noun="profesionales"
            items={selectedRows.map((item) => ({ id: item.id, label: item.fullName }))}
            onRemove={(id) => setRowSelection((current) => ({ ...current, [id]: false }))}
            onClear={() => setRowSelection({})}
            actions={[
              {
                label: "Asociar a licitación",
                onClick: () => openFlow({ type: "select-professional", title: "Asociar a licitación", size: "wide", payload: { professionalIds: selectedRows.map((item) => item.id) } }),
              },
              {
                label: "Exportar autorizados",
                onClick: () => {
                  const blob = new Blob([JSON.stringify(selectedRows.map(({ fullName, profession, primaryProfile, city, availability }) => ({ fullName, profession, primaryProfile, city, availability })), null, 2)], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement("a");
                  anchor.href = url;
                  anchor.download = "banco-perfiles-autorizado.json";
                  anchor.click();
                  URL.revokeObjectURL(url);
                },
              },
            ]}
          />
        }
        list={
          <DataTable
            data={rows}
            columns={columns}
            selectedId={selectedId}
            enableSelection
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            onRowClick={(row) => setSelectedId(row.id)}
          />
        }
        detail={
          hideDetail || !selected ? undefined : (
            <ContextDetailPanel
              title={selected.professional.fullName}
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openFlow({ type: "create-professional", title: "Editar profesional", recordId: selected.professional.id, payload: { professionalId: selected.professional.id } })}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() =>
                      openFlow({
                        type: "resume-builder",
                        title: "Generar hoja de vida",
                        size: "extraWide",
                        steps: ["Identificación", "Datos", "Estudios", "Experiencias", "Certificaciones", "Acreditaciones", "Vista previa", "Generación"],
                        payload: { professionalId: selected.professional.id },
                      })
                    }
                  >
                    Generar HV
                  </Button>
                </div>
              }
            >
              <dl className="grid gap-2 text-sm">
                <div><dt className="text-muted">Identificación</dt><dd>{selected.professional.documentType} {selected.professional.documentNumberMasked}</dd></div>
                <div><dt className="text-muted">Perfil principal</dt><dd>{selected.professional.primaryProfile}</dd></div>
                <div><dt className="text-muted">Ciudad</dt><dd>{selected.professional.city}</dd></div>
                <div><dt className="text-muted">Disponibilidad</dt><dd>{prettyLabel(selected.professional.availability)}</dd></div>
                <div><dt className="text-muted">Autorización</dt><dd>{selected.consent?.present ? "Puede presentarse" : "Sin autorización de presentación"}</dd></div>
              </dl>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Estudios</h3>
              <SelectionChips items={selected.education.map((item) => ({ id: item.id, label: item.title }))} />
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Experiencias</h3>
              <ul className="mt-2 grid gap-2">
                {selected.experiences.map((item) => (
                  <li key={item.id} className="rounded-2xl bg-white/70 px-3 py-2">
                    <p className="text-sm font-medium">{item.role} · {item.project}</p>
                    <p className="text-xs text-muted">{item.client} · {item.startedOn} – {item.endedOn ?? "actual"} · {item.supportRef ? "con soporte" : "sin soporte"}</p>
                  </li>
                ))}
              </ul>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Certificaciones</h3>
              <SelectionChips items={selected.certifications.map((item) => ({ id: item.id, label: `${item.name}${item.validity === "vencida" ? " · vencida" : ""}` }))} />
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => openFlow({ type: "select-professional", title: "Asociar a licitación", payload: { professionalIds: [selected.professional.id] } })}>
                  Asociar a licitación
                </Button>
                <Button size="sm" onClick={() => void professionalsService.saveConsent(selected.professional.id, { store: true, consult: true, present: true })}>
                  Registrar autorización
                </Button>
              </div>
            </ContextDetailPanel>
          )
        }
      />
    </section>
  );
}
