# aoox-web

## Language

- Write everything in this repository in English: AGENTS.md, README, CONTRIBUTING, CHANGELOG, code comments and commit messages. Existing Indonesian text is being translated gradually; do not add new Indonesian text.

Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn/ui frontend for aoox
(self-hosted PaaS). Backend: `../aoox-api`.

Read `AGENTS.md` — this version of Next.js has breaking changes; check `node_modules/next/dist/docs/` before writing code.

## Folder structure (all code under `src/`, alias `@/*` → `src/*`)

- `src/app/` — App Router routes/layouts only (thin UI, no business logic).
- `src/features/<feature-name>/` — all business logic, entities (data interfaces/types),
  server actions, and schemas (validation). Example:

  ```
  src/features/project/
  ├── project.entity.ts
  ├── project.schema.ts
  ├── project.actions.ts
  └── project.service.ts
  ```

- `src/components/ui/` — components from the provider (shadcn, etc.). Do not edit manually.
- `src/components/custom/` — all of our own custom components.
- `src/hooks/`, `src/lib/` — shared hooks and utilities.

## Font

- UI (plain text **and** headings) = **Inter** (`next/font/google` → variable `--font-sans` in `layout.tsx`; `globals.css` `@theme` `--font-heading: var(--font-sans)`
  and `html { @apply font-sans; }`). Previously Geist, with `html` forced to `font-mono` (the entire UI was monospace) — both have been replaced.
  **JetBrains Mono** (`--font-mono`) is still applied explicitly through the `font-mono` class for technical content: `<code>`/`<pre>`, image names/URLs/hashes/commit SHAs/logs/commands,
  mount paths, and form fields whose content is a technical identifier (repo names, env vars, etc.) — do not remove that class from components that display technical values.
  The terminal (xterm) still uses **Fira Code** via `--font-terminal`, see the Terminal section — it is not affected by this change at all.
- **Tiered letter-spacing** (helipod.io style, enforced in `globals.css` `@layer base` — element/`data-slot` selectors with low specificity so that a `tracking-*` class on a single element can still override it; do not write `letter-spacing` per component): `h1`/`h2` (page titles such as `InfraPage`, dialog headers) = `-0.03em`;
  `h3` and `[data-slot="card-title"|"dialog-title"|"sheet-title"|"alert-title"]` (`CardTitle`/`DialogTitle`/`SheetTitle`/`AlertTitle`) = `-0.015em`; very large display text/numbers (e.g. the `text-3xl` stat cards on the dashboard home) use Tailwind's built-in `tracking-tighter` (`-0.05em`) directly on that element.
  Body text, buttons, labels, inputs, badges, tables, and **anything with the `font-mono` class** stay at `letter-spacing: normal` (there is a safety rule `.font-mono { letter-spacing: normal }`
  in the base layer) — do not add tracking to headings whose content is technical (paths, hashes, etc.).

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint 9 (eslint-config-next does not support v10 yet); shadcn-generated files are excluded from `react-hooks/set-state-in-effect`

## Git

- Do not commit or push unless explicitly instructed by the user.

## Auth

- Sign-in calls `POST /auth/sign-in` on the API through a server action (`src/features/auth/auth.actions.ts`),
  then stores `{ token, user }` in the httpOnly cookie `aoox_session` (`auth.session.ts`).
- `src/proxy.ts` only does an optimistic redirect based on the presence of the cookie (`/sign-in`, `/setup`, and `/invite/` are public).
- Members: `src/features/member/` (entity/queries/actions) + `members-card.tsx` in Settings (user list with a role select and delete for owners, pending invitations,
  an **Invite** dialog that shows the link once — copy it manually) and the public page `/invite/[token]` (`accept-invite-form.tsx`: email/role preview from the API,
  name+password form, then `setSession` + redirect to `/`). All members see all projects; roles only restrict Settings/terminal.
  Server pages use `getVerifiedSession()` (`GET /auth/me`, wrapped in `cache()` per request) — a stale cookie or a different secret → treated as not logged in, not as an error.
- Onboarding: `/setup` (`setupAction`) is shown when `GET /auth/setup-status` → `needsSetup`; `/sign-in` redirects there.
- HTTP calls to the API always go from the server via `src/lib/api.ts` (`API_URL` in `.env.local`, see `.env.example`).
  Exception: the terminal (Socket.IO) connects directly from the browser to `PUBLIC_API_URL`, which is read **at request time** in a server component
  and passed as a prop — do not use `NEXT_PUBLIC_*` for this, because it would be inlined at image build time.

## Dashboard

- All authenticated pages live in the route group `src/app/(dashboard)/` — its `layout.tsx`
  mounts `SidebarProvider` + `AppSidebar` + `AppNavbar` (user dropdown on the right) and redirects to `/sign-in` when there is no session.
- Shell: `src/components/custom/app-sidebar.tsx` (the navigation menu is in the `NAV` constant), `app-navbar.tsx`, `user-menu.tsx`.
  Logo = `brand-logo.tsx` (inline salmon SVG on the primary tile, used in the sidebar header). Navbar: sidebar trigger, separator (`data-vertical:h-4 self-center` — the default ui
  Separator `self-stretch` would make it as tall as the header), then the **breadcrumb** `app-breadcrumb.tsx` (shadcn `breadcrumb`): detail pages publish named crumbs via
  `<SetBreadcrumb items />` (`breadcrumb-store.ts`: module-level store + `useSyncExternalStore`; `useLayoutEffect` sets/clears — not context, because the navbar and the page
  are siblings in the layout), Settings via `SettingsTabs` (tab labels), otherwise derived from the pathname (`STATIC`). **Do not** use `useSearchParams` in
  the navbar: it is wrapped in Suspense, so the crumb subtree is not hydrated on full load until the first interaction (the store never gets subscribed) — that is why the tab labels
  are published from the Settings page.
- Per-feature pattern (example `src/features/project/`): `*.entity.ts`, `*.schema.ts` (zod), `*.queries.ts` (server-side fetch, uses `requireToken()`),
  `*.actions.ts` (server actions for mutations, `revalidatePath` + `redirect`). Client forms use `useActionState`.

## Terminal

- `/terminal` — xterm.js (`src/components/custom/terminal-view.tsx`, client-only via dynamic import) + `socket.io-client` connecting to the API's `/terminal` namespace.
  Terminal font = **Fira Code** (`next/font/google` → variable `--font-terminal` in `layout.tsx`; xterm reads the family from that variable), `lineHeight` 1.4.
  xterm measures the glyph cell once at `open()`, so the font is awaited first (`document.fonts.load`, capped at 1.5 s) and re-fitted on `loadingdone`. FitAddon divides
  by the *unrounded* cell height while the DOM renders rows at whole-pixel heights → the last row can "sink" below the box; `refit()` measures the real row
  height (`.xterm-rows > div`) and calls `term.resize` with the number of rows that actually fit (re-run at rAF + 250 ms, because new rows exist only after the first paint).
- `src/features/terminal/` — `terminal.protocol.ts` (mirror of the API events + `terminalNamespaceUrl`), `terminal.actions.ts` (`createTerminalTicket`),
  `terminal.entity.ts` + `terminal.queries.ts` (`getTerminalStatus` → `GET /terminal/status`, owner/admin).
- Settings shows `terminal-card.tsx`: mode (SSH/local), the public key automatically from the API, and the `authorized_keys` command that the user runs once on the host.
  The `error` message from the gateway when SSH auth fails already contains the same command, written as-is to xterm.
- Notifications: `src/features/notification/` (entity/queries/actions) + `notifications-card.tsx` in Settings — an add dialog with fields per type
  (Telegram token+chat id, Slack/Discord webhook URL, webhook URL, email = host/port/TLS/user/password/sender/recipients separated by commas),
  four event toggles (deploy success/failure, backup failure, container down; Radix `Switch` with `name` → "on"), a send-test button, and delete.
- Remote servers: `src/features/server/` (`server.entity.ts`, `server.queries.ts` `listServers`/`getPlatformSshKey`, `server.actions.ts` create/delete/test) +
  `servers-card.tsx` in Settings (platform key + command, server list, connection test that shows `authorizeCommand` when rejected, add dialog with an optional private key).
  `terminal-view.tsx` receives `servers` and shows a target `<Select>` ("Host aoox" / server); `createTerminalTicket(serverId?)` sends `serverId` in the ticket body —
  the target is bound to the ticket by the API, not sent in the handshake.
