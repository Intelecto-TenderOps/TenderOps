import ExcelJS from "exceljs";
import { TEMPLATE_SHEETS } from "./sheets.js";

const EXAMPLE_NOTE = "EJEMPLO FICTICIO — no corresponde a una persona real.";

export async function buildImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TenderOps";
  workbook.created = new Date();

  const professionals = workbook.addWorksheet("Profesionales");
  professionals.columns = [
    "ID Externo",
    "Nombres",
    "Apellidos",
    "Tipo de documento",
    "Número de documento",
    "Profesión",
    "Especialidad",
    "Perfil principal",
    "Ciudad",
    "Departamento",
    "Correo",
    "Teléfono",
    "Tipo de vinculación",
    "Disponibilidad",
    "Estado",
  ].map((header) => ({ header, width: 22 }));
  professionals.addRow([
    "EXT-DEMO-001",
    "María Camila",
    "Suárez Ficticia",
    "CC",
    "9001001",
    "Ingeniería de Sistemas",
    "Arquitectura",
    "Arquitecta de Software",
    "Bogotá",
    "Bogotá D.C.",
    "maria.demo@example.test",
    "3000000001",
    "empleado",
    "disponible",
    "activo",
  ]);

  const education = workbook.addWorksheet("Formación");
  education.columns = [
    "ID Externo Profesional",
    "ID Estudio",
    "Nivel",
    "Título",
    "Institución",
    "Fecha de grado",
    "Estado",
    "Referencia soporte",
  ].map((header) => ({ header, width: 24 }));
  education.addRow(["EXT-DEMO-001", "EDU-001", "profesional", "Ingeniería de Sistemas", "Universidad Demo", "2014-03-15", "graduado", "diploma-demo.pdf"]);

  const experiences = workbook.addWorksheet("Experiencias");
  experiences.columns = [
    "ID Externo Profesional",
    "ID Experiencia",
    "Empresa",
    "Proyecto",
    "Cargo",
    "Fecha inicio",
    "Fecha fin",
    "Funciones",
    "Tecnologías",
    "Referencia soporte",
  ].map((header) => ({ header, width: 24 }));
  experiences.addRow([
    "EXT-DEMO-001",
    "EXP-001",
    "Entidad Demo S.A.S.",
    "Plataforma ciudadana demo",
    "Arquitecta de Software",
    "2018-01-01",
    "2022-12-31",
    "Diseño de arquitectura y liderazgo técnico",
    "Azure;.NET;SQL Server",
    "cert-laboral-demo.pdf",
  ]);

  const certifications = workbook.addWorksheet("Certificaciones");
  certifications.columns = [
    "ID Externo Profesional",
    "ID Certificación",
    "Nombre",
    "Emisor",
    "Código",
    "Fecha expedición",
    "Fecha vencimiento",
    "Categoría",
    "Referencia soporte",
  ].map((header) => ({ header, width: 24 }));
  certifications.addRow(["EXT-DEMO-001", "CER-001", "Azure Solutions Architect", "Microsoft", "AZ-305-DEMO", "2023-04-01", "2026-04-01", "nube", "az305-demo.pdf"]);

  const skills = workbook.addWorksheet("Competencias");
  skills.columns = ["ID Externo Profesional", "Competencia", "Categoría", "Nivel"].map((header) => ({ header, width: 24 }));
  skills.addRow(["EXT-DEMO-001", ".NET", "desarrollo", "avanzado"]);

  const licenses = workbook.addWorksheet("Acreditaciones");
  licenses.columns = [
    "ID Externo Profesional",
    "Tipo",
    "Entidad",
    "Número",
    "Profesión",
    "Fecha",
    "Estado",
    "Referencia soporte",
  ].map((header) => ({ header, width: 22 }));
  licenses.addRow(["EXT-DEMO-001", "matricula", "COPNI Demo", "MAT-0001", "Ingeniería de Sistemas", "2014-06-01", "pendiente", ""]);

  const instructions = workbook.addWorksheet("Instrucciones");
  instructions.getColumn(1).width = 100;
  [
    "Plantilla TenderOps para el banco de perfiles. " + EXAMPLE_NOTE,
    "Campos obligatorios en Profesionales: ID Externo, Nombres, Apellidos.",
    "El número de documento es sensible: se usa solo para detectar duplicados y no se expone como llave pública.",
    "Relacione Formación, Experiencias, Certificaciones, Competencias y Acreditaciones con el mismo ID Externo.",
    "Fechas en formato AAAA-MM-DD. Celdas vacías se interpretan como dato ausente, no como cero.",
    "Los soportes se referencian por nombre o identificador; el Excel no adjunta PDF.",
    "No ejecute macros. TenderOps ignora fórmulas y no las evalúa.",
    "Una reimportación actualiza por ID Externo y no borra registros ausentes en el archivo.",
    "Experiencias y certificaciones ya verificadas no se reemplazan en silencio.",
    `Hojas esperadas: ${TEMPLATE_SHEETS.join(", ")}.`,
  ].forEach((line, index) => {
    instructions.getCell(index + 1, 1).value = line;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function readWorkbook(content: Buffer): Promise<{ name: string; headers: string[]; rows: string[][] }[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(content as unknown as ArrayBuffer);
  return workbook.worksheets.map((sheet) => {
    const rows = sheet.getSheetValues() as (string | number | undefined)[][];
    const headerRow = (rows[1] ?? []).slice(1).map((cell) => String(cell ?? "").trim());
    const data = rows.slice(2).map((row) => (row ?? []).slice(1).map((cell) => String(cell ?? "").trim()));
    return { name: sheet.name, headers: headerRow, rows: data.filter((row) => row.some(Boolean)) };
  });
}

export async function buildErrorWorkbook(issues: { sheet: string; row: number; field: string; value: string; error: string; action: string }[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Errores");
  sheet.columns = ["Hoja", "Fila", "Campo", "Valor", "Error", "Acción recomendada"].map((header) => ({ header, width: 28 }));
  for (const issue of issues) {
    sheet.addRow([issue.sheet, issue.row, issue.field, issue.value, issue.error, issue.action]);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
