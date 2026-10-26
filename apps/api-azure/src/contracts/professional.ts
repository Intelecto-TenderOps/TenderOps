interface Identified {
  id: string;
}

interface Audited {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ProfessionalStatus = "activo" | "inactivo" | "borrador";
export type AvailabilityStatus =
  | "disponible"
  | "parcial"
  | "no_disponible"
  | "por_confirmar"
  | "asignado";
export type VerificationStatus = "pendiente" | "verificado" | "rechazado" | "incompleto";
export type EducationLevel =
  | "bachiller"
  | "tecnico"
  | "tecnologo"
  | "profesional"
  | "especializacion"
  | "maestria"
  | "doctorado";
export type LinkageType = "empleado" | "contratista" | "aliado" | "independiente";
export type MatchOutcome = "cumple" | "no_cumple" | "pendiente_validar" | "cumple_parcial";
export type ResumeFormat = "corporativo" | "entidad";
export type ResumeOutput = "docx" | "pdf" | "zip";
export type DuplicateAction = "conservar" | "actualizar" | "omitir" | "revisar";
export type ImportBatchStatus = "recibido" | "analizado" | "mapeado" | "validado" | "confirmado" | "parcial" | "error";

export interface Professional extends Identified, Audited {
  companyId: string;
  externalId: string;
  givenName: string;
  middleName: string;
  familyName: string;
  fullName: string;
  documentType: string;
  documentNumberMasked: string;
  documentCountry: string;
  profession: string;
  specialty: string;
  primaryProfile: string;
  capableRoles: string[];
  city: string;
  department: string;
  country: string;
  linkage: LinkageType;
  availability: AvailabilityStatus;
  status: ProfessionalStatus;
  verification: VerificationStatus;
  incomplete: boolean;
  notes: string;
  consentId: string | null;
  yearsGeneral: number;
  sharePointFolder: string;
  emailMasked?: string;
  phoneMasked?: string;
}

export interface ProfessionalEducation extends Identified, Audited {
  professionalId: string;
  companyId: string;
  externalId: string;
  level: EducationLevel;
  title: string;
  institution: string;
  country: string;
  startedOn: string | null;
  graduatedOn: string | null;
  status: "en_curso" | "graduado" | "pendiente";
  supportRef: string | null;
  verification: VerificationStatus;
}

export interface ProfessionalExperience extends Identified, Audited {
  professionalId: string;
  companyId: string;
  externalId: string;
  client: string;
  employer: string;
  project: string;
  role: string;
  startedOn: string;
  endedOn: string | null;
  current: boolean;
  functions: string;
  activities: string[];
  technologies: string[];
  sector: string;
  projectType: string;
  contractObject: string;
  supportRef: string | null;
  verification: VerificationStatus;
  monthsVerified: number;
}

export interface ProfessionalCertification extends Identified, Audited {
  professionalId: string;
  companyId: string;
  externalId: string;
  name: string;
  issuer: string;
  credentialCode: string;
  issuedOn: string | null;
  expiresOn: string | null;
  verificationUrl: string | null;
  category: string;
  supportRef: string | null;
  validity: "vigente" | "vencida" | "sin_fecha" | "pendiente";
  verification: VerificationStatus;
}

export interface ProfessionalLicense extends Identified, Audited {
  professionalId: string;
  companyId: string;
  externalId: string;
  kind: "matricula" | "tarjeta" | "licencia" | "registro";
  issuer: string;
  number: string;
  profession: string;
  issuedOn: string | null;
  status: "vigente" | "vencida" | "pendiente" | "sin_confirmar";
  supportRef: string | null;
  verification: VerificationStatus;
}

export interface ProfessionalSkill extends Identified {
  professionalId: string;
  companyId: string;
  name: string;
  category: string;
  level: "basico" | "intermedio" | "avanzado" | "acreditado" | "aprobado";
}

export interface ProfessionalAttachment extends Identified, Audited {
  professionalId: string;
  companyId: string;
  kind: "hv_original" | "diploma" | "acta" | "certificado" | "laboral" | "matricula" | "consentimiento" | "otro";
  name: string;
  sharePointId: string | null;
  sharePointPath: string;
  relatedRecordId: string | null;
  hash: string | null;
  status: "pendiente" | "asociado" | "no_asociado";
}

export interface ProfessionalConsent extends Identified, Audited {
  professionalId: string;
  companyId: string;
  store: boolean;
  consult: boolean;
  present: boolean;
  shareWithEntity: boolean;
  legalBasis: string;
  grantedOn: string | null;
  evidenceRef: string | null;
}

export interface TenderStaffRole extends Identified, Audited {
  companyId: string;
  tenderId: string;
  name: string;
  quantity: number;
  educationLevel: EducationLevel | "";
  acceptedProfessions: string[];
  postgraduate: string;
  licenseRequired: boolean;
  generalMonths: number;
  specificMonths: number;
  specificCriteria: string;
  certifications: string[];
  skills: string[];
  requiredDocuments: string[];
  resumeFormat: ResumeFormat;
  referenceDate: string;
  restrictions: string;
  sourceRequirementId: string | null;
  sourceDocument: string | null;
  version: number;
}

export interface TenderStaffRequirement extends Identified {
  companyId: string;
  roleId: string;
  tenderId: string;
  kind: "estudio" | "experiencia_general" | "experiencia_especifica" | "certificacion" | "matricula" | "documento";
  description: string;
  threshold: string;
  sourceRequirementId: string | null;
}

export interface MatchEvidence {
  kind: string;
  recordId: string;
  label: string;
  months?: number;
  note: string;
}

export interface MatchResult {
  professionalId: string;
  roleId: string;
  outcome: MatchOutcome;
  score: number;
  reasons: string[];
  evidence: MatchEvidence[];
  generalMonths: number;
  specificMonths: number;
  missingSupports: string[];
  warnings: string[];
}

export interface TenderProfessionalAssignment extends Identified, Audited {
  companyId: string;
  tenderId: string;
  roleId: string;
  professionalId: string;
  match: MatchResult;
  status: "propuesto" | "confirmado" | "retirado";
  resumeId: string | null;
}

export interface ResumeSelection {
  includeName: boolean;
  includeIdentification: boolean;
  includeProfession: boolean;
  includeSpecialty: boolean;
  includeCity: boolean;
  includeContact: boolean;
  includeSummary: boolean;
  educationIds: string[];
  experienceIds: string[];
  certificationIds: string[];
  licenseIds: string[];
  attachmentIds: string[];
  experienceOrder: "reciente" | "antigua" | "relevancia" | "manual";
  summary: string;
}

export interface ResumeConfiguration extends Identified, Audited {
  companyId: string;
  tenderId: string;
  professionalId: string;
  roleId: string;
  proposedRoleName: string;
  templateId: string;
  templateVersion: string;
  format: ResumeFormat;
  outputs: ResumeOutput[];
  selection: ResumeSelection;
  approved: boolean;
}

export interface GeneratedResume extends Identified, Audited {
  companyId: string;
  tenderId: string;
  professionalId: string;
  roleId: string;
  configurationId: string;
  status: "borrador" | "generado" | "aprobado" | "obsoleto";
  format: ResumeFormat;
  sharePointPath: string | null;
  hash: string | null;
  warnings: string[];
  snapshot: {
    fullName: string;
    proposedRoleName: string;
    education: ProfessionalEducation[];
    experiences: ProfessionalExperience[];
    certifications: ProfessionalCertification[];
    licenses: ProfessionalLicense[];
  };
}

export interface ResumeGenerationJob extends Identified {
  companyId: string;
  tenderId: string;
  status: "queued" | "running" | "done" | "error" | "pending_sharepoint";
  resumeIds: string[];
  error?: string;
  sharePointReady: boolean;
}

export interface ImportIssue {
  id: string;
  batchId: string;
  sheet: string;
  row: number;
  field: string;
  value: string;
  error: string;
  action: string;
  severity: "error" | "warning";
}

export interface ImportPreviewRow {
  externalId: string;
  fullName: string;
  action: "crear" | "actualizar" | "omitir" | "revisar";
  existingId: string | null;
  education: number;
  experiences: number;
  certifications: number;
  issues: number;
}

export interface ProfessionalImportBatch extends Identified, Audited {
  companyId: string;
  fileName: string;
  status: ImportBatchStatus;
  mapping: Record<string, string>;
  mappingProfileId: string | null;
  stats: {
    rows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    education: number;
    experiences: number;
    certifications: number;
    duplicates: number;
  };
  preview: ImportPreviewRow[];
  issues: ImportIssue[];
  policy: "fail_fast" | "partial";
}

export interface ColumnMappingProfile extends Identified {
  companyId: string;
  name: string;
  sheet: string;
  mapping: Record<string, string>;
}

export interface ProfessionalIndicators {
  total: number;
  active: number;
  available: number;
  incomplete: number;
  expiringCertifications: number;
  proposed: number;
  pendingDocuments: number;
}

export interface ProfessionalFilters {
  search?: string;
  profession?: string;
  profile?: string;
  specialty?: string;
  education?: string;
  institution?: string;
  experienceQuery?: string;
  employer?: string;
  project?: string;
  technology?: string;
  certification?: string;
  issuer?: string;
  minYears?: number;
  city?: string;
  availability?: AvailabilityStatus;
  verification?: VerificationStatus;
  incomplete?: boolean;
}

export interface ProfessionalRecord {
  professional: Professional;
  education: ProfessionalEducation[];
  experiences: ProfessionalExperience[];
  certifications: ProfessionalCertification[];
  licenses: ProfessionalLicense[];
  skills: ProfessionalSkill[];
  attachments: ProfessionalAttachment[];
  consent: ProfessionalConsent | null;
}
