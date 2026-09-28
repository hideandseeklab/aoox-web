# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions below 1.0.0 may include breaking changes in a minor release.

## [Unreleased]

## [0.1.0-alpha.3] - 2026-09-28

### Added

- Registry page: new **"Hapus image"** button on each repository row (icon button next to the tag
  count) that deletes the whole repository — every tag, its storage folder, and a garbage-collect
  pass on the API side — not just one tag. The confirm dialog fetches and shows which applications'
  current/running image looks like it points at this repo before letting the delete proceed (the API
  409s without confirmation otherwise); `ApiError` now carries the parsed error body's `details` so
  the action can read that `usage` array instead of only the message string. Uses `sonner` toasts
  (loading → success/error) rather than the plain inline error `delete-tag` uses, since this is a
  bigger, slower, less reversible action. The repository list also updates locally (no full refetch)
  when a repo is removed. The stale "Tidak ada tag (manifest sudah dihapus, jalankan garbage
  collect)" hint — which didn't actually make the 0-tag repo disappear, since garbage-collect only
  reclaims blobs, never the repository's own folder — now points at this new button instead.
- New **Console** tab on the application page (`application-tabs.tsx`, next to Webhook): an interactive
  `docker exec -it` into the app's own container, backed by the API's new `/console` Socket.IO gateway.
  `console-view.tsx` reuses the same xterm.js setup as `/terminal` (font handling, refit-on-resize,
  origin-mismatch `<Alert>`) minus the server picker (the container is already fixed) plus an optional
  task picker for a swarm-service app with more than one running task on this node, sourced straight
  from `app.service.tasks` (already returned by `get-application`, filtered to `local && running`).
  Hidden entirely for a project viewer (the API rejects it with 403 too; hiding the tab just avoids
  showing something guaranteed to fail). Verified in a real browser against a real container: typed
  commands echo back correctly, prompt reflects the container id.
- Settings → Notifikasi: new **"error di log aplikasi"** toggle (off by default, like "deploy
  dimulai") for the API's new `on_app_error` event, which scans running apps' container logs for
  common error shapes and notifies once per app per check.
- Application form (Pengaturan, edit only): new **"Abaikan error di log"** switch (`ignoreErrorLogs`)
  to opt an app out of that log scan entirely, for apps whose normal output just looks like errors.
- Creating an application, database, compose stack (git or one-click template), or importing a
  project now shows a `toast.loading()` the moment you submit, updated in place to success/error
  (not stacked) once the result is known, plus a spinner + "Membuat…" on the submit button and a
  locked dialog (no close/cancel) while the request is in flight. The plain application/database/
  compose-from-git create actions no longer call a server-side `redirect()` on success — that would
  abort before the toast could ever resolve to success, leaving it stuck on "loading" forever after
  navigating away. They now return the created row's id and the dialog navigates itself, right after
  updating the toast. Database/stack success messages are explicit that provisioning/deploy keeps
  running in the background (their detail pages already poll while `creating`/`deploying`).
- Create-database dialog: new engine option **Valkey**, and for **PostgreSQL** a new **Varian**
  picker (pgvector, PostGIS, TimescaleDB — each with a one-line description and its own default
  image tag replacing the placeholder). Every place that special-cased Redis (data browser key/value
  view, hidden "create table"/schemas UI, "backup all databases" toggle) now also covers Valkey,
  since it's a key-value engine with no named tables either.
- Create-database dialog: new engine option **MongoDB** (no Variant field — Mongo has no variants).
  Data browser (`database-data-browser.tsx`) gets a third mode alongside SQL and Redis/Valkey
  (`isMongo`): the collection list ("Koleksi"), rows grid, column sorting, and CSV export all work,
  since the backend already supports them for Mongo; the Structure tab, "create table" dialog, row
  edit/delete, and SQL export/import are hidden (not supported by the API yet — it rejects them with
  400). Query box shows a `users.find({})` placeholder and read-only-find-only copy. Fixed a real bug
  found while wiring this up: `managed-database.schema.ts`'s `z.enum([...])` engine list doesn't
  participate in the `Record<DatabaseEngine, ...>` exhaustiveness check that caught every other spot
  needing an update — it was still missing `valkey`/`mongodb`, so submitting the create-database form
  for either engine would have failed client-side Zod validation before the request ever reached the
  API. Found by grepping every `DatabaseEngine`/`valkey` reference in the repo per the same
  methodology used for the Valkey change above, not by `tsc`.
- **Resource usage per project**: project cards on `/projects` now show a compact "CPU 12% · RAM 340 MB ·
  ↓2.1 MB/s ↑0.4 MB/s" line (`project-card.tsx`, hidden entirely when nothing in the project is
  running) from the new `resourceUsage` field the API's `GET /projects` already returns. The project
  detail page gets a new "Resource usage" card above the Aplikasi/Stack compose/Database sections
  (`ProjectResourcePanel`, `project-resource-panel.tsx`) — the same CPU/Memori/Jaringan tile-plus-
  sparkline layout as the application/database `MetricsPanel`, minus the range picker (the API's
  `GET /projects/:id/resource-usage` is live-only, no stored history), polling every 15s to match the
  sampler. `ProjectsAutoRefresh` (the existing 4s poller that clears "deploying…" badges) now also
  triggers — at a calmer 10s — whenever any project has something running, so the list page's numbers
  keep updating without adding a second poller to the same page; still fully idle when every project is
  stopped.

