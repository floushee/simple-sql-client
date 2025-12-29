# Agent Notes: Simple SQL Client

## What this app is
- Minimal Electron SQL client for PostgreSQL and Microsoft SQL Server.
- Users create named connection profiles, test them, save/edit/delete them, and run ad-hoc SQL.
- Query input supports selecting a subset of text and executing only the selection; otherwise executes full textarea content.
- Results render in a table with column headers and row count info.

## Where data is stored
- Saved connections persist to a JSON file at `<app userData>/connections.json` (see CONNECTIONS_FILE in src/main.ts). Electron resolves `userData` per OS (e.g., on Linux: `~/.config/<app-name>` by default).
- Each saved connection includes: `id`, `name`, `type` (`mssql` | `postgresql`), `host`, `port`, `database`, `username`, `password`.

## Key flows (current behavior)
- Load saved connections on startup and render as cards; clicking a card loads it into the form; delete via card × button.
- Default ports auto-set on DB type change (mssql: 1433, postgresql: 5432).
- "Test Connection" invokes a DB-specific connect/disconnect.
- "Connect" first tests; on success switches to query view and stores the in-memory connection.
- Query execution: uses current in-memory connection, chooses selected text if present else full textarea, then calls backend to execute and displays results/row count.
- Disconnect hides query view and returns to connection form without altering saved connections.

## Components of note
- Backend (Electron main) handles persistence, testing, and query execution for both DB types; uses `mssql` and `pg` clients, writing connections to the JSON file noted above.
- Preload exposes IPC bridges: get/save/delete connections, test connection, execute query.
- Renderer drives the UI: connection form, connection cards, query textarea, status messages, results table.

## Quick pointers
- Storage/logic: src/main.ts
- IPC bridge: src/preload.ts
- UI logic: src/renderer.ts
- Types shared with renderer: src/types.ts
