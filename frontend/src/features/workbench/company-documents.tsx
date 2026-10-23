import { useState } from "react";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { FileCheck2 } from "lucide-react";
import { z } from "zod";
import { useCommand } from "./hooks";
import { can, referenceDate } from "./repository";
import {
  Badge,
  DataTable,
  day,
  Feedback,
  FormDialog,
  Notice,
  PageHeading,
  required,
  Stat,
} from "./ui";
import type { FormSpec } from "./ui";
import type { ScreenProps } from "./discovery";

export function CompanyDocuments({ context, data }: ScreenProps): ReactElement {
  const [type, setType] = useState<string>("Todos");
  const [dialog, setDialog] = useState<FormSpec | null>(null);
  const mutation = useCommand(context);
  const allowed = data.companyDocuments.filter(
    (doc) =>
      doc.type !== "Financiero" ||
      context.permissions.includes("financial.read"),
  );
  const rows = allowed.filter((doc) => type === "Todos" || doc.type === type);
  const days = (value: string): number =>
    Math.ceil(
      (new Date(value + "T00:00:00Z").getTime() -
        new Date(referenceDate + "T00:00:00Z").getTime()) /
        86400000,
    );
  return (
    <section>
      <PageHeading
        eyebrow="PERFIL Y EVIDENCIA"
        title="Documentos empresariales vigentes"
        description="Vigencia, responsable y versión de los soportes que reutiliza tu equipo."
      >
        <Link
          className="secondary-link"
          to={context.base + "/profile/evidence"}
        >
          <FileCheck2 size={17} aria-hidden="true" /> Referencias de experiencia
        </Link>
      </PageHeading>
      <div className="stats-row">
        <Stat
          label="Soportes visibles"
          value={allowed.length}
          detail="Según los permisos de tu función"
        />
        <Stat
          label="Próximos a vencer"
          value={
            allowed.filter(
              (doc) =>
                days(doc.validUntil) >= 0 &&
                days(doc.validUntil) <= data.preferences.warningDays,
            ).length
          }
          detail={`Aviso ${data.preferences.warningDays} días antes`}
        />
        <Stat
          label="Vencidos"
          value={allowed.filter((doc) => days(doc.validUntil) < 0).length}
          detail="No se proponen como soportes vigentes"
        />
        <Stat
          label="Conservación"
          value={data.preferences.legalHold ? "Hold activo" : "Sin hold"}
          detail="Retención sujeta a política aprobada"
        />
      </div>
      <Notice>
        Son metadatos sintéticos. Registrar una renovación no carga un original
        ni reemplaza la revisión de seguridad y contenido.
      </Notice>
      <div className="table-filters">
        <label>
          Tipo de soporte
          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            {["Todos", ...new Set(allowed.map((doc) => doc.type))].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <DataTable
        rows={rows}
        label="Vigencia documental empresarial"
        columns={[
          {
            key: "name",
            label: "Soporte / versión",
            render: (doc) => (
              <>
                <strong>{doc.name}</strong>
                <small className="cell-sub">
                  {doc.type} · v{doc.version}
                </small>
              </>
            ),
          },
          {
            key: "dates",
            label: "Emisión / vigencia",
            sort: (doc) => doc.validUntil,
            render: (doc) => (
              <>
                {day(doc.issuedOn)} → {day(doc.validUntil)}
                <small className="cell-sub">
                  {days(doc.validUntil) < 0
                    ? `Venció hace ${-days(doc.validUntil)} días`
                    : `${days(doc.validUntil)} días de vigencia`}
                </small>
              </>
            ),
          },
          {
            key: "status",
            label: "Estado",
            render: (doc) => (
              <Badge>
                {days(doc.validUntil) < 0
                  ? "Vencido"
                  : days(doc.validUntil) <= data.preferences.warningDays
                    ? "Próximo a vencer"
                    : doc.status}
              </Badge>
            ),
          },
          { key: "owner", label: "Responsable", render: (doc) => doc.owner },
          { key: "source", label: "Procedencia", render: (doc) => doc.source },
          {
            key: "action",
            label: "Acciones",
            render: (doc) =>
              can(context, "edit") ? (
                <button
                  onClick={() =>
                    setDialog({
                      title: "Registrar renovación documental",
                      description:
                        "Se conserva una nueva versión de los metadatos; el soporte queda pendiente de revisión.",
                      fields: [
                        {
                          name: "issuedOn",
                          label: "Fecha de emisión",
                          type: "date",
                        },
                        {
                          name: "validUntil",
                          label: "Vigente hasta",
                          type: "date",
                        },
                        {
                          name: "source",
                          label: "Fuente del soporte renovado",
                        },
                      ],
                      initial: { ...doc },
                      schema: z
                        .object({
                          issuedOn: z.iso.date(),
                          validUntil: z.iso.date(),
                          source: required,
                        })
                        .refine((value) => value.issuedOn <= value.validUntil, {
                          path: ["validUntil"],
                          message:
                            "La vigencia no puede terminar antes de la emisión.",
                        }),
                      onSave: (values) =>
                        mutation.mutateAsync({
                          type: "company-document.save",
                          id: doc.id,
                          values,
                        }),
                    })
                  }
                >
                  Registrar renovación
                </button>
              ) : (
                <span className="muted">Consulta</span>
              ),
          },
        ]}
      />
      <Feedback error={mutation.error} success={mutation.isSuccess} />
      {dialog && <FormDialog spec={dialog} onClose={() => setDialog(null)} />}
    </section>
  );
}
