import type {
  AlertItem,
  Approval,
  Assessment,
  AuditEvent,
  Capability,
  CommercialOpportunity,
  Company,
  CompanyDocument,
  CopilotMessage,
  CriterionWeight,
  Decision,
  DecisionComment,
  Escalation,
  Evidence,
  Experience,
  FinancialSnapshot,
  GeoCoverage,
  IntegrationStatus,
  Membership,
  ParticipationRule,
  ProcessDocument,
  Requirement,
  SavedSearch,
  SourceConfig,
  Tender,
  WorkTask,
} from "@/contracts";
import { departments, people, sectors } from "./catalogs";

const now = "2026-10-23T16:00:00-05:00";

export const companies: Company[] = [
  {
    id: "co-andina",
    legalName: "Andina Tecnología S.A.S.",
    tradeName: "Andina Tech",
    taxId: "900123456-1",
    countryCode: "CO",
    city: "Bogotá",
    department: "Bogotá D.C.",
    email: "licitaciones@andinatech.co",
    phone: "+57 601 555 0140",
    website: "https://andinatech.co",
    legalRep: "Valentina Herrera",
    status: "activa",
    createdAt: "2024-02-11T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Valentina Herrera",
  },
  {
    id: "co-oriente",
    legalName: "Oriente Soluciones S.A.S.",
    tradeName: "Oriente Soluciones",
    taxId: "901887221-4",
    countryCode: "CO",
    city: "Bucaramanga",
    department: "Santander",
    email: "contacto@orientesoluciones.co",
    phone: "+57 607 555 2201",
    website: "https://orientesoluciones.co",
    legalRep: "Daniel Rojas",
    status: "activa",
    createdAt: "2025-04-02T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Valentina Herrera",
  },
];

const titles = [
  "Modernización de la plataforma de atención ciudadana",
  "Servicios de ciberseguridad y gestión de vulnerabilidades",
  "Implementación de un sistema de gestión documental",
  "Soporte y operación de la infraestructura tecnológica",
  "Analítica de datos para la gestión territorial",
  "Licenciamiento y adopción de herramientas colaborativas",
  "Interventoría técnica de proyectos de transformación digital",
  "Desarrollo del portal de trámites y servicios",
  "Suministro de equipos para aulas de tecnología",
  "Migración y respaldo de servicios en la nube",
  "Formación en competencias digitales para servidores",
  "Renovación de redes y conectividad institucional",
];

const buyers = [
  "Instituto Distrital del Futuro",
  "Agencia Regional de Servicios Digitales",
  "Corporación de Desarrollo Público",
  "Universidad Pública del Oriente",
  "Secretaría de Hacienda Distrital",
  "Empresa de Acueducto Regional",
];

const mods = [
  "Licitación pública",
  "Selección abreviada",
  "Concurso de méritos",
  "Mínima cuantía",
];

const statuses = ["abierto", "en_evaluacion", "abierto", "abierto", "cerrado", "adjudicado"] as const;
const risks = ["bajo", "medio", "alto", "medio", "bajo", "critico"] as const;
const recs = ["BID", "REVISION", "BID", "NO_BID", "REVISION", "BID"] as const;
const values = [1_450_000_000, 820_000_000, 2_350_000_000, 680_000_000, 190_000_000, 3_120_000_000];

export const tenders: Tender[] = titles.map((object, index) => ({
  id: `tnd-${String(index + 1).padStart(3, "0")}`,
  tenderOpsId: `TO-2026-${String(41 + index).padStart(3, "0")}`,
  secopId: `SECOP-LP-2026-${String(41 + index).padStart(3, "0")}`,
  sourceUrl: "https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index",
  entity: buyers[index % buyers.length],
  entityTaxId: `80000${1000 + index}`,
  object,
  modality: mods[index % mods.length],
  value: values[index % values.length],
  currency: "COP",
  department: departments[index % departments.length],
  municipality: ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga", "Soacha"][index % 6],
  publishedAt: `2026-10-${String(6 + (index % 12)).padStart(2, "0")}T09:00:00-05:00`,
  closesAt: `2026-11-${String(4 + (index % 20)).padStart(2, "0")}T17:00:00-05:00`,
  status: statuses[index % statuses.length],
  source: "SECOP II",
  compatibility: [88, 74, 91, 42, 67, 81][index % 6],
  risk: risks[index % risks.length],
  recommendation: recs[index % recs.length],
  owner: people[index % people.length].name,
  favorite: index % 5 === 0,
  watching: index % 3 === 0,
  dynamicsOpportunityId: index % 4 === 0 ? `D365-OPP-${200 + index}` : null,
  tags: [sectors[index % sectors.length], "Colombia"],
}));

