import { randomUUID } from 'node:crypto';
import { sql, type SQL } from 'drizzle-orm';
import { CatalogRecord, ProposalContent, SaveProposalCommand, SubmitProposalCommand, ReviewProposalCommand, CommentCommand, ReportCommand, SendContributionCommand, TriageContributionCommand } from '@catalog/contracts';
import { CommandError, checkSubmission, changesBetween, contentHash, VALIDATOR_VERSION, type Actor } from '@catalog/domain';
import { insertApprovedRevision, type CatalogDatabase, type CatalogTransaction } from './index.ts';

type Content = typeof ProposalContent._output;
type Proposal = { id: string; author_id: string; state: string; version: number; submitted_version: number | null; draft: Content };
type Head = { entity_id: string; revision_id: string; payload: CatalogRecord };
type Validation = { id: string; proposal_id: string; proposal_version: number; submitted_hash: string; validator_version: string; heads: Record<string, string>; result: ReturnType<typeof checkSubmission> };
const json = (value: unknown) => sql`${JSON.stringify(value)}::jsonb`;
async function rows<T = Record<string, unknown>>(tx: CatalogTransaction, query: SQL) { return await tx.execute(query) as unknown as T[]; }
function conflict(message: string): never { throw new CommandError(409, 'conflict', message); }
const forbidden = (): never => { throw new CommandError(403, 'forbidden', 'This operation is not allowed for your account.'); };

// Every entry point verifies the live session, including reads and idempotent retries.
export async function authorize(tx: CatalogTransaction, actor: Actor, maintainer = false) {
  const live = await rows(tx, sql`select id from editorial.session_status where id=${actor.sessionId} and user_id=${actor.userId} and (not_after is null or not_after > clock_timestamp())`);
  if (!live.length || actor.expiresAt * 1000 <= Date.now()) throw new CommandError(401, 'session_expired', 'Sign in again to continue.');
  const membership = await rows(tx, sql`select user_id from editorial.maintainers where user_id=${actor.userId} and active`);
  if (maintainer && !membership.length) forbidden();
  return { user_id: actor.userId, maintainer: membership.length > 0 };
}

async function proposal(tx: CatalogTransaction, actor: Actor, id: string, owner = false) {
  const who = await authorize(tx, actor);
  const [record] = await rows<Proposal>(tx, sql`select * from editorial.proposals where id=${id} for update`);
  if (!record || (record.author_id !== actor.userId && (!who.maintainer || owner))) throw new CommandError(404, 'not_found', 'Submission not found.');
  return record;
}
function expected(record: Proposal, version: number) { if (record.version !== version) conflict('The submission has changed. Reload it before continuing.'); }
async function event(tx: CatalogTransaction, actor: Actor, record: Proposal, name: string) {
  await tx.execute(sql`insert into editorial.proposal_events(id,proposal_id,version,actor_id,event) values (${randomUUID()},${record.id},${record.version},${actor.userId},${name})`);
}
async function heads(tx: CatalogTransaction) {
  return rows<Head>(tx, sql`select h.entity_id,h.revision_id,r.payload from editorial.approved_heads h join editorial.revisions r on r.id=h.revision_id order by h.entity_id`);
}
const headMap = (values: Head[]) => Object.fromEntries(values.map(row => [row.entity_id, row.revision_id]));
async function validate(tx: CatalogTransaction, content: Content, current: Head[]) {
  const sources = await rows<{ id: string; payload: unknown }>(tx, sql`select id,payload from editorial.sources`);
  const result = checkSubmission(content, current.map(row => row.payload), sources.map(row => row.id));
  const revisions = headMap(current);
  for (const target of content.targets) {
    if ((revisions[target.entity_id] ?? null) !== target.base_revision_id) result.errors.push({ entity_id: target.entity_id, path: '/base_revision_id', code: 'stale_base', message: 'The approved revision changed. Rebase and submit a new proposal version.' });
    const [entity] = await rows<{ entity_type: string }>(tx, sql`select entity_type from editorial.entities where id=${target.entity_id}`);
    if (entity && entity.entity_type !== target.payload.entity_type) result.errors.push({ entity_id: target.entity_id, path: '/entity_type', code: 'identity_type', message: 'This identity already belongs to a different entity type.' });
  }
  for (const source of content.sources) {
    const existing = sources.find(row => row.id === source.id);
    if (existing && contentHash(existing.payload) !== contentHash(source)) result.errors.push({ entity_id: content.targets[0]!.entity_id, path: '/sources', code: 'source_conflict', message: 'Existing citations are immutable. Use a new source ID for changed citation details.' });
  }
  return { ...result, context: current };
}
async function submitted(tx: CatalogTransaction, record: Proposal) {
  if (record.state !== 'submitted' || record.submitted_version !== record.version) conflict('This version is not awaiting review.');
  const [version] = await rows<{ content: Content; content_hash: string }>(tx, sql`select content,content_hash from editorial.proposal_versions where proposal_id=${record.id} and version=${record.version}`);
  if (!version) throw new Error('Missing immutable submission');
  return { content: ProposalContent.parse(version.content), hash: version.content_hash };
}