- **Wrong-origin detection for Socket.IO features** (Terminal, live deploy logs): both API gateways reject connections from any origin other than the configured `WEB_ORIGIN`
  (see the aoox-api AGENTS.md Terminal section). If the panel has a custom domain but is opened via IP, this used to show up as the raw text `origin not allowed` written by xterm / thrown as a socket error, which was confusing (found through a real VPS test). `use-browser-host.ts` `useBrowserOrigin()` (new hook, same pattern as
  `useBrowserHost()`) is compared with the `webOrigin` prop (from `lib/api.ts` `webOrigin()` — reads `process.env.WEB_ORIGIN` of the **web** container, not the API), passed
  server-side from the `/terminal` and `/applications/[id]` pages. If they differ: `terminal-view.tsx` never tries to connect at all (it skips rendering the xterm div);
  `application-deploy-panel.tsx` passes `enabled: false` to `useLogsSocket()` (a new parameter; its effect `return`s early — so that a log ticket is not wasted on a connection that is certain to be rejected). Both show an `<Alert>` explaining the cause plus a button that opens the same page at `webOrigin`.
- `requireToken()` is in `src/features/auth/auth.session.ts` and is used by all queries/actions.

## Console

- Tab **Console** on the application page (`application-tabs.tsx`, next to "Webhook"): `docker exec -it` into the application's own container — unlike `/terminal`, which SSHes into the host. `console-view.tsx` is a copy of `terminal-view.tsx` (xterm.js + `--font-terminal`, same refit, same origin-mismatch detection with the same `<Alert>`)
  minus the server selector (not relevant — the container is already determined), plus an optional **task** selector for `service`-mode apps with more than one local task
  (`ConsoleTask[]`, shown only if `tasks.length > 1`, same as the server selector in the terminal). `src/features/console/` — `console.protocol.ts` (mirror of
  the API's `console.protocol.ts` + `consoleNamespaceUrl`), `console.actions.ts` (`createConsoleTicket(applicationId, containerId?)`).
- **Tab hidden for viewers** (`app.projectRole !== "viewer"`, checked in `application-tabs.tsx` before rendering `TabsTrigger`/`TabsContent` — the API already rejects with 403 too; this only keeps viewers from seeing a tab that is certain to fail). The task list comes from the **existing** `app.service.tasks` in `ApplicationDetail`
  (`get-application` — see the aoox-api AGENTS.md Docker Swarm section): filtered by `local && state === "running"` (tasks without a `containerId` or not on this node cannot be exec'd from here, same as the swarm cross-node limitation for jobs/metrics), label `Task <slot> · <node>`.
  A small caption "This shell is inside the container. File changes are lost on redeploy, except in a volume mount." always shows — a reminder that this is not a mount and not a code editor.
- Visual verification: API + web dev servers, real containers (`debian:bookworm-slim` as a fake app container named `aoox-app-<appName>`), open the Console tab,
  type real commands (`echo`/`hostname`), check the real output via `get_page_text` (real browser, not a mock) — the shell prompt (`root@<container-id>:/#`) and the command results display correctly.

## Internationalization (i18n)

- Library: `next-intl` 4.x **without i18n routing**: no URL prefix, every route stays the same. Locales are `en` (default and fallback) and `id`
  (`src/i18n/config.ts`: `LOCALES`, `DEFAULT_LOCALE`, `LOCALE_COOKIE` = `aoox_locale`). The locale is stored in that cookie only (not on the account, not in the API).
  `src/i18n/request.ts` (`getRequestConfig`, registered by `createNextIntlPlugin()` in `next.config.ts`) reads the cookie and loads the message files of that locale;
  a missing or unknown value falls back to `en`. `NextIntlClientProvider` wraps the app in `src/app/layout.tsx`, and `<html lang>` follows the locale.
- Switching: the user menu calls `setLocaleAction` (`src/features/locale/locale.actions.ts`, sets the cookie) and then `router.refresh()`.
- **Messages**: one file per namespace and language, `messages/<locale>/<namespace>.json` (`en` and `id`). The file holds the namespace's keys directly, **without** a wrapper
  object; the file name is the namespace name. Namespaces are listed in `src/i18n/namespaces.ts` (`NAMESPACES`); `src/i18n/request.ts` imports `messages/<locale>/<ns>.json` for each
  of them (a dynamic import with a static prefix, so the bundler includes every file, nothing is read from disk at runtime) and merges them into `{ [namespace]: content }`.
  Nested keys are fine (`groups.platform`); camelCase leaf names; ICU placeholders (`{count}`, `{version}`) must be identical in both languages. English is the reference file.
  - Namespaces: `nav`, `breadcrumb`, `inbox`, `commandPalette`, `userMenu` (shell), `common` (shared buttons, states, labels, generic messages: reuse these before adding a key elsewhere),
    `logViewer`, `validation` (zod and server-action messages), `alerts` (resource alert rules card), `auth`, `dashboard`, `projects`, `applications`, `compose`, `database`, `settings`, `infra`, `docker`, `registry`,
    `terminal`, `templates`. An empty `{}` file is a namespace nobody has filled yet.
  - To add text: put the key in the right namespace file in **both** languages (one area = one owner, so parallel work does not touch the same file), then
    `useTranslations("namespace")` (client or server component) / `getTranslations` (async server code) and `t("key", { count })`.
  - To add a namespace: create `messages/en/<ns>.json` and `messages/id/<ns>.json`, and add the name to `NAMESPACES`.
  - Run `npm run check:i18n` (`scripts/check-i18n.mjs`): it fails when the two languages have different files or keys, when a file is not listed in `NAMESPACES` (or a listed one has
    no file), on empty values, and on mismatched placeholders.
  - **Never hardcode user-facing text in a new component.** Existing screens still hold Indonesian literals until they are migrated (stage 2); migrate a screen by moving its text
    into its namespace, with `id` getting today's Indonesian wording and `en` a natural English one.
  - Text that comes from the API (error messages, audit-log event titles) is displayed as received and is not translated. **Inbox** items are the exception: the API sends structured `params`
    (+ `variant`) next to its English `title`/`summary`, and `features/inbox/inbox.describe.ts` composes the line from `messages/<lang>/inbox.json` (`events.<event>[.<variant>].title|summary`, ICU).
    A row without `params`, an unknown event/variant, or a missing needed value falls back to the API text. Adding an event or variant = a builder in `inbox.describe.ts` + both message files (the contract is in aoox-api AGENTS "Inbox").
- **Dictionary by API id, API text as fallback** (`src/i18n/api-text.ts`, `apiText(t, key, fallback)`). Template catalog texts (`templates.catalog.<templateId>`: `description`, `variables.<KEY>.label|hint`,
  `services.<service>-<port>`) and proxy preset texts (`infra.proxyPresets.<presetId>`: `label`, `description`, `fields.<field>.label|hint`) come from the API with stable ids, so the English reference
  in the message file is copied from the API source (the API `*.ts` files stay the source of the English text; keep the two in sync when an id or text changes). Rendering calls `apiText`, which uses the
  dictionary entry when the active locale has it (`t.has(key)`) and the API text otherwise: a new template or preset shows English until a translation is added. Product names, option values
  (select values such as `to-www`), units and the API ids themselves are never translated. Do not put these keys in the API response or add a second source of text.
- **Navigation labels** live in the `nav` namespace; `src/components/custom/nav-items.ts` holds only keys (`key: "dockerDisk"`), so the sidebar and the command palette stay in sync.
- **Dates, times, numbers**: never call `toLocaleString("id-ID")` or similar. Use `src/i18n/format.ts` (`formatDateTime`, `formatDate`, `formatTime`, `formatNumber`, `formatRelative`),
  passing `useLocale()` (client) or `await getLocale()` (server). These are pure functions, usable in module-level helpers that take `locale` as a parameter.
- Tooling note: `next-intl`'s plugin loads `@swc/core` when `next.config.ts` is read. On Windows, a restricted-token shell can make its native cache check fail
  (`ERR_SWC_NATIVE_CACHE`); setting `SWC_NATIVE_BINDING_CACHE` to a directory under the user profile with a clean ACL (for example `C:\Users\<you>\.swc-cache`) fixes it. Normal shells are not affected.

## Shared UI components (status, logo, empty state, log, charts)

- `status-dot.tsx` `StatusDot` + `statusTone()`: one meaning for status colors across all lists/cards (lime `bg-primary` = running/active, pulsing amber = transitioning, `bg-destructive` = error/failed, muted = other);
  `showLabel` shows a small text label; without it only the dot + `sr-only`. Detail pages (`StatusStrip`) keep using `Badge`. Do not create new status dots/colors per component.
- `brand-icon.tsx` (+ `brand-paths.ts`, inline simple-icons CC0 paths, `currentColor`, no CDN/dependencies): `EngineIcon`, `SourceIcon`, `GitProviderIcon`, `ImageRegistryIcon`, `ComposeSourceIcon`.
  Valkey is not in simple-icons → lucide icon. Adding a new brand = adding an entry in `brand-paths.ts`.
- `empty-state.tsx` `EmptyState` (lucide icon + one sentence + optional action; `compact` inside a card/tab). Actions are rendered only when the equivalent button actually exists for that role.
- `log-viewer.tsx` `LogViewer` + `lib/ansi.ts` `parseAnsi` (pure): all logs (deployment, live container, compose, job, preview, Docker log dialog). Text → React text nodes, never HTML; only the last
  2000 lines are drawn (a button for older ones); `"Follow"` stops when the user scrolls up. The surface is always dark (`#0a0a0a`) in both themes.
- `area-chart.tsx` `AreaChart` (own SVG, real pixel width via `ResizeObserver`, monotone cubic curve, `primary` gradient, value+time tooltip): used by `StatSparkline`, the host charts, and HTTP monitor latency. No chart library.
- `nav-items.ts`: the single navigation definition (`NAV`/`INFRA_NAV`/`SETTINGS_NAV`/`AUDIT_LOG_NAV` + `visibleNav({showTerminal,isOwner})` with the `terminal`/`manage`/`owner` flags); the sidebar and command palette both use it — new nav items are simply added here.
- `command-palette.tsx` `CommandPalette` (in `AppNavbar`, Ctrl/Cmd+K, built on `ui/dialog` without `cmdk`): pages + project/instance from a single `fetchProjectsAction` (`GET /projects`, read when first opened) + theme switch; navigation only, no write actions.
  The shortcut is inactive in `textarea`/contenteditable/`.xterm`/`[data-no-palette]` (put that attribute on new editors). Combobox + listbox/option pattern + `aria-activedescendant`; focus is returned via `onCloseAutoFocus` (the dialog has no Radix trigger).
- Transitions (tabs, `ul.divide-y > li` rows) are in `globals.css` behind `prefers-reduced-motion: no-preference`; dialogs/menus use the stock built-in animations.

## Principles

- Always follow the official documentation (Next.js in `node_modules/next/dist/docs/`, shadcn, etc.) for package selection and code patterns.

## Field and button height (one row)

- Fields (`Input`, `SelectTrigger`) and the default `Button` = **h-7 (28 px)**. In a row that contains **both** fields and buttons, everything must be the same height: **do not** add `h-*` overrides on fields (e.g. `h-8`), and **do not** use `Button size="sm"`/`icon-sm` next to default-size fields. `size="sm"`/`xs` remain for toolbars, list/table rows, and card headers that contain no default-size fields; rows that are entirely small (e.g. `SelectTrigger size="sm"` + `icon-sm`, like the Terminal/Console toolbars) are also fine because they are uniform.
- Labeled fields stacked above, with a button on the right: wrap them in a `flex items-end` row (label+field in one `space-y-1` column), so the button's bottom = the field's bottom. `SelectTrigger` already has `mb-0` (inside a `<form>` Radix adds a hidden `<select>` as the last child, and Tailwind v4's `space-y-*` gives a 4 px bottom margin to a trigger that is not `:last-child`).
- `npm run check:ui` (`scripts/check-field-heights.mjs`, no new dependencies) flags height overrides on fields and rows with mixed control heights; it is intentionally manual (a heuristic, not in build/CI). Intentional exceptions: a `ui-check-ignore: reason` comment on the line above. The actual measurer remains `getBoundingClientRect` in the browser.
- Every `SelectContent` uses `position="popper"` (the menu opens below its field, flipping up when there is no room, as wide as the field); `npm run check:ui` enforces it. Never change the default in `src/components/ui/select.tsx`.

## Toast & loading on create (application, database, compose stack, template, project import)

- Pattern: `toast.loading(...)` (sonner) on submit → store the returned id (in a `useRef`, not `useState` — no re-render needed) → `toast.success`/`toast.error` with the same `{ id }` when the result arrives, so the **update** replaces the same toast instead of stacking new ones. The submit button gets a `Loader2` (lucide) icon with `animate-spin` + a working text (`"Creating…"`) in addition to `disabled={pending}`. For forms that are still dialogs (`deploy-template-dialog.tsx`, `import-project-dialog.tsx`), the dialog is also locked (`onOpenChange` refuses to close, `DialogContent showCloseButton={!pending}`) so a running request is not cut off by Escape, an overlay click, or the X button.
- **Why not `redirect()` in a server action**: `createApplicationAction`/`createDatabaseAction`/`createComposeAppAction` used to call `redirect()` on the server on success — this cut off the `useActionState` promise before it could update the toast (the toast stayed "loading" forever on the destination page, since sonner did not know how to finish it). All three now **return `{ values, createdId }`** (new fields on `ApplicationFormState`/`DatabaseFormState`/`ComposeFormState`) instead of redirecting. The form components (`application-form.tsx` create mode, `compose-form.tsx` with the `mode` prop, `database-form.tsx`) perform `router.push()` themselves in a `useEffect` that watches the `pending: true → false` transition — once `state.createdId` is present, the toast is updated to success first and only then does navigation happen (not the other way around), so the toast never gets stuck even though the old component unmounts right after the push. Validated field errors still appear inline as before (unchanged — only the success handling moved from server to client).
- `deploy-template-dialog.tsx` and `import-project-dialog.tsx` already used `useTransition` + a manual `router.push()` from the start (never a server-side `redirect()`) — only a toast + spinner were added, with no action changes.
- Success messages are **honest about background processing**: database (`"...is being set up, pulling the image can take a few minutes"`), stack (`"...is deploying"`) — these lines refer to the `creating`/`deploying` statuses whose detail pages **already** poll themselves (`database-panel.tsx`, `compose-panel.tsx`, `setInterval` every 3 seconds while the status is not terminal) — do not add new polling there, just make sure the toast does not claim "done".
- `onCreateWithDomain` in `application-form.tsx` (Access option → Domain) now takes `(formData, toastId)` — `create-application-page-form.tsx` sets `toast.success`/`toast.error` with that id, because this flow also calls `addDomainAction` after create, and its message needs to know whether the domain was added successfully or not.
- **Full pages, not dialogs** (`/projects/[id]/applications/new`, `/projects/[id]/compose/new`, `/projects/[id]/databases/new`): the "New application"/"Compose stack"/"New database" forms were originally dialogs on the project page — too cramped for the dialog width, especially the application form (Source, Access, Swarm, etc.). Each route now has its own `page.tsx` (breadcrumb + back button + a `max-w-3xl` `Card` wrapping the exact same form), and the "New application"/"Compose stack"/"New database" buttons on the project page are now plain `Link`s, not dialog triggers. `application-form.tsx`/`compose-form.tsx`/`database-form.tsx` receive a new `cancelHref?: string` prop — rendered as a `"Cancel"` button (`Button asChild variant="outline"`) next to the submit button, used only by the create pages (editing in the Settings tab does not need Cancel). Because the sonner toast is stored in a global store (`<Toaster/>` in the root layout), not in the form component, navigating via "Cancel" or a successful `router.push` never cuts off a toast that is still running. `create-application-page-form.tsx` (client, no `Dialog`) wraps `application-form.tsx` for the Access → Domain option — its logic is exactly the same as the removed dialog, just without `open`/`setOpen`. `deploy-template-dialog.tsx` **remains a dialog** (outside the scope of this change) because it is invoked from the template catalog (`/templates`), not from the project page.

## Docker

- `Dockerfile` follows the official example `vercel/next.js/examples/with-docker` (`output: "standalone"` in `next.config.ts`).
- Runtime env: `API_URL` (server → api, in compose `http://api:3001`) and `PUBLIC_API_URL` (browser → api). The full stack is in `../aoox-api/docker-compose.dist.yml`.

## Registry

- `/registry` — the `"Local registry"` tab (`self-hosted-registry-card.tsx`: provision/GC/delete, credentials shown once; `registry-repositories.tsx`: repo → tag, delete tag with a shared-digest warning)
  and the `"External"` tab (`external-registries.tsx`). `src/features/registry/` = entity, schema, queries, actions (`ActionResult<T>` for non-form actions).

## Application

- The application list is on the project detail page (the "New application" button → `/projects/[id]/applications/new`, see the Toast & loading section). The detail page is at `/applications/[id]` with a Deploy tab
  (`application-deploy-panel.tsx`: Deploy/Stop/Start buttons, deployment list, deployment logs and container logs **streamed** via Socket.IO `/logs` — hook `src/features/application/use-logs-socket.ts`, protocol in `logs.protocol.ts`; `router.refresh()` when the status is terminal)
  and a Settings tab (`application-form.tsx`, also used for create). The application tabs (Deploy/Domain/Mount/Jobs/Webhook/Settings) are now rendered by
  `application-tabs.tsx` (client, **controlled** `Tabs` via `useState`) instead of `<Tabs defaultValue>` directly in `page.tsx` — this is needed so that the button in
  `application-deploy-panel.tsx` (access nudge) can switch tabs from outside.
- **Maintenance mode card** (`application-maintenance.tsx`, first card of the Settings tab, `setMaintenanceAction` → `PUT /applications/:id/maintenance`): the switch publishes at once with the text in the box, the message has its own Save button (280 characters, plain text). Viewers see the state read-only; remote-server apps show a note (the API refuses them). The status strip shows a "Maintenance" badge while `maintenanceEnabled` is true. Routing lives in the API (see aoox-api AGENTS "Maintenance mode"), not in the web.
- **Access step on create** (`application-form.tsx`, prop `mode: "create" | "edit"` — only create shows this; edit keeps the Host port field + the separate Domain tab as before): a segmented tab (shadcn `Tabs`, same pattern as `compose-domains.tsx`) **IP & port** / **Domain** / **`"Later"`**. "IP & port" reuses the same `hostPort` field (same field name, only moved during create). "Domain" (host + HTTPS switch, disabled without `proxy.acmeEmail`) cannot go through the create DTO (there is no domain field there yet) — its form bypasses the normal `formAction` itself (custom `onSubmit`, not `action={formAction}`) and calls the
  `onCreateWithDomain` prop (implemented by `create-application-page-form.tsx`): `createApplicationForAccessAction` (a variant of `createApplicationAction` that does **not** `redirect()`, so it can go on to call `addDomainAction`) → `addDomainAction` → `router.push` to the application page (with `?domainProxyAutoProvisioned=1`
  when `addDomainAction` reports that). The API `POST /applications/:id/domains` now replies with `{domain, proxyAutoProvisioned}` (not a plain `Domain`) — `addDomainAction`
  flattens it back into `Domain & {proxyAutoProvisioned}` (see the aoox-api AGENTS.md Proxy & Domain section) so both callers (`create-application-page-form.tsx`,
  `application-domains.tsx`) still read `r.data.proxyAutoProvisioned` without knowing the response shape changed. A generic 400 error from create/update that mentions the word "port" (not structured `fieldErrors` — the API does not return those for port conflicts yet) is shown near the Host port field instead of only in the bottom banner
  (`portConflict`, applies to both create and edit).
- The deploy panel (`application-deploy-panel.tsx`) receives `hasAccess` (from `!!app.hostPort || domains.length > 0`, computed in `application-tabs.tsx`): if the app has once deployed successfully (`app.currentImage`) but `!hasAccess`, an Alert "This application has no access address" appears with a button to the Settings/Domain tab
  (`onNavigateTab`, a prop from `application-tabs.tsx`). The `domainProxyAutoProvisioned` prop (from the query string set by the "New application" page) shows the same warning Alert style as `panel-domain-card.tsx` (DNS/firewall/wait for ACME) — it can be closed, and it does not remove the query string.
- **Deployment trigger origin & live `deployment:created`** (`application-deploy-panel.tsx`): `DeploymentSummary` (`application.entity.ts`) now has
  `trigger` (`manual`|`webhook`|`auto-update`), `commitSha`/`commitMessage`/`triggeredBy` from the API (see the aoox-api AGENTS.md Application & Deploy section). The history
  shows a `Webhook` (lucide) icon for webhook deploys + the short SHA in the date row, both with a `title` tooltip (`triggerLabel()`, a local helper in this file — not a shadcn `Tooltip` component, consistent with the other `kind` icons in the list, which already use a plain `title`); the selected deployment shows the same label
  in the log subtitle. `logs.protocol.ts` (a copy of `LogsServerEvents` from aoox-api) has a new event `deployment:created` — a separate effect (not merged into the per-deployment log effect that already exists, so it keeps listening even when `selectedId`/`following` change) listens for it while `socket` exists: it selects the new deployment, resets the log state, calls `router.refresh()`, and shows a `toast.info()` (sonner) with `triggerLabel()`. It is subject to the existing `useLogsSocket(..., enabled)` — an origin
  mismatch means this live feature also does not run, just like the regular log streaming; there is no polling fallback.
- `src/features/application/` — entity (including `ACTIVE_DEPLOYMENT_STATUSES`), zod schema (empty `hostPort` → null), queries, actions.
- `application-form.tsx`: a **Server** select (Host aoox / remote servers from `listServers()`, shown only when there are servers; a member gets 403 → an empty list) with a note on remote limitations (no registry push, no domain/proxy); the application detail shows a server name badge.
- `application-form.tsx`: **Health check path** field (`healthcheckPath`, empty = null) with a note on blue/green and the prerequisites wget/curl/node/python3 in the image.
- The database page now has the tabs **Overview / Data / Backup**. The Data tab = `database-data-browser.tsx` (table/key list on the left with estimated rows, a grid of rows
  paged 50 at a time with per-column sort, an SQL/command box with Ctrl+Enter, results where `NULL`/(empty) are distinguished, a `message` badge, and the engine's error messages as-is).
  `src/features/managed-database/data-browser.{entity,actions}.ts` (`listTablesAction`, `fetchTableRowsAction`, `runQueryAction`). `canWrite` from the session role
  (owner/admin) only changes the caption text — the real gate is in the API.
  A **database** selector above the table list (non-Redis): `listSchemasAction`, `createSchemaAction` (input + + button), `dropSchemaAction` (trash icon, non-primary only, `window.confirm`); `dbParam` = undefined for the primary database, so all data browser actions send `db` only when switching. The backup schedule form has a switch
  `"All databases on the server"` (`backupAllDatabases`), and the backup list marks `scope: all`.
  Overview tab: `database-panel.tsx` receives `schemas` (from `listSchemas`, only when the server is running and it is not Redis) and shows a "Connection for database" select when there is more than one — choosing another database only changes the database name and URL path (`withDatabase`); the host/user/password stay the same.
- Create table: `create-table-dialog.tsx` (+ button in the table list header, owner/admin, non-Redis) — a column form (name, type per engine from `COLUMN_TYPES`, varchar length,
  NULL, PK, default) → `buildCreateTable()` (`src/features/managed-database/create-table.ts`, pure: identifier validation, implicit PK NOT NULL) → SQL preview → executed
  through the same `runQueryAction` as the SQL box (write rights are checked by the API). After success, the list is reloaded and the new table is opened.
- SQL export/import in the header of the SQL box: **Export SQL** = `<a href="/api/databases/[id]/export?db=">` (a route handler proxies the stream with a Bearer token, `Content-Disposition`
  is passed through); **Import SQL** (owner/admin) = a hidden file input → `window.confirm` (name, size, target database) → `importSqlAction(id, db, FormData)` (a multipart fetch
  directly to the API, not the JSON `api()`) → a result notice, and the table list is reloaded.
- `application-form.tsx`: **CPU limit (millicore)** & **Memory limit (MiB)** fields (`cpuMillicores`/`memoryMb`, empty = null); the database page has a `database-resources.tsx` card
  (`updateDatabaseResourcesAction` → `PATCH /databases/:id`). The UI note: applies immediately; removing a limit = the container is recreated.
- `application-form.tsx`: **Build method** select (`buildType` Dockerfile / Nixpacks); the Dockerfile field appears only for `dockerfile`, and Nixpacks shows a note
  (the first build is slow, cache is disabled, build args = nixpacks env).
- Env: `env-editor.tsx` (client) = a per-line editor with masked values (password input + show toggle) and a text mode for pasting a `.env`;
  the submit is still one text field `KEY=VALUE` (the API contract is unchanged — the API still returns the real values, masking is only in the UI). Used by `application-form.tsx`
  (plus the build args field and the project's database slug hint) and `project-form.tsx` (`showEnv`, the shared env on the project page).
- Compose: `src/features/compose/` (entity/schema/queries/actions — server actions must be `async function`, arrow aliases are rejected by Next) + `compose-form.tsx` (used by the
  `/projects/[id]/compose/new` page and the Settings tab), `compose-panel.tsx` (client: deploy/stop/start/delete, container list, last action log; polls every 3 seconds while
  `deploying`), route `/compose/[id]`. The project page shows the **Compose stack** section between Applications and Databases.
  The Compose Deploy tab starts with `compose-access-hint.tsx` (client): without `serviceDomains` & `servicePorts` → an Alert "This stack has no address yet"; otherwise an "Open" button per service — domain
  `http(s)://host[:proxy port]`, host port `http://<browser hostname>:<hostPort>`. The hostname comes from `use-browser-host.ts` (`useSyncExternalStore` over
  `window.location.hostname`, `null` on the server) — the stack always runs on the same machine as the panel, so the panel's host = the published port's host; no API call.
  `/projects/[id]` layout: two columns at `lg` (`grid lg:grid-cols-[minmax(0,1fr)_400px]`) — Applications, Compose stacks, Databases on the left; the Settings card (sticky) on the right;
  the resource card grid uses `sm:grid-cols-2 2xl:grid-cols-3` because the columns are narrower.
- One-click templates: `/templates` (`templates-catalog.tsx` grid + search, `deploy-template-dialog.tsx`: project, name, a per-service **Access** fieldset (host + HTTPS and/or host port — `servicePorts` is passed to `deployTemplateAction`), variable fields —
  empty = default/generated by the API) → `deployTemplateAction` (`src/features/template/`) → redirect to `/compose/<id>`. The sidebar has a **Templates** menu; the project page
  has a **From template** button (`/templates?project=<id>`). Stack `source: "template"`: `ComposeForm source="template"` (a `composeContent` textarea, no git fields;
  a hidden `source` input selects `composeTemplateSchema` in the action) and the **Access** card `compose-domains.tsx` (`ComposeAccess`: a single combined list of domains + host ports
  with badges, an add form with **Domain** / **IP & port** Tabs — the Service & container Port fields are the same, then Host+HTTPS or Host port; service suggestions from the catalog via
  `templateId`; `updateServiceDomainsAction` / `updateServicePortsAction`, both PATCH `/compose-apps/:id`). An API 400 error (port already in use) is shown below the form. `ComposeApp.gitUrl` is now nullable — show `template · <id>` when `source === "template"`.
- `/projects`: `project-card.tsx` cards — name, an active/inactive badge (≥1 instance `running`), the instance list from `ProjectListItem.instances`
  (a per-kind icon, engine/kind, a status dot: green running, red error, yellow pulsing building/deploying/creating, gray other) and an `n/total running` summary.
  **`instance.deploying`** (from the API, see the aoox-api AGENTS.md Project section): an amber "deploying…" badge + a pulsing status dot, which wins over the normal status color —
  this is the only way an application (not compose/database) shows a deploy indicator here, because `Application.status` itself never holds
  `building`/`deploying`. The `/projects` page renders `ProjectsAutoRefresh` (client, `projects-auto-refresh.tsx`), which calls `router.refresh()` every 4 seconds **only**
  while there is a `deploying` instance in any project on that page (computed server-side from the `listProjects()` result), and stops by itself once all badges are gone —
  no polling when nothing is deploying.
- Dashboard: `live-clock.tsx` in the top-right corner of the header (day, date, local hh:mm:ss, `useSyncExternalStore` with a 1 s interval as the store; a server snapshot of `null`
  → placeholder, so there is no hydration mismatch and no `setState` in an effect, which the lint rules reject).
- Dashboard: three project cards at the top (`getProjectSummary` → total / active in green `emerald` / inactive in red `red`; the colors only reinforce, the labels still say what they mean).
- Realtime host charts on the Dashboard (below the Host card): `host-live-chart.tsx` (owner/admin) — three area charts for CPU %, RAM %, and Storage % (side by side on wide screens `lg:grid-cols-3`, stacked on narrow ones; SVG `preserveAspectRatio="none"` + non-scaling stroke so they stretch fully) with a fixed 0–100 scale and 25 % gridlines, the last 5 minutes,
  polling `fetchHostLiveAction` every 2 seconds **only while the tab is visible** (`visibilitychange` via `useSyncExternalStore`), hover crosshair + time (formatted on the client).
  The initial data comes from `getHostLive()` on the server; the caption shows the share of aoox containers (container CPU "per core" divided by the host's core count).
- Monitoring: `src/features/monitoring/` (`getHostOverview`, `getMetrics`, server action `fetchMetricsAction` for client polling) + `metrics-panel.tsx`
  (client; a KPI row for CPU/memory/network with a single-series SVG sparkline — ink `muted-foreground`, current point `primary`, hover reads the nearest sample;
  polled every 15 seconds = the API sampler interval) in the application's Deploy tab and on the database page; `host-overview-card.tsx` (server) on the Dashboard for owner/admin with a stacked Docker disk meter (one hue, steps getting lighter). The chart patterns follow the `dataviz` skill.
- Preview PRs: `previews-panel.tsx` in the Webhook tab (preview list: status, host, open link, logs, delete; polls every 5 seconds while `building`) +
  the `previewsEnabled` toggle and `previewDomain` in `application-form.tsx` (`src/features/application/preview.entity.ts`, `listPreviews`, `fetchPreviewsAction`, `deletePreviewAction`).
  `metrics-panel.tsx` formats time only on the client (`useSyncExternalStore` mounted) to avoid hydration mismatches.
  The `metrics-panel.tsx` sparkline is stretched to the full tile width (`preserveAspectRatio="none"`, non-scaling stroke, vertical marker line); the Network tile shows the incoming rate per second (`rxRate`: the difference in cumulative counters between samples / second, clamped to 0 when a counter resets).
- The backup lists (DB & volume) use `local` from the API: a `remoteKey` without `local` is shown as `"only on S3"` — restore/download still work (the API pulls it from S3).
- **Volume backups** (`volume-backups.tsx`, below the Mount tab; `src/features/volume-backup/`): backup per volume (select a volume when there is more than one), a list with download/restore/delete, schedule + retention + S3 destination per application (`updateVolumeBackupScheduleAction` → `PATCH /applications/:id/backup-schedule`). The selected volume is derived from props (falling back to the first volume), not from an initial `useState` — the component first renders when no volume exists yet. Downloads go through `/api/volume-backups/[id]/download`.
- `application-jobs.tsx` and `application-mounts.tsx` receive **`owner`** (`JobOwner`: application|database|compose; `MountOwner`: application|database) — the API paths come from `ownerBase()`, page revalidation from `ownerPage()` (compose: `/compose/<id>`). The database page has Mount & Jobs tabs; the compose page has a Jobs tab with a `service` select
  (service names come from the running stack's containers — a stack that has not been deployed has no options).
- **Jobs** tab (`application-jobs.tsx`): cron jobs per application (`src/features/job/` entity/queries/actions). Run history is loaded when the row is opened (not in an effect — the React Compiler `set-state-in-effect` rule), polled every 2 seconds while a run is `running`, and then `router.refresh()` so `lastStatus`/`lastRunAt` in the header are refreshed too.
  Notifications have a new `onJobFailure` toggle.
- **Mount** tab (`application-mounts.tsx`): the mount list (file = textarea + "Save & apply"; deleting a volume asks about purging via `confirm`) + an add form
  (volume/bind/file; bind only when `canBind` = owner/admin from `getVerifiedSession`). Actions `addMountAction`/`updateMountAction`/`deleteMountAction`, query `listMounts`.
- **Domain** tab (`application-domains.tsx`): add/remove hostnames + an HTTPS toggle (enabled only when the proxy has an `acmeEmail`); a Rollback button in the deploy panel.
  If `addDomainAction` reports `proxyAutoProvisioned` (the API turned on the proxy automatically for the first domain), a troubleshooting Alert in the same style as
  `panel-domain-card.tsx` (DNS/firewall/wait for ACME) appears — local state (`justAutoProvisioned`), not via the query string like the create-with-domain path.
- Per-domain DNS check (radar button in `application-domains.tsx`): `checkDomainDnsAction` → `GET /applications/:id/domains/:domainId/dns`, result badge `ok|wrong target|not found|?` + message;
  when the public IP is detected automatically, the message suggests `PUBLIC_IP` in the API. `DnsCheck` in `application.entity.ts`.
- `/settings` is grouped in `Tabs` (`?tab=` = deep link, default `account`): **Account** (account-card, api-tokens-card), **Team** (members-card + audit log link; owner/admin),
  **Integrations** (git-credentials-card, notifications-card, backup-destinations-card). Cards inside a tab keep the `lg:grid-cols-2` grid; data is loaded all at once on the server.
  The tabs are **controlled by the URL** (`settings-tabs.tsx`: `useSearchParams` → `router.replace(?tab=)`), so the **Settings** sidebar group (`app-sidebar.tsx`: Account / Team / Integrations + Audit log; Team & Audit only for owner/admin, using the same `showTerminal` flag) always stays in sync with the open tab. The "Settings" menu in the Platform group was removed.
- **Infrastructure** = its own sidebar group, **one page per host component** at `app/(dashboard)/infra/<slug>/page.tsx` (previously one tab full of cards): `proxy`
  (all members; `canManage` for buttons), `servers`, `terminal`, `swarm`, `disk` (owner/admin, `notFound()` for members), `backup` (owner only). Each page loads only the data for its own card and uses `infra-page.tsx` (title + description + `SetBreadcrumb` "Infrastructure › …"; cards full width). `/infra` redirects to `/infra/proxy`.
  `INFRA_NAV` in `app-sidebar.tsx` (flags `manage`/`owner`; a new `isOwner` prop from the layout). Help text that used to say "Settings → Infrastructure" now says "Infrastructure → Reverse proxy".
- `/infra/proxy` — `proxy-card.tsx` (provision/remove Traefik); `src/features/proxy/` entity, queries, actions.
- In production the web app can be served through the proxy with its own domain (`docker-compose.domain.yml` in the API repo): `WEB_ORIGIN`/`PUBLIC_API_URL` must be https
  and match that domain — the `Secure` cookie follows `WEB_ORIGIN`, and the terminal gateway rejects other `Origin`s.
- **Webhook** tab (`application-webhook.tsx`): URL + copy + regenerate. The application form has a **Git credentials** select (`"none"` → sent as null).
- Webhook secret (in the same tab, the "Secret (signature)" section): `setWebhookSecretAction(id, enabled)` (PUT/DELETE `/applications/:id/webhook/secret`), the secret is shown with copy,
  enable/rotate/disable buttons; the provider instructions mention the Secret / Secret token field when enabled.
- Two-step sign-in: `signInAction` returns a `challengeToken` when the API answers `requiresTwoFactor`; `sign-in-form.tsx` then uses a second `useActionState`
  (`signInTwoFactorAction`) — the result of step 2 decides the view: a `challengeToken` present = stay on the code step (wrong code); none = back to step 1 (the challenge expired).
- `servers-card.tsx` inserts `server-proxy-panel.tsx` for each server: status (fetched on request, via SSH), HTTP/HTTPS ports, ACME email, staging, Provision/Re-provision/Remove
  (`provisionServerProxyAction`/`serverProxyStatusAction`/`removeServerProxyAction`). The `Server` entity carries the proxy settings. The application and volume backup form text no longer mentions the limitations of remote servers.
- `notifications-card.tsx`: the `onDiskLow` & `onCertificateFailure` toggles; the webhook channel has an optional `secret` field (type password) with an explanation of the signature header.
  The `onDeploymentStarted` toggle ("deploy started") is **unchecked by default** when creating a new channel — unlike all other toggles in `EVENT_LABEL`, which are on by default (`DEFAULT_CHECKED_EVENTS`, computed from `EVENT_LABEL` minus this field) — to match the API default (`on_deployment_started = false`), because this event can fire often via webhook/auto-update. The `onAppError` toggle ("errors in application log") is in the same `DEFAULT_OFF_EVENTS` list (not a one-element `Set` anymore) — it is also off by default in the API, because detection from log text is prone to misjudging (see the aoox-api AGENTS.md Notifications section).
- `application-form.tsx`: the **"Ignore errors in logs"** switch (`ignoreErrorLogs`, edit mode only — same pattern as `staticSpa`/`previewsEnabled`) excludes the application
  from the log scanning in `app-error-watcher.service.ts` in the API, for apps whose normal output looks like errors.
  **A pitfall that was found** (found through manual verification of the "New application" page — not by `tsc`/lint/tests, because the type is structurally valid, just semantically wrong): the `applicationSchema` (zod) is shared by create & edit, so `ignoreErrorLogs` is always present in the `data` after parsing (`.default(false)`) — but
  the `CreateApplicationDto` in the API does **not** declare this field (edit-only, see `update-application.dto.ts`), and the global `ValidationPipe` with `forbidNonWhitelisted`
  rejects with 400 `property ignoreErrorLogs should not exist` for **every** application creation, regardless of source/engine — this bug made create-application fail 100% until it was found here. The fix: `createApplicationAction`/`createApplicationForAccessAction` (`application.actions.ts`) filter this field out via the helper `omitIgnoreErrorLogs()` before `POST /applications`. Other fields with the same pattern (a shared create+edit schema, edit-only fields) carry the same risk — check that the create DTO in aoox-api actually declares every field that is sent before adding a new field to this shared schema.
- `application-form.tsx`: the **Source** select (`sourceType` git|image): `image` shows `imageRef` + a registry credentials select (`imageRegistryId`, `"public"` → null) and hides the git block (`hidden`, still submitted). Per-source validation in `applicationSchema` = `baseSchema.superRefine` (gitUrl required for git, imageRef for image).
  The project and application pages load `listRegistries()` (members → `[]`). The `imageRef`/`imageRegistryId` fields are now **controlled** (not `defaultValue`), because the **"Choose from registry"** button (`image-picker-dialog.tsx`) needs to fill them programmatically: the dialog reuses the same `fetchRepositoriesAction`/`fetchTagsAction` as the Registry page (endpoint `GET /registries/:id/repositories[/…/tags]`, OCI catalog — works for any registry, not just self-hosted, though a public registry such as Docker Hub without `_catalog` support will show empty) for cascading registry → repository → tag selects, then builds `imageRef` = `<registry.url>/<repo>:<tag>` on "Use".
  This button is hidden when there are no registries at all (`registries.length === 0`) — you can still fill it in manually as before.
- `application-form.tsx`: third build method **Static site (nginx)** → fields `staticBuildCommand` (empty = null), `staticOutputDir` (empty → `dist`), switch `staticSpa`
  (Radix Switch with `name` sends `on`; `readForm` normalizes to `"on" | ""`, `parse` converts to boolean like `previewsEnabled`).
- `disk-card.tsx` in `/settings` (owner/admin; `src/features/maintenance/`): a Docker usage bar, "Can be freed now", a **Clean now** button (owner; synchronous, can take about 1 minute)
  + a registry GC toggle, and the last report. The application form has a `deploymentKeep` field (default "10" in `readForm`).
- `/settings` loads `account-card.tsx` (`src/features/account/`): change password, enable 2FA (QR dialog + code confirmation → a one-time recovery codes dialog), disable with password.
  `members-card.tsx`: the owner can set a member's password and disable a non-owner member's 2FA (`prompt`/`confirm`). `/settings/audit-log` (`audit-log-table.tsx`, `src/features/audit-log/`):
  owner/admin, `action` filter, `before` cursor, body details per row. `AuthUser.twoFactorEnabled` is optional (only from `/auth/me`).
- `/settings` loads `api-tokens-card.tsx` (`src/features/api-token/`): create a token (name + expiry) → a one-time plaintext dialog + a curl example, a list of prefix/last used, revoke;
  a link to `${publicApiUrl}/docs`. `Date.now()` is read once via `useState` (the React Compiler rejects impure functions in render).
- `/settings` also loads `git-credentials-card.tsx`; `src/features/git-credential/` entity, queries, actions.

## Managed database

- The **Database** section on the project page (the "New database" button → `/projects/[id]/databases/new`, form in `database-form.tsx` — there is no edit mode; changing the
  engine/variant after creation is not supported), details at `/databases/[id]` (`database-panel.tsx`: start/stop, credentials with masking/copy,
  internal & external URLs, delete with/without volume; auto-refresh while `creating`). `src/features/managed-database/` entity, schema, queries, actions.
  **Engine**: `postgres`|`mysql`|`mariadb`|`redis`|`valkey`|`mongodb` (`ENGINE_LABEL`/`ENGINE_DEFAULT_TAG`, `Record<DatabaseEngine, ...>`, so adding a new engine forces the compiler to fill every place). For `postgres`, `database-form.tsx` shows an extra **Variant** select (`POSTGRES_VARIANT_INFO`: pgvector/PostGIS/
  TimescaleDB, each option has its own description + default tag that replaces the tag placeholder) — sent as the `variant` field (the `"none"` sentinel in the UI,
  converted to `""` and then `null` before reaching the API, the same pattern as `gitCredentialId`/`imageRegistryId` "none"/"public"). Other places that distinguish
  redis from SQL engines (`isRedis` in `database-data-browser.tsx`, `Exclude<DatabaseEngine, "redis">` in `create-table.ts`/`create-table-dialog.tsx`, the check
  `engine !== "redis"` in `database-backups.tsx` and the database detail page) have all been extended to include `"valkey"` as well — Valkey is key-value too,
  with no named tables/schemas. **Watch out for `z.enum([...])` in `managed-database.schema.ts`** — this literal list is not caught by the
  `Record<DatabaseEngine, ...>` exhaustiveness check (it was only found by a manual grep when adding `mongodb`, not by `tsc`), so every new engine
  must also be added there, or the create form will fail Zod validation before it ever reaches the API.
  **MongoDB** gets a third mode `isMongo` in `database-data-browser.tsx` (alongside SQL and `isRedis`): the collection list ("Collections"), the row grid, sort, and
  CSV export keep working (the backend already supports them); the Structure tab, `CreateTableDialog` (also `Exclude`d in `create-table.ts`/`create-table-dialog.tsx`,
  just like redis/valkey — MongoDB has no `CREATE TABLE`), SQL export/import, and row edit/delete are hidden (the backend rejects these with 400; the `columns` field is deliberately never filled for mongo, so PK-based action buttons do not appear without an extra explicit check). The query box shows the placeholder
  `users.find({})` and a description saying that only `.find()` is supported (read-only).
- Backup: `database-backups.tsx` below the panel (backup now, a list with download/restore/delete, a restore confirmation dialog, a schedule form with cron presets/custom + keep count).
  Data via `listBackups`; actions `createBackupAction`/`restoreBackupAction`/`deleteBackupAction`/`updateBackupScheduleAction` (cron, keep, `backupDestinationId`).
  The schedule form has an "S3 destination" select (`local` = null) from `listBackupDestinations` (the `"S3 destination"` label is quoted UI text: S3 destination); backups copied to S3 (`remoteKey`) get a cloud icon.
- S3 backup destinations: `src/features/backup-destination/` (entity/queries/actions create/delete/test) + `backup-destinations-card.tsx` in Settings (owner/admin):
  an add dialog (name, empty endpoint = AWS, bucket, region, prefix, access key, secret key written once, path-style switch), connection test, delete.
  Downloads cannot carry a Bearer header from an `<a href>`, so they go through the route handler `src/app/api/backups/[id]/download/route.ts`, which reads the session cookie
  and proxies the stream from the API (`Content-Disposition` is passed through).

## Project export/import

- `export-project-button.tsx` (project page; a dropdown "Without secrets" / "With database passwords" — the second is only for owners, from `getSession()` in the page) downloads through the route handler `src/app/api/projects/[id]/export/route.ts` (cookie → Bearer, `Content-Disposition` `<slug>.aoox.json`, `?includeSecrets=true` is passed through).
- `import-project-dialog.tsx` (`/projects` page, next to New project): the file is read and `JSON.parse`d in the browser, then `importProjectAction(file, name?)`
  (`src/features/project-transfer/`, `POST /projects/import`). With no warnings → straight to the new project; with warnings → a report (the number created + the list of warnings) first, then an "Open project" button.

## Instance backup

- `instance-backup-card.tsx` (Settings → Infrastructure, owner only — the page loads `listInstanceBackups`/`getInstanceBackupSettings` from `src/features/instance-backup/` when the role is owner):
  Back up now, a list (download via `/api/instance-backups/[id]/download`, restore with a confirmation dialog, delete), the schedule form (presets/custom, save, S3 destination), and "Restore from file"
  (multipart `restoreInstanceUploadAction`). After a restore: `router.refresh()` + a warnings report from the API (ENCRYPTION_KEY/JWT_SECRET); `revalidatePath("/", "layout")` because all data changes.

## Automatic image updates

- Application form (image section): the `autoUpdate` switch + interval in minutes (`autoUpdateIntervalMinutes`, zod 5–1440); `application-deploy-panel.tsx` has the **Check image update** button
  (`checkImageUpdateAction(id, deploy=true)` → `POST /applications/:id/check-image`) with a result message (baseline/latest/changed → pick the new deployment); the history marks
  `kind === "auto-update"` with ⟳.

## Docker page (Platform group in the sidebar; route `/infra/docker`)

- `app/(dashboard)/infra/docker/page.tsx` (server component, owner/admin — otherwise 404) reads `?server=<uuid>&tab=containers|images|volumes|networks` from the URL: a server that is not in
  `GET /servers` falls back to the host, and an unknown tab falls back to `containers`. Only the data for the **open tab** is fetched (`features/docker/docker.queries.ts` → `/docker/*` in the API, see the aoox-api AGENTS "Docker manager"); a server error (a remote server that is down) appears as an `Alert` on the page, not as a 500. `docker-toolbar.tsx` (client) = **one row**: a "Server" selector (first option "Host (aoox machine)") + a tab strip (h-7) that only changes the URL + a search box aligned right (`ms-auto`, `sm:max-w-sm sm:flex-1`; below `sm` it drops to its own full row; at 375 px: a server row, a tab row, a search row). The toolbar wraps its content (`children`) and shares the search text via `DockerQueryContext` (`useDockerQuery()` in each table); the text is cleared on every tab change.
- **Sidebar & title**: the "Docker" item is in `NAV` (Platform group, after Registry, before Terminal) with the flag `terminal: true` = the same owner/admin gate as the Terminal item (members/viewers do not see it, and opening its URL = 404); the page sets `SetBreadcrumb` "Docker" and its own title (not `InfraPage`, so that no "Infrastructure" crumb appears). "Docker disk"/"Docker Swarm" remain under Infrastructure.
  **Container table**: the first column is a dot (`StateDot`: `bg-primary` when `running`, `bg-muted-foreground/40` otherwise; the `title` and `sr-only` text hold the original state), then Container, Status (only the Docker status text),
  **Managed by aoox** (that exact title, final by the user; `MANAGED_LABEL` = aoox panel/Proxy/Registry/Application/Database/Database admin/Stack/Build/Job/Backup, with the `managedHint` tooltip, "-" when not managed), Port, Age, Actions.
  The Image tab uses the same columns for the "aoox image" and "protected" badges.
- One client component per tab (`docker-containers/-images/-volumes/-networks.tsx`) that filters with the text from the toolbar (`docker-ui.tsx`: `useDockerQuery`, `DockerSearch`, `matches`, `ago`, `DockerEmpty`); the state-dot column is `w-10 min-w-10 px-0` wide with the dot centered and the Container column is `ps-0`, so the distance from the dot to the table's left edge equals the distance from the dot to the name text (16 px, measured at 1280 and 375 px; without `min-w` the column shrinks to 8 px in tables that scroll); the table is wrapped in the default `overflow-x-auto` of `Table` (no horizontal page scroll at 375 px, tested). An aoox-owned container (`managed` from the API) gets an `aoox · <kind>` badge and an "Open its page" link
  when the label names a resource (`/applications|databases|compose/<id>`), **without** stop/restart/delete buttons — the API rejects those too (403); the UI only hides the actions. Actions for other containers:
  Log (`docker-logs-dialog.tsx`, a one-time fetch of 100/200/500 lines; the dialog is `key`ed per container so the state is clean), Start/Stop, Restart, Delete (`ConfirmDialog`; for a running container there is a "Force" switch — without it the API replies 409, which is shown in the dialog). Write actions are only visible to the owner (`isOwner`); admins can only read. Images: delete is available for images that are unused, not aoox-owned, and have no `protectedReason` (images used by rollback/applications/previews, or owned by the aoox registry, get a "protected" badge with the reason in the tooltip, and no delete button);
  the "Clean up dangling" button (the count is in the label) opens a `ConfirmDialog` that says this applies to **all** dangling images on that server (not only aoox ones), with an estimated count/size
  from the list that is already loaded (no new call). The image delete dialog (`RemoveImageButton`) says that delete applies **per image ID** (the API uses `force`, so all tags disappear too), and shows all `DockerImage.tags` (mono, one per line, a `max-h-40` box ≈ 8 lines that scrolls); an image without tags shows a short ID + "untagged". Volumes/networks are read-only (`aoox`, `yatim` (orphan), `bawaan` (built-in), `internal` badges).
- Action text in the audit log: the 6 keys `POST/DELETE /docker/...` in `audit-log.format.ts`. The server action (`docker.actions.ts`) calls `revalidatePath('/infra/docker')`, so the list refreshes itself;
  stopping a container that ignores SIGTERM takes about 10 seconds (the button stays locked on "Rendering…" during that time — this is normal).
- **Not yet**: actions for remote servers are not yet tested live (the code is the same as for the host); volumes/networks have no delete; no exec/shell.

## Docker Swarm

- `swarm-card.tsx` (Settings → Infrastructure, owner/admin; actions owner only): status, init (advertise address optional), node list (drain/activate, remove), join command (copy),
  the number of service-mode apps, leave (disabled while service apps exist). `src/features/swarm/` entity/queries/actions.
- Application form: **Deploy mode** (container/service) + **Replicas** fields appear only when `swarmActive` (the application page loads `getSwarmStatus()`; a member gets null → hidden) or the app
  is already `service`. The application header shows a `service running/desired` badge from `ApplicationDetail.service`.
- Multi-node: the form has a **Placement** select (`swarmNodeId`, "any" = null) when in service mode and there is more than one node (`swarmNodes` from the status); the `service n/m` header badge shows the tasks per node in its `title`; the Swarm card warns about a `localhost:` registry when there is more than one node (`status.registry.reachableFromNodes`).
- The service app's deploy panel: a task table (slot, node, state, since, error; "(other node)" when it is not the host) + an n/m badge; metrics show a "N tasks" count; the history marks `config` deployments (⚙, "configuration") that were created when mode/replicas/node/limits were changed.
- Service form: **Extra constraint** (Additional constraint) (`swarmConstraint`, the same zod regex as the API), **Rolling update** (`updateParallelism`/`updateDelaySeconds`) and **Order** (`updateOrder`);
  Swarm card: `NodeLabels` (a `key=value …` input per node; a Save button appears when changed → `updateNodeAction(id, {labels})`).

## Project members

- `project-members.tsx` in the right column of the project page (below Settings): the member list (implicit: platform owner/admin & creator; explicit: role select + remove),
  an add form by e-mail + role — only when `myRole === "admin"`; the Delete project button is also admin-only. Data from `listProjectMembers` (`src/features/project-member/`).
  The project list & summary are already filtered by access in the API, so the web does not need to filter again.
- Viewer: the project page hides the create buttons (app/compose/template/database) and Delete (`canWrite = myRole !== "viewer"`); the application page shows a "Read only" badge
  instead of the Delete button (`ApplicationDetail.projectRole`, also present in the database detail). **All panels follow the same convention**: the page derives `canEdit = projectRole !== "viewer"` (project page: `canWrite`) and passes it down (`canEdit` prop, default `true`); write buttons/forms are hidden, settings forms take `readOnly` (`ApplicationForm`, `ComposeForm`, `ProjectForm`: a `<fieldset disabled className="contents">` around the fields, Save hidden, so values stay visible); the data browser takes `canQuery` (query box disabled with a note — POST /query is 403 for viewers). Console tab is hidden. New write controls must follow this.

## Metrics history

- `metrics-panel.tsx` has a range picker (1 hour / 24 hours / 7 days / 30 days, `METRIC_RANGES`): `1h` keeps polling every 15 seconds from the live sampler; other ranges call
  `fetchMetricsAction(target, id, range)` once when selected and then keep polling; the panel also shows when the container is down if there is stored history, with a note on the resolution
  (minute/hour) and the number of points.

## Railpack

- Application form: the **Railpack (auto-detect, build cache)** option in the "Build method" select + an explanation (cache between deploys, needs BuildKit on the host, not for remote servers).
  The Disk card shows the results of the BuildKit cache prune (`CleanupReport.buildkitCache`).

## Resource alerts card

- `components/custom/resource-alerts-card.tsx` (client, `kind: "application" | "database"`): CPU and memory rule per section (switch + state badge + last reading, "Above" and "For" selects, a hint that says what the percentage refers to). Switches save at once (`saveResourceAlertsAction` → `PUT /applications|databases/:id/alerts`), the selects need Save; viewers (`projectRole === "viewer"`) get disabled controls and no Save. Mounted under the HTTP monitor on the application's Monitor tab (`application-tabs.tsx`, prop `alerts`, null when the API lacks the endpoint) and on the database Overview tab. Data: `features/resource-alert/`. Messages: namespace `alerts`. A threshold that is not a preset (an imported rule) is added to the select. Inbox: `resourceAlert.alert|recovered` in `inbox.describe.ts` + `inbox.json`; audit-log keys `putApplicationsAlerts`/`putDatabasesAlerts`.

## Deploy stepper, notification bell, onboarding checklist

- `features/application/deployment-steps.ts` `buildSteps()` (pure) + `components/custom/deploy-stepper.tsx`: steps per kind (git: Queued→Build→Push→Start→Done; image source: Queued→Pull→Start;
  rollback/config: Queued→Start; remote server without Push). Times come from the API's `stepTimes`; the deploy panel fills `liveTimes` from `deployment:status.at` (first one wins). Old rows without times appear without durations;
  a failed deployment without times marks the final step as "Failed". The spinner is `motion-safe` only.
- `components/custom/inbox-bell.tsx` in `app-navbar.tsx`: `GET /inbox` via a server action, polling every 30 seconds only while the tab is visible + on navigation (no Socket.IO); "Mark all as read". Each row's title/summary is composed by `describeInboxItem()` (`features/inbox/inbox.describe.ts`) from the `event` + `params` from the API, see the i18n section.
- `components/custom/onboarding-checklist.tsx` on the dashboard: rendered only when `getOnboarding()` (owner) returns `visible`; "Hide" = `dismissOnboardingAction`. Audit log: `POST /inbox/read` and `POST /onboarding/dismiss` are in `audit-log.format.ts`.

## DNS provider and DNS-01 (Cloudflare)

- `src/features/dns/` (`dns.entity.ts`, `dns.queries.ts`, `dns.actions.ts`), new i18n namespace **`dns`** (`connections`, `domain`, `proxy`, `previews`, `validation`, `errors`).
- `dns-connections-card.tsx` in Settings → Integrations (owner/admin; hidden when the API answers an error, like the other optional cards): add (name, API token write-only, optional account ID), test (shows the zones the token can see), delete (the API refuses while it is in use and says where).
- Domains tab (`application-domains.tsx`): the add form gets a DNS connection select (+ proxied and overwrite switches, with the explanation why proxied is off by default) and, when `GET /applications/:id/dns-options` says the proxy has DNS-01, a certificate mode select (automatic, DNS-01 per host, DNS-01 wildcard `*.<parent>`). Each row has a DNS line (connection select, status badge, proxied switch, sync button, the last message) and a certificate-mode line; viewers see them read-only. A DNS problem arrives as `dnsWarning` after the domain was added and is shown as a toast.
- `proxy-dns-card.tsx` on Infrastructure → Reverse proxy (owner/admin read, owner writes; same `?server=` as the dynamic config card): bind/unbind a connection, state badge (active / not applied yet / proxy not running / off), what depends on it, and a confirmation before a running proxy is recreated (the web always sends `acceptProxyRestart: true` after that confirmation). The Webhook tab previews card has the wildcard-certificate switch (only when the proxy has DNS-01 or it is already on, disabled without a preview domain).
- Select values are rendered with explicit `SelectValue` children (no empty flash). Measured in headless Chrome (Chrome DevTools Protocol; desktop 1366 and 375 px, light and dark, English and Indonesian, owner and project viewer): controls 28 px in the add form, 24 px (`size="sm"`) in rows and the proxy card, body text 12 px, card titles 13 px, card padding 16 px and card width equal to the sibling cards, no horizontal scroll.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
