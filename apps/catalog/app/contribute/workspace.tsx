'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CatalogRecord, ProposalContent, Source } from '@catalog/contracts';
import QuickContribution, { categories, type Contribution } from './quick-contribution';

type Content = typeof ProposalContent._output;
type RecordRow = { entity_id: string; revision_id: string; payload: CatalogRecord };
type ListItem = { id: string; title: string; state: string; version: number };
type Checks = { id: string; submitted_hash: string; context: RecordRow[]; errors: { path: string; message: string }[]; warnings: { message: string }[]; changes: { entity_id: string; path: string; before: unknown; after: unknown }[] };
type Detail = { id: string; own: boolean; state: string; version: number; draft: Content; decisions: { decision: string; reason: string; self_review: boolean }[]; comments: { id: string; body: string; own: boolean }[]; events: { event: string; version: number }[] };
let client: SupabaseClient | undefined;
function browserAuth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return client ??= createClient(url, key);
}
const today = () => new Date().toISOString().slice(0, 10);
function display(value: unknown): string {
  if (value === null) return 'Unknown';
  if (Array.isArray(value)) return value.length ? value.map(display).join('; ') : 'None recorded';
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    if (item.kind === 'exact') return `Supported counts: ${(item.counts as number[]).join(', ')}`;
    if (item.kind === 'at_least') return `${item.min} or more players`;
    if (item.kind === 'standalone') return 'Standalone';
    return Object.entries(item).map(([key, child]) => `${key.replaceAll('_',' ')}: ${display(child)}`).join(' · ');
  }
  return String(value);
}
const fieldLabel = (path: string) => path.split('/').filter(Boolean).map(part => /^\d+$/.test(part) ? `entry ${Number(part) + 1}` : part.replaceAll('_',' ')).join(' → ');
const recordName = (record: CatalogRecord) => record.state === 'active' && 'name' in record ? record.name : record.state === 'active' && 'label' in record ? record.label : record.id;

