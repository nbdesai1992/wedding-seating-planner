---
id: 001-editorial-restyle-redeploy
title: "Editorial Restyle + Render Redeploy"
created: "2026-08-01T19:05:00Z"
updated: "2026-08-01T19:05:00Z"
completion: 0/8
outcome: needs-human
pending_replan: false
turn_cap: 34
---

# Editorial Restyle + Render Redeploy

## Overview

The wedding seating planner is a working full-stack app (Next.js 14 + Tailwind + Clerk / FastAPI + SQLAlchemy + Postgres, AI layout generation via Anthropic, PDF export via reportlab) whose Render deployment is currently down (all services return 503). This brief does two things: (1) elevate the frontend to the editorial, "fine stationery" level of polish demonstrated by the reference repo `wedding-seating` — transferring its styling **techniques** while keeping this app's existing (better) palette and fonts — and (2) redeploy the whole stack to Render in the `nealdes.ai` workspace with every feature verified working end to end.

The styling reference is technique-only. Do NOT copy its palette (blush `#e7c9c4` family, sage `#7d8c72` family, gold `#c9a96a`), its features, or its architecture. This app's rose/cream/gold/warm-gray palette and Playfair Display + Inter pairing stay exactly as they are.

## Scope

### In Scope
- Frontend visual restyle of every surface: landing, auth (Clerk pages), dashboard, event overview/create/edit, guest management, seating editor, empty states
- Full backend regression via the existing pytest suite (~256 tests) against the real database
- Browser-level verification of key user flows and UI quality (no overlap, no clipping, responsive)
- Render redeploy in the `nealdes.ai` workspace: services live, healthy, URLs aligned across config
- Post-deploy visual verification of the live site

### Out of Scope
- New product features of any kind (no new pages, endpoints, or models)
- Backend logic changes (except configuration/URL alignment)
- Copying anything from `wedding-seating` other than styling techniques
- Changing the color palette, fonts, or brand direction
- Migrating the old `session/` history into this board (kept as archive)

## Requirements

### Functional Requirements
- [ ] **FR-1**: Editorial styling techniques applied app-wide while preserving the existing design tokens. The palette in `frontend/tailwind.config.ts` (rose/cream/gold/warm-gray scales) and the Playfair Display + Inter pairing remain byte-identical. New treatments come from the transferable recipe in Technical Constraints.
  - Acceptance: `git diff frontend/tailwind.config.ts` shows no changes to color token hex values or font families; screenshots show the new treatments (layered gradient background, hairline-rule section headers, letter-spaced eyebrows, pill commitment, warm shadows) in use.
- [ ] **FR-2**: Every surface restyled consistently — landing page, sign-in/sign-up, dashboard, event overview, event create/edit, guests page, seating editor. No surface looks "bolted on."
  - Acceptance: dev-browser screenshots of each listed page pass the bold-design quality gates (AI Slop, Swap, Squint, Signature) and share the same card/shadow/typography language.
- [ ] **FR-3**: Zero feature regressions. Events CRUD, guest management + CSV import, AI layout generate/modify, layout wizard, manual table/feature editing (drag, resize, rotate), drag-and-drop seat assignment, AI seating suggestions (preview-then-apply), PDF export, and Clerk auth all still work.
  - Acceptance: full backend pytest suite passes (`cd backend && python -m pytest -q` — currently ~256 tests, 0 failures); dashboard → create event → add guest → open seating editor exercised in the browser with screenshots.
- [ ] **FR-4**: Designed empty states. Dashboard-with-no-events and empty seating canvas get inviting empty states (frosted card + warm one-line invitation + starter actions; ghost placeholders on the canvas) instead of bare panels.
  - Acceptance: screenshots of both empty states; neither is a blank surface.
- [ ] **FR-5**: UI integrity at common breakpoints: no overlapping elements, no clipped text, no horizontal page scroll at 1440px and 375px widths on landing, dashboard, and seating editor.
  - Acceptance: screenshots at both widths for the three pages, visually checked; any defect fixed and re-shot.