export const assessments: Assessment[] = tenders.map((tender, index) => ({
  id: `as-${tender.id}`,
  tenderId: tender.id,
  score: tender.compatibility,
  risk: tender.risk,
  compatibility: tender.compatibility,
  experience: 70 + (index % 20),
  financial: 60 + (index % 30),
  legal: 75 + (index % 15),
  technical: 68 + (index % 25),
  scoring: 55 + (index % 35),
  confidence: 62 + (index % 28),
  blocked: tender.recommendation === "NO_BID",
  blockReason: tender.recommendation === "NO_BID" ? "Fuera de cobertura financiera aprobada" : null,
  recommendation: tender.recommendation,
  explanation:
    tender.recommendation === "BID"
      ? "La experiencia en plataformas ciudadanas y la capacidad financiera cubren los habilitantes."
      : tender.recommendation === "NO_BID"
        ? "El valor supera la capacidad de contratación vigente y hay un bloqueo de regla interna."
        : "Falta evidencia de experiencia específica. Se recomienda revisión humana.",
  version: 1,
  updatedAt: now,
}));

export const criterionWeights: CriterionWeight[] = [
  { id: "cw-fit", name: "Compatibilidad empresarial", weight: 25, enabled: true },
  { id: "cw-exp", name: "Experiencia", weight: 20, enabled: true },
  { id: "cw-fin", name: "Requisitos financieros", weight: 15, enabled: true },
  { id: "cw-leg", name: "Requisitos jurídicos", weight: 15, enabled: true },
  { id: "cw-tec", name: "Requisitos técnicos", weight: 15, enabled: true },
  { id: "cw-score", name: "Factores de puntuación", weight: 10, enabled: true },
];

const reqTemplates: Array<Omit<Requirement, "id" | "tenderId">> = [
  {
    code: "R-JUR-01",
    category: "jurídico",
    requirement: "RUT vigente y certificado de existencia",
    condition: "Documento no mayor a 30 días",
    source: "Pliego · 3.1",
    evidence: "RUT Andina 2026",
    compliance: "cumple",
    risk: "bajo",
    owner: "Laura Méndez",
    dueDate: "2026-10-30",
    status: "cerrado",
    copied: "cargado",
    notes: "Cargado a SharePoint de demostración",
    sharePointId: "sp-doc-rut",
  },
  {
    code: "R-FIN-01",
    category: "financiero",
    requirement: "Índice de liquidez mayor a 1.2",
    condition: "Estados financieros 2025",
    source: "Pliego · 4.2",
    evidence: "EEFF 2025",
    compliance: "cumple",
    risk: "bajo",
    owner: "Camilo Vargas",
    dueDate: "2026-10-28",
    status: "en_revision",
    copied: "listo_no_cargado",
    notes: "Listo en repositorio interno",
    sharePointId: null,
  },
  {
    code: "R-EXP-01",
    category: "experiencia",
    requirement: "Dos contratos similares en 5 años",
    condition: "Valor sumado ≥ 80% del presupuesto",
    source: "Pliego · 5.1",
    evidence: "Contrato IDF 2023",
    compliance: "pendiente",
    risk: "medio",
    owner: "Sofía Cárdenas",
    dueDate: "2026-11-02",
    status: "abierto",
    copied: "en_proceso",
    notes: "Falta certificación de cumplimiento",
    sharePointId: null,
  },
  {
    code: "R-TEC-01",
    category: "técnico",
    requirement: "Arquitectura en nube con residencialidad en Colombia",
    condition: "Declaración y diagrama",
    source: "Anexo técnico B",
    evidence: "",
    compliance: "indeterminado",
    risk: "alto",
    owner: "Daniel Rojas",
    dueDate: "2026-11-03",
    status: "abierto",
    copied: "pendiente",
    notes: "Pendiente de revisión de Copilot",
    sharePointId: null,
  },
  {
    code: "R-PUN-01",
    category: "puntaje",
    requirement: "Equipo de trabajo con posgrado",
    condition: "Mínimo 2 perfiles",
    source: "Criterios de puntuación",
    evidence: "Hojas de vida",
    compliance: "no_aplica",
    risk: "bajo",
    owner: "Mariana Torres",
    dueDate: "2026-11-04",
    status: "abierto",
    copied: "pendiente",
    notes: "",
    sharePointId: null,
  },
];

