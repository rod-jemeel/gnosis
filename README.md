# Gnosis

Evidence-first document question answering. Gnosis answers questions from an
authorized document collection and shows the exact passage, revision, and
physical page behind every claim — and says so honestly when the documents
don't answer.

Positioning: **an evidence-first RAG system with version-aware retrieval,
inspectable claim-to-source attribution, durable ingestion, and reproducible
evaluations.** It is not an autonomous research agent and does not guarantee
that every answer is true; it guarantees that you can inspect the evidence.

## Quickstart (demo mode — no configuration)

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. With no environment variables set, the app runs
in **demo mode**:

- a curated, fully synthetic corpus (Acme Platform docs) with a revision-2
  replacement and a deliberate cross-document conflict;
- a local evidence pipeline: lexical + dense-style candidate retrieval,
  reciprocal-rank fusion, simulated reranking, and **extractive** answer
  synthesis — every claim is an exact sentence from a retrieved, authorized
  chunk, so no citation can be fabricated;
- honest outcomes: `answered`, `partial`, `conflicting_sources`,
  `insufficient_evidence`, and `clarification_required`;
- real client-side PDF text extraction (PDF.js) for uploads, with staged,
  resumable index builds (`queued → validating → parsing → chunking →
  embedding → indexing → checking → ready → activate`);
- durable two-step runs (POST a run, subscribe to its event stream),
  cancellation, refresh-surviving state, and diagnostics;
- nothing leaves the browser.

Try the curated suggestions on the empty chat screen — including the
conflicting-rollback question and the unanswerable one.

## Configuration

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enable real Supabase authentication (accounts, sessions). Without them, a clearly-labeled local demo identity is used. |
| `NEXT_PUBLIC_GNOSIS_API` | Base URL of a backend implementing the `/v2` contract. Requests send the Supabase access token as a Bearer token; without it, the local demo client is used. |

## Architecture (web app)

```
app/
  (marketing)/       Landing page: the evidence workflow and honest capabilities
  (app)/chat         Unified chat: scope selection, strict-mode status, outcomes,
                     Evidence Explorer (separate scope/view/evidence state)
  (app)/documents    Document list + detail (Original file / Extracted text /
                     Index build / Activity)
  (app)/diagnostics  Own runs with sanitized retrieval details; lifecycle alerts
  (app)/settings     Workspace, membership, quotas, privacy, appearance
lib/
  v2/                Versioned API contract: types, HTTP client (Bearer +
                     Idempotency-Key + cursor pagination + SSE), demo engine
  workspace/         Workspace/client context
  supabase/          Optional auth wiring (client, server, proxy middleware)
components/
  chat/ evidence/ documents/ v2/ pdf/
```

Key contract decisions (see `lib/v2/types.ts`):

- **Explicit search scope** — `all_current` or a nonempty `selected_documents`
  list; an empty list is never treated as "all" (RET-01).
- **Stable evidence identity** — evidence IDs (E1, E2…) are assigned once and
  shared by chat, explorer, persistence, and replay; display numbers like
  `[1]` are presentation labels only (§14.2).
- **Outcome ≠ execution state** — a completed `insufficient_evidence` run is a
  correct answer, not an infrastructure failure (§15.4).
- **Honest progress** — ingestion shows actual stages; no invented percentages
  (DOC-02). Page-level location precision is labeled page-level; no bounding
  boxes are fabricated (EVD-01).
- **Two-step durable runs** — create the run, then stream its events with a
  sequence cursor; refresh and reconnect recover from the persisted run
  (§16).

## Scripts

```bash
pnpm dev     # development
pnpm build   # production build
pnpm start   # production server
pnpm lint    # eslint
```

## Vendored PDF.js assets

`public/pdfjs/<version>/pdf.worker.min.mjs` and `public/pdfjs/standard_fonts/`
are vendored from the `pdfjs-dist` version that `react-pdf` resolves, so the
viewer works with no CDN dependency. After upgrading `react-pdf`, re-copy them
from `node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/` to the new
version folder (the app resolves the path from `pdfjs.version` at runtime).

## Related

- `docs/supabase-setup.md` — SQL for optional Supabase usage logging and
  account deletion RPCs.
- Backend contract: `/v2` endpoints under `lib/v2/http.ts` mirror the full
  product specification (workspaces, uploads, documents, builds, sessions,
  runs, evidence, diagnostics).
