'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import type { ContributionContent } from '@catalog/contracts';

export type Contribution = { id: string; state: 'received' | 'archived'; content: typeof ContributionContent._output };
type Content = Contribution['content'];
type Kind = Content['kind'];
type Category = Content['details'][number]['category'];
export const categories: Record<Category, { label: string; hint: string }> = {
  notes: { label: 'General notes', hint: 'Anything you know, in your own words. A pasted description is fine.' },
  links: { label: 'Links or sources', hint: 'Paste links, a quote, a book title, or where you heard about it.' },
  edition: { label: 'Edition or version', hint: 'A language, year, expansion, or anything that identifies the version.' },
  play: { label: 'Players, time, or age', hint: 'For example: We play with 2–5 people and it takes about an hour.' },
  credits: { label: 'Designer or publisher', hint: 'Names, credits, or anything you remember.' },
  other: { label: 'Something else', hint: 'Anything else you would like to share.' },
};
const labels: Record<Kind, string> = { game: 'Add a game', correction: 'Suggest a correction', problem: 'Report a problem' };
const empty = (kind: Kind): Content => ({ kind, name: '', body: '', details: [] });

export default function QuickContribution({ busy, send }: {
  busy: boolean;
  send: (id: string, content: Content) => Promise<void>;
}) {
  const [kind, setKind] = useState<Kind>('game');
  const [drafts, setDrafts] = useState<Record<Kind, Content>>({ game: empty('game'), correction: empty('correction'), problem: empty('problem') });
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const retries = useRef<Partial<Record<Kind, { id: string; body: string }>>>({});
  const locked = useRef(false);
  const optionsId = useId();
  const draft = drafts[kind];
  const disabled = busy || sending;
  function update(changes: Partial<Content>) {
    setDrafts(current => ({ ...current, [kind]: { ...current[kind], ...changes } }));
    setError(''); setReceipt('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    if (!(kind === 'game' ? draft.name : draft.body).trim()) {
      setError(kind === 'game' ? 'Give us a game name.' : 'Tell us what you noticed.'); return;
    }
    locked.current = true; setSending(true); setError(''); setReceipt('');
    // A retry after a lost response uses the same ID and never creates a duplicate.
    const body = JSON.stringify(draft);
    const retry = retries.current[kind];
    const id = retry?.body === body ? retry.id : crypto.randomUUID();
    retries.current[kind] = { id, body };
    try {
      await send(id, draft);
      setDrafts(current => ({ ...current, [kind]: empty(kind) }));
      delete retries.current[kind]; setExpanded(false);
      setReceipt('Thanks! Your submission has been received. You can find it below.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not send. Your text is still here; please try again.'); }
    finally { locked.current = false; setSending(false); }
  }
  return <section aria-labelledby="contribution-title" className="quick-contribution">
    <h2 id="contribution-title">Share what you know</h2>
    <div className="actions contribution-kinds">{(Object.keys(labels) as Kind[]).map(value =>
      <button type="button" key={value} aria-pressed={kind === value} disabled={disabled} onClick={() => { setKind(value); setExpanded(false); setError(''); setReceipt(''); }}>{labels[value]}</button>
    )}</div>
    <form onSubmit={event => void submit(event)}>
      <fieldset disabled={disabled} className="plain-fieldset">
        {kind === 'game' ? <>
          <label htmlFor="quick-game-name">Game name</label>
          <input id="quick-game-name" value={draft.name} onChange={event => update({ name: event.target.value })} required maxLength={10000} placeholder="What’s the game called?" aria-describedby="contribution-hint" />
          <p id="contribution-hint" className="hint">Just the name is enough. Add anything else you know if you like.</p>
        </> : <>
          <label htmlFor="quick-note">{kind === 'correction' ? 'What should we correct?' : 'What went wrong?'}</label>
          <textarea id="quick-note" value={draft.body} onChange={event => update({ body: event.target.value })} required maxLength={10000} placeholder={kind === 'correction' ? 'For example: Demo Harbor has a solo mode, too.' : 'Tell us what you noticed…'} aria-describedby="contribution-hint" />
          <p id="contribution-hint" className="hint">A quick note is enough. Mention the game or page if you know it.</p>
        </>}
        {draft.details.map((detail, index) => <div className="extra-information" key={`${kind}:${detail.category}`}>
          <div className="extra-heading"><label htmlFor={`extra-${detail.category}`}>{categories[detail.category].label} <span className="hint">(optional)</span></label>
            <button type="button" className="text-button" aria-label={`Remove ${categories[detail.category].label.toLowerCase()}`} onClick={() => update({ details: draft.details.filter((_, position) => position !== index) })}>Remove</button></div>
          <textarea autoFocus id={`extra-${detail.category}`} value={detail.text} maxLength={10000} placeholder={categories[detail.category].hint} onChange={event => update({ details: draft.details.map((item, position) => position === index ? { ...item, text: event.target.value } : item) })} />
        </div>)}
        <button className="secondary-button add-information" type="button" aria-expanded={expanded} aria-controls={optionsId} onClick={() => setExpanded(!expanded)}><span aria-hidden="true">+ </span>Add more information</button>
        {expanded && <div id={optionsId} className="information-options"><p className="hint">Choose anything you want to add. Plain text is fine.</p><div className="actions">
          {(Object.keys(categories) as Category[]).filter(category => !draft.details.some(detail => detail.category === category)).map(category => <button className="secondary-button" type="button" key={category} onClick={() => { update({ details: [...draft.details, { category, text: '' }] }); setExpanded(false); }}>{categories[category].label}</button>)}
          {draft.details.length === Object.keys(categories).length && <p>All optional categories are open above.</p>}
        </div></div>}
        <div className="send-contribution"><button type="submit">{sending ? 'Sending…' : kind === 'game' ? 'Send game' : kind === 'correction' ? 'Send correction' : 'Send report'}</button><span className="hint">We’ll take it from here.</span></div>
      </fieldset>
      {error && <p role="alert" className="notice">{error}</p>}
      {receipt && <p role="status" className="receipt">{receipt}</p>}
    </form>
  </section>;
}