export const requirements: Requirement[] = tenders.flatMap((tender) =>
  reqTemplates.map((item, index) => ({
    ...item,
    id: `req-${tender.id}-${index + 1}`,
    tenderId: tender.id,
    owner: index === 2 && tender.id === "tnd-001" ? "Sofía Cárdenas" : item.owner,
  })),
);

export const documents: ProcessDocument[] = tenders.flatMap((tender, tIndex) =>
  ["Pliego de condiciones", "Anexo técnico", "Estudios previos", "Adenda 1"].map((name, index) => ({
    id: `doc-${tender.id}-${index + 1}`,
    tenderId: tender.id,
    name: `${name} · ${tender.secopId}`,
    category: ["pliego", "técnico", "estudio", "adenda"][index],
    version: index === 3 ? 2 : 1,
    status: index === 3 && tIndex % 4 === 1 ? "en_revision" : "disponible",
    reviewed: index < 2,
    sizeKb: 420 + index * 80,
    uploadedAt: tender.publishedAt,
    sharePointId: `sp-${tender.id}-${index + 1}`,
    excerpt: `Extracto simulado del ${name.toLowerCase()} para ${tender.object}.`,
  })),
);

export const evidences: Evidence[] = documents.slice(0, 8).map((doc, index) => ({
  id: `ev-${index + 1}`,
  documentId: doc.id,
  tenderId: doc.tenderId,
  label: `Cita ${index + 1}`,
  locator: `p.${3 + index} · párrafo ${index + 1}`,
  note: "Referencia extraída en modo demostración",
}));

export const decisions: Decision[] = tenders.slice(0, 6).map((tender, index) => ({
  id: `dec-${tender.id}`,
  tenderId: tender.id,
  recommended: tender.recommendation,
  decided: index < 2 ? tender.recommendation : null,
  decidedBy: index < 2 ? "Valentina Herrera" : null,
  decidedAt: index < 2 ? now : null,
  rationale: assessments[index]?.explanation ?? "",
  risks: tender.risk === "alto" || tender.risk === "critico" ? ["Plazo corto", "Requisito financiero exigente"] : ["Competencia alta"],
  blockers: tender.recommendation === "NO_BID" ? ["Regla de capacidad financiera"] : [],
  version: 1,
  simulated: index >= 2,
}));

export const approvals: Approval[] = tenders.slice(0, 4).flatMap((tender) =>
  (["jurídico", "técnico", "financiero", "comercial"] as const).map((discipline, index) => ({
    id: `apr-${tender.id}-${discipline}`,
    tenderId: tender.id,
    discipline,
    reviewer: people[index + 1].name,
    status: index === 0 ? "aprobado" : "pendiente",
    comment: index === 0 ? "Sin observaciones bloqueantes" : "",
    updatedAt: now,
  })),
);

