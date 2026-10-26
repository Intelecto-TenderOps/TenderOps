import { useMemo, useState } from "react";
import { FlowDrawerBody } from "@/components/flow/FlowDrawerBody";
import { FlowDrawerFooter } from "@/components/flow/FlowDrawerFooter";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SelectionChips } from "@/components/selection";
import { StatusBadge } from "@/components/viz/StatusBadge";
import type { ResumeSelection } from "@/contracts/professional";
import { prettyLabel } from "@/lib/format";
import { downloadHtmlAsDoc, professionalsService, renderResumeHtml } from "@/services/professionalsService";
import { downloadBase64 } from "./template";
import { useDemoStore } from "@/store/demo-store";
import { useDrawerStore } from "@/store/drawer-store";
import { useUiStore } from "@/store/ui-store";
import { matchProfessionalToRole } from "./engine";

export function ImportProfessionalsFlow() {
  const step = useDrawerStore((state) => state.step);
  const setStep = useDrawerStore((state) => state.setStep);
  const setDirty = useDrawerStore((state) => state.setDirty);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [batch, setBatch] = useState<Awaited<ReturnType<typeof professionalsService.startImport>> | null>(null);
  const [status, setStatus] = useState("");

  async function loadFile(file: File) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((value) => {
      binary += String.fromCharCode(value);
    });
    setFileName(file.name);
    setContent(btoa(binary));
    setDirty(true);
    setStatus("Archivo listo para analizar. TenderOps no ejecuta macros ni fórmulas.");
  }

  return (
    <>
      <FlowDrawerBody>
        {step === 0 && (
          <div className="grid gap-3">
            <p className="text-sm text-muted">Suba un Excel propio o descargue la plantilla de siete hojas. Los PDF de soportes no van en el archivo.</p>
            <Button onClick={async () => {
              const template = await professionalsService.template();
              downloadBase64(template.fileName, template.contentBase64, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            }}>
              Descargar plantilla Excel
            </Button>
            <Field label="Archivo" htmlFor="excel-file">
              <Input id="excel-file" type="file" accept=".xlsx" onChange={(event) => event.target.files?.[0] && void loadFile(event.target.files[0])} />
            </Field>
            {fileName ? <p className="text-sm">{fileName}</p> : null}
            {status ? <p className="text-xs text-muted">{status}</p> : null}
          </div>
        )}
        {step === 1 && <p className="text-sm">Se leerán las hojas Profesionales, Formación, Experiencias, Certificaciones, Competencias y Acreditaciones. La hoja Instrucciones se ignora.</p>}
        {step === 2 && (
          <div className="grid gap-2">
            <p className="text-sm">Ajuste el mapeo si los encabezados no coinciden con la plantilla.</p>
            {Object.entries(mapping).map(([header, field]) => (
              <Field key={header} label={header} htmlFor={`map-${header}`}>
                <Input id={`map-${header}`} value={field} onChange={(event) => setMapping((current) => ({ ...current, [header]: event.target.value }))} />
              </Field>
            ))}
            {!Object.keys(mapping).length ? <p className="text-xs text-muted">El mapeo se sugerirá al analizar el archivo.</p> : null}
          </div>
        )}
        {step >= 3 && batch && (
          <div className="grid gap-3 text-sm">
            <p>{batch.stats.rows} filas · {batch.stats.created} nuevos · {batch.stats.education} estudios · {batch.stats.experiences} experiencias · {batch.stats.errors} errores</p>
            <ul className="grid gap-2">
              {batch.preview.slice(0, 12).map((row) => (
                <li key={row.externalId} className="rounded-2xl bg-white/70 px-3 py-2">
                  {row.fullName} · {row.action} · {row.experiences} exp.
                </li>
              ))}
            </ul>
            {batch.issues.slice(0, 8).map((issue) => (
              <p key={issue.id} className="text-xs text-red-700">{issue.sheet} fila {issue.row}: {issue.error}</p>
            ))}
          </div>
        )}
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => (step === 0 ? closeFlow() : setStep(step - 1))}>{step === 0 ? "Cancelar" : "Atrás"}</Button>
        {step < 6 ? (
          <Button
            variant="primary"
            onClick={async () => {
              if (step === 1 && content) {
                const created = await professionalsService.startImport(fileName, content, mapping);
                setBatch(created);
                setMapping(created.mapping);
              }
              if (step === 5 && batch) await professionalsService.commitImport(batch.id, "actualizar");
              setStep(step + 1);
            }}
            disabled={step === 0 && !content}
          >
            {step === 5 ? "Confirmar importación" : "Continuar"}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => closeFlow(true)}>Cerrar</Button>
        )}
      </FlowDrawerFooter>
    </>
  );
}