- [ ] **FR-6**: API URL alignment. The live backend URL (discovered by the infra worker after redeploy) is consistent across `frontend/lib/api.ts` fallback, `CLAUDE.md`, and `render.yaml` (`CORS_ORIGINS`, `FRONTEND_URL`); the current three-way disagreement (`wedding-planner-api` vs `wedding-planner-api-z0l3`) is resolved.
  - Acceptance: grep shows one consistent backend host in all three files; `curl` of that host's `/health` returns 200.

### Non-Functional Requirements
- [ ] **NFR-1**: Deployed and healthy on Render in the `nealdes.ai` workspace ONLY (the render-workspace-guard hook enforces this). Backend `/health` and frontend `/api/health` return 200 on the live URLs; database connected.
  - Acceptance: `curl` output of both health endpoints showing 200; `render services -o json` listing both services in the pinned workspace.
- [ ] **NFR-2**: Live-site visual verification. The deployed frontend (not localhost) renders the restyled UI correctly.
  - Acceptance: dev-browser screenshots of the live landing page and dashboard passing the same quality gates as FR-2.

## Technical Constraints

- **Palette and fonts are frozen**: rose (`#E8B4B8` base / `#C4848A` / `#A86A70` deep), cream (`#FFFCF8` page bg), gold (`#D4A574`), warm-gray text scale, Playfair Display headings, Inter body. Never introduce the reference repo's blush/sage/gold hues.
- **Transferable styling recipe** (from the `wedding-seating` reference — techniques, not values):
  1. Serif display + humanist sans discipline: serif for ALL headings/wordmark at restrained weights (500/600, never 700+); sans for everything else.
  2. Never a flat page background: two large soft radial gradients anchored off-screen in opposite corners (use rose-tint and cream/gold-tint) over the cream base.
  3. Warm, barely-there shadows: shadow color tinted toward warm-gray ink (not black) at ~0.07–0.10 opacity; soft resting + lifted hover variants; hover swaps soft → lifted with `translateY(-3px)`.
  4. Commit to the pill: `border-radius: 9999px` on buttons, chips, filters, badges, progress bars, toasts; 12–22px on cards.
  5. Letter-spacing as ornament: uppercase eyebrow labels with wide tracking (0.2–0.6em) above headlines; gold ornament dividers.
  6. Section headers as serif heading + `flex:1; height:1px` hairline rule; whitespace and hairlines instead of boxes.
  7. Property-scoped transitions at 80–300ms (never `transition: all`); `translateY(1px)` press feedback on `:active`.
  8. Designed empty states: frosted (`backdrop-filter: blur`) card + ornament + warm invitation copy + 2–3 starter pill actions; dashed-border "create" tile living inside the card grid as a peer.
  9. Auth/utility surfaces styled with the exact same tokens (Clerk appearance config already exists in `frontend/app/layout.tsx` — extend, don't replace).
  10. Half-pixel type tuning for UI text (13.5/12.5/11.5px) and low information density.
- **Backend tests run against the real database** via `backend/.env` `DATABASE_URL` (conftest overrides Clerk auth — no live Clerk tokens needed). Do not mock the DB.
- **Services may need human re-activation**: all URLs currently 503. The infra worker must diagnose via the Render CLI (suspended? failed deploy? deleted?). If services are gone, creating a new Blueprint Instance is a HUMAN action — park it as a blocker with exact instructions and continue local work.
- **Deploys happen via `git push`** (human checkpoint; Render auto-deploys). Workers never create services via the API.
- **Frontend dev proxies to the deployed backend** per CLAUDE.md; `frontend/.env.local` exists locally with Clerk keys.

## Success Criteria

A visitor can open the live frontend URL, see a beautiful editorial wedding-stationery UI (recognizably this app's rose/cream palette, elevated in polish), sign in with Clerk, create an event, import guests, generate and edit a room layout, seat guests by drag-and-drop, and download the PDF chart — with all ~256 backend tests green and both Render services healthy in the `nealdes.ai` workspace.

## Execution Protocol

These rules bind ANY session working this brief. The `/orchestrate` skill is the full runner — invoke it if it is not already loaded.

1. **Single writer.** Only the main (orchestrating) session edits this file or moves it between board folders. Subagents never touch it.
2. **Decompose before building.** If Task Breakdown below is empty, fill it before any implementation. Every requirement must map to at least one subtask.
3. **Delegate, don't implement.** Execute each subtask via the matching subagent (frontend-worker / backend-worker / infra-worker). The main session plans, verifies, records, and routes.
4. **Verify before checking.** A requirement checkbox may only be checked when its acceptance criteria are demonstrably met (test output, screenshot, health check in the transcript). Never weaken, reinterpret, or remove a requirement to make it pass.
5. **Park blockers, keep moving.** When a subtask hits a human blocker: record it under `
### 2026-08-02T00:15Z — PAUSED by human redirection (main session)
- Human clarified the true deliverable lives in the `wedding-seating` repo (that app's functionality, frontend-only, wearing THIS app's palette). This brief's remaining phases are superseded for now.
- State at pause: restyle p3-task-1/2/3 completed and verified; p3-task-4 (seating editor) IN PROGRESS — components modified but NOT visually verified; backend regression, deploy, and live verification not run. Blueprint Instance was never created (B-3 unresolved).
- All restyle work is committed. Nothing here is wrong — it is real improvement to this app — but finishing it awaits an explicit human decision.

## Blockers` (question + options + empty `Resolution:` line), mark the subtask blocked, and continue every subtask NOT downstream of the blockage (by dependency, file ownership, or shared requirement). Max 3 attempts per subtask; the 3rd failure becomes a blocker.
6. **Document every turn.** Append a Progress Log entry each working turn (a Stop hook enforces this).
7. **Route on terminal state — two DISTINCT outcomes:**
   - **COMPLETE**: all requirement checkboxes checked → set `outcome: completed`, write `## Outcome`, `mv` this file to `briefs/4-done/`, announce "BRIEF COMPLETE".
   - **NEEDS HUMAN**: requirements remain AND zero runnable subtasks → set `outcome: needs-human`, write `## Outcome` listing every open question, `mv` this file to `briefs/3-blocked/`, announce "NEEDS HUMAN INTERVENTION" with the questions. Blocked is NOT done — never present it as completion.
8. **Prove board state.** End every turn by running: `ls briefs/2-active/ briefs/3-blocked/ briefs/4-done/`

## Task Breakdown

_Filled just-in-time by the runner when this brief becomes active. Current phase in detail; future phases as placeholder rows._

| ID | Phase | Description | Agent | Requirements | Depends On | Files Owned | Status | Attempts |
|----|-------|-------------|-------|--------------|------------|-------------|--------|----------|
| p1-task-1 | 1 | Render state audit + revival: confirm CLI auth + `nealdes.ai` workspace, list services/DBs, diagnose 503s (suspended/failed/deleted), attempt non-creating revival (resume or redeploy existing services), discover actual URLs, verify DB connectivity via `backend/.env`. Report actual hosts as interface contracts. If services/DB deleted → blocked with Blueprint instructions. | infra-worker | NFR-1, FR-6 | — | backend/.env | completed (audit done; revival superseded by B-2 resolution → fresh deploy, see p1-task-2) | 1 |
| p1-task-2 | 1 | Fresh-deployment discovery in `nealdes.ai` (tea-crni5668ii6s73es22s0): confirm CLI workspace active, list services/DBs, identify Blueprint-created wedding services (NEVER touch `personal_homepage` srv-d787ms3uibrs73bhot2g / `personal_site` srv-d0tmjlm3jp1c73ep7rag, NEVER touch old-workspace orphans), discover URLs + DB, verify DB connectivity, set `backend/.env` DATABASE_URL for pytest, verify env group `general_builder_keys` linkage. Report hosts as interface contracts. If Blueprint Instance absent → blocked with exact human instructions. | infra-worker | NFR-1, FR-6 | — | backend/.env | blocked (B-3) | 1 |
| p2-task-1 | 2 | Backend regression: full pytest suite (~256 tests) against real DB — needs live DB from p1-task-2 | backend-worker | FR-3 | p1-task-2 | backend/* | pending | 0 |
| p3-task-1 | 3 | Editorial foundation: layered gradient page background, warm ink-tinted shadow + pill + transition system in globals.css/tailwind config (NO color-token or font changes), restyle shared UI primitives (Button, Card, Input, Modal, Toast), Navbar/Sidebar, extend Clerk appearance in app/layout.tsx | frontend-worker | FR-1, FR-2 | — | frontend/app/globals.css, frontend/tailwind.config.ts, frontend/app/layout.tsx, frontend/components/ui/*, frontend/components/layout/*, frontend/components/providers/ToastProvider.tsx | completed | 1 |
| p3-task-2 | 3 | Landing + auth restyle: landing page sections, sign-in/sign-up (+ legacy login/register), eyebrows, hairline section headers, ornament dividers, editorial hero | frontend-worker | FR-1, FR-2 | p3-task-1 | frontend/app/page.tsx, frontend/components/landing/*, frontend/app/sign-in/**, frontend/app/sign-up/**, frontend/app/login/page.tsx, frontend/app/register/page.tsx | completed | 1 |
| p3-task-3 | 3 | Dashboard + events + guests restyle: dashboard (incl. designed empty state: frosted card, warm invitation, starter pills, dashed create-tile), event overview/create/edit, guests page, event/guest components | frontend-worker | FR-1, FR-2, FR-4 | p3-task-1 | frontend/app/dashboard/*, frontend/app/events/** (except seating/page.tsx), frontend/components/events/*, frontend/components/guests/* | completed | 1 |
| p3-task-4 | 3 | Seating editor restyle: canvas chrome, toolbars, guest sidebar, wizard, AI panels, zoom controls + designed empty-canvas state (ghost placeholders) | frontend-worker | FR-1, FR-2, FR-4 | p3-task-1 | frontend/app/events/[eventId]/seating/page.tsx, frontend/components/canvas/* | pending | 0 |
| p4-task-1 | 4 | Integrated verification + fix pass: FR-5 breakpoints (1440px/375px on landing, dashboard, seating editor), FR-2 cross-surface consistency gates, FR-1 token-freeze check (`git diff tailwind.config.ts`), fix any defects found (owns all frontend files, runs alone in its phase) | frontend-worker | FR-1, FR-2, FR-5 | p3-task-1, p3-task-2, p3-task-3, p3-task-4 | frontend/** | pending | 0 |
| p5-task-1 | 5 | URL alignment + deploy + live verification (placeholder — decomposed after phases 1–4) | infra-worker | FR-6, NFR-1, NFR-2 | p1-task-2, p4-task-1 | render.yaml, CLAUDE.md, frontend/lib/api.ts | pending | 0 |

## Progress Log

_Append-only. One entry per working turn: timestamp, what happened, what's next._

### 2026-08-01T19:20Z — Turn 1: Selected + decomposed
- Pulled brief from `1-backlog/` → `2-active/`; created `session/001-editorial-restyle-redeploy/`.
- Surveyed repo: Next.js app surfaces (`landing, sign-in/up, login/register, dashboard, events, guests, seating`), backend pytest suite, `render.yaml` blueprint. Confirmed FR-6 three-way URL disagreement: `api.ts` → `wedding-planner-api-z0l3`, CLAUDE.md → `wedding-planner-api`, render.yaml frontend host `wedding-planner-frontend-c7a4`.
- Stale-memory caveat: 123-day-old memory names workspace `tea-csp9i7bgbbvc73fe7np0` ("Neal Desai's Workspace") and service `srv-d2tqa3p5pdvs739qkgt0` — brief pins `nealdes.ai` workspace; live CLI state governs.
- Decomposed: phase 1 (infra diagnosis/revival) in detail; phases 2–4 as placeholders.
- Next: spawn infra-worker for p1-task-1.

### 2026-08-01T22:35Z — Turn 1 (cont.): p1-task-1 blocked; re-planned; frontend restyle proceeding
- infra-worker report (blocked, external-action): all 3 services EXIST but are suspended (`x-render-routing: suspend-by-user`); both `wedding-planner-api` AND `wedding-planner-api-z0l3` are real suspended backends (explains FR-6 drift); DB not running (TLS ok, Postgres startup → 0 bytes); workspace `nealdes.ai` not found under CLI login → guard blocks all Render ops. Worker did not bypass guard, created nothing.
- Parked **B-1** (workspace identity, needs-human-decision) and **B-2** (resume suspended services+DB, external-action). p1-task-1 → blocked.
- Recomputed runnable set: p2-task-1 (backend pytest) needs the live DB → downstream of B-2, not runnable. Frontend restyle is NOT downstream (local dev, Clerk keys in `.env.local`, empty/error states verifiable) → decomposed phase 3 into p3-task-1..4 (foundation → landing/auth → dashboard/events/guests → seating editor) + p4-task-1 (responsive/consistency pass), p5-task-1 (deploy/live verify placeholder).
- Data-full browser verification (FR-3 flows, live checks) stays gated on B-1/B-2.
- Next: spawn frontend-worker for p3-task-1 (editorial foundation).

### 2026-08-01T22:50Z — Turn 1 (cont.): p3-task-1 completed
- frontend-worker delivered the editorial foundation: layered radial-gradient body, warm ink shadows (soft/lifted/btn-rose/btn-gold), pill commitment, eyebrow/hairline/frosted/ornament utilities, half-pixel `text-ui*` scale, restyled Button/Card/Input/Modal/Toast + frosted Navbar/Sidebar, extended Clerk appearance. New `SectionHeader`/`Eyebrow` exports from `components/ui`.
- Evidence: `tsc --noEmit` exit 0; `npm run build` all 13 routes clean; landing + /sign-in screenshots at 1440px pass all four bold-design gates; DOM probe confirms pill radii, warm shadow rgba(168,106,112,.35), Playfair w600 Clerk title, radial-gradient body.
- Runner spot-check: `git diff frontend/tailwind.config.ts` = 28 insertions, 0 deletions; no hex/fontFamily lines touched → FR-1 token freeze holds.
- Interface contract recorded (tokens/utilities/components) for p3-task-2..4.
- Next: p3-task-2 (landing + auth restyle) — includes bringing Hero w700 down to the w500/600 contract.

### 2026-08-01T23:05Z — Turn 1 (cont.): p3-task-2 completed
- Landing + auth restyled on foundation tokens only: feathered translucent washes replace opaque slabs (gradient reads through), 7 eyebrows + 4 ornament dividers, all CTAs gold/rose pill with warm shadows, Playfair brought to w500/600 (hero DOM probe: w600), frosted auth shells around themed Clerk cards. `/login`/`/register` are pure `redirect()` pages — left untouched, redirects verified landing on restyled surfaces.
- Evidence: 1440px full-scroll landing screenshots (2 verify-ui iterations — iteration 1 caught band edges, fixed by feathering), /sign-in + /sign-up screenshots, DOM probes (pill radius 9999px, frosted-card rgba(255,255,255,0.65)/20px, dual radial body), all four bold-design gates PASS per surface, `tsc --noEmit` exit 0.
- Next: p3-task-3 (dashboard + events + guests restyle incl. FR-4 dashboard empty state).

### 2026-08-01T23:25Z — Turn 1 (cont.): p3-task-3 completed
- Authenticated surfaces restyled on foundation tokens: dashboard (frosted sticky header, dashed create-tile as grid peer, designed error notice), event overview/layout (frosted countdown, serif-numeral stat cards, hairline checklist), EventForm (frosted, ornament, eyebrow), guests page (pill chips, hairline table rows, designed table empty state), CSVImport (gold-dashed dropzone). Fixed EventCard double-padding bug via `padding="none"`.
- **FR-4 dashboard empty state verified live**: backend down renders exactly the no-events state — frosted card + gold ornament + warm invitation + pill starter actions. Screenshot evidence captured; all four gates PASS on /dashboard and /events/new.
- Auth for verification done properly: Clerk `+clerk_test` user via Backend API + real /sign-in UI with OTP 424242 (Turnstile blocks headless sign-up). No API mocking.
- NOT visually verified (gated on B-2): /events/{id} overview, edit, guests — `getEvent` failure redirects to /dashboard. Statically verified: `tsc --noEmit` 0, `npm run build` clean.
- Next: p3-task-4 (seating editor restyle + canvas empty state).

## Blockers

### B-1: Render workspace `nealdes.ai` unreachable from CLI login
- **Raised:** 2026-08-01T22:24:00Z · **Subtask:** p1-task-1 · **Type:** needs-human-decision
- **Description:** The brief (and render-workspace-guard hook) pin workspace `nealdes.ai`, but the Render CLI logged in as nbdesai1992@gmail.com sees only "Neal Desai's Workspace" (`tea-csp9i7bgbbvc73fe7np0`). `render workspace set nealdes.ai` → "no workspaces found with name nealdes.ai". The guard therefore fails closed and blocks ALL Render CLI/API operations (list, resume, redeploy, env audit). The worker correctly did not bypass the guard or edit the pin.
- **Context:** p1-task-1 Render state audit; every Render operation is gated on this.
- **Options:**
  1. If "Neal Desai's Workspace" is the intended home: rename it to `nealdes.ai` in the Render Dashboard (Settings → workspace name), OR update the pin in `.claude/render-workspace` (+ brief/CLAUDE.md) to the true workspace name.
  2. If `nealdes.ai` is a different Render account: `render login` with that account, then `render workspace set nealdes.ai`. If the services don't exist there, also create a Blueprint Instance from `render.yaml` (Dashboard → Blueprints → New Blueprint Instance), ensure env group `general_builder_keys` exists, and set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`.
- **Resolution:** RESOLVED 2026-08-01 by human+main session. The workspace EXISTS and this login can access it — its name on Render carries a trailing space ('nealdes.ai ') which defeats exact-name matching. The CLI active workspace is now set by ID: `tea-crni5668ii6s73es22s0`. The pin file `.claude/render-workspace` now holds name AND ID, and the guard accepts either. Render ops are unblocked. If the workspace ever needs re-setting: `render workspace set tea-crni5668ii6s73es22s0`.

### B-2: Services + database suspended ("suspend-by-user") — human resume needed
- **Raised:** 2026-08-01T22:24:00Z · **Subtask:** p1-task-1 · **Type:** external-action
- **Description:** All three known services exist but return 503 with `x-render-routing: suspend-by-user`: `wedding-planner-api.onrender.com`, `wedding-planner-api-z0l3.onrender.com` (two distinct suspended backend services — explains the FR-6 URL drift), and `wedding-planner-frontend-c7a4.onrender.com`. The Postgres DB (`dpg-d74ufo8gjchc73bekd00-a.oregon-postgres.render.com` / `wedding_planner_db_7lxc`) accepts TCP+TLS but closes on the Postgres startup message — not running (suspended or deprovisioned). Backend pytest (FR-3) and all live verification (NFR-1/NFR-2) are impossible until the DB and services run.
- **Context:** p1-task-1 revival attempt; resume requires Dashboard access or CLI access unblocked by B-1.
- **Options:**
  1. Resume the DB + the canonical services from the Render Dashboard (each service/DB → Resume), then tell us which backend service (`wedding-planner-api` vs `wedding-planner-api-z0l3`) is canonical — or leave that discovery to the infra worker once B-1 is resolved.
  2. Resolve B-1 first and let the infra worker resume services via CLI/API (works only if suspension is CLI-resumable on this plan).
- **Resolution:** RESOLVED-WITH-REDIRECTION 2026-08-01 by human decision. Do NOT resume the suspended services — the deploy target is a FRESH deployment in the `nealdes.ai` workspace (`tea-crni5668ii6s73es22s0`), which currently has NO wedding services and NO database. The suspended services and DB found in "Neal Desai's Workspace" are out-of-scope orphans: never resume, modify, or delete them. Canonical backend = whatever the new Blueprint creates (human decision: "let infra worker decide" → discover the new service URLs post-blueprint and align all config to them per FR-6). Already done via API: env group `general_builder_keys` (evg-d9n776e417fc73cq9ic0) created in nealdes.ai with ANTHROPIC_API_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. PENDING HUMAN: creating the Blueprint Instance in nealdes.ai (Dashboard → Blueprints → New Blueprint Instance → this repo) — if it does not exist yet when infra work resumes, park a fresh blocker for it and continue all locally-possible work (frontend restyle does not require live services). CRITICAL: nealdes.ai also hosts `personal_homepage` (srv-d787ms3uibrs73bhot2g) and `personal_site` (srv-d0tmjlm3jp1c73ep7rag) — these belong to a DIFFERENT project; never touch them.

### B-3: Blueprint Instance not yet created in `nealdes.ai` — human creation needed
- **Raised:** 2026-08-01T23:15:00Z · **Subtask:** p1-task-2 · **Type:** external-action
- **Description:** Fresh-deployment discovery confirmed the wedding-planner Blueprint has NOT been instantiated in workspace `nealdes.ai` (tea-crni5668ii6s73es22s0): zero wedding services, zero Postgres databases (`GET /v1/postgres?ownerId=…` → `[]`). Only the out-of-scope `personal_site`/`personal_homepage` exist (untouched). Env group `general_builder_keys` (evg-d9n776e417fc73cq9ic0) exists with all three keys but has `serviceLinks: []`. Blueprint Instances cannot be created via API and the brief forbids workers creating services — this is creation-only human work. Downstream: p2-task-1 (pytest needs DB), p5-task-1 (deploy/URL alignment/live verify), NFR-1, NFR-2, and the live halves of FR-3/FR-6.
- **Context:** p1-task-2 discovery after B-1/B-2 resolutions; CLI pinned to the workspace by ID and verified (`render workspace current` → tea-crni5668ii6s73es22s0, name "nealdes.ai " with trailing space).
- **Options:**
  1. (Recommended) Create the Blueprint Instance: Dashboard → switch to workspace "nealdes.ai" → Blueprints → New Blueprint Instance → select this repo (wedding-seating-planner), branch `main` → confirm resources from render.yaml (web `wedding-planner-api`, web `wedding-planner-frontend`, Postgres `wedding-planner-db`) → when prompted for `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (sync: false), paste the value already in env group `general_builder_keys` → do NOT create a new env group; link the existing `general_builder_keys` (evg-d9n776e417fc73cq9ic0) → Apply. Then run /orchestrate; a follow-up infra task discovers URLs, sets cross-service env vars, verifies health, and writes DATABASE_URL into backend/.env.
  2. Create the three resources manually in the Dashboard matching render.yaml exactly — not recommended (loses blueprint linkage, invites drift).
- **Resolution:** RESOLVED 2026-08-02 by human. THIS APP IS THE DELIVERABLE — the pause in the Outcome section is lifted; continue the mission (finish p3-task-4 seating-editor restyle verification onward). Deployment decision: REBUILD FRESH IN nealdes.ai (tea-crni5668ii6s73es22s0). Never resume or touch the suspended services/DB in "Neal Desai's Workspace" (archives) or the wedding-seating/-uccb services (different project, suspended). Prerequisites already in place: env group `general_builder_keys` (evg-d9n776e417fc73cq9ic0) exists in nealdes.ai with ANTHROPIC_API_KEY, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — render.yaml's fromGroup + sync:false vars are all covered (Blueprint prompts skippable). The Blueprint Instance itself is a HUMAN Dashboard step (nealdes.ai → Blueprints → New Blueprint Instance → this repo) and may happen while the run proceeds — treat it as park-and-continue: do all local work (restyle verification, backend tests can wait on the new DB) and re-check for the services each turn. After services exist: discover actual URLs, align FR-6 (frontend/lib/api.ts, CLAUDE.md, render.yaml CORS_ORIGINS/FRONTEND_URL), deploy, live-verify. AUTO-PUSH AUTHORIZED by human 2026-08-02: the runner MAY git push to main itself once work is committed and acceptance-verified. NEVER touch personal_homepage (srv-d787ms3uibrs73bhot2g) or personal_site (srv-d0tmjlm3jp1c73ej7rag).

## Outcome

_Written when this brief is routed out of 2-active/. States which terminal (completed / needs-human) and why._

**Terminal: NEEDS HUMAN (paused, not failed).** Routed to 3-blocked on 2026-08-02 after the human redirected the mission to the `wedding-seating` repo. Open question: should the planner's restyle ever be finished (resume p3-task-4 onward), or is this app retired? Answer on B-4's Resolution line and run /orchestrate to resume.

