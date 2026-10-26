export interface SheetTable {
  name: string;
  headers: string[];
  rows: string[][];
}

export const TEMPLATE_SHEETS = [
  "Profesionales",
  "Formación",
  "Experiencias",
  "Certificaciones",
  "Competencias",
  "Acreditaciones",
  "Instrucciones",
] as const;

export const PROFESSIONAL_FIELDS = [
  "externalId",
  "givenName",
  "familyName",
  "documentType",
  "documentNumber",
  "profession",
  "specialty",
  "primaryProfile",
  "city",
  "department",
  "email",
  "phone",
  "linkage",
  "availability",
  "status",
] as const;

const HEADER_ALIASES: Record<string, string> = {
  "id externo": "externalId",
  "id externo profesional": "externalId",
  "id estudio": "recordExternalId",
  "id experiencia": "recordExternalId",
  "id certificación": "recordExternalId",
  "id certificacion": "recordExternalId",
  "id competencia": "recordExternalId",
  "id acreditacion": "recordExternalId",
  "id acreditación": "recordExternalId",
  nombres: "givenName",
  "nombre completo": "fullName",
  apellidos: "familyName",
  "tipo de documento": "documentType",
  "número de documento": "documentNumber",
  "numero de documento": "documentNumber",
  profesión: "profession",
  profesion: "profession",
  especialidad: "specialty",
  "perfil principal": "primaryProfile",
  ciudad: "city",
  departamento: "department",
  correo: "email",
  teléfono: "phone",
  telefono: "phone",
  "tipo de vinculación": "linkage",
  "tipo de vinculacion": "linkage",
  disponibilidad: "availability",
  estado: "status",
  nivel: "level",
  título: "title",
  titulo: "title",
  institución: "institution",
  institucion: "institution",
  "fecha de grado": "graduatedOn",
  "referencia soporte": "supportRef",
  empresa: "client",
  proyecto: "project",
  cargo: "role",
  "fecha inicio": "startedOn",
  "fecha fin": "endedOn",
  funciones: "functions",
  tecnologías: "technologies",
  tecnologias: "technologies",
  nombre: "name",
  emisor: "issuer",
  código: "credentialCode",
  codigo: "credentialCode",
  "fecha expedición": "issuedOn",
  "fecha expedicion": "issuedOn",
  "fecha vencimiento": "expiresOn",
  categoría: "category",
  categoria: "category",
  competencia: "name",
  tipo: "kind",
  entidad: "issuer",
  número: "number",
  numero: "number",
  fecha: "issuedOn",
};

export function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase("es-CO").replace(/\s+/g, " ");
}

export function suggestMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of headers) {
    const alias = HEADER_ALIASES[normalizeHeader(header)];
    if (alias) mapping[header] = alias;
  }
  return mapping;
}

export function rowObject(headers: string[], row: string[], mapping: Record<string, string>): Record<string, string> {
  const data: Record<string, string> = {};
  headers.forEach((header, index) => {
    const field = mapping[header];
    if (!field) return;
    data[field] = (row[index] ?? "").trim();
  });
  return data;
}

export function sheetByName(sheets: SheetTable[], name: string): SheetTable | undefined {
  return sheets.find((sheet) => normalizeHeader(sheet.name) === normalizeHeader(name));
}
