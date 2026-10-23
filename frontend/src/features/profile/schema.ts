import { z } from "zod";

export interface Field {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "checkbox" | "textarea" | "list";
  options?: string[];
}
export interface Definition {
  kind: string;
  title: string;
  description: string;
  permission: string;
  schema: z.ZodType<Record<string, unknown>>;
  fields: Field[];
}
const text = z.string().trim().min(1, "Completa este campo.");
const country = z
  .string()
  .regex(/^[A-Z]{2}$/, "Usa dos letras mayúsculas, por ejemplo CO.");
const currency = z
  .string()
  .regex(/^[A-Z]{3}$/, "Usa tres letras, por ejemplo COP.");
const money = z
  .string()
  .regex(
    /^\d{1,24}(\.\d{1,4})?$/,
    "Escribe un valor positivo sin separadores de miles y hasta cuatro decimales.",
  );
const date = z.iso
  .date("Escribe una fecha válida.")
  .refine(
    (value: string) => value >= "1900-01-01",
    "La fecha debe ser posterior a 1900.",
  );
const list = z.string().transform((value: string) =>
  value
    .split(",")
    .map((item: string) => item.trim())
    .filter(Boolean),
);
const membershipList = list.pipe(
  z
    .array(
      z.enum([
        "Administrator",
        "Analyst",
        "Commercial",
        "Legal",
        "Financial",
        "Approver",
        "Auditor",
      ]),
    )
    .min(1),
);
const field = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  options?: string[],
): Field => ({ key, label, type, options });

