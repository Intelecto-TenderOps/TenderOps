import fs from 'node:fs';
import { z } from 'zod';
import { definitions } from '../src/features/profile/schema.ts';

const schemas = Object.fromEntries(definitions.map(definition => [definition.kind, z.toJSONSchema(definition.schema, { io: 'output', unrepresentable: 'any' })]));
fs.writeFileSync('../contracts/profile-payloads.schema.json', JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'urn:tenderops:profile-payloads:v1', $defs: schemas }, null, 2) + '\n');
const contract = JSON.parse(fs.readFileSync('../contracts/openapi-v1.json', 'utf8'));
contract.info.title = 'TenderOps BFF';
contract.info.version = 'v1';
contract.components ??= {};
contract.components.schemas ??= {};
contract.components.securitySchemes = { session: { type: 'apiKey', in: 'cookie', name: '__Host-TenderOps.Session' } };
for (const [name, schema] of Object.entries(schemas)) contract.components.schemas[name + 'Payload'] = schema;
contract.components.schemas.SafeProblem = { type: 'object', required: ['status', 'code', 'correlationId'], properties: { status: { type: 'integer' }, title: { type: 'string' }, type: { type: 'string' }, code: { type: 'string' }, correlationId: { type: 'string' } } };
for (const [route, operations] of Object.entries(contract.paths) as [string, Record<string, Record<string, unknown>>][]) {
  if (route.includes('/demo/')) { delete contract.paths[route]; continue; }
  for (const [method, operation] of Object.entries(operations)) {
    if (!['get', 'post', 'put', 'delete'].includes(method)) continue;
    operation.security = route.startsWith('/auth/') || route === '/api/csrf' || route.startsWith('/health/') ? [] : [{ session: [] }];
    const parameters = (operation.parameters ?? []) as Record<string, unknown>[];
    if (method !== 'get') parameters.push({ name: 'X-CSRF-TOKEN', in: 'header', required: true, schema: { type: 'string' }, description: 'Token antiforgery de la sesión actual; los formularios de logout también aceptan __RequestVerificationToken.' });
    if (method !== 'get' && route.startsWith('/api/v1/') && !route.endsWith('/select')) parameters.push({ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', format: 'uuid' } });
    if (method === 'put' || route.endsWith('/approve')) parameters.push({ name: 'If-Match', in: 'header', required: true, schema: { type: 'string' }, example: '"1"' });
    for (const parameter of parameters) if (parameter.name === 'kind') parameter.schema = { type: 'string', enum: [...definitions.map(item => item.kind), 'job'] };
    operation.parameters = parameters;
    if ((method === 'post' || method === 'put') && route.includes('{kind}') && !route.endsWith('/approve')) operation.requestBody = { required: true, content: { 'application/json': { schema: { oneOf: Object.keys(schemas).map(name => ({ $ref: '#/components/schemas/' + name + 'Payload' })) } } } };
    const responses = (operation.responses ?? {}) as Record<string, unknown>;
    for (const status of ['400','401','403','404','409','412','428','500','503']) responses[status] = { description: 'Error seguro con código y correlación.', content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/SafeProblem' } } } };
    operation.responses = responses;
  }
}
fs.writeFileSync('../contracts/openapi-v1.json', JSON.stringify(contract, null, 2) + '\n');
console.log('Exported profile payloads and annotated OpenAPI.');