export function CreateProfessionalFlow() {
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const setDirty = useDrawerStore((state) => state.setDirty);
  const companyId = useUiStore((state) => state.companyId);
  const [form, setForm] = useState({ givenName: "", familyName: "", profession: "", primaryProfile: "", specialty: "", city: "", documentNumber: "" });
  return (
    <>
      <FlowDrawerBody>
        <div className="grid gap-3">
          <Field label="Nombres" htmlFor="given"><Input id="given" value={form.givenName} onChange={(event) => { setForm({ ...form, givenName: event.target.value }); setDirty(true); }} /></Field>
          <Field label="Apellidos" htmlFor="family"><Input id="family" value={form.familyName} onChange={(event) => { setForm({ ...form, familyName: event.target.value }); setDirty(true); }} /></Field>
          <Field label="Profesión" htmlFor="prof"><Input id="prof" value={form.profession} onChange={(event) => setForm({ ...form, profession: event.target.value })} /></Field>
          <Field label="Perfil principal" htmlFor="profile"><Input id="profile" value={form.primaryProfile} onChange={(event) => setForm({ ...form, primaryProfile: event.target.value })} /></Field>
          <Field label="Especialidad" htmlFor="spec"><Input id="spec" value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} /></Field>
          <Field label="Ciudad" htmlFor="city"><Input id="city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></Field>
          <Field label="Documento (no se muestra completo)" htmlFor="doc"><Input id="doc" value={form.documentNumber} onChange={(event) => setForm({ ...form, documentNumber: event.target.value })} /></Field>
        </div>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow()}>Cancelar</Button>
        <Button variant="primary" onClick={async () => { await professionalsService.save(companyId, form); closeFlow(true); }}>Guardar</Button>
      </FlowDrawerFooter>
    </>
  );
}