export class EditorialService {
  constructor(private db: CatalogDatabase) {}
  session(actor: Actor) { return this.db.transaction(tx => authorize(tx, actor)); }

  // A durable per-user limiter works across app processes. Called before parsing mutation bodies.
  consume(actor: Actor) { return this.db.transaction(async tx => {
    await authorize(tx, actor);
    const [limit] = await rows<{ count: number }>(tx, sql`insert into editorial.rate_limits(actor_id,window_start,count)
      values (${actor.userId},clock_timestamp(),1) on conflict(actor_id) do update set
      count=case when editorial.rate_limits.window_start < clock_timestamp()-interval '1 minute' then 1 else least(editorial.rate_limits.count+1,61) end,
      window_start=case when editorial.rate_limits.window_start < clock_timestamp()-interval '1 minute' then clock_timestamp() else editorial.rate_limits.window_start end returning count`);
    return limit!.count <= 60;
  }); }

  save(actor: Actor, input: unknown) {
    const command = SaveProposalCommand.parse(input);
    return this.db.transaction(async tx => {
      await authorize(tx, actor);
      if (command.expected_version === 0) {
        const inserted = await rows<Proposal>(tx, sql`insert into editorial.proposals(id,author_id,draft) values (${command.proposal_id},${actor.userId},${json(command.content)}) on conflict do nothing returning *`);
        if (!inserted.length) conflict('This proposal ID already exists.');
        await event(tx, actor, inserted[0]!, 'created');
        return inserted[0]!;
      }
      const record = await proposal(tx, actor, command.proposal_id, true);
      expected(record, command.expected_version);
      if (!['draft','submitted','changes_requested'].includes(record.state)) conflict('This proposal is closed. Create a new proposal instead.');
      if (record.state === 'submitted') await event(tx, actor, record, 'version_withdrawn');
      const [saved] = await rows<Proposal>(tx, sql`update editorial.proposals set version=version+1,state='draft',draft=${json(command.content)} where id=${record.id} returning *`);
      await event(tx, actor, saved!, 'draft_saved');
      return saved!;
    });
  }

