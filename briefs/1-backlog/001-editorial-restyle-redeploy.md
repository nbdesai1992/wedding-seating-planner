---
id: 001-editorial-restyle-redeploy
title: "Editorial Restyle + Render Redeploy"
created: "2026-08-01T19:05:00Z"
updated: "2026-08-01T19:05:00Z"
completion: 0/8
outcome: pending
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
5. **Park blockers, keep moving.** When a subtask hits a human blocker: record it under `## Blockers` (question + options + empty `Resolution:` line), mark the subtask blocked, and continue every subtask NOT downstream of the blockage (by dependency, file ownership, or shared requirement). Max 3 attempts per subtask; the 3rd failure becomes a blocker.
6. **Document every turn.** Append a Progress Log entry each working turn (a Stop hook enforces this).
7. **Route on terminal state — two DISTINCT outcomes:**
   - **COMPLETE**: all requirement checkboxes checked → set `outcome: completed`, write `## Outcome`, `mv` this file to `briefs/4-done/`, announce "BRIEF COMPLETE".
   - **NEEDS HUMAN**: requirements remain AND zero runnable subtasks → set `outcome: needs-human`, write `## Outcome` listing every open question, `mv` this file to `briefs/3-blocked/`, announce "NEEDS HUMAN INTERVENTION" with the questions. Blocked is NOT done — never present it as completion.
8. **Prove board state.** End every turn by running: `ls briefs/2-active/ briefs/3-blocked/ briefs/4-done/`

## Task Breakdown

_Filled just-in-time by the runner when this brief becomes active. Current phase in detail; future phases as placeholder rows._

| ID | Phase | Description | Agent | Requirements | Depends On | Files Owned | Status | Attempts |
|----|-------|-------------|-------|--------------|------------|-------------|--------|----------|

## Progress Log

_Append-only. One entry per working turn: timestamp, what happened, what's next._

## Blockers

_None yet. Each blocker gets: title, type, description, context, options, and an empty `Resolution:` line for the human._

## Outcome

_Written when this brief is routed out of 2-active/. States which terminal (completed / needs-human) and why._