### Changed

- "New application", "Stack compose", and "New database" on the project page are no longer dialogs —
  each is now its own full-width page (`/projects/[id]/applications/new`, `/projects/[id]/compose/new`,
  `/projects/[id]/databases/new`) with a breadcrumb/back link to the project and a "Batal" button next
  to submit, since the application form in particular (Sumber, Akses, Swarm, build args, …) was too
  packed for a dialog's width. The buttons on the project page are now plain links instead of dialog
  triggers; `create-application-dialog.tsx`, `create-compose-dialog.tsx`, and `create-database-dialog.tsx`
  are deleted. `application-form.tsx`/`compose-form.tsx` gained an optional `cancelHref` prop (renders
  the "Batal" link, create pages only) and are otherwise unchanged; the application page's
  create-with-domain/toast glue moved into a new `create-application-page-form.tsx` wrapper, and the
  create-database form itself was extracted out of its old dialog into a new reusable
  `database-form.tsx` (there's still no database edit form — engine/variant can't be changed after
  creation). All the toast/spinner/redirect-avoidance behavior from the dialogs carries over
  unchanged — sonner's toast store is global, not tied to the dialog's lifetime, so navigating
  to/from these pages never orphans a "loading" toast. `deploy-template-dialog.tsx` is unaffected
  and stays a dialog (opened from the template catalog, not the project page).