  submit(actor: Actor, input: unknown) {
    const command = SubmitProposalCommand.parse(input);
    return this.db.transaction(async tx => {
      // The pilot serializes graph-changing commands. Stable rows are additionally locked on approval.
      await tx.execute(sql`select pg_advisory_xact_lock(173214,1)`);
      const record = await proposal(tx, actor, command.proposal_id, true);
      expected(record, command.expected_version);
      if (record.state !== 'draft') conflict('Save a new draft before submitting this proposal.');
      const content = ProposalContent.parse(record.draft);
      const current = await heads(tx);
      const result = await validate(tx, content, current);
      if (result.errors.length) throw new CommandError(result.errors.some(error => error.code === 'stale_base') ? 409 : 422, 'validation_failed', 'Fix the submission checks before submitting.', result.errors);
      const hash = contentHash(content);
      for (const target of [...content.targets].sort((a,b) => a.entity_id.localeCompare(b.entity_id))) await tx.execute(sql`insert into editorial.entities(id,entity_type) values (${target.entity_id},${target.payload.entity_type}) on conflict do nothing`);
      await tx.execute(sql`insert into editorial.proposal_versions(proposal_id,version,content,content_hash) values (${record.id},${record.version},${json(content)},${hash})`);
      for (const target of content.targets) await tx.execute(sql`insert into editorial.proposal_targets(proposal_id,proposal_version,entity_id,base_revision_id,payload) values (${record.id},${record.version},${target.entity_id},${target.base_revision_id},${json(target.payload)})`);
      await tx.execute(sql`update editorial.proposals set state='submitted',submitted_version=version where id=${record.id}`);
      const validationId = randomUUID();
      await tx.execute(sql`insert into editorial.validations(id,proposal_id,proposal_version,submitted_hash,validator_version,heads,result,actor_id) values (${validationId},${record.id},${record.version},${hash},${VALIDATOR_VERSION},${json(headMap(current))},${json(result)},${actor.userId})`);
      await event(tx, actor, record, 'submitted');
      return { proposal_id: record.id, version: record.version, state: 'submitted', submitted_hash: hash, validation_id: validationId, ...result };
    });
  }

  withdraw(actor: Actor, input: unknown) {
    const command = SubmitProposalCommand.parse(input);
    return this.db.transaction(async tx => {
      const record = await proposal(tx, actor, command.proposal_id, true);
      expected(record, command.expected_version);
      if (!['draft','submitted','changes_requested'].includes(record.state)) conflict('This proposal is already closed.');
      await tx.execute(sql`update editorial.proposals set state='withdrawn' where id=${record.id}`);
      await event(tx, actor, record, 'withdrawn');
      return { state: 'withdrawn' };
    });
  }