export function ResumeBuilderFlow() {
  const step = useDrawerStore((state) => state.step);
  const setStep = useDrawerStore((state) => state.setStep);
  const payload = useDrawerStore((state) => state.payload);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const setDirty = useDrawerStore((state) => state.setDirty);
  const workspace = useDemoStore((state) => state.workspace);
  const professionalId = String(payload.professionalId ?? workspace.professionals[0]?.id ?? "");
  const professional = workspace.professionals.find((item) => item.id === professionalId);
  const education = workspace.professionalEducation.filter((item) => item.professionalId === professionalId);
  const experiences = workspace.professionalExperiences.filter((item) => item.professionalId === professionalId);
  const certifications = workspace.professionalCertifications.filter((item) => item.professionalId === professionalId);
  const licenses = workspace.professionalLicenses.filter((item) => item.professionalId === professionalId);
  const tenders = workspace.tenders;
  const roles = workspace.staffRoles;
  const [tenderId, setTenderId] = useState(String(payload.tenderId ?? tenders[0]?.id ?? ""));
  const [roleId, setRoleId] = useState(roles.find((item) => item.tenderId === tenderId)?.id ?? roles[0]?.id ?? "");
  const [proposedRoleName, setProposedRoleName] = useState(roles.find((item) => item.id === roleId)?.name ?? professional?.primaryProfile ?? "");
  const [format, setFormat] = useState<"corporativo" | "entidad">("corporativo");
  const [selection, setSelection] = useState<ResumeSelection>({
    includeName: true,
    includeIdentification: false,
    includeProfession: true,
    includeSpecialty: true,
    includeCity: true,
    includeContact: false,
    includeSummary: true,
    educationIds: education.slice(0, 2).map((item) => item.id),
    experienceIds: [],
    certificationIds: [],
    licenseIds: [],
    attachmentIds: [],
    experienceOrder: "relevancia",
    summary: "",
  });
  const [preview, setPreview] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const selectedEducation = education.filter((item) => selection.educationIds.includes(item.id));
  const selectedExperiences = experiences.filter((item) => selection.experienceIds.includes(item.id));
  const selectedCerts = certifications.filter((item) => selection.certificationIds.includes(item.id));

  function toggle(list: keyof Pick<ResumeSelection, "educationIds" | "experienceIds" | "certificationIds" | "licenseIds">, id: string) {
    setSelection((current) => ({
      ...current,
      [list]: current[list].includes(id) ? current[list].filter((item) => item !== id) : [...current[list], id],
    }));
    setDirty(true);
  }

  const html = useMemo(() => {
    if (!professional) return "";
    return renderResumeHtml({
      id: "preview",
      companyId: professional.companyId,
      tenderId,
      professionalId,
      roleId,
      configurationId: "preview",
      status: "borrador",
      format,
      sharePointPath: null,
      hash: null,
      warnings,
      snapshot: {
        fullName: selection.includeName ? professional.fullName : "Nombre omitido",
        proposedRoleName,
        education: selectedEducation,
        experiences: selectedExperiences,
        certifications: selectedCerts,
        licenses: licenses.filter((item) => selection.licenseIds.includes(item.id)),
      },
      createdAt: "",
      updatedAt: "",
      createdBy: "",
    });
  }, [professional, tenderId, professionalId, roleId, format, warnings, selection, proposedRoleName, selectedEducation, selectedExperiences, selectedCerts, licenses]);

  return (
    <>
      <FlowDrawerBody>
        <div className="grid min-h-0 gap-4 xl:grid-cols-2">
          <div className="grid gap-3">
            {step === 0 && (
              <>
                <Field label="Proceso" htmlFor="tender">
                  <Select id="tender" value={tenderId} onChange={(event) => setTenderId(event.target.value)}>
                    {tenders.map((item) => <option key={item.id} value={item.id}>{item.secopId} · {item.object}</option>)}
                  </Select>
                </Field>
                <Field label="Perfil propuesto" htmlFor="role">
                  <Select id="role" value={roleId} onChange={(event) => { setRoleId(event.target.value); setProposedRoleName(roles.find((item) => item.id === event.target.value)?.name ?? ""); }}>
                    {roles.filter((item) => item.tenderId === tenderId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </Select>
                </Field>
                <Field label="Nombre del cargo en la HV" htmlFor="cargo">
                  <Input id="cargo" value={proposedRoleName} onChange={(event) => setProposedRoleName(event.target.value)} />
                </Field>
                <Field label="Formato" htmlFor="format">
                  <Select id="format" value={format} onChange={(event) => setFormat(event.target.value as "corporativo" | "entidad")}>
                    <option value="corporativo">Plantilla corporativa</option>
                    <option value="entidad">Formato de la entidad</option>
                  </Select>
                </Field>
                <p className="text-xs text-muted">El nombre del profesional sale de su registro maestro. El cargo propuesto puede ser distinto de su título.</p>
              </>
            )}
            {step === 1 && professional && (
              <div className="grid gap-2 text-sm">
                <label><input type="checkbox" checked={selection.includeName} onChange={(event) => setSelection({ ...selection, includeName: event.target.checked })} /> Nombre</label>
                <label><input type="checkbox" checked={selection.includeIdentification} onChange={(event) => setSelection({ ...selection, includeIdentification: event.target.checked })} /> Identificación</label>
                <label><input type="checkbox" checked={selection.includeProfession} onChange={(event) => setSelection({ ...selection, includeProfession: event.target.checked })} /> Profesión</label>
                <label><input type="checkbox" checked={selection.includeCity} onChange={(event) => setSelection({ ...selection, includeCity: event.target.checked })} /> Ciudad</label>
                <label><input type="checkbox" checked={selection.includeContact} onChange={(event) => setSelection({ ...selection, includeContact: event.target.checked })} /> Contacto</label>
                <Field label="Perfil resumido" htmlFor="summary"><Textarea id="summary" value={selection.summary} onChange={(event) => setSelection({ ...selection, summary: event.target.value })} /></Field>
              </div>
            )}
            {step === 2 && (
              <>
                {education.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm">
                    <input type="checkbox" checked={selection.educationIds.includes(item.id)} onChange={() => toggle("educationIds", item.id)} />
                    <span>{item.title} · {item.institution} · {prettyLabel(item.verification)}</span>
                  </label>
                ))}
                <SelectionChips items={selectedEducation.map((item) => ({ id: item.id, label: item.title }))} onRemove={(id) => toggle("educationIds", id)} />
              </>
            )}
            {step === 3 && (
              <>
                <Field label="Orden" htmlFor="order">
                  <Select id="order" value={selection.experienceOrder} onChange={(event) => setSelection({ ...selection, experienceOrder: event.target.value as ResumeSelection["experienceOrder"] })}>
                    <option value="reciente">Más reciente</option>
                    <option value="antigua">Más antigua</option>
                    <option value="relevancia">Mayor relevancia</option>
                    <option value="manual">Manual</option>
                  </Select>
                </Field>
                {experiences.map((item) => (
                  <label key={item.id} className="grid gap-1 rounded-2xl bg-white/70 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={selection.experienceIds.includes(item.id)} onChange={() => toggle("experienceIds", item.id)} />
                      <strong>{item.role}</strong>
                    </span>
                    <span className="text-xs text-muted">{item.project} · {item.client} · {item.startedOn} – {item.endedOn ?? "actual"} · {item.supportRef ? "soporte" : "sin soporte"}</span>
                    <span>{item.functions}</span>
                  </label>
                ))}
                <SelectionChips items={selectedExperiences.map((item) => ({ id: item.id, label: item.role }))} onRemove={(id) => toggle("experienceIds", id)} />
              </>
            )}
            {step === 4 && (
              <>
                {certifications.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm">
                    <input type="checkbox" checked={selection.certificationIds.includes(item.id)} onChange={() => toggle("certificationIds", item.id)} />
                    <span>{item.name} · {item.issuer} · {prettyLabel(item.validity)}</span>
                  </label>
                ))}
                <SelectionChips items={selectedCerts.map((item) => ({ id: item.id, label: item.name }))} onRemove={(id) => toggle("certificationIds", id)} />
              </>
            )}
            {step === 5 && (
              <>
                {licenses.map((item) => (
                  <label key={item.id} className="flex items-start gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm">
                    <input type="checkbox" checked={selection.licenseIds.includes(item.id)} onChange={() => toggle("licenseIds", item.id)} />
                    <span>{item.kind} {item.number} · {prettyLabel(item.status)}</span>
                  </label>
                ))}
                {!licenses.length ? <p className="text-sm text-muted">No hay matrículas o tarjetas registradas. No se declara vigencia sin evidencia.</p> : null}
              </>
            )}
            {step >= 6 && (
              <div className="grid gap-2 text-sm">
                <p>Estudios {selectedEducation.length} · Experiencias {selectedExperiences.length} · Certificaciones {selectedCerts.length}</p>
                {warnings.map((item) => <p key={item} className="text-amber-800">{item}</p>)}
                {preview ? <p className="text-xs text-muted">Documento generado. La versión aprobada no cambia si luego actualiza el maestro.</p> : null}
              </div>
            )}
          </div>
          <article className="glass-panel min-h-[240px] rounded-[24px] p-4 text-sm" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => (step === 0 ? closeFlow() : setStep(step - 1))}>{step === 0 ? "Cancelar" : "Atrás"}</Button>
        {step < 7 ? (
          <Button variant="primary" onClick={() => setStep(step + 1)}>Continuar</Button>
        ) : (
          <Button
            variant="primary"
            onClick={async () => {
              const result = await professionalsService.generateResume(tenderId, professionalId, roleId, selection, proposedRoleName, format) as { resume: { id: string; warnings: string[] }; preview?: string };
              setWarnings(result.resume.warnings);
              setPreview(result.preview ?? html);
              downloadHtmlAsDoc(`${proposedRoleName}-${professional?.fullName}.doc`, result.preview ?? html);
            }}
          >
            Generar DOCX
          </Button>
        )}
      </FlowDrawerFooter>
    </>
  );
}

