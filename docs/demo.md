# Local contribution and review demo

Allow about 5 minutes for quick contributions, or 15–20 minutes including maintainer approval. The current demo covers contributions and approval;
public catalog releases, exports, and consuming-app updates are later milestones.
The legacy YAML catalog stays unchanged.

Open <http://127.0.0.1:3100/contribute>. If needed, start the app with `npm run dev`.
Use a normal browser window for the contributor and a private window or separate
browser profile for the maintainer. Two ordinary tabs share the same sign-in.

Local demo credentials and account IDs are saved in `.local/demo-accounts.json`.
That file is ignored by Git. These accounts are for this local Supabase stack only;
no email is sent. For account administration, see [development.md](development.md).

## 1. Send a game with just its name

As the contributor, choose **Add a game**, enter **Demo Harbor**, and select
**Send game**. That is the whole submission. A receipt appears, and the name is
listed under **Your contributions** as **Received**. Refresh to confirm it persists.
No edition, source, explanation, or separate draft/submission step is required.

Try another game with **+ Add more information**. Pick any optional category:
general notes, links or sources, edition or version, players/time/age, designer or
publisher, or something else. Each accepts ordinary text. For example:

- General notes: “A harbor trading game. I don't remember the publisher.”
- Players, time, or age: “We play with 2–4 people; takes about half an hour.”
- Links or sources: “I saw it in a shop; no link yet.”

You can add, remove, or leave these fields blank. No bibliography or numeric format
is needed. The original wording is saved for later review; intake does not infer
facts or immediately change approved records.

## 2. Send a correction or report

Choose **Suggest a correction**, write “Demo Harbor has a solo mode, too,” and
select **Send correction**. You don't have to choose a catalog record or know
which field needs changing.

Choose **Report a problem**, write “The rules link on Demo Harbor is broken,” and
select **Send report**. A source or proposed solution is optional.

Both forms have the same optional information categories. Unsaved text survives
switching between the three forms during this visit; it is not saved across a
page reload. Successfully submitted text appears in your contribution list.

## 3. Triage as the maintainer

Refresh the maintainer window. The **Contribution inbox** includes the original
name, note, and optional details under **Additional information**.

- **Archive** puts an unhelpful or handled submission aside. **Reopen** returns it
  to received status. These actions preserve the original text.
- **Prepare catalog change** opens the detailed maintainer editor, copying the
  game name and notes where applicable. Organize and verify facts here. Selecting
  an existing edition for a correction is the maintainer's work.
- Saving a prepared proposal does not automatically archive the intake. Archive
  it once handled; an archived contribution is not an approval or rejection.

For the optional approval demo, use **Prepare catalog change** on Demo Harbor,
then enter these fictional verified details in the maintainer editor:

| Field | Value |
| --- | --- |
| Catalog game name | Demo Harbor |
| Edition name | English first edition |
| Publication year / language | 2025 / en |
| Supported player counts | 2, 3, 4 |
| Shortest / longest playtime | 20 / 40 minutes |
| Minimum age | 8 |
| Explanation | Add this fictional game and edition using the demo rulebook. |
| Source type | rulebook |
| Source URL | http://127.0.0.1:3100/demo/harbor-rules.txt |
| Source title | Demo Harbor — English first edition rules |
| Publisher or author | Demo Studio (fictional) |
| Page or section | Pages 1–2 |

Save the draft and submit it for review. Run **Check current proposal**, inspect
the source and before/after values, then record a reason and decision. Self-review
is recorded when the maintainer prepares and approves the same proposal. Approval
makes records eligible for a future release; it does not publish them.

For a later correction, the fictional [solo addendum](http://127.0.0.1:3100/demo/harbor-solo-addendum.txt)
supports changing the same edition to `1, 2, 3, 4` players.

## Things to test

| Try | Expected result |
| --- | --- |
| Send only a game name | Received immediately, with no source or edition requirement. |
| Send a one-sentence correction or problem | Received without selecting a record or entering structured facts. |
| Add uncertain facts, pasted prose, or incomplete links | Wording is preserved; no numeric or URL validation blocks feedback. |
| Open an optional category and leave it blank | Sending still works. |
| Remove an optional category | That text is removed from the form and the submission. |
| Switch between the three forms before sending | Each retains its own unsaved text during this visit. |
| Send an empty or whitespace-only name/note | A prompt asks for the one essential field. |
| Lose the network response and retry the same text | Text remains available; a retry does not duplicate a saved submission. |
| Refresh after sending | The saved contribution and its current status remain visible. |
| Use a different contributor account | It cannot see someone else's contributions. |
| Archive and reopen as maintainer | Status changes; the original text stays intact. |
| Submit a name that already exists | Intake accepts it; the maintainer handles duplicates during preparation/review. |
| Use a narrow mobile window or keyboard navigation | The main field, optional controls, and send action remain usable. |
| Sign out | Private contribution content and actions are hidden. |

The structured proposal review still checks citations, current catalog context,
permissions, stale versions, and approval atomicity. Receiving raw feedback never
bypasses those checks. Automated parsing/enrichment is not implemented; the raw
text is available for a future parser and current maintainer review.

## Automated checks

After stopping the demo dev server, run:

```sh
npm run check
npm run test:supabase
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

The browser command also covers real HTTP ownership, role and session-revocation
checks and removes its own generated test data. It does not remove your manually
created demo proposals or accounts. It starts its own Next.js process, so it must
not run alongside this workspace's dev/build process. With Playwright's bundled
Chromium installed, use `npm run test:browser` without the Chrome channel variable.