export const comments: DecisionComment[] = [
  {
    id: "cmt-1",
    tenderId: "tnd-001",
    author: "Laura Méndez",
    body: "El RUT y la existencia están al día. Podemos avanzar a decisión.",
    createdAt: "2026-10-22T11:20:00-05:00",
  },
  {
    id: "cmt-2",
    tenderId: "tnd-001",
    author: "Camilo Vargas",
    body: "Recomiendo confirmar el indicador de endeudamiento antes del comité.",
    createdAt: "2026-10-22T15:10:00-05:00",
  },
];

export const escalations: Escalation[] = [
  {
    id: "esc-1",
    tenderId: "tnd-004",
    reason: "Conflicto entre recomendación simulada y regla financiera",
    owner: "Valentina Herrera",
    status: "abierta",
    createdAt: "2026-10-21T09:00:00-05:00",
  },
];

export const opportunities: CommercialOpportunity[] = tenders
  .filter((item) => item.dynamicsOpportunityId)
  .map((tender, index) => ({
    id: `opp-${tender.id}`,
    tenderId: tender.id,
    dynamicsOpportunityId: tender.dynamicsOpportunityId ?? `D365-OPP-${index}`,
    dynamicsAccountId: `D365-ACC-${100 + index}`,
    account: tender.entity,
    name: tender.object,
    value: tender.value,
    owner: tender.owner,
    stage: (["calificación", "propuesta", "negociación", "ganada"] as const)[index % 4],
    status: index === 3 ? "cerrada" : "abierta",
    outcome: index === 3 ? "ganada" : null,
    activities: 2 + index,
    tasks: 3,
    documents: 4,
    createdAt: tender.publishedAt,
  }));

export const tasks: WorkTask[] = [
  {
    id: "tsk-001",
    tenderId: "tnd-001",
    title: "Revisar habilitantes jurídicos",
    description: "Validar RUT, existencia y representantes.",
    owners: ["Laura Méndez"],
    status: "en_curso",
    priority: "alta",
    category: "jurídico",
    dueDate: "2026-10-24",
    evidence: null,
    dynamicsTaskId: "D365-TSK-881",
  },
  {
    id: "tsk-002",
    tenderId: "tnd-001",
    title: "Completar matriz financiera",
    description: "Cargar EEFF y calcular indicadores.",
    owners: ["Camilo Vargas"],
    status: "pendiente",
    priority: "urgente",
    category: "financiero",
    dueDate: "2026-10-23",
    evidence: null,
    dynamicsTaskId: null,
  },
  {
    id: "tsk-003",
    tenderId: "tnd-002",
    title: "Mapear controles de ciberseguridad",
    description: "Contrastar anexo técnico con capacidades.",
    owners: ["Daniel Rojas", "Sofía Cárdenas"],
    status: "en_curso",
    priority: "media",
    category: "técnico",
    dueDate: "2026-10-27",
    evidence: null,
    dynamicsTaskId: "D365-TSK-882",
  },
  {
    id: "tsk-004",
    tenderId: "tnd-003",
    title: "Armar paquete de experiencia",
    description: "Certificaciones de contratos similares.",
    owners: ["Mariana Torres"],
    status: "bloqueada",
    priority: "alta",
    category: "experiencia",
    dueDate: "2026-10-26",
    evidence: null,
    dynamicsTaskId: null,
  },
  {
    id: "tsk-005",
    tenderId: "tnd-005",
    title: "Preparar presentación comercial",
    description: "Resumen ejecutivo para Dynamics.",
    owners: ["Mariana Torres"],
    status: "hecha",
    priority: "baja",
    category: "comercial",
    dueDate: "2026-10-20",
    evidence: "Acta de revisión",
    dynamicsTaskId: "D365-TSK-870",
  },
  {
    id: "tsk-006",
    tenderId: null,
    title: "Actualizar cobertura geográfica",
    description: "Incluir municipios del Valle.",
    owners: ["Valentina Herrera"],
    status: "pendiente",
    priority: "media",
    category: "perfil",
    dueDate: "2026-10-29",
    evidence: null,
    dynamicsTaskId: null,
  },
];