export function SelectProfessionalFlow() {
  const payload = useDrawerStore((state) => state.payload);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const workspace = useDemoStore((state) => state.workspace);
  const roleId = String(payload.roleId ?? workspace.staffRoles[0]?.id ?? "");
  const role = workspace.staffRoles.find((item) => item.id === roleId);
  const professionals = workspace.professionals.filter((item) => item.companyId === role?.companyId);
  return (
    <>
      <FlowDrawerBody>
        <div className="grid gap-2">
          {professionals.map((item) => {
            const record = {
              professional: item,
              education: workspace.professionalEducation.filter((row) => row.professionalId === item.id),
              experiences: workspace.professionalExperiences.filter((row) => row.professionalId === item.id),
              certifications: workspace.professionalCertifications.filter((row) => row.professionalId === item.id),
              licenses: workspace.professionalLicenses.filter((row) => row.professionalId === item.id),
              skills: workspace.professionalSkills.filter((row) => row.professionalId === item.id),
              attachments: workspace.professionalAttachments.filter((row) => row.professionalId === item.id),
              consent: workspace.professionalConsents.find((row) => row.professionalId === item.id) ?? null,
            };
            const match = role ? matchProfessionalToRole(record, role, role.referenceDate) : null;
            return (
              <article key={item.id} className="rounded-2xl bg-white/70 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.fullName}</p>
                    <p className="text-xs text-muted">{item.profession} · {prettyLabel(item.availability)}</p>
                  </div>
                  {match ? <StatusBadge value={match.outcome} /> : null}
                </div>
                {match ? <p className="mt-1 text-xs text-muted">{match.reasons[0]}</p> : null}
                {role ? (
                  <Button size="sm" className="mt-2" onClick={async () => { await professionalsService.assign(role.tenderId, role.id, item.id); closeFlow(true); }}>
                    Seleccionar
                  </Button>
                ) : null}
              </article>
            );
          })}
        </div>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow()}>Cerrar</Button>
      </FlowDrawerFooter>
    </>
  );
}

