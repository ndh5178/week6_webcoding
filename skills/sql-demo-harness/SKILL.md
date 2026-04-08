---
name: sql-demo-harness
description: Build, refactor, or integrate a three-panel SQL demo that uses a real C engine behind a web UI. Use when working on projects that must connect `CLI input -> parse tree -> service view`, keep frontend/backend/engine responsibilities separated, and preserve the rule that the browser does not fake SQL execution.
---

# Sql Demo Harness

Use this skill when the project has:

- a real SQL processor written in C
- a backend bridge that runs the engine
- a frontend that shows three panels on one page
- a requirement that service data must come from engine execution, not mock-only local state

## Core Rule

Keep this architecture:

```text
frontend
-> backend bridge
-> C engine
-> file-based DB
-> backend response
-> parse tree panel + service panel
```

Do not let the frontend simulate successful SQL execution if the real engine is meant to be used.

## Panel Model

- `CliPanel`: accept SQL input and trigger execution
- `ParseTreePanel`: render the parsed structure of the current query
- `ServicePanel`: render service data produced by engine execution
- `App`: own shared state and compose the three panels on one screen

If the UI uses tabs instead of showing all three panels together, change it unless the user explicitly asks otherwise.

## Team Workflow

Use this ownership split by default:

- person 1: `CliPanel`
- person 2: `ParseTreePanel`
- person 3: `ServicePanel`
- person 4: integration owner for `App`, backend bridge, and engine connection

The integration owner is responsible for verifying that:

- query input reaches the real engine
- parse tree updates after each successful query
- service data comes from engine results
- domain schema is consistent across frontend, backend, and engine

## Required Contracts

Lock these before integrating:

1. engine binary path
2. engine input shape
3. engine output shape
4. service table schema

If the engine prints plain text, either:

- add a backend protocol parser that converts stdout to structured JSON, or
- add a machine-readable engine mode

Do not leave the contract implicit.

## Working Sequence

Follow this order:

1. confirm the service schema
2. finish minimal engine behavior for `INSERT` and `SELECT`
3. make the backend run the real engine
4. define the response shape used by the frontend
5. build the three panels
6. integrate them in one screen
7. run end-to-end tests using demo queries

## Project Files To Check

When this skill is used in this repository, read these first:

- `README.md`
- `AGENT.md`
- `ROLES.md`
- `docs/architecture.md`
- `docs/contracts.md`
- `docs/demo-scenarios.md`

## Done Criteria

The work is not done until:

- one query entered from the CLI panel affects both the parse tree and the service panel
- the service panel is driven by engine-backed data
- the demo can show one `INSERT` flow and one `SELECT` flow without manual state editing