export const alerts: AlertItem[] = [
  {
    id: "al-001",
    tenderId: "tnd-001",
    kind: "nueva",
    title: "Nueva coincidencia con búsqueda Plataformas ciudadanas",
    detail: "SECOP-LP-2026-041 encaja 88 % con Andina Tecnología.",
    urgency: "alta",
    read: false,
    silenced: false,
    createdAt: "2026-10-23T08:15:00-05:00",
  },
  {
    id: "al-002",
    tenderId: "tnd-002",
    kind: "adenda",
    title: "Adenda 1 publicada",
    detail: "Se amplió el plazo de observaciones 48 horas.",
    urgency: "media",
    read: false,
    silenced: false,
    createdAt: "2026-10-22T18:40:00-05:00",
  },
  {
    id: "al-003",
    tenderId: "tnd-004",
    kind: "riesgo",
    title: "Bloqueo financiero detectado",
    detail: "La regla de capacidad vigente descarta el proceso.",
    urgency: "alta",
    read: true,
    silenced: false,
    createdAt: "2026-10-21T10:00:00-05:00",
  },
  {
    id: "al-004",
    tenderId: "tnd-001",
    kind: "vencimiento",
    title: "Cierre en 12 días",
    detail: "El proceso cierra el 4 de noviembre de 2026.",
    urgency: "media",
    read: false,
    silenced: false,
    createdAt: "2026-10-23T07:00:00-05:00",
  },
  {
    id: "al-005",
    tenderId: "tnd-003",
    kind: "cambio",
    title: "Cambio en presupuesto oficial",
    detail: "El valor pasó de 2.1 a 2.35 billones de pesos.",
    urgency: "baja",
    read: true,
    silenced: true,
    createdAt: "2026-10-19T12:00:00-05:00",
  },
];

export const capabilities: Capability[] = [
  {
    id: "cap-001",
    companyId: "co-andina",
    name: "Plataformas de atención ciudadana",
    description: "Diseño e implementación de portales y tramites en línea.",
    sector: "Tecnología",
    country: "CO",
    validUntil: "2028-12-31",
    active: true,
    createdAt: "2025-01-12T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Valentina Herrera",
  },
  {
    id: "cap-002",
    companyId: "co-andina",
    name: "Ciberseguridad ofensiva y defensiva",
    description: "Análisis de vulnerabilidades y SOC.",
    sector: "Ciberseguridad",
    country: "CO",
    validUntil: "2027-06-30",
    active: true,
    createdAt: "2025-03-04T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Daniel Rojas",
  },
  {
    id: "cap-003",
    companyId: "co-oriente",
    name: "Interventoría digital",
    description: "Seguimiento técnico de proyectos de TI.",
    sector: "Infraestructura cloud",
    country: "CO",
    validUntil: "2027-01-15",
    active: true,
    createdAt: "2025-08-01T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Daniel Rojas",
  },
];

export const experiences: Experience[] = [
  {
    id: "exp-001",
    companyId: "co-andina",
    client: "Instituto Distrital del Futuro",
    object: "Portal de trámites y ventanilla única",
    contractNumber: "IDF-2023-118",
    currency: "COP",
    value: 980_000_000,
    startDate: "2023-02-01",
    endDate: "2024-01-31",
    location: "Bogotá D.C.",
    evidenceName: "Acta de liquidación IDF",
    evidenceSharePointId: "sp-exp-001",
    complete: true,
    createdAt: "2024-02-10T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Mariana Torres",
  },
  {
    id: "exp-002",
    companyId: "co-andina",
    client: "Agencia Regional de Servicios Digitales",
    object: "SOC administrado 7x24",
    contractNumber: "ARSD-2024-044",
    currency: "COP",
    value: 640_000_000,
    startDate: "2024-03-01",
    endDate: "2025-02-28",
    location: "Antioquia",
    evidenceName: "Certificación de cumplimiento",
    evidenceSharePointId: null,
    complete: false,
    createdAt: "2025-03-12T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Daniel Rojas",
  },
];