export const definitions: Definition[] = [
  {
    kind: "company",
    title: "Empresa",
    description: "Datos legales que identifican el espacio de trabajo.",
    permission: "company.write",
    schema: z.object({
      legalName: text.max(200),
      countryCode: country,
      taxId: text.max(50),
    }),
    fields: [
      field("legalName", "Razón social"),
      field("countryCode", "País (ISO)"),
      field("taxId", "Identificación tributaria"),
    ],
  },
  {
    kind: "capability",
    title: "Capacidades",
    description: "Qué puede ofrecer la empresa y hasta cuándo está vigente.",
    permission: "profile.write",
    schema: z.object({
      name: text.max(150),
      description: text.max(2000),
      countryCode: country,
      validUntil: date,
      active: z.boolean(),
    }),
    fields: [
      field("name", "Nombre de la capacidad"),
      field("description", "Descripción", "textarea"),
      field("countryCode", "País (ISO)"),
      field("validUntil", "Vigente hasta", "date"),
      field("active", "Capacidad activa", "checkbox"),
    ],
  },
  {
    kind: "experience",
    title: "Experiencia",
    description:
      "Contratos ejecutados y su alcance. Las cifras conservan su moneda original.",
    permission: "profile.write",
    schema: z
      .object({
        client: text.max(200),
        subject: text.max(2000),
        start: date,
        end: date,
        amount: money,
        currency,
        status: z.literal("PendingEvidence").default("PendingEvidence"),
      })
      .refine((data) => data.start <= data.end, {
        message: "La fecha final debe ser posterior al inicio.",
        path: ["end"],
      }),
    fields: [
      field("client", "Cliente"),
      field("subject", "Objeto contractual", "textarea"),
      field("start", "Inicio", "date"),
      field("end", "Finalización", "date"),
      field("amount", "Valor original"),
      field("currency", "Moneda (ISO)"),
    ],
  },
  {
    kind: "evidence",
    title: "Evidencias",
    description:
      "Referencias documentales de la experiencia. La carga segura se habilitará en la siguiente etapa.",
    permission: "profile.write",
    schema: z.object({
      experienceId: z.uuid("Selecciona un contrato válido."),
      fileName: text.max(200),
      sha256: z
        .string()
        .regex(
          /^[a-fA-F0-9]{64}$/,
          "El hash SHA-256 debe contener 64 caracteres hexadecimales.",
        ),
      locator: text.max(500),
    }),
    fields: [
      field("experienceId", "ID de experiencia"),
      field("fileName", "Nombre del archivo"),
      field("sha256", "SHA-256 del original"),
      field("locator", "Ubicación dentro del documento"),
    ],
  },
  {
    kind: "financial",
    title: "Finanzas",
    description:
      "Cada corte conserva periodo, fuente y aprobación. Un borrador no alimenta evaluaciones.",
    permission: "financial.write",
    schema: z
      .object({
        periodStart: date,
        periodEnd: date,
        validUntil: date,
        currency,
        assets: money,
        liabilities: money,
        currentAssets: money,
        currentLiabilities: money,
        revenue: money,
        source: text.max(500),
      })
      .refine(
        (data) =>
          data.periodStart <= data.periodEnd &&
          data.periodEnd <= data.validUntil,
        {
          message: "Revisa el orden de las fechas del corte y su vigencia.",
          path: ["validUntil"],
        },
      ),
    fields: [
      field("periodStart", "Inicio del periodo", "date"),
      field("periodEnd", "Cierre del periodo", "date"),
      field("validUntil", "Vigente hasta", "date"),
      field("currency", "Moneda (ISO)"),
      field("assets", "Activos totales"),
      field("liabilities", "Pasivos totales"),
      field("currentAssets", "Activos corrientes"),
      field("currentLiabilities", "Pasivos corrientes"),
      field("revenue", "Ingresos"),
      field("source", "Fuente de las cifras"),
    ],
  },
  {
    kind: "coverage",
    title: "Cobertura",
    description: "Territorios incluidos o excluidos y fecha de aplicación.",
    permission: "profile.write",
    schema: z.object({
      countryCode: country,
      subdivision: text.max(100),
      excluded: z.boolean(),
      effectiveFrom: date,
    }),
    fields: [
      field("countryCode", "País (ISO)"),
      field("subdivision", "Departamento o subdivisión"),
      field("excluded", "Excluir este territorio", "checkbox"),
      field("effectiveFrom", "Aplica desde", "date"),
    ],
  },
  {
    kind: "rule",
    title: "Reglas",
    description:
      "Umbrales y exclusiones para futuras evaluaciones. Cada publicación conserva su versión.",
    permission: "rules.write",
    schema: z
      .object({
        name: text.max(150),
        priority: z.coerce.number().int().min(0).max(1000),
        effectiveFrom: date,
        validUntil: date,
        field: z.enum([
          "country",
          "contractValue",
          "currentRatio",
          "experienceValue",
        ]),
        operator: z.enum(["eq", "gte", "lte", "exclude"]),
        value: text.max(100),
        blocking: z.boolean(),
      })
      .refine((data) => data.effectiveFrom <= data.validUntil, {
        message: "Revisa el rango de vigencia.",
        path: ["validUntil"],
      }),
    fields: [
      field("name", "Nombre de la regla"),
      field("priority", "Prioridad", "number"),
      field("effectiveFrom", "Aplica desde", "date"),
      field("validUntil", "Vigente hasta", "date"),
      field("field", "Dato evaluado", "text", [
        "country",
        "contractValue",
        "currentRatio",
        "experienceValue",
      ]),
      field("operator", "Condición", "text", ["eq", "gte", "lte", "exclude"]),
      field("value", "Valor del umbral"),
      field("blocking", "Regla bloqueante", "checkbox"),
    ],
  },
  {
    kind: "membership",
    title: "Usuarios",
    description:
      "Accesos por empresa. La baja conserva el historial y revoca las nuevas operaciones.",
    permission: "members.write",
    schema: z.object({
      tenantId: z.uuid(),
      objectId: z.uuid(),
      roles: membershipList,
      active: z.boolean(),
    }),
    fields: [
      field("tenantId", "Tenant ID de Entra"),
      field("objectId", "Object ID del usuario"),
      field("roles", "Roles, separados por coma", "list"),
      field("active", "Acceso activo", "checkbox"),
    ],
  },
  {
    kind: "team",
    title: "Equipos",
    description: "Agrupa integrantes que ya tienen acceso a esta empresa.",
    permission: "members.write",
    schema: z.object({
      name: text.max(150),
      memberIds: list.pipe(z.array(z.uuid()).max(100)),
    }),
    fields: [
      field("name", "Nombre del equipo"),
      field("memberIds", "IDs de membresía, separados por coma", "list"),
    ],
  },
  {
    kind: "sourcepolicy",
    title: "Políticas de fuente",
    description:
      "Base autorizada y versión de términos. Registrar una política aún no conecta una fuente.",
    permission: "sourcepolicy.write",
    schema: z.object({
      source: text.max(150),
      termsVersion: text.max(100),
      legalBasis: text.max(2000),
      reviewedOn: date,
      authorized: z.boolean(),
    }),
    fields: [
      field("source", "Nombre de la fuente"),
      field("termsVersion", "Versión de términos"),
      field("legalBasis", "Base autorizada", "textarea"),
      field("reviewedOn", "Fecha de revisión", "date"),
      field("authorized", "Uso autorizado", "checkbox"),
    ],
  },
];
