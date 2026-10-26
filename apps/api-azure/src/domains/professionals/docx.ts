import { deflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";

function crc32(data: Buffer): number {
  let crc = ~0;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function zipFiles(files: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const compressed = deflateRawSync(file.data);
    const crc = crc32(file.data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    const localFull = Buffer.concat([local, compressed]);
    locals.push(localFull);
    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    centrals.push(central);
    offset += localFull.length;
  }
  const centralDir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDir, end]);
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function paragraph(text: string, bold = false): string {
  const runProps = bold ? "<w:b/>" : "";
  return `<w:p><w:r><w:rPr>${runProps}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>`;
}

export function hashBuffer(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function buildResumeDocx(input: {
  fullName: string;
  proposedRole: string;
  profession: string;
  city: string;
  summary: string;
  education: { title: string; institution: string; graduatedOn: string | null }[];
  experiences: { role: string; client: string; project: string; startedOn: string; endedOn: string | null; functions: string }[];
  certifications: { name: string; issuer: string; expiresOn: string | null; validity: string }[];
  licenses: { kind: string; issuer: string; number: string }[];
  processLabel: string;
}): Buffer {
  const body = [
    paragraph("TenderOps · Hoja de vida de licitación", true),
    paragraph(input.processLabel),
    paragraph(input.fullName, true),
    paragraph(`Perfil propuesto: ${input.proposedRole}`),
    paragraph(`Profesión: ${input.profession} · ${input.city}`),
    input.summary ? paragraph(input.summary) : "",
    paragraph("Formación académica", true),
    ...input.education.map((item) => paragraph(`${item.title} · ${item.institution} · ${item.graduatedOn ?? "sin fecha"}`)),
    paragraph("Experiencia seleccionada", true),
    ...input.experiences.map((item) =>
      paragraph(`${item.role} · ${item.project} · ${item.client} (${item.startedOn} – ${item.endedOn ?? "actual"}) ${item.functions}`),
    ),
    paragraph("Certificaciones seleccionadas", true),
    ...input.certifications.map((item) =>
      paragraph(`${item.name} · ${item.issuer}${item.validity === "vencida" ? " · VENCIDA" : ""}`),
    ),
    paragraph("Acreditaciones seleccionadas", true),
    ...input.licenses.map((item) => paragraph(`${item.kind} · ${item.issuer} · ${item.number}`)),
    paragraph("Este documento conserva únicamente las selecciones de la versión generada."),
  ].join("");

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  return zipFiles([
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes) },
    { name: "_rels/.rels", data: Buffer.from(rels) },
    { name: "word/document.xml", data: Buffer.from(document) },
  ]);
}

export function applyTemplateVariables(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_, key: string) => values[key] ?? "");
}