  validate(actor: Actor, input: unknown) {
    const command = SubmitProposalCommand.parse(input);
    return this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(173214,1)`);
      await authorize(tx, actor, true);
      const record = await proposal(tx, actor, command.proposal_id);
      expected(record, command.expected_version);
      const version = await submitted(tx, record);
      const current = await heads(tx);
      const result = await validate(tx, version.content, current);
      const id = randomUUID();
      await tx.execute(sql`insert into editorial.validations(id,proposal_id,proposal_version,submitted_hash,validator_version,heads,result,actor_id) values (${id},${record.id},${record.version},${version.hash},${VALIDATOR_VERSION},${json(headMap(current))},${json(result)},${actor.userId})`);
      return { id, submitted_hash: version.hash, ...result };
    });
  }

  review(actor: Actor, input: unknown) {
    const command = ReviewProposalCommand.parse(input);
    return this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(173214,1)`);
      await authorize(tx, actor, true);
      const [retry] = await rows<{ request_hash: string; result: Record<string, unknown> }>(tx, sql`select request_hash,result from editorial.command_results where actor_id=${actor.userId} and command='review' and idempotency_key=${command.idempotency_key}`);
      if (retry) {
        if (retry.request_hash !== contentHash(command)) conflict('This idempotency key was used for different review content.');
        return retry.result;
      }
      const record = await proposal(tx, actor, command.proposal_id);
      expected(record, command.expected_version);
      const version = await submitted(tx, record);
      if (version.hash !== command.submitted_hash) conflict('The submitted content does not match the content you reviewed.');
      const [reviewed] = await rows<Validation>(tx, sql`select * from editorial.validations where id=${command.validation_id} and proposal_id=${record.id} and proposal_version=${record.version} and submitted_hash=${version.hash}`);
      if (!reviewed || reviewed.validator_version !== VALIDATOR_VERSION) conflict('Run the current validation checks before deciding.');
      let approvalId: string | null = null;
      if (command.decision === 'approve') {
        // Lock all known graph dependencies plus new targets, in stable order. Full-graph validation
        // is deliberately conservative for the small pilot and catches incoming merge references.
        await tx.execute(sql`select id from editorial.entities order by id for update`);
        const current = await heads(tx);
        if (contentHash(headMap(current)) !== contentHash(reviewed.heads)) conflict('Approved dependencies changed. Run validation and review the new context.');
        const result = await validate(tx, version.content, current);
        if (result.errors.length) throw new CommandError(result.errors.some(error => error.code === 'stale_base') ? 409 : 422, 'validation_failed', 'Approval checks failed.', result.errors);
        approvalId = randomUUID();
        for (const source of version.content.sources) await tx.execute(sql`insert into editorial.sources(id,payload) values (${source.id},${json(source)}) on conflict do nothing`);
        await tx.execute(sql`insert into editorial.approvals(id,proposal_id,proposal_version,submitted_hash,reviewer_id,reason,validator_version) values (${approvalId},${record.id},${record.version},${version.hash},${actor.userId},${command.reason},${VALIDATOR_VERSION})`);
        // Release every changed target's old claims first, allowing an atomic reviewed transfer/merge.
        for (const target of version.content.targets) await tx.execute(sql`delete from editorial.identifier_claims where entity_id=${target.entity_id}`);
        for (const target of version.content.targets) {
          const revisionId = randomUUID();
          // Carry forward citations only when their addressed content is unchanged.
          const previous = current.find(row => row.entity_id === target.entity_id);
          const changed = changesBetween(previous?.payload, target.payload);
          const inherited = previous ? await rows<{ path: string; source_id: string; note: string | null }>(tx, sql`select field_path as path,source_id,note from editorial.revision_evidence where revision_id=${previous.revision_id}`) : [];
          const evidence = [...target.evidence, ...inherited.filter(item =>
            !changed.some(change => change.path === item.path || change.path.startsWith(`${item.path}/`) || item.path.startsWith(`${change.path}/`)) &&
            !target.evidence.some(value => value.path === item.path && value.source_id === item.source_id))];
          await insertApprovedRevision(tx, { revision_id: revisionId, approval_id: approvalId, payload: target.payload, evidence });
          if (target.payload.state === 'active' && 'identifiers' in target.payload) for (const identifier of target.payload.identifiers) await tx.execute(sql`insert into editorial.identifier_claims(namespace,value,entity_id) values (${identifier.namespace},${identifier.value},${target.entity_id})`);
          await tx.execute(sql`insert into editorial.approved_heads(entity_id,revision_id) values (${target.entity_id},${revisionId}) on conflict(entity_id) do update set revision_id=excluded.revision_id`);
        }
      }
      await authorize(tx, actor, true);
      const state = { approve: 'approved', reject: 'rejected', request_changes: 'changes_requested' }[command.decision];
      const decisionId = randomUUID();
      await tx.execute(sql`insert into editorial.decisions(id,proposal_id,proposal_version,submitted_hash,validation_id,actor_id,decision,reason,self_review) values (${decisionId},${record.id},${record.version},${version.hash},${reviewed.id},${actor.userId},${command.decision},${command.reason},${record.author_id === actor.userId})`);
      await tx.execute(sql`update editorial.proposals set state=${state} where id=${record.id}`);
      await event(tx, actor, record, state);
      const result = { proposal_id: record.id, version: record.version, state, decision_id: decisionId, approval_id: approvalId };
      await tx.execute(sql`insert into editorial.command_results(actor_id,command,idempotency_key,request_hash,result) values (${actor.userId},'review',${command.idempotency_key},${contentHash(command)},${json(result)})`);
      return result;
    });
  }

  list(actor: Actor) { return this.db.transaction(async tx => {
    const who = await authorize(tx, actor);
    return rows(tx, sql`select id,state,version,draft->>'title' as title,created_at from editorial.proposals where author_id=${actor.userId} or ${who.maintainer} order by created_at desc,id limit 100`);
  }); }
  detail(actor: Actor, id: string) { return this.db.transaction(async tx => {
    const record = await proposal(tx, actor, id);
    const versions = await rows(tx, sql`select version,content,content_hash,submitted_at from editorial.proposal_versions where proposal_id=${id} order by version`);
    const validations = await rows(tx, sql`select id,proposal_version,submitted_hash,result,validator_version from editorial.validations where proposal_id=${id} order by created_at desc limit 20`);
    const decisions = await rows(tx, sql`select decision,reason,self_review,proposal_version,created_at from editorial.decisions where proposal_id=${id} order by created_at`);
    const comments = await rows(tx, sql`select id,body,created_at,author_id=${actor.userId} as own from editorial.comments where proposal_id=${id} order by created_at limit 200`);
    const events = await rows(tx, sql`select event,version,created_at from editorial.proposal_events where proposal_id=${id} order by created_at`);
    return { ...record, own: record.author_id === actor.userId, author_id: undefined, versions, validations, decisions, comments, events };
  }); }
  comment(actor: Actor, input: unknown) {
    const command = CommentCommand.parse(input);
    return this.db.transaction(async tx => {
      await proposal(tx, actor, command.proposal_id);
      const id = randomUUID();
      await tx.execute(sql`insert into editorial.comments(id,proposal_id,author_id,body) values (${id},${command.proposal_id},${actor.userId},${command.body})`);
      return { id };
    });
  }
  report(actor: Actor, input: unknown) {
    const command = ReportCommand.parse(input);
    return this.db.transaction(async tx => {
      await authorize(tx, actor);
      if (command.entity_id && !(await rows(tx, sql`select entity_id from editorial.approved_heads where entity_id=${command.entity_id}`)).length) throw new CommandError(404, 'not_found', 'Record not found.');
      const inserted = await rows(tx, sql`insert into editorial.reports(id,author_id,entity_id,body,sources) values (${command.report_id},${actor.userId},${command.entity_id},${command.body},${json(command.sources)}) on conflict do nothing returning id`);
      if (!inserted.length) conflict('This report ID already exists.');
      return { id: command.report_id };
    });
  }
  reports(actor: Actor) { return this.db.transaction(async tx => {
    const who = await authorize(tx, actor);
    return rows(tx, sql`select id,entity_id,body,sources,created_at from editorial.reports where author_id=${actor.userId} or ${who.maintainer} order by created_at desc,id limit 100`);
  }); }
  records(actor: Actor) { return this.db.transaction(async tx => { await authorize(tx, actor); return heads(tx); }); }

  contribute(actor: Actor, input: unknown) {
    const command = SendContributionCommand.parse(input);
    return this.db.transaction(async tx => {
      await authorize(tx, actor);
      const inserted = await rows(tx, sql`insert into editorial.contributions(id,author_id,content) values (${command.contribution_id},${actor.userId},${json(command.content)}) on conflict do nothing returning id`);
      if (!inserted.length) {
        const [retry] = await rows<{ content: unknown }>(tx, sql`select content from editorial.contributions where id=${command.contribution_id} and author_id=${actor.userId}`);
        if (!retry || contentHash(retry.content) !== contentHash(command.content)) conflict('This submission ID has already been used.');
      }
      return { id: command.contribution_id };
    });
  }
  contributions(actor: Actor) { return this.db.transaction(async tx => {
    const who = await authorize(tx, actor);
    return rows(tx, sql`select id,content,state,created_at from editorial.contributions where author_id=${actor.userId} or ${who.maintainer} order by (state='received') desc,created_at desc,id limit 100`);
  }); }
  triageContribution(actor: Actor, input: unknown) {
    const command = TriageContributionCommand.parse(input);
    return this.db.transaction(async tx => {
      await authorize(tx, actor, true);
      const [updated] = await rows(tx, sql`update editorial.contributions set state=${command.state},triaged_by=${actor.userId},triaged_at=clock_timestamp() where id=${command.contribution_id} returning id,state`);
      if (!updated) throw new CommandError(404, 'not_found', 'Submission not found.');
      return updated;
    });
  }
}