- UI font switched from Geist to **Inter** for both body text and headings (`layout.tsx`'s
  `--font-sans`, and `globals.css`'s `--font-heading` now points at it too). The `<html>` element
  was also forcing `font-mono` app-wide — removed, so `font-sans` actually applies instead of every
  page rendering in JetBrains Mono. Technical text (code/pre, image refs, hashes, paths, commit SHAs,
  logs, technical form fields) keeps its explicit `font-mono` class unchanged; the web terminal keeps
  Fira Code via `--font-terminal`, untouched.
- Headings now carry tight letter-spacing (helipod.io-style), scaled to size: `h1`/`h2` (page
  titles like `InfraPage`, dashboard "Total project" card, dialog headers) at `-0.03em`, `h3`/
  `CardTitle`/`DialogTitle`/`SheetTitle`/`AlertTitle` at `-0.015em`, and a `tracking-tighter`
  (`-0.05em`) "display" tier for the very large stat numbers on the dashboard home page. Rules
  live centrally in `globals.css` (element/`data-slot` selectors, low specificity on purpose so a
  `tracking-*` utility on one element can still override), not spread across components. Body
  text, buttons, labels, inputs, badges, and tables are untouched, and any `.font-mono` element
  is explicitly reset to normal tracking even if it matches one of the heading selectors above.

### Fixed

- Creating an application (any source/engine) was completely broken — every submission 400'd with
  `property ignoreErrorLogs should not exist`. `createApplicationAction`/`createApplicationForAccessAction`
  always sent the full parsed form (including `ignoreErrorLogs`, defaulted `false` by the zod schema
  shared with the edit form) straight to `POST /applications`, but `CreateApplicationDto` never declared
  that field (it's edit-only — see `update-application.dto.ts`) and the API's global `forbidNonWhitelisted`
  `ValidationPipe` rejects unknown properties. Caught while manually verifying the new "Aplikasi baru"
  page above, not by `tsc`/lint/tests (the type is structurally valid, just semantically wrong for the
  create endpoint) — both actions now strip `ignoreErrorLogs` from the request body via a shared
  `omitIgnoreErrorLogs()` helper before posting.
- Settings → Integrasi → Notifikasi: the **"DNS domain bermasalah"** toggle (`onDnsIssue`) never
  actually reached the API — `notifications-card.tsx`'s switch and `Notification` entity type already
  had it, but `notification.actions.ts`'s zod schema and form-reading code didn't, so it was silently
  dropped from every create request and the channel always ended up with whatever the API defaulted to
  (`true`), no matter what the toggle showed in the dialog. Found while auditing every `on_*` toggle
  against its web/docs coverage for the same task that added the missing DTO field on the API side.
  Added `onDnsIssue` to the `base` zod schema and the `formData.get(...)` block, matching every other
  toggle's pattern.

## [0.1.0-alpha.2] - 2026-09-27

### Added

- Panel domain card now shows a warning with manual troubleshooting steps (DNS, firewall, waiting
  for the ACME certificate) when saving the domain auto-provisioned the reverse proxy — found
  testing on a real VPS where the proxy wasn't running yet and the domain was silently unreachable
  with no indication why.
- Toast notifications (`sonner`) for copy actions, starting with the registry credentials dialog.
- `copyToClipboard()` helper (`src/lib/clipboard.ts`) that falls back to `document.execCommand("copy")`
  when `navigator.clipboard` isn't available — it only exists in secure contexts (HTTPS or
  localhost), so copy buttons silently did nothing on a panel opened over plain HTTP by IP (the
  default before a custom domain is set). Now wired into every copy-to-clipboard button across the
  dashboard (account, API tokens, database connection strings, member invite links, server/terminal
  command boxes, swarm join tokens, webhook URL/secret), each with a toast on success or failure.
- Settings → Infrastruktur → **Environment** (owner only): edit a whitelisted subset of the panel's
  own env vars (SSH-to-host settings for the web terminal, `PUBLIC_IP`, `REGISTRY_PUBLIC_HOST`)
  without SSH — mirrors the Domain panel card. Saving briefly restarts the api container.
- Application form: "Pilih dari registry" button next to the Image field (Sumber: Image) opens a
  picker (registry → repository → tag) instead of having to remember and retype the ref you just
  `docker push`ed. Reuses the same repository/tag endpoints as the Registry page's own browser.
- Terminal page and the application deploy panel's realtime log now detect when they were opened
  from a different origin than the panel's configured `WEB_ORIGIN` (e.g. by IP after a custom
  domain was set) and show a clear explanation instead of a raw "origin not allowed" error, with a
  button to open the same page on the correct domain — and skip wasting a log ticket on a
  connection the gateway will reject anyway.
- New application dialog: an "Akses" step (IP & port / Domain / Nanti saja) between the deploy
  source fields and the submit button, so an app doesn't silently end up with neither a host port
  nor a domain (found on a real VPS: app deployed fine but wasn't reachable — both options only
  existed in edit-only tabs discovered after the fact). "IP & port" reuses the existing `hostPort`
  field; "Domain" creates the app first (no host port), then calls `add-domain` and lands on the
  app page — `createApplicationForAccessAction` exists alongside the redirecting
  `createApplicationAction` specifically for this, since a `redirect()` inside the action would
  abort before the add-domain call. A generic create/update error that mentions "port" is now shown
  next to the host port field instead of only the bottom banner (best-effort until the API returns
  a structured port-conflict error). `addDomainAction` now surfaces `proxyAutoProvisioned` (the API's
  `POST /applications/:id/domains` auto-starts the reverse proxy if it wasn't running, mirroring
  panel-domain) — the deploy panel shows the same troubleshooting warning (DNS, firewall, ACME wait)
  after creating-with-domain, and the Domain tab (`application-domains.tsx`) shows it inline after
  adding any domain from there too.