export default function Workspace() {
  const [signedIn, setSignedIn] = useState(false);
  const [maintainer, setMaintainer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  type Report = { id: string; body: string; entity_id: string | null; sources: typeof Source._output[] };
  const [reports, setReports] = useState<Report[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [intake, setIntake] = useState<Contribution | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [checks, setChecks] = useState<Checks | null>(null);
  const [mode, setMode] = useState('game');
  const [selected, setSelected] = useState('');
  const [contextIndex, setContextIndex] = useState(0);
  const [editing, setEditing] = useState<Detail | null>(null);
  const [reviewKey, setReviewKey] = useState<string | null>(null);

  async function api<T>(path: string, body?: unknown): Promise<T> {
    const auth = browserAuth();
    if (!auth) throw new Error('Contributions are not configured yet.');
    const { data } = await auth.auth.getSession(); // Transport only; server validates identity and session.
    const response = await fetch(`/api/editorial/v1/${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) { setSignedIn(false); setDetail(null); }
      const fields = Array.isArray(result.error?.fields) ? result.error.fields.map((field: { path: unknown; message: string }) => `${Array.isArray(field.path) ? field.path.join('.') : field.path}: ${field.message}`).join(' ') : '';
      throw new Error(`${result.error?.message ?? 'The request failed.'} ${fields}`.trim());
    }
    return result.data;
  }
  async function refresh() {
    const who = await api<{ maintainer: boolean }>('session');
    setMaintainer(who.maintainer); setSignedIn(true);
    const [proposals, catalog, problems, feedback] = await Promise.all([api<ListItem[]>('proposals'), api<RecordRow[]>('records'), api<Report[]>('reports'), api<Contribution[]>('contributions')]);
    setItems(proposals); setRecords(catalog); setReports(problems); setContributions(feedback);
  }
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const auth = browserAuth();
    if (!auth) return;
    void auth.auth.getSession().then(({ data }) => { if (data.session) void run(refresh); });
    const { data } = auth.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') { setSignedIn(false); setDetail(null); setChecks(null); setItems([]); setRecords([]); setReports([]); setContributions([]); setIntake(null); setEditing(null); setPreparing(false); } });
    return () => data.subscription.unsubscribe();
    // All data/permissions are refreshed from the server after sign-in or a command.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function open(id: string) { setChecks(null); setReviewKey(null); setDetail(await api<Detail>(`proposals/${id}`)); }
  function edit(record: Detail) {
    const edition = record.draft.targets.find(target => target.payload.entity_type === 'edition');
    const game = record.draft.targets.find(target => target.payload.entity_type === 'game');
    const context = edition?.evidence.map(item => item.path.match(/^\/play_specifications\/(\d+)\//)?.[1]).find(Boolean);
    setIntake(null); setEditing(record); setDetail(null); setMode(game && game.base_revision_id === null ? 'game' : 'correction'); setSelected(edition?.entity_id ?? ''); setContextIndex(Number(context ?? 0));
  }
  async function saveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await run(async () => {
      const text = (key: string) => String(form.get(key) ?? '').trim();
      const number = (key: string) => text(key) ? Number(text(key)) : null;
      const source = { id: crypto.randomUUID(), url: text('url'), title: text('source_title'), publisher: text('publisher'), source_type: text('source_type'), accessed_on: text('accessed_on'), locator: text('locator') || null };
      if (mode === 'report') {
        await api('reports', { report_id: crypto.randomUUID(), entity_id: selected || null, body: text('rationale'), sources: text('url') ? [source] : [] });
        setMessage('Problem reported. You can follow it below.'); await refresh(); return;
      }
      const existingGame = editing?.draft.targets.find(target => target.payload.entity_type === 'game');
      const existingEdition = editing?.draft.targets.find(target => target.payload.entity_type === 'edition');
      const gameId = existingGame?.entity_id ?? crypto.randomUUID();
      const editionId = existingEdition?.entity_id ?? crypto.randomUUID();
      const base = { schema_version: 1, state: 'active', field_notes: [], aliases: [] };
      const cite = (paths: string[]) => paths.map(path => ({ path, source_id: source.id, note: source.locator }));
      const counts = text('players').split(',').map(value => Number(value.trim())).sort((a,b) => a-b);
      const support = text('players') ? text('support_kind') === 'at_least' ? { kind: 'at_least' as const, min: Number(text('players')) } : { kind: 'exact' as const, counts } : null;
      const duration = number('time_min') === null && number('time_max') === null ? null : { min: number('time_min'), max: number('time_max') };
      let targets: Content['targets'];
      if (mode === 'game') {
        const game = CatalogRecord.parse({ ...base, id: gameId, entity_type: 'game', name: text('name'), description: null, kind: 'base_game', first_published_year: number('year'), designers: [], mechanics: [], themes: [], styles: [], families: [], default_edition_id: editionId, identifiers: [], relationships: [] });
        const edition = CatalogRecord.parse({ ...base, id: editionId, entity_type: 'edition', game_id: gameId, name: text('edition_name'), publication_year: number('year'), languages: text('language') ? [text('language')] : [], publishers: [], artists: [], identifiers: [], compatible_with: [], play_specifications: [{ context: { kind: 'standalone' }, player_support: support, playtime_minutes: duration, min_age: number('age') }] });
        targets = [{ entity_id: gameId, base_revision_id: null, payload: game, evidence: cite(['/name', '/first_published_year']) }, { entity_id: editionId, base_revision_id: null, payload: edition, evidence: cite(['/name','/game_id','/publication_year','/languages','/play_specifications']) }];
      } else {
        const original = records.find(record => record.entity_id === selected);
        if (!original || original.payload.state !== 'active' || original.payload.entity_type !== 'edition') throw new Error('Choose an edition to correct.');
        const index = Number(text('context'));
        const specs = structuredClone(original.payload.play_specifications);
        if (!specs[index]) throw new Error('Choose a play context.');
        specs[index] = { ...specs[index], player_support: support, playtime_minutes: duration, min_age: number('age') };
        const payload = CatalogRecord.parse({ ...original.payload, play_specifications: specs });
        targets = [{ entity_id: selected, base_revision_id: original.revision_id, payload, evidence: cite([`/play_specifications/${index}/player_support`, `/play_specifications/${index}/playtime_minutes`, `/play_specifications/${index}/min_age`]) }];
      }
      const content = ProposalContent.parse({ title: mode === 'game' ? `Add ${text('name')}` : `Correct ${records.find(record => record.entity_id === selected)?.payload.state === 'active' ? 'edition play details' : 'edition'}`, rationale: text('rationale'), origin: text('origin'), targets, sources: [source] });
      const saved = await api<{ id: string }>('proposals/save', { proposal_id: editing?.id ?? crypto.randomUUID(), expected_version: editing?.version ?? 0, content });
      setEditing(null); setIntake(null); setPreparing(false); await refresh(); await open(saved.id); setMessage('Draft saved. Review it below, then submit it for review.');
    });
  }

  if (!browserAuth()) return <p>Contributions are not configured yet. Follow the local development guide to connect the app.</p>;
  if (!signedIn) return <section><h2>Sign in</h2><form onSubmit={event => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void run(async () => { const { error } = await browserAuth()!.auth.signInWithPassword({ email: String(data.get('email')), password: String(data.get('password')) }); if (error) throw new Error('Sign-in failed. Check your email and password.'); await refresh(); });
  }}><label>Email<input name="email" type="email" autoComplete="username" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label><button disabled={busy}>Sign in</button></form><p>Use your catalog contributor account.</p><p role="status">{message}</p></section>;

  const current = records.find(record => record.entity_id === selected)?.payload;
  const editedGame = editing?.draft.targets.find(target => target.payload.entity_type === 'game')?.payload;
  const editedEdition = editing?.draft.targets.find(target => target.payload.entity_type === 'edition')?.payload;
  const edition = editedEdition?.state === 'active' && editedEdition.entity_type === 'edition' ? editedEdition : current?.state === 'active' && current.entity_type === 'edition' ? current : null;
  const spec = edition?.play_specifications[contextIndex];
  const oldSource = editing?.draft.sources[0];
  return <>
    <div className="actions"><span>{maintainer ? 'Maintainer workspace' : 'Contributor workspace'}</span><button disabled={busy} onClick={() => void run(refresh)}>Refresh</button><button disabled={busy} onClick={() => void run(async () => { const { error } = await browserAuth()!.auth.signOut({ scope: 'local' }); if (error) throw error; })}>Sign out</button></div>
    <p role="status" className="notice">{message}</p>
    <QuickContribution busy={busy} send={async (id, content) => {
      setBusy(true);
      try { await api('contributions', { contribution_id: id, content }); }
      finally { setBusy(false); }
      // A refresh failure must not turn a successful send into a failed submission.
      await run(refresh);
    }} />
    <section><h2>{maintainer ? 'Contribution inbox' : 'Your contributions'}</h2>
      {!contributions.length && <p>No contributions yet.</p>}
      <ul className="contribution-list">{contributions.map(item => <li key={item.id}>
        <p><strong>{item.content.kind === 'game' ? item.content.name : item.content.kind === 'correction' ? 'Suggested correction' : 'Problem report'}</strong> · {item.state === 'received' ? 'Received' : 'Archived'}</p>
        {item.content.body && <p>{item.content.body}</p>}
        {!!item.content.details.length && <details><summary>Additional information</summary><dl>{item.content.details.map((detail, index) => <div key={index}><dt>{categories[detail.category].label}</dt><dd>{detail.text || 'No details added'}</dd></div>)}</dl></details>}
        {maintainer && <div className="actions">
          <button disabled={busy} onClick={() => { setIntake(item); setEditing(null); setSelected(''); setContextIndex(0); setMode(item.content.kind === 'correction' ? 'correction' : 'game'); setPreparing(true); }}>Prepare catalog change</button>
          <button className="secondary-button" disabled={busy} onClick={() => void run(async () => { await api('contributions/triage', { contribution_id: item.id, state: item.state === 'received' ? 'archived' : 'received' }); await refresh(); })}>{item.state === 'received' ? 'Archive' : 'Reopen'}</button>
        </div>}
      </li>)}</ul>
    </section>
    {(maintainer || editing) && <details className="catalog-editor" open={preparing || !!editing} onToggle={event => setPreparing(event.currentTarget.open)}>
    <summary>Prepare a catalog change</summary>
    <section><h2>{editing ? 'Revise your proposal' : 'Catalog change details'}</h2>
      <p>Maintainer tools: organize the submitted information, verify sources, and prepare a change for review.</p>
      {intake && <aside><h3>Original submission</h3><p className="intake-note">{[intake.content.name, intake.content.body, ...intake.content.details.map(detail => `${categories[detail.category].label}: ${detail.text}`)].filter(Boolean).join('\n\n')}</p></aside>}
      {!editing && <div className="actions">{[['game','New game and edition'],['correction','Correct edition details']].map(([value,label]) => <button key={value} aria-pressed={mode === value} disabled={busy} onClick={() => { setMode(value!); setSelected(''); }}>{label}</button>)}</div>}
      {mode === 'game' && <p>Check for an existing design first. This editor prepares a base game and edition; resolve uncertain identities before preparing a proposal.</p>}
      <form key={`${mode}:${selected}:${contextIndex}:${editing?.version ?? ''}:${intake?.id ?? ''}`} onSubmit={event => void saveForm(event)}>
        {mode !== 'game' && <label>{mode === 'report' ? 'Affected record (optional)' : 'Edition'}<select aria-label={mode === 'report' ? 'Affected record (optional)' : 'Edition'} value={selected} onChange={event => { setSelected(event.target.value); setContextIndex(0); }} required={mode !== 'report'}><option value="">Choose a record</option>{records.filter(row => row.payload.state === 'active' && (mode === 'report' || row.payload.entity_type === 'edition')).map(row => <option key={row.entity_id} value={row.entity_id}>{row.payload.state === 'active' && 'name' in row.payload ? row.payload.name : row.entity_id} · {row.payload.entity_type}</option>)}</select></label>}
        {mode === 'game' && <><label>Catalog game name<input name="name" required maxLength={300} defaultValue={editedGame?.state === 'active' && 'name' in editedGame ? editedGame.name : intake?.content.name ?? ''} /></label><label>Edition name<input name="edition_name" required maxLength={300} defaultValue={edition?.name ?? ''} placeholder="English first edition" /></label><label>Publication year (optional)<input name="year" type="number" min={-9999} max={9999} defaultValue={edition?.publication_year ?? ''} /></label><label>Edition language (optional)<input name="language" placeholder="en" defaultValue={edition?.languages[0] ?? ''} /></label></>}
        {mode !== 'report' && <>
          {mode === 'correction' && edition && <><p>This edition belongs to game {records.find(row => row.entity_id === edition.game_id)?.payload.state === 'active' && 'name' in records.find(row => row.entity_id === edition.game_id)!.payload ? (records.find(row => row.entity_id === edition.game_id)!.payload as { name: string }).name : edition.game_id}.</p><label>Play context<select aria-label="Play context" name="context" value={contextIndex} onChange={event => setContextIndex(Number(event.target.value))}>{edition.play_specifications.map((value,index) => <option key={index} value={index}>{value.context.kind === 'standalone' ? 'Standalone' : `With base game ${value.context.base_game_id}`}</option>)}</select></label></>}
          <label>Player count format<select aria-label="Player count format" name="support_kind" defaultValue={spec?.player_support?.kind ?? 'exact'}><option value="exact">Exact supported counts</option><option value="at_least">Minimum with no upper bound</option></select></label>
          <label>Supported player counts or minimum (optional)<input name="players" placeholder="1, 2, 3, 4" defaultValue={spec?.player_support?.kind === 'exact' ? spec.player_support.counts.join(', ') : spec?.player_support?.min ?? ''} /></label>
          <div className="fields"><label>Shortest playtime, minutes (optional)<input name="time_min" type="number" min="1" defaultValue={spec?.playtime_minutes?.min ?? ''} /></label><label>Longest playtime, minutes (optional)<input name="time_max" type="number" min="1" defaultValue={spec?.playtime_minutes?.max ?? ''} /></label><label>Minimum age (optional)<input name="age" type="number" min="1" defaultValue={spec?.min_age ?? ''} /></label></div>
          <label>How was this prepared?<select aria-label="How was this prepared?" name="origin" defaultValue={editing?.draft.origin ?? 'human'}><option value="human">Written by me</option><option value="ai">Assisted by AI</option><option value="import">Imported research</option></select></label>
        </>}
        <label>{mode === 'report' ? 'Describe the problem' : 'Explain the change and how the source supports it'}<textarea name="rationale" required maxLength={10000} defaultValue={editing?.draft.rationale ?? (intake ? [intake.content.body, ...intake.content.details.map(detail => `${categories[detail.category].label}: ${detail.text}`)].filter(Boolean).join('\n\n') : '')} /></label>
        <fieldset><legend>{mode === 'report' ? 'Source (optional)' : 'Supporting source'}</legend><label>Source type<select aria-label="Source type" name="source_type" defaultValue={oldSource?.source_type ?? 'rulebook'}>{Source.shape.source_type.options.map(type => <option key={type} value={type}>{type}</option>)}</select></label><label>Source URL<input name="url" type="url" required={mode !== 'report'} defaultValue={oldSource?.url ?? ''} /></label><label>Source title<input name="source_title" required={mode !== 'report'} defaultValue={oldSource?.title ?? ''} /></label><label>Publisher or author<input name="publisher" required={mode !== 'report'} defaultValue={oldSource?.publisher ?? ''} /></label><label>Page or section<input name="locator" defaultValue={oldSource?.locator ?? ''} /></label><label>Date consulted<input name="accessed_on" type="date" required defaultValue={oldSource?.accessed_on ?? today()} /></label></fieldset>
        <div className="actions"><button disabled={busy}>{mode === 'report' ? 'Send report' : 'Save draft'}</button>{editing && <button type="button" onClick={() => setEditing(null)}>Cancel revision</button>}</div>
      </form>
    </section>
    </details>}
    {(maintainer || items.length > 0) && <section><h2>{maintainer ? 'Review queue and submissions' : 'Catalog proposals'}</h2>{!items.length && <p>No submissions yet.</p>}<ul>{items.map(item => <li key={item.id}><button disabled={busy} onClick={() => void run(() => open(item.id))}>{item.title}</button> <span>{item.state.replaceAll('_',' ')} · version {item.version}</span></li>)}</ul></section>}
    {detail && <section><h2>{detail.draft.title}</h2><p>{detail.state.replaceAll('_',' ')} · version {detail.version} · {detail.draft.origin}</p><p>{detail.draft.rationale}</p>
      <h3>Proposed records</h3>{detail.draft.targets.map(target => <div key={target.entity_id}><strong>{target.payload.entity_type} · {target.payload.state === 'active' && 'name' in target.payload ? target.payload.name : target.entity_id}</strong><dl>{Object.entries(target.payload).filter(([key]) => !['schema_version','id','entity_type'].includes(key)).map(([key,value]) => <div key={key}><dt>{key.replaceAll('_',' ')}</dt><dd>{display(value)}</dd></div>)}</dl></div>)}
      <h3>Evidence</h3><ul>{detail.draft.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> — {source.publisher}; {source.locator}; consulted {source.accessed_on}<ul>{detail.draft.targets.flatMap(target => target.evidence.filter(evidence => evidence.source_id === source.id).map(evidence => <li key={`${target.entity_id}:${evidence.path}`}>{fieldLabel(evidence.path)}: {evidence.note}</li>))}</ul></li>)}</ul>
      <div className="actions">{detail.own && ['draft','submitted','changes_requested'].includes(detail.state) && <><button disabled={busy} onClick={() => edit(detail)}>Revise draft</button><button disabled={busy} onClick={() => void run(async () => { await api('proposals/withdraw', { proposal_id: detail.id, expected_version: detail.version }); await refresh(); await open(detail.id); })}>Withdraw</button></>}{detail.own && detail.state === 'draft' && <button disabled={busy} onClick={() => void run(async () => { await api('proposals/submit', { proposal_id: detail.id, expected_version: detail.version }); await refresh(); await open(detail.id); })}>Submit for review</button>}{maintainer && detail.state === 'submitted' && <button disabled={busy} onClick={() => void run(async () => { setChecks(await api<Checks>('proposals/validate', { proposal_id: detail.id, expected_version: detail.version })); setReviewKey(crypto.randomUUID()); })}>Check current proposal</button>}</div>
      {checks && <><h3>Review checks</h3><p>{checks.errors.length ? 'Blocking checks must be fixed.' : 'Structural and evidence checks passed. Verify the sources support the claims.'}</p><ul>{checks.errors.map((error,i) => <li key={i}>{error.path}: {error.message}</li>)}{checks.warnings.map((warning,i) => <li key={`w${i}`}>{warning.message}</li>)}</ul><div className="table-scroll"><table><thead><tr><th>Record</th><th>Field</th><th>Before</th><th>Proposed</th></tr></thead><tbody>{checks.changes.map((change,i) => <tr key={i}><td>{detail.draft.targets.filter(target => target.entity_id === change.entity_id).map(target => `${target.payload.entity_type}: ${recordName(target.payload)}`).join()}</td><th title={change.path}>{fieldLabel(change.path)}</th><td>{display(change.before)}</td><td>{display(change.after)}</td></tr>)}</tbody></table></div><details><summary>Approved catalog context used by these checks</summary>{checks.context.map(row => <div key={row.entity_id}><h4>{row.payload.entity_type}: {recordName(row.payload)}</h4><p>{display(row.payload)}</p></div>)}</details><form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(async () => { await api('proposals/review', { proposal_id: detail.id, expected_version: detail.version, submitted_hash: checks.submitted_hash, validation_id: checks.id, decision: data.get('decision'), reason: data.get('reason'), idempotency_key: reviewKey }); await refresh(); await open(detail.id); }); }}><label>Decision<select aria-label="Decision" name="decision" onChange={() => setReviewKey(crypto.randomUUID())}><option value="request_changes">Request changes</option><option value="reject">Reject</option><option value="approve" disabled={checks.errors.length > 0}>Approve for a future release</option></select></label><label>Decision reason, including any warnings<textarea name="reason" required onChange={() => setReviewKey(crypto.randomUUID())} /></label><label className="check"><input type="checkbox" required />I reviewed this version and its supporting evidence.</label><button disabled={busy}>Record decision</button></form></>}
      <h3>Decisions and discussion</h3>{detail.decisions.map((decision,i) => <p key={i}><strong>{decision.decision.replaceAll('_',' ')}{decision.self_review ? ' (self-review)' : ''}</strong>: {decision.reason}</p>)}{detail.comments.map(comment => <p key={comment.id}><strong>{comment.own ? 'You' : 'Participant'}</strong>: {comment.body}</p>)}<form onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const body = new FormData(form).get('body'); void run(async () => { await api('comments', { proposal_id: detail.id, body }); await open(detail.id); form.reset(); }); }}><label>Add a comment<textarea name="body" required maxLength={10000} /></label><button disabled={busy}>Comment</button></form>
    </section>}
    {reports.length > 0 && <section><h2>Earlier problem reports</h2>{reports.length ? <ul>{reports.map(report => <li key={report.id}><p>{report.body}</p>{report.entity_id && <p>Affected record: {records.find(row => row.entity_id === report.entity_id) ? recordName(records.find(row => row.entity_id === report.entity_id)!.payload) : report.entity_id}</p>}<ul>{report.sources.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> — {source.publisher}; {source.locator}</li>)}</ul></li>)}</ul> : <p>No reports yet.</p>}</section>}
    {maintainer && <section><h2>Approved records for contribution lookup</h2><p>Approval makes a record eligible for a future release. Publication is a separate step.</p>{records.length ? <ul>{records.map(row => <li key={row.entity_id}>{row.payload.state === 'active' && 'name' in row.payload ? row.payload.name : row.entity_id} · {row.payload.entity_type}</li>)}</ul> : <p>No records have been approved yet.</p>}</section>}
  </>;
}
