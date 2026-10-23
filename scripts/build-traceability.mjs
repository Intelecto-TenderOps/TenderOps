import fs from 'node:fs';
import path from 'node:path';

// Reads the supplied backlog's authoring source without executing it or rewriting project references.
const source = process.argv[2];
if (!source) throw new Error('Provide the path to build_vitomato_d365_backlog.py');
const text = fs.readFileSync(source, 'utf8');
const evidence = { CONF: 'Confirmada publicamente por Vitomato', USER: 'Requisito confirmado por el solicitante', DER: 'Derivada necesaria para materializar una capacidad confirmada', PROP: 'Propuesta de producto sujeta a validacion', OPT: 'Opcion de fase posterior sujeta a aprobacion' };
const lines = text.split(/\r?\n/).filter(line => line.startsWith("S('"));
const rows = lines.map((line, index) => {
  const match = line.match(/^S\('([A-L])','([^']+)','[^']*','[^']*','(P[012])',(CONF|USER|DER|PROP|OPT),/);
  if (!match) throw new Error('Unrecognized story: ' + line);
  const [, epic, title, priority, basis] = match;
  const number = index + 1;
  const increment = number <= 7 || number >= 78 && number <= 85 || [88, 90, 92].includes(number) ? 1
    : number >= 8 && number <= 20 || number >= 29 && number <= 31 ? 2
    : number >= 22 && number <= 28 || number >= 32 && number <= 34 || number >= 36 && number <= 46 ? 3
    : [47, 48, 50].includes(number) || number >= 53 && number <= 77 ? 4 : 5;
  return { id: `HU-${epic}${String(number).padStart(3, '0')}`, title, priority, evidence: evidence[basis], increment,
    state: increment === 1 ? 'Implementación parcial; pendiente de validación real' : number === 21 ? 'Diferida P2' : 'Pendiente de su etapa',
    tests: increment === 1 ? 'Consultar docs/verification.md; evidencia local no equivale a sandbox' : 'Pendientes',
    dependencies: increment === 1 ? 'Entra, certificado/application user, metadatos/roles Dataverse, ITC y validación Azure' : `Incrementos previos; criterios del backlog`,
    acceptanceSource: line.substring(line.indexOf(basis) + basis.length + 1) };
});
if (rows.length !== 92 || rows.filter(r => r.priority === 'P0').length !== 67 || rows.filter(r => r.priority === 'P1').length !== 24) throw new Error('Backlog totals mismatch');
fs.mkdirSync('docs/requirements', { recursive: true });
fs.writeFileSync('docs/requirements/stories.json', JSON.stringify(rows, null, 2) + '\n');
fs.writeFileSync('docs/requirements/traceability.csv', '\uFEFF' + [Object.keys(rows[0]), ...rows.map(Object.values)].map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\n') + '\n');
console.log(`Validated ${rows.length} stories: 67 P0, 24 P1, 1 P2; stages ${[1,2,3,4,5].map(i => rows.filter(r => r.increment === i).length).join('/')}`);
