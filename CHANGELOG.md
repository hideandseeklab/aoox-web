# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions below 1.0.0 may include breaking changes in a minor release.

## [Unreleased]

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

[Unreleased]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.2...HEAD
[0.1.0-alpha.2]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.1...v0.1.0-alpha.2
[0.1.0-alpha.1]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.0...v0.1.0-alpha.1
[0.1.0-alpha.0]: https://github.com/hideandseeklab/aoox-web/releases/tag/v0.1.0-alpha.0
