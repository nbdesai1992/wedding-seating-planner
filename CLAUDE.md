# Project Guidelines for Claude

## Project Overview

This would be an AI-based wedding seat planner and guest management app. It's marketed towards a bride to keep track of their guests and can use a description to generate a spatial layout of their room and align the tables, dance floor, etc all ke yaspects of the layout and it will have a very intuitive and easy to use layout and methodology for assignign guests to tables. We hsoud be thinking about usability and flexibilty both. Users should nto get frustrated that it cant do what they want, but it should also be easy. We should also have a PDF export option of the actual seting chart. We should offer support for multiple events as well. This should give you an idea

## Design Context

visual feel should be marketd at a bride it should feel like like the UI/UX is geared towards that. It needs to be beautiful and streamliend but not over hte top. The oclro scheme and ease of use go a long way here.

## Architecture

- **Frontend**: nextjs
- **Backend**: fastapi
- **Database**: postgresql
- **Deployment**: render

## Deployment

- Platform: render
- Dev server port: 3000
- Dev server command: `npm run dev`
- Backend API URL: https://wedding-planner-api.onrender.com
- Frontend URL: https://wedding-planner-frontend.onrender.com

### Development Workflow

Backend and database run on Render. Frontend runs locally during development for fast visual iteration, proxying API calls to the deployed backend. The orchestrator deploys backend code before starting frontend tasks, so the frontend always hits a real API with a real database.

## Orchestration System

This project uses an autonomous development orchestration system. Key commands:

- `/spec create` — Create a structured development specification
- `/spec update` — Modify an existing spec
- `/spec show` — View spec with completion status
- `/orchestrate` — Execute the spec: decompose, spawn workers, track progress
- `/status` — Diagnostic: where things stand relative to the spec

### How It Works

1. Human creates a spec with `/spec create "description"`
2. `/orchestrate` reads the spec, decomposes into phases and tasks
3. Worker agents are spawned as independent `claude -p` sessions (frontend-worker, backend-worker, infra-worker) and execute tasks autonomously
4. Progress is tracked in `session/` directory (gitignored)
5. Blockers are surfaced to the human for resolution
6. `/status` shows progress at any time
7. Orchestrator resumes across conversations by reading session state from disk

### Session Directory

All orchestration state lives in `session/` (ephemeral, gitignored):
- `spec.md` — The human-approved specification
- `phases/*.md` — Phase definitions with task tables
- `tasks/*.md` — In-progress task files with progress logs
- `tasks/completed/*.md` — Completed task files (moved here on completion)
- `turn-log.json` — Cross-conversation resume support
- `changelog.md`, `decisions.md`, `blockers.md` — Audit trail

## Testing Policy

- **Local testing**: Use dev-browser for UI verification (`/verify-ui`)
- **Backend testing**: Workers write and run tests as part of task execution
- **User feedback**: The user reports back with results from deployment