export const financials: FinancialSnapshot[] = [
  {
    id: "fin-001",
    companyId: "co-andina",
    period: "2025",
    currency: "COP",
    equity: 4_800_000_000,
    currentAssets: 3_200_000_000,
    currentLiabilities: 1_450_000_000,
    source: "Revisor fiscal",
    approver: "Camilo Vargas",
    status: "aprobado",
    createdAt: "2026-03-20T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Camilo Vargas",
  },
];

export const coverage: GeoCoverage[] = [
  { id: "geo-1", companyId: "co-andina", kind: "inclusion", country: "CO", department: "Bogotá D.C.", municipality: "Bogotá" },
  { id: "geo-2", companyId: "co-andina", kind: "inclusion", country: "CO", department: "Antioquia", municipality: "Medellín" },
  { id: "geo-3", companyId: "co-andina", kind: "exclusion", country: "CO", department: "Amazonas", municipality: "Leticia" },
];

export const rules: ParticipationRule[] = [
  {
    id: "rule-1",
    companyId: "co-andina",
    name: "Tope de valor no cubierto por patrimonio",
    priority: 1,
    blocking: true,
    expression: "tender.value > company.equity * 0.6",
    owner: "Camilo Vargas",
    active: true,
    createdAt: "2026-01-15T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Valentina Herrera",
  },
];

export const companyDocuments: CompanyDocument[] = [
  {
    id: "cdoc-1",
    companyId: "co-andina",
    name: "RUT",
    type: "Jurídico",
    validUntil: "2026-12-31",
    status: "vigente",
    sharePointId: "sp-doc-rut",
    createdAt: "2026-01-08T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Laura Méndez",
  },
  {
    id: "cdoc-2",
    companyId: "co-andina",
    name: "Estados financieros 2025",
    type: "Financiero",
    validUntil: "2026-11-15",
    status: "por_vencer",
    sharePointId: "sp-doc-eeff",
    createdAt: "2026-03-21T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Camilo Vargas",
  },
  {
    id: "cdoc-3",
    companyId: "co-andina",
    name: "Póliza de responsabilidad",
    type: "Jurídico",
    validUntil: "2026-09-30",
    status: "vencido",
    sharePointId: null,
    createdAt: "2025-09-30T09:00:00-05:00",
    updatedAt: now,
    createdBy: "Laura Méndez",
  },
];

export const memberships: Membership[] = people.map((person) => ({
  id: `mem-${person.id}`,
  companyId: "co-andina",
  userId: person.id,
  name: person.name,
  email: `${person.id.replace("usr-", "")}@andinatech.co`,
  role: person.role,
  team: person.team,
  active: true,
}));

export const savedSearches: SavedSearch[] = [
  {
    id: "ss-1",
    name: "Plataformas ciudadanas abiertas",
    filters: {
      search: "plataforma",
      modalities: ["Licitación pública"],
      departments: ["Bogotá D.C."],
      statuses: ["abierto"],
    },
    createdAt: "2026-10-10T09:00:00-05:00",
  },
];

export const sources: SourceConfig[] = [
  { id: "src-secop", name: "SECOP II", country: "CO", enabled: true, lastSync: now, health: "ok" },
  { id: "src-secop1", name: "SECOP I (histórico)", country: "CO", enabled: false, lastSync: null, health: "atrasada" },
];

export const integrations: IntegrationStatus[] = [
  { id: "int-d365", name: "Dynamics 365 Sales", system: "Dynamics 365", status: "simulada", lastSync: now, note: "Oportunidades y tareas de demostración" },
  { id: "int-dv", name: "Dataverse TenderOps", system: "Dataverse", status: "desconectada", lastSync: null, note: "Pendiente de application user" },
  { id: "int-sp", name: "SharePoint evidencias", system: "SharePoint", status: "simulada", lastSync: now, note: "Referencias sp-* únicamente" },
  { id: "int-entra", name: "Microsoft Entra ID", system: "Entra ID", status: "desconectada", lastSync: null, note: "Identidad no conectada en esta fase" },
  { id: "int-secop", name: "SECOP II", system: "SECOP", status: "simulada", lastSync: now, note: "Ingesta estática coherente" },
  { id: "int-copilot", name: "Copilot Studio", system: "Copilot Studio", status: "simulada", lastSync: now, note: "Conversaciones predefinidas" },
];