- Application deploy panel: a callout ("Aplikasi belum punya alamat akses") appears after a
  successful deploy when the app still has no host port and no domain, with buttons that jump
  straight to the Pengaturan or Domain tab. This required converting the application detail page's
  outer `Tabs` from uncontrolled to a controlled client component (`application-tabs.tsx`) so a
  button click elsewhere in the tree can switch tabs.
- Project cards now show an amber "deploy…" badge next to any application/database/compose instance
  that has a deployment/provision in flight (new `deploying` flag from `GET /projects`) — previously
  a webhook-triggered redeploy gave no indication anywhere outside the application page itself that
  anything was happening. The `/projects` page polls itself (`router.refresh()` every 4s via the new
  `ProjectsAutoRefresh` client component) only while at least one instance is deploying, and stops on
  its own once the badge clears.
- Settings → Notifikasi: new "deploy dimulai" toggle (off by default, unlike the other event toggles)
  for the API's new `on_deployment_started` event.
- Application deploy panel now shows what actually queued each deployment — a webhook icon + short
  commit SHA in the history list (tooltip has the full commit message and pusher), and the same
  label under the selected deployment's log — instead of a webhook-triggered redeploy looking
  identical to clicking Deploy. Listens for the API's new `deployment:created` Socket.IO event
  (broadcast to every socket ticketed for the application, not just one subscribed to a specific
  deployment) to select the new deployment, refresh, and show a toast the moment any deploy is
  queued from anywhere — webhook, auto-update, or another user's manual click.

### Fixed

- Registry lokal card: the domain value now renders in the accent color when set, matching the
  "Running" status color elsewhere in the dashboard.
- The "Domain kustom" input and its buttons in the registry card were different heights
  (`size="sm"` buttons at 24px next to a 28px input) — buttons now use the default size to match.
- Registry lokal card's "Alamat push" and "Login" line kept showing `localhost:5000` after setting
  a custom domain — they read `status.publicUrl` (always the pre-domain default) instead of
  `registry.url` (which the API already updates to the domain). Now uses `registry.url`, falling
  back to `publicUrl` only before the registry is provisioned. The one-time "Registry siap" dialog
  (shown right after provisioning, before a domain can exist) still shows `localhost:...` — that's
  correct there, since that's what actually works for `docker push` without extra config — but now
  adds a note that it only works run from the server itself, with a pointer to set a domain for
  access from elsewhere.

## [0.1.0-alpha.1] - 2026-09-26

### Added

- Settings → "Domain panel" (owner only): configure a custom domain for the dashboard/API from the
  running panel, without editing `docker-compose.domain.yml`/`.env.dist` over SSH.
- Registry → Local registry card: "Custom domain" field (owner/admin) to route the self-hosted
  registry through the built-in proxy with a real certificate.
- Registry provisioning dialog now lets you pick a storage backend (local disk or an existing S3
  destination) before creating the self-hosted registry.
- Settings → "Update aoox" (owner only): check for and apply updates to the panel's own
  `api`/`web` images from the dashboard.
- CI (`.github/workflows/ci.yml`): typecheck + lint + build on every pull request and push to
  `main` — previously the only workflow ran on version tags (Docker publish), so a broken PR could
  merge unnoticed.

## [0.1.0-alpha.0] - 2026-09-25

### Added

- Initial public alpha release: the dashboard for aoox (Next.js 16, React 19, Tailwind CSS,
  shadcn/ui).
- Screens for every `aoox-api` feature: sign-in and two-factor auth, projects and members,
  applications (deploy, env, domains, mounts, jobs, logs), managed databases and the data browser,
  compose stacks and templates, registries, remote servers, Docker Swarm, monitoring dashboards,
  backups, notifications, and account/instance settings.
- A web terminal (shell on the host or inside the API container) over WebSocket.

[Unreleased]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.3...HEAD
[0.1.0-alpha.3]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.2...v0.1.0-alpha.3
[0.1.0-alpha.2]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.1...v0.1.0-alpha.2
[0.1.0-alpha.1]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.0...v0.1.0-alpha.1
[0.1.0-alpha.0]: https://github.com/hideandseeklab/aoox-web/releases/tag/v0.1.0-alpha.0