export function StaffRoleFlow() {
  const payload = useDrawerStore((state) => state.payload);
  const closeFlow = useDrawerStore((state) => state.closeFlow);
  const setDirty = useDrawerStore((state) => state.setDirty);
  const [form, setForm] = useState({ name: "", quantity: "1", educationLevel: "profesional", specificMonths: "36", specificCriteria: "", certifications: "" });
  return (
    <>
      <FlowDrawerBody>
        <div className="grid gap-3">
          <Field label="Cargo requerido" htmlFor="role-name"><Input id="role-name" value={form.name} onChange={(event) => { setForm({ ...form, name: event.target.value }); setDirty(true); }} /></Field>
          <Field label="Cantidad" htmlFor="qty"><Input id="qty" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></Field>
          <Field label="Nivel de estudios" htmlFor="edu">
            <Select id="edu" value={form.educationLevel} onChange={(event) => setForm({ ...form, educationLevel: event.target.value })}>
              <option value="profesional">Profesional</option>
              <option value="especializacion">Especialización</option>
              <option value="maestria">Maestría</option>
            </Select>
          </Field>
          <Field label="Meses de experiencia específica" htmlFor="months"><Input id="months" value={form.specificMonths} onChange={(event) => setForm({ ...form, specificMonths: event.target.value })} /></Field>
          <Field label="Criterio específico" htmlFor="criteria"><Input id="criteria" value={form.specificCriteria} onChange={(event) => setForm({ ...form, specificCriteria: event.target.value })} /></Field>
          <Field label="Certificaciones" htmlFor="certs"><Input id="certs" value={form.certifications} onChange={(event) => setForm({ ...form, certifications: event.target.value })} /></Field>
        </div>
      </FlowDrawerBody>
      <FlowDrawerFooter>
        <Button onClick={() => closeFlow()}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={async () => {
            await professionalsService.saveStaffRole(String(payload.tenderId ?? "tnd-001"), {
              name: form.name,
              quantity: Number(form.quantity),
              educationLevel: form.educationLevel as never,
              specificMonths: Number(form.specificMonths),
              specificCriteria: form.specificCriteria,
              certifications: form.certifications ? form.certifications.split(",").map((item) => item.trim()) : [],
            });
            closeFlow(true);
          }}
        >
          Guardar perfil
        </Button>
      </FlowDrawerFooter>
    </>
  );
}