export const auditEvents: AuditEvent[] = [
  { id: "aud-1", actor: "Valentina Herrera", action: "Registró decisión BID", entity: "SECOP-LP-2026-041", correlationId: "corr-881", at: "2026-10-22T16:12:00-05:00" },
  { id: "aud-2", actor: "Sistema demo", action: "Sincronizó lote SECOP", entity: "src-secop", correlationId: "corr-882", at: "2026-10-23T06:00:00-05:00" },
  { id: "aud-3", actor: "Camilo Vargas", action: "Aprobó snapshot financiero", entity: "fin-001", correlationId: "corr-883", at: "2026-03-20T09:40:00-05:00" },
];

export const copilotThread: CopilotMessage[] = [
  {
    id: "cp-1",
    role: "assistant",
    agent: "orquestador",
    body: "Estoy en modo demostración. Puedo ayudarte a revisar viabilidad, documentos o asignar responsables sin conectar Copilot Studio.",
    createdAt: "2026-10-23T08:00:00-05:00",
    status: "listo",
  },
  {
    id: "cp-2",
    role: "user",
    agent: "orquestador",
    body: "¿Quién debería revisar el habilitante financiero de SECOP-LP-2026-041?",
    createdAt: "2026-10-23T08:01:00-05:00",
  },
  {
    id: "cp-3",
    role: "assistant",
    agent: "viabilidad",
    body: "El requisito R-FIN-01 está listo pero no cargado. Recomiendo asignar la revisión a Camilo Vargas.",
    createdAt: "2026-10-23T08:01:12-05:00",
    findings: ["Liquidez 2.2 sobre mínimo 1.2", "Evidencia EEFF 2025 disponible", "Falta carga a SharePoint"],
    table: {
      headers: ["Requisito", "Cumplimiento", "Responsable sugerido"],
      rows: [
        ["R-FIN-01", "Cumple", "Camilo Vargas"],
        ["R-EXP-01", "Pendiente", "Sofía Cárdenas"],
      ],
    },
    recommendation: "Asignar revisión financiera antes del comité de mañana.",
    references: ["Pliego · 4.2", "EEFF 2025"],
    status: "listo",
    proposedAction: {
      type: "assign-owners",
      label: "Asignar revisión financiera",
      payload: { tenderId: "tnd-001", requirementId: "req-tnd-001-2" },
    },
  },
];

export interface DemoWorkspace {
  companies: Company[];
  tenders: Tender[];
  assessments: Assessment[];
  criterionWeights: CriterionWeight[];
  requirements: Requirement[];
  documents: ProcessDocument[];
  evidences: Evidence[];
  decisions: Decision[];
  approvals: Approval[];
  comments: DecisionComment[];
  escalations: Escalation[];
  opportunities: CommercialOpportunity[];
  tasks: WorkTask[];
  alerts: AlertItem[];
  capabilities: Capability[];
  experiences: Experience[];
  financials: FinancialSnapshot[];
  coverage: GeoCoverage[];
  rules: ParticipationRule[];
  companyDocuments: CompanyDocument[];
  memberships: Membership[];
  savedSearches: SavedSearch[];
  sources: SourceConfig[];
  integrations: IntegrationStatus[];
  auditEvents: AuditEvent[];
  copilotThread: CopilotMessage[];
}

export function createSeed(): DemoWorkspace {
  return structuredClone({
    companies,
    tenders,
    assessments,
    criterionWeights,
    requirements,
    documents,
    evidences,
    decisions,
    approvals,
    comments,
    escalations,
    opportunities,
    tasks,
    alerts,
    capabilities,
    experiences,
    financials,
    coverage,
    rules,
    companyDocuments,
    memberships,
    savedSearches,
    sources,
    integrations,
    auditEvents,
    copilotThread,
  });
}
