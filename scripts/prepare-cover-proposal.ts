import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { prepareCoverProposal } from './lib/cover-proposal.ts';

const { values } = parseArgs({ options: { asset: { type: 'string' }, context: { type: 'string' } } });
if (!values.asset || !values.context) throw new Error('Usage: npm run prepare:cover-proposal -- --asset CANDIDATE.json --context CONTEXT.json');
const proposal = prepareCoverProposal(JSON.parse(await readFile(values.asset, 'utf8')), JSON.parse(await readFile(values.context, 'utf8')));
console.log(JSON.stringify(proposal, null, 2));
