import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { contractSchemas, CONTRACT_VERSION, z } from '@catalog/contracts';

// Schema components and the implemented private editorial HTTP surface. Public release paths arrive in M4.
const schemas = Object.fromEntries(Object.entries(contractSchemas).map(([name, schema]) =>
  [name, z.toJSONSchema(schema, { target: 'draft-2020-12' })]));
const response = { description: 'Private command/query result. See docs/editorial-api.md for result fields.', content: { 'application/json': { schema: { type: 'object', required: ['data'], properties: { data: {} } } } } };
const error = { description: 'Error with code, message, optional field errors, and request ID.', content: { 'application/json': { schema: { type: 'object', required: ['error'], properties: { error: { type: 'object', required: ['code','message','request_id'], properties: { code: { type: 'string' }, message: { type: 'string' }, fields: {}, request_id: { type: 'string', format: 'uuid' } } } } } } } };
const operation = (description: string, command?: string) => ({ description, security: [{ bearerAuth: [] }], ...(command ? { requestBody: { required: true, content: { 'application/json': { schema: { $ref: `#/components/schemas/${command}` } } } } } : {}), responses: { '200': response, '400': error, '401': error, '403': error, '404': error, '409': error, '413': error, '415': error, '422': error, '429': error, '503': error } });
const paths: Record<string, unknown> = {};
for (const [path,command] of Object.entries({ 'proposals/save':'SaveProposalCommand','proposals/submit':'SubmitProposalCommand','proposals/withdraw':'WithdrawProposalCommand','proposals/validate':'ValidateProposalCommand','proposals/review':'ReviewProposalCommand','comments':'CommentCommand','reports':'ReportCommand','contributions':'SendContributionCommand','contributions/triage':'TriageContributionCommand' })) paths[`/api/editorial/v1/${path}`] = { post: operation(`Execute ${command}. Identity and permissions are checked on the server.`,command) };
for (const path of ['session','proposals','reports','records','contributions']) paths[`/api/editorial/v1/${path}`] = { ...(paths[`/api/editorial/v1/${path}`] as object ?? {}), get: operation(`Read ${path} visible to the current account.`) };
paths['/api/editorial/v1/proposals/{id}'] = { get: { ...operation('Read an owned proposal, or any proposal as a current maintainer.'), parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }] } };
const document = {
  openapi: '3.1.0',
  info: {
    title: 'Boardgame Catalog contracts',
    version: CONTRACT_VERSION,
    description: 'Catalog schemas and M2 editorial endpoints. Cross-field, reference, and workflow invariants also require the shared Zod/domain validators. No public release API is implemented yet.',
  },
  paths,
  components: { schemas, securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'Supabase access JWT' } } },
};
const path = 'docs/contracts/openapi.json';
const output = `${JSON.stringify(document, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (await readFile(path, 'utf8') !== output) throw new Error('Contract artifact is stale; run npm run contracts:generate');
  console.log('Contract artifact matches shared schemas');
} else {
  await mkdir('docs/contracts', { recursive: true });
  await writeFile(path, output);
  console.log(`Wrote ${path}`);
}
