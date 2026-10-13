# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions below 1.0.0 may include breaking changes in a minor release.

## [Unreleased]

### Added

- **Variables: shared variable sets.** A new **Variables** item in the sidebar (Platform group) lists the variable sets you can see: name, slug, description, which projects they are shared with, their environments with variable counts, how many applications and stacks use them, and your access. Instance owners and admins create sets with **New set** (name, optional slug, description, shared with all projects or with selected ones; a new set starts with development, staging and production).
- **Set page** (`/variables/<id>`): one tab per environment with the editor that used to live on the project page: reveal and edit (audited), secret flags, version history with **Show values** per version and restore, and compare/promote between environments of the set. Each environment lists the applications and stacks that link it (with their project and link position). Instance owners and admins also get the Details card (name, description; the slug is fixed), the **Sharing** card (all projects or selected ones; the API's message naming the linked applications is shown when a project would lose access), add/delete environment (a new one can be marked protected) and a Danger zone row to delete the set permanently.
- **Variable set links on applications and stacks.** The application's Environment tab and the stack's Settings tab have a **Variable sets** card: an ordered list of set environments (add from the sets shared with the project, move up/down, unlink, Save). Each link shows its variable names; names overridden by a later link or by the own env are struck through with a one-line hint, and one line explains the merge order. Linking or unlinking a protected environment is offered to project admins only (the API's 403/400 messages are shown as well).
- The create forms for applications and compose stacks have an optional **Variable sets** picker (the same ordered list); the template deploy dialog has one optional set environment select for the chosen project. They send `variableSetLinks`.
- **Project page: "Variable sets" card** in the right column: the sets shared with the project, their environments and which of its applications and stacks link each one, with a link to the set page.
- **API tokens: limit to variable environments.** The token form takes scope entries `set-slug/environment`, `set-slug/*` or `*/environment` (checked like the API, at most 20); the token list shows a `vars: …` badge.
- Audit log wording (English and Indonesian) for every variable set route and for changing the links of an application or stack.

### Changed

- References in help texts now read `${{vars.KEY}}` (was `${{project.KEY}}`).

### Removed

- **Project environments.** The Environments section of the project page, the Project environment select of applications and stacks (create forms and Settings), the old `environments` token restriction and the audit log wording of the removed `/projects/:id/environments` routes. Their data lives in variable sets now (see aoox-api).

### UI UX Improvement

- **Variables list and set page.** Set cards in a responsive grid (name, mono slug, sharing line with a globe or folder icon, environment badges with a lock for protected ones, usage and your role in the footer) and an illustrated empty state; the set page follows the project page layout (environments on the left, Details, Sharing and Danger zone on the right).
- **Saving over a newer edit is easier to recover from.** When an environment changed since you revealed it, the error box in the editor has a **Load latest** button that loads the current text instead of asking you to cancel and reveal again.
- **Link editor rows.** Numbered rows with icon-only move up/down and unlink buttons (with labels for screen readers), variable names as mono chips, and the add select grouped by set with the key count per environment.

## [0.1.0-alpha.9] - 2026-10-13

### Added

- **API tokens can be limited to environments.** The token form has a "Limit to environments (optional)" row: chips for development, staging and production, plus a field to add another name; the token list shows an `env: …` badge with the names. With a restriction the token can only reveal or change the variables of those environments (the API answers 403 for others); a read-only token may still read variables.
- **The environment editor saves against the version it read.** Reveal now keeps the `updatedAt` it received and the save sends it back, so a save over someone else's newer edit (the CLI, another tab) is refused with the API's message instead of overwriting it.
- Project export "With database passwords" now also includes the environment variables (they are no longer always exported).
- Audit log entries for adding, editing, revealing and deleting environments.

- **Warning when the image listens on another port.** If the image declares `EXPOSE` ports and the Container port is none of them, the Settings tab (above the port field) and the Domains tab (above the table) show an amber alert explaining the likely "Bad Gateway". Developers and owners get a one-click "Use port N" button when the image exposes exactly one port; viewers only see the warning.

### UI UX Improvement
- **One overview card on the dashboard.** The three tinted project cards and the separate Host card are now a single Overview card: the host summary in the header with a status dot, one row of cells split by hairlines (projects with active/inactive counts, aoox containers, memory, CPU; 4 across, 2×2 or stacked by the card's width) and the Docker disk meter as its footer, in solid steps that read in light mode too. Members, and owners/admins when Docker cannot be reached, see total, active and inactive projects as three cells (with a "Host data unavailable" note for owners/admins) instead of an empty Host area.
- **Project settings column scrolls with the page.** The Settings, Members and Danger zone column on the project page was sticky and slid under the top bar when scrolling; it now scrolls normally.
- **Environment tab: note in an alert, delete as a Danger zone row.** The "changes apply on the next deploy" note is now an info alert, and Delete moved from the action row to a red "Delete this environment" row at the bottom of the tab (shared `DangerZoneItem`, also used by the Danger zone cards), so the action row only has the note, History and Reveal and edit.

- **Environment card actions and editor.** Under the variable list the note, History and Reveal and edit are right-aligned with Reveal and edit rightmost (the note wraps above the buttons on a phone); in the editor, Add variable is a full-width dashed button (also in the application and stack env editors), and the two explanatory lines sit in one info alert.
- **Theme switch in the user menu.** The menu at the foot of the sidebar has a Theme submenu (Light, Dark, System) below Language.
- **Environment history.** Each environment has a **History** button: a list of every change with who made it (dashboard or API token), when, and which variable names were added, changed or removed. **Restore this version** (behind a confirm step) writes the old content as a new version, so nothing is lost; it follows the editing rule (a protected environment needs a project admin).
- **Compare and promote environments.** A **Compare** button next to Add environment compares two environments variable by variable (names only) and lets you select variables to copy from one into the other, with a confirm step that names the variables and the target.
- **Secret switch per variable.** The environment editor has a Secret switch on every row; secret variables are always masked in deployment logs, and the list shows a Secret badge.
- **History, Compare and Secret controls are laid out for narrow screens.** The environment card header wraps Compare and Add environment under the description on a phone; the history and compare dialogs scroll their lists inside the dialog; with the Secret switch the editor rows put the key on its own line below 640 px and keep value, switch and delete on the next one.

- **The Environment select of applications and stacks follows the protection rule.** For anyone who is not a project admin the protected environments (with the lock) are disabled, new resources start in `development` instead of `production`, and an application or stack already linked to a protected environment cannot be moved away from it (only its own option stays selectable); a one-line note explains why. Admins see no change.
- **Token rows wrap on narrow screens.** The name no longer collapses to one letter when a token has several badges (read-only, projects, environments): the badges move to a second line.
- **Tab strips show the active tab on narrow screens.** A strip that opens on a tab near its end (the project's `production` environment) scrolls it into view on load instead of leaving it cut off at the edge.

- **Project environments.** The project page has an **Environments** section (replacing the "Shared environment" field of the Settings card) with one tab per environment (development, staging, production, and any you add). Each tab lists the variable names with masked values; **Reveal and edit** opens the values in the usual rows/text editor and is recorded in the audit log. `production` shows a **Protected** badge: only project admins can reveal or edit it (developers see a short explanation, viewers see names and counts only). Developers can add environments, project admins can delete them (not production, and not one that is still used; the dialog names the applications). Applications and compose stacks have a **Project environment** select (production for project admins, an unprotected environment for others) in Settings and in the create forms; switching to an environment that lacks a `${{project.KEY}}` the app uses is refused with the API's message. Changes apply on the next deploy.
- **Exposed-port alert.** Compact amber alert (`exposed-port-alert.tsx`) shared by the Settings and Domains tabs, in English and Indonesian.
- **Ready-made image form in one column.** Credentials now sit under the Image field and its "Choose from registry" button instead of beside them, followed by Auto update.
- **Update overlay.** While an update is applied, a full-screen overlay shows the versions (from → to), three steps (downloading, restarting, panel back), an elapsed timer, and a note that the panel is unavailable for about a minute while deployed applications keep running. An unreachable panel is shown as "Waiting for the panel to come back…", after 2 minutes there is a Reload now button and the `aoox update panel` hint, and after 5 minutes a failure state with the container log commands. After the reload a toast says "aoox updated to vX" with a link to the changelog.

### Fixed

- **Update aoox no longer freezes after "Apply update".** The page used to poll through a server action, which stops existing once the web container is replaced by the new version, so it kept "waiting" until the 5-minute timeout. It now polls the public `/.well-known/aoox.json` and the API's `GET /` with plain requests and reloads by itself as soon as both report the new version.

- **The update overlay works from any dashboard address.** The API version is now asked through the same-origin route `/api/panel-version` (the web server calls the API's `GET /` internally) instead of from the browser, which the API's CORS refused when the dashboard was opened from an address other than `WEB_ORIGIN`, such as the server IP after a panel domain is set; the overlay then ended in "not back after 5 minutes" although the update had worked.
- **New application with a Domain: field errors show under their field.** With the Domain access option, a missing name or git URL used to appear as one message under the Hostname field; they now show under Name and Git repository like the other access options, with a "Check the form fields" toast.
- **Unknown dashboard addresses show the illustrated not-found page** instead of the bare default 404; signed-in visitors see it inside the dashboard (breadcrumb "Page not found"), and anything outside the dashboard falls back to the same page full-screen.

## [0.1.0-alpha.8] - 2026-10-12

### Added

- **Edit your name and email.** The Account card shows your name and email with an Edit profile dialog; the current password field appears only when the email changes. Owners get an edit (pencil) action on each non-owner row of the Team card. Both refresh the session so the sidebar shows the new name immediately.

- **CLI sign-in help.** The dialog that shows a new API token now also shows a copy-ready `aoox login --url <dashboard address> --token <token>` line with a copy button, and a hint to install or update the CLI (`aoox update`, or `npm i -g @hideandseeklab/aoox` for a first install). The dashboard also serves a small public discovery document at `/.well-known/aoox.json` (`apiUrl`, `webUrl`, `version`; nothing secret) so the CLI only needs the dashboard address and finds the API itself.

### Fixed

- Detail pages no longer trigger 404 prefetches of `/applications`, `/databases` and `/compose`: the breadcrumb shown before a page publishes its own crumbs no longer links to these folders, which have no page.

### UI UX Improvement

- **Integrations have their own sidebar group.** Git credentials, Notifications, Backup destinations, Secret manager, DNS providers and SSL certificates moved out of the Settings → Integrations tab into a new **Integrations** group above Settings, one page each (`/integrations/git`, `/notifications`, `/backup-destinations`, `/secrets`, `/dns`, `/certificates`) with a title, description and breadcrumb, and they are listed in the command palette. Same access as before: every member can see Git credentials, the rest is owner/admin only. Settings keeps Account and Team, and `/settings?tab=integrations` redirects to `/integrations/git`. Help texts that pointed to Settings now name the new location.
- **Settings → Account tidier.** The API token form's Read-only switch row is 28 px like the fields beside it, so it lines up with them, and the two-factor section is separated from the password form by a divider with its Enable/Disable button aligned right.
- **Template logos keep their colours in dark mode.** Only the near-black marks (Directus, Ghost, Umami, Vaultwarden) are inverted; coloured logos such as WordPress, Grafana or Gitea are no longer turned into their negative.
- **Template card buttons on the right.** The footer buttons are right-aligned with Deploy last (website, docs, Deploy), and each has a tooltip saying what it does; a disabled Deploy explains that a project is needed first.
- **Smaller terminal text.** The host Terminal and the application Console use 12 px text like the log viewer (was 13 px) with a tighter line height, so the text and the block cursor are in proportion with the rest of the page.
- **Delete moved to a Danger zone.** On the application page the Delete button left the header for a red-tinted **Danger zone** card at the bottom of the Settings tab; on the project page it moved to a Danger zone under the Members card (admins only, as before). Both use the new shared `DangerZone` component.
- **Terminal access menu.** The Infrastructure entry for the terminal's SSH settings is now called **Terminal access** (Indonesian: Akses terminal), so the sidebar no longer shows two items named "Terminal".
- **Project page uses the resource header card.** The project title sits in the same header card as applications, databases and stacks (back button, icon tile, a line with the number of applications, stacks and databases and the creation date, Export on the right). The page no longer scrolls sideways at 375 px when a stack shows a long repository address.
- The S3 hint in the "Enable local registry" dialog and the localhost note in the "Registry ready" dialog are shown as info alerts.

- **Header card on application, database and compose pages.** The title, status badges, a line of short facts (source, container or slug, host port) and the Deploy, Stop/Start and Delete buttons now sit in one rounded card above the tab strip, replacing the separate title row and the status line that used to sit under the tabs. Viewers see a Read only badge instead of the buttons, as before.
- **Section headers.** The Deploy, Domains, Mounts, Jobs and compose History tabs open with a title, a count and a short hint; the environment Save button moved up next to its title.
- **Tables and "+ Add" dialogs on list tabs.** Domains, Mounts, Jobs, the volume and database backup lists and the compose History are now tables (small uppercase column titles, hairline row dividers, monospace for hosts, paths, cron and sizes, status badges, and icon-only actions with a tooltip in the last column). The add forms for domains, mounts and jobs moved into a dialog opened by a **+ Add** button at the right of the section header; errors show inside the dialog, which closes on success. File mounts open their contents in a dialog (editable for developers, read-only for viewers) instead of an inline editor. On a phone the table scrolls sideways inside its own box instead of the page. Viewers see no Add button or write actions.

- **One tab style with icons.** Every tab strip (application, database, compose stack, registry, settings, Docker, and the small Access switches in forms) now has an icon next to each label, no background, and a 2px accent underline under the active tab that sits on a full-width bottom border.
- **Select menus open beside their field.** Every select dropdown opens below its trigger (or above it when there is no room) and is as wide as the field, instead of covering the field. `npm run check:ui` enforces `position="popper"` on every `SelectContent`.
- **Docker Swarm page breathes.** The card is split into "Nodes" and "Add a node" sections with headings and more space between them, node rows have more padding, the join commands sit in roomier rows, and the leave action sits on its own footer line. The Worker and Manager copy buttons have the same width and their labels are translated, and the add-node hint now says that applications can run on other nodes (applications with mounts stay on the host; built images need a registry every node can reach).

## [0.1.0-alpha.7] - 2026-10-12

### Added

- **Resource alerts card.** The application Monitor tab (below the HTTP monitor) and the database Overview tab have a "Resource alerts" card with a switch, a threshold (percent) and a duration (minutes) for CPU and for memory, the current state (normal, checking, alerting) and the last reading. Developers and up edit (switches save at once, the selects with Save); viewers see it read-only. The new "CPU or memory alert" event can be switched on per notification channel, and the bell shows these alerts in the active language. Texts live in the new `alerts` message namespace. Needs the matching API (`GET`/`PUT /applications/:id/alerts`, `/databases/:id/alerts`).
- **Multi-language support (English and Bahasa Indonesia).** The whole dashboard now speaks two languages (`next-intl`, no URL prefix): every screen, dialog, toast and form message is translated, including projects, applications, stacks, databases, the dashboard, Settings, Infrastructure, Docker, Registry, Terminal, Templates and the sign-in, setup and invite pages. The language lives in a cookie (English by default, also when the cookie is missing or unknown), `<html lang>` follows it, and it is chosen from the user menu. Dates, times, relative times and numbers follow the active language instead of a hardcoded Indonesian format. Text that comes from the API (error messages, notification and audit-log event titles, template catalog texts) is shown as received. Messages live in `messages/<language>/<area>.json` and `npm run check:i18n` fails when the two languages differ (it also parses every message as ICU and compares the arguments, ignoring words inside select/plural branches).
- **Deploy stepper.** The Deploy tab shows the steps of the selected deployment (Queued → Build → Push → Start → Done; image sources Queued → Pull → Start; rollbacks and config changes Queued → Start; Push is skipped on remote servers) with the time each step took. It follows a running deployment live, and a failure marks the step that failed. Old deployments without step times show no durations.
- **Notification bell.** A bell in the top bar shows the number of unread notifications (refreshed every 30 s while the tab is visible and on navigation). The menu lists recent events with a level icon, relative time and a link to the resource, and "Mark all as read".
- **Notifications follow the language.** Inbox titles and summaries are now composed in the active language from the structured facts the API sends (`params`), for every event type: deployments, backups, jobs, container, stack, server and HTTP down/recovered, disk, certificates, DNS and application errors. Events recorded before that, and event types the web does not know yet, keep the English text from the API; system error messages stay as received. Notifications sent to Telegram, Slack, email and webhooks are unchanged.
- **Getting-started checklist** on the dashboard for the owner: registry, proxy, panel domain (optional), first project and first running resource, each with a button to the right page; it disappears when the required steps are done, or with "Hide".

- **Docker page (Docker, in the Platform group of the sidebar).** Pick the host or a remote server, then browse containers, images, volumes and networks (search box on each,
  the choice lives in the URL). Containers aoox owns (panel, proxy, registry, applications, databases, stacks) carry a badge and a link to their own page and
  get no stop/restart/remove here; other containers can show their log tail and be started, stopped, restarted or removed (owner, with a confirmation and
  an optional "force" for running ones). Images no container uses can be removed (the owner) unless they are still needed for rollback, by an application or preview, or belong to aoox's local registry (badged "protected"); dangling ones are cleaned up in one click after a confirmation that says it covers every dangling image on that server, with an estimated count and size; volumes and networks are
  read-only with size, users and an "orphan" marker. Audit log entries read in Indonesian.
- **"Authorize automatically" for the terminal's SSH key.** The owner can let the panel add its SSH key to the host user's `~/.ssh/authorized_keys` instead of running the manual command: a button in Infrastructure, Terminal (above the command, which stays as the fallback) and in the connection error notice on the Terminal page, behind a confirmation dialog that names the user. On success with a verified login the toast says "Terminal ready" and the terminal reconnects; otherwise the API's message is shown and the manual command stays visible. The audit log reads "Authorize terminal SSH key" for it. Needs the matching API (`POST /terminal/authorize`, `canAutoAuthorize` in the terminal status).

- **Proxy dynamic configuration (Infrastructure > Reverse proxy).** A "Dynamic configuration" card lists the Traefik config files of the host or a
  remote server (`?server=`): enable/disable, a YAML editor that shows Traefik's rejection verbatim (the previous version is restored), delete with
  a confirmation, "From preset" (basic auth, security headers, rate limit, IP allowlist, www redirect) and "Apply again". The owner writes, admins
  read. A proxy from an older aoox asks for confirmation before it is recreated once. Audit log entries read in Indonesian.
- **Domain tab: middlewares.** Each domain shows its Traefik middlewares and, for developers and up, an "Manage" dialog to pick them (the order they are
  switched on is the order they run).

### Fixed

- **"Cannot reach the server" after a save that worked.** Saving "SSH Terminal" (and the other sections) in Infrastructure, Environment showed that toast although the change was applied: the API answers `202 Accepted` with an empty body, and the web's API helper tried to parse the empty body as JSON. The helper now treats an empty successful response as "no data" (a non-empty body that is not valid JSON still fails, and error responses are unchanged). The same applied to "Apply update", which only worked because the page treats a network error as "the panel is restarting".
- **Compose environment hint lost its database list.** On a stack whose project has databases, the hint under the environment editor used a plain `{databases}` placeholder for what is a rich element, so React logged "Functions are not valid as a React child" and the list of `${{database.<slug>.url}}` references was missing. The message now uses a `<databases></databases>` tag, like the application environment hint.
- **Log connection error showed a raw key.** When the logs socket could not connect, the message looked up `applications.logs.connectFailed`, which does not exist (the text lives under `deploy.logs`), so the dev overlay reported a missing message and the user saw the key instead of the sentence.
- **Last hardcoded Indonesian texts.** The log connection error, the backup and export download errors, and the chart's empty-state label now follow the selected language.

### UI UX Improvement

- **DNS provider connections (Settings, Integrations).** A "DNS provider" card adds, tests and deletes Cloudflare API tokens (write-only; a test shows the zones the token can see).
- **DNS record and certificate mode per domain (application Domains tab).** The add-domain form and each domain row can attach a DNS connection (with the proxied and overwrite options), show the last sync result with a sync button, and pick the certificate mode (automatic, DNS-01 per host, DNS-01 wildcard) when the proxy has DNS-01. A DNS problem shows as a warning; the domain is still added.
- **DNS-01 certificates card (Infrastructure, Reverse proxy).** Enables or disables DNS-01 for the aoox host or a remote server proxy, asks before recreating a running proxy and lists what depends on it. The Webhook tab previews card has a switch for one wildcard certificate for previews. English and Bahasa Indonesia in the new `dns` namespace.

- **Maintenance mode in Settings.** A new "Maintenance mode" card at the top of an application's Settings tab: an Enabled switch (publishes at once) and a plain-text page message (up to 280 characters, saved with its own button, empty = the default text). Viewers see the state and the text without the controls. The application header shows a "Maintenance" badge while it is on. Copy in English and Indonesian.

- **Domains tab is read-only for viewers.** Project viewers no longer see the add-domain form (with its DNS and HTTPS hints) or the delete button on each domain; the API already refused both with 403. The DNS check button stays. The Indonesian DNS error badge now reads "DNS gagal". The same goes for the page headers: viewers no longer see Deploy and Stop/Start on an application, or Stop/Start and "Delete database" on a database; the database header shows the same "Read only" badge as the application header. Compose stacks follow suit: viewers see a "Read only" badge instead of Deploy, Stop/Start and Delete.
- **Every project page is read-only for viewers.** Viewers no longer see controls that can only fail with 403: rollback and "Check image update" on the deploy panel, mounts (add, remove, edit file), volume backups (back up, restore, delete, schedule), jobs (new job form, run, delete, active switch), webhook rotate/regenerate, database backups and resource limits, the data browser query box (shown disabled with a note, since the API rejects queries from viewers), compose mounts, access, resource limits and webhook, and project settings. Settings forms (application, compose stack, project) show their values in a disabled form without the Save button. Developers see exactly what they saw before.

- **Resource alerts card lines up with the HTTP monitor.** Its threshold and duration selects use the same four-column grid as the HTTP monitor card above it (two columns at 375 px), and they show their value in the first server render instead of appearing empty until the page hydrates.

- **Indonesian covers the whole dashboard.** The template catalog (descriptions, variable labels and hints, service labels; product names stay as they are), the proxy config presets and the remaining labels that were still English in both languages (for example New project, New application, active, Resource usage, Restore, Settings and status words) now have Bahasa Indonesia translations. Template and preset texts come from the API by their stable id, so a template or preset added later still shows the API text in English until it is translated.

- **Language picker.** The user menu at the foot of the sidebar has a "Language" submenu (English / Bahasa Indonesia); choosing one switches the interface at once and is remembered in this browser.
- **Deploy progress, notifications and first steps are visible.** A deploy now shows a stepper with per-step durations instead of one status word, the top bar has a notification bell with an unread badge (the menu stays inside a 375 px screen), and a new owner sees a short progress checklist on the dashboard. The animated spinner on the active step only runs when the system does not ask for reduced motion.
- **One status language, resource logos and empty states.** Lists and cards show status as a small dot plus the status text (lime = running, amber = in transition and pulsing, red = failed, grey = anything else) in the project's cards and the application, database and stack cards; the Docker containers tab uses the same dot. The detail pages keep their status badges. Database engines show their logo (PostgreSQL, MySQL, MariaDB, Redis, MongoDB; pgvector, PostGIS and TimescaleDB are PostgreSQL; Valkey a generic database glyph) and applications show where they come from (GitHub, GitLab, Bitbucket or plain git, Docker Hub, GitHub for ghcr.io, a generic package for other registries) on the cards and in the page titles; the glyphs are drawn in the text colour. Empty lists (projects, applications, stacks, databases, domains, jobs, mounts, API tokens, backups, notifications, servers, certificates, registries, audit log, the Docker tabs and others) share one look: an icon, one sentence and, when you can act on it, one button. Numbers that update or sit in columns use tabular figures. Tab changes and list rows get a light 150–200 ms transition, only when the system does not ask for reduced motion.
- **Log viewer.** Deployment logs (live and history), the live container log, stack action logs, job output, preview logs and the Docker log dialog share one viewer: ANSI colours (other escape sequences are dropped and nothing is ever rendered as HTML), line numbers, search with highlights and next/previous (Enter / Shift+Enter), "Follow" (follows the newest line and lets go as soon as you scroll up), wrap toggle and copy all. Only the last 2000 lines are drawn until you ask for older ones, so long logs stay smooth. It is dark in both themes, like the logs already were.
- **Command palette (Ctrl+K / Cmd+K).** A "Search…" button in the top bar (icon only on phones) and the shortcut open a quick-jump dialog: every page the sidebar shows to you (same list and role rules, now defined once in `nav-items.ts`), your projects with their applications, databases and stacks (status dot, engine logo, project name as secondary text; read once, the first time it opens, and limited to what you may see), and theme switches (light, dark, system). Type to filter, ↑/↓ to move, Enter to open, Esc to close; focus goes back to where it was. The shortcut stays out of the way inside text areas, the terminal/console and other editors. It never changes anything on the server.
- **Metric charts.** The charts under the metric tiles (application, database, stack, project), the host CPU/RAM/storage charts on the dashboard and the HTTP monitor's latency chart are smooth area charts with a faint fade from the accent colour, a tooltip with value and time while hovering or touching, and a minimal axis (the top of the scale and the first and last time).
- **Removing an image says what goes with it.** The confirmation in the Docker page's Image tab now explains that removal is per image ID, so every tag of that image disappears from the server, and lists all of its tags (monospace, one per line, scrolling after about eight); an image without a tag shows its short ID and says so. The data was already in the image list, so the API is unchanged; protection, actions and the other dialogs are untouched.
- **Docker page layout.** "Docker" moved from the Infrastructure group to the Platform group of the sidebar (between Registry and Terminal, shown to owners and admins only like the Terminal item; the address is still `/infra/docker`, the breadcrumb now reads Dashboard, Docker, and "Docker disk" and "Docker Swarm" stay under Infrastructure). The picker is labelled "Server" with "Host (aoox machine)" as its first choice. In the container table the state became a small round marker in its own first column (lime while running, muted otherwise, with the real state as its tooltip and for screen readers), "Status" holds only Docker's status text, and a new "Managed by aoox" column names what aoox container it is (aoox panel, Proxy, Registry, Application, Database, Database admin, Stack, Build, Job, Backup) with a tooltip saying it is managed from its own page; the images table got the same column for its "aoox image" and "protected" markers. The state dot sits exactly in the middle of its own column (16 px to the table edge and 16 px to the container name, also at phone width). The toolbar is one row: Server picker, the tabs, and the search box at the right edge (it drops onto its own full-width row on a narrow screen); the search text starts empty on each tab. Contents, actions and the guards behind them are unchanged.
- **Terminal SSH help text.** When the terminal cannot reach the host, the error notice now adds a short explanation of "SSH authentication failed": the authorization command has to run on the host as the same user as the User field in Environment, and root login is often refused by sshd on cloud VPS, so on Ubuntu set User to your login user (usually `ubuntu`). The User field in Infrastructure, Environment has a one-line note saying the same. Text only; no protocol or behaviour change.

- **Settings cards follow the content width.** In Settings, the Account and Integrations tabs lay their cards out in two columns only when the content area is wide enough (it used to depend on the screen width, which squeezed both cards to about 350 px between 1024 and 1280 px), and a card left alone on the last row, such as Sertifikat SSL, or the only card a member sees under Integrations, now spans the full width instead of leaving half the row empty. Contents, roles and the tab and sidebar navigation are unchanged.

- **Application and compose detail pages: status line under the tabs.** The status badges (state, server, swarm service for applications; state and `compose` for stacks) and the source line moved from the page header to a status line right under the tab list, so they stay visible on every tab. The Deploy and Stop/Start buttons moved there too (the application's "Delete" or "Read only" badge and the stack's Delete with its confirmation dialog as well), with their error message beside them; Deploy still opens the new deployment's log in the Deploy tab. "Check image update" and "Container logs (live)" stay in the Deploy tab. The stack page now keeps its live state in one place (`ComposeLiveProvider`), so the badge and buttons in the status line change as soon as a deploy, stop or start finishes. Nothing was added or removed; checked by comparing every text and control before and after for an owner and a project viewer.

- **Icons in the statistic cards.** The dashboard cards (projects, active, inactive, and the Host boxes) and the CPU/Memori/Jaringan tiles on the application, database, compose and project pages now show a small icon chip before the label (an optional `icon` of the shared `StatCard`, using the existing text colours).

- **Database detail page: status line and one wide connection card.** The status badge and the "engine version · slug" line moved from the page header to a status line right under the tabs (so they stay visible on every tab), with the Start/Stop button (and its error message) on the right of that line instead of the Overview toolbar. "Internal connection" and "External connection" are now two columns of one full-width card (stacked at 375 px) built from the shared `DetailList`, which replaced the private `Row`; every row, value, mask, copy button and note is the same. "Show password" and "Delete database" stay where they were. The dashboard needed no further change after the shared statistic card. Checked by comparing all text and controls before and after for an owner and for a project viewer.

- **Sidebar logo removed.** The header of the sidebar shows only the "aoox" name and the version line, left-aligned with the menu icons in the same 48 px button; the logo tile is gone (this supersedes the full-bleed logo in 0.1.0-alpha.6) and the `BrandLogo` component was deleted. The site favicon is unchanged. In the collapsed icon rail the header is hidden, since there is no mark to fit the 32 px rail; the sidebar toggle stays in the top bar.

- **One statistic block, one activity list.** The three look-alike statistic blocks (dashboard KPI cards, the boxes inside the Host card, and the CPU/Memori/Jaringan tiles on the application, database, compose and project pages) are now one `StatCard` component with three sizes, and the two copies of the sparkline became one `StatSparkline`; the Recent activity rows became `ActivityList`. The rendered result is unchanged, checked by comparing the page markup before and after. New `DetailList` (label/value rows) and `StatusStrip` (status line with actions) are added for the detail pages and are not used by any page yet.

- **Sidebar: user menu at the bottom, active marker on the start edge.** The signed-in user's menu moved from the top bar to the foot of the sidebar with exactly the same contents (name, email, Profile, Sign out). In icon mode it shows just the avatar (the name is the tooltip) and opens beside the rail; in the mobile drawer and expanded sidebar it opens above the button. The top bar keeps the sidebar toggle and the breadcrumb. The active menu item gets a 2 px marker on its start edge in the existing sidebar accent colour (a pseudo-element in `globals.css`, so the focus ring is untouched). The "Update available" button stays above the user menu and only shows for the owner as before; menu items hidden for some roles stay hidden. No routes, labels or information changed.

## [0.1.0-alpha.6] - 2026-10-05

### Added

- **Custom SSL certificates for application domains.** Settings → Integrations has a "SSL certificates" card (owner/admin): upload a certificate (PEM, with its chain) and its private key by pasting or picking the files, see each certificate's names, issuer, expiry (green, amber under 14 days, red when expired) and how many domains use it, replace its content with "Update" (e.g. after a renewal) or delete it (refused while a domain uses it). The private key is write-only: it is sent once, never shown again and wiped from the form afterwards. In an application's Domain tab every https domain shows its certificate and (developer and up) can switch between "Automatic (Let's Encrypt)" and an uploaded certificate that covers the host; the add-domain form has the same choice, and a certificate that is close to or past its expiry is flagged. Needs the matching API (`/certificates`, `PATCH /applications/:id/domains/:domainId`).

- **Recent activity on the dashboard (owner/admin).** A new "Recent activity" card at the bottom of the dashboard lists the 10 latest audit-log entries: time, who, a readable action ("Deploy application", "Delete database"; the raw route when an action has no label), a soft green/amber/red status and how it was done (session, API token, webhook). It refreshes every 30 seconds while the tab is visible, shows an empty state, and shows a small error inside the card if loading fails. "View all" opens the Audit log. Other roles do not get the card at all. Request bodies and params are never shown here; the action labels are shared with the Audit log page code (`audit-log.format.ts`).

- **Admin UI card on the database page** (Overview tab): install a web admin tool for the database (the list comes from the API and depends on the engine) as its own container. The install dialog picks the tool (each shows whether it signs in with the database login or a generated password) and the access, either a domain (hostname, HTTPS switch) or an IP and host port, validated before sending. The installed card shows the tool, a status badge (creating refreshes every 3 s until it settles, errors show the message), the URL opening in a new tab, "Show credentials" which fetches the generated login on demand (tools using the database login point to the Credentials card instead), and "Remove Admin UI" with a confirmation. Developers and up manage it; viewers only see status and URL. Install is disabled while the database is not running. New `database-companion.tsx` and `src/features/database-companion/`.

- **New one-click template: Excalidraw** (the 15th). The Templates page lists it automatically from the API catalog, with its logo and a "Whiteboard" service you can give a domain. It is a static client with no database or variables, so the deploy dialog only asks for the project, name and domain; live collaboration is not included.

### Fixed

- **Audit log texts for certificates.** The dashboard's Recent activity and the Audit log show "Upload SSL certificate", "Update SSL certificate", "Delete SSL certificate" and "Change domain certificate" instead of the raw routes; every route the API records now has a readable text (checked against all POST/PUT/PATCH/DELETE routes).
- **Admin UI card hint.** For Adminer and phpMyAdmin it told you to sign in with the credentials "from the Credentials card", which does not exist; it now points to the Internal connection card and its Show password button.

### UI UX Improvement

- The application Environment tab's "Environment" and "Secret source" cards span the full content width (they were capped at 672 px); descriptions keep a readable line length, the secret-source fields sit in one row on wide screens and stack at 375 px. The Settings, Domain and Webhook tabs are full width too: on a wide screen the settings form lays its cards out in two columns (source and image/repo details on the left, network and resources on the right) and stays one column at 375 px and on the narrow create page; the add-domain form keeps a readable width.

- The Admin UI card uses the usual card, dialog and field sizes (12 px text, 28 px controls) and stacks cleanly at 375 px; the tool and access choices are full-width selectable cards.

- **Sidebar logo is full-bleed.** The mark was a small dark `$` tile inside a ringed box (a white hairline in dark mode), so it looked off-centre and too small next to the "aoox" and version text. `BrandLogo` now crops the same artwork to the glyph's own margins (the `$` is centred on the 64 grid; the favicon keeps its wider margin for the circle crop), fills the whole 32 px square, has no ring or padding, and uses `rounded-lg` (follows `--radius`). The logo is only used in the sidebar header, in expanded and icon mode. The header button drops its padding so the mark now spans the full 48 px button height (it was a 32 px tile that blended into the dark sidebar and read as a bare `$` at the edge); in icon mode it stays 32 px.

- **Normal text is small everywhere, set once.** Card details, lists, rows, helper and error text had drifted to `text-sm`/16 px next to the 12 px fields and buttons (most visible in the Registry lokal card, the image list, Settings → Infrastructure and the application/database/compose pages). The scale is now defined in the theme (`globals.css`, rem untouched): `text-base` and `text-xs` are 12 px, `text-sm` is 13 px and means section/card/dialog titles (with `font-medium`), page titles stay `text-lg`, stat numbers `text-2xl`. `<body>` uses `text-base`, so unstyled text no longer falls back to 16 px; about 160 stray `text-sm` on body text were set to `text-xs`; inputs and textareas are 12 px like the rest (no more 14 px below `md`). On touch screens (`pointer: coarse`) input, textarea and select stay at 16 px so iOS does not zoom the page when a field is focused; with a mouse they are 12 px. The image list rows are less tall. `npm run check:ui` also flags `text-sm`/`text-base` on non-title text so it does not creep back. The `src/components/ui` files are exactly what shadcn ships: the panel's adjustments (12 px fields and avatar text, the select-trigger margin fix, 16 px touch fields) live in `globals.css` keyed on shadcn's `data-slot` attributes, and the scrolling tab strip is a `ScrollableTabsList` wrapper in `components/custom` instead of an edit to the tabs component.

- **Adding and dropping databases moved to Overview.** The "Add database" form and the drop button for extra databases left the Data tab and now sit next to "Connection for database" in the database's Overview tab (owner/admin only, SQL and MongoDB servers that are running): a "Add database" button opens a dialog for the name, and the trash button beside the selector opens a confirmation dialog before dropping the selected non-primary database. The Data tab keeps its database selector.

- **Every delete/destructive confirmation is one dialog now.** The browser `confirm()` pop-ups are gone: deleting a job, a stack, an account, a table row, a server proxy, leaving the swarm, dropping a database, disabling someone's 2FA and running an uploaded SQL file all use the same `ConfirmDialog` (title, what exactly is lost, Batal and a red action; the SQL import one is neutral and names the file and database). Detaching a mount asks with two clear choices, "Detach mount only (keep data)" and "Detach and delete volume (data lost)". An API error shows inside the dialog and keeps it open, and it cannot be closed while the action runs.

## [0.1.0-alpha.5] - 2026-10-02

### Added

- **Monitor tab on the application page** (developers and up edit, viewers read): switch, path, interval, timeout, healthy status codes, failures before an alert, internal-address switch; the target actually used (read-only, with where it comes from and the "checked from the panel machine" caveat); status badge, last result, 24 h/7 d uptime, average and p95 latency, a 24 h latency chart with failed buckets marked, recent down incidents, and "Check now". New `application-monitor.tsx` (no fields added to the application form).
- **Remote servers show their status**: the server list has an up/down/not-checked badge, when it was checked, since when it is down, the error, and how many containers are monitored, read from the last check (no live call when the page opens). Applications on a remote server now show CPU/memory/network in the Deploy tab and the project's resource card. Two new notification toggles, "remote server unreachable" and "HTTP monitor failed" (on by default, see the API changelog).

- **Root directory field** in the application form (create and edit, Git section) for monorepos: the folder to build (for example `apps/web`; empty = repository root), validated with
  the same rules as the API, shown in the application header as `url#branch:folder`. A switch next to it turns on "deploy only when files in this folder change" for webhook pushes.
  Dockerfile path and static output folder are relative to that folder, and the hint says so.

- **Instance cards on the project page show where to open them.** Application cards list the domain(s) as `https://`/`http://` links (per the domain's HTTPS flag, with the
  proxy's port when it is not 80/443), or `host:port` when there is only a host port; stack cards list their service domains and host ports (`service · address`, one per
  line); database cards show the published `host:port` as a copy button (toast), or "internal". Links open in a new tab (`rel="noopener noreferrer"`, `aria-label` "Open … in a new tab")
  and only while the instance is `running` (otherwise the same addresses as dim text); more than two addresses collapse into "+N". `host:port` uses the host the
  panel was opened on (`useBrowserHost`), like the compose Deploy tab. Remote-server apps with only a host port show `:port (server remote)` without a link. Needs the
  `domains` field on the applications list in aoox-api. New `project-instance-card.tsx` / `instance-access.ts`.

- **Seven new templates in the catalog** (Vaultwarden, Umami, Grafana, Metabase, Directus, Mattermost, Nextcloud) come straight from the API's template list: cards, search and the deploy
  dialog with its variable fields needed no change. Checked in the browser with 13 cards (all logos load, Directus dialog with six variables fits the viewport).

- **Odoo Community appears in the template catalog** from the API list: card (logo, description, tags), search and the deploy dialog with its variable hint needed no change. The
  generated master password can be read from the stack page (Settings, environment, "Show values"), so no new UI was needed. Checked in the browser: 14 cards, Odoo logo loads, dialog
  shows the master-password hint.

- **Secret source for applications (Infisical).** Settings → Integrations has a "Secret manager" card (owner/admin): connections (name, optional URL, client ID; the client secret is write-only), add, delete and "Test connection". The application's Environment tab has a "Secret source" section: pick a connection, project ID, environment and path (default `/`), a "Sync all secrets to the container" switch, "Save" and "View keys" (key names only, never values), plus the rules in plain words (values are read when the container is created, `${{secret.KEY}}` in env, the application's env wins on a clash, PR previews do not inherit, an unreachable secret manager fails the deployment and leaves the old container running). Without a connection it points to Settings → Integrations (a link for owner/admin, text for others). Viewers read only. Needs the matching API (`/secret-connections`, `/applications/:id/secret-source`).

### Changed

- Project metadata for discoverability (no behavior change): `package.json` gets `description`, `keywords`, `homepage` (https://aoox.dev), `repository` and `bugs`; the
  README links to the website, docs and changelog and to the other repos; the runner image carries OCI labels
  (`title`, `description`, `url`, `documentation`, `source`, `licenses`, `vendor`; no `version`/`revision`), validated on their own
  because a full local `docker build` is blocked here by TLS interception.

### Fixed

- **`/favicon.ico` returned 404** (crawlers and older browsers request it on their own). `public/favicon.ico` (16/32/48 px,
  made from the same tile as `src/app/icon.svg`) is served now, and the root layout declares both icons
  (`<link rel="icon">` for the ICO with `sizes="48x48"`, then the SVG): a `metadata.icons` entry replaces the link the
  `app/icon.svg` convention adds by itself, so the SVG has to be listed explicitly next to it.

### UI UX Improvement

- Three small UI fixes. **Data tab (database):** the "new database" input + button now sit above the database select (input, then
  select, then Tabel), aligned with the select; behavior (validation, toast, owner/admin only, hidden for Redis/Valkey) is unchanged.
  **Headers:** the monospace subtitle under the database, application and compose titles is `text-sm` like the project header's
  subtitle (it was `text-xs`); the identifiers stay monospace. **Project page:** "Resource usage" is just the three CPU / Memori /
  Jaringan tiles under the section heading — the wrapping card is gone (no card inside a card); polling, sparklines and the empty
  state are unchanged. `MetricsPanel` (application/database pages) is untouched.

- **Medium border radius across the panel**: `--radius` goes from `0` (everything square) to `0.5rem`; the existing scale
  (sm 4.8 / md 6.4 / lg 8 / xl 11 px) is unchanged. Cards, buttons, inputs, tabs, dialogs, selects/popovers, tooltips, alerts,
  log/terminal/console panes (already `rounded-md` + `overflow-hidden`), skeletons and toasts pick it up through the variables.
  The one forced override, `[data-slot="badge"] { border-radius: 0 }` in `globals.css`, is removed, so badges are the standard
  pills again. Deliberately left square: the brand logo tile, the navigation progress bar (a thin line), and the mobile sidebar
  sheet, which is flush with the screen edge. Checked on sign-in, dashboard, projects, project/app/database/compose detail,
  registry, templates, terminal, environment, settings and audit log, light and dark, and at 375 px.

- **`→` in the panel's text became icons.** Arrows on links and buttons ("View audit log", "Older") are a small
  `ArrowRight` that nudges right on hover; arrows between the steps of a path or flow inside a sentence ("Settings → Audit log",
  "Infrastructure → Reverse proxy", "GitHub: Settings → Webhooks → Add webhook", "284 s → 54 s") are a small chevron on the text
  baseline. Both come from one module, `components/custom/arrows.tsx` (`LinkArrow`, `PathArrow`), instead of repeated markup.
  `PathArrow` carries a visually hidden "→" (and its own spaces, in a `relative` wrapper so the absolutely positioned text cannot widen scrolling table cells), so screen readers and copy-paste still get "Settings → Audit
  log" (checked: a selection copied from the rendered page reads `Settings → Webhooks`). Hints that were plain strings but are
  only ever rendered as JSX text (Discord webhook hint, GitLab deploy-token hint, the terminal error-link labels, the proxy
  notices in the compose/template forms) became JSX so they can hold the icon. Left as `→` on purpose: code comments and
  docblocks — there are no `→` left in rendered text, toasts or error strings.

- **Horizontal scrollbar on `/terminal` (and any page with fixed-width content, e.g. the application Console tab).** The
  dashboard's `<main>` is a flex item next to the sidebar and, as a flex item, never shrinks below its content's
  minimum width; the xterm terminal is a fixed number of pixels wide, so the moment any scrollbar took a few pixels
  (a 1 px overflow is enough — the page is exactly one viewport tall, so a horizontal bar makes it overflow vertically,
  the vertical bar then takes 15 px of width, and `<main>` cannot follow), `<main>` stayed too wide and the page scrolled
  sideways. The dashboard layout now gives `SidebarInset` `min-w-0`. Verified with fixed-width content at 1280, 1024,
  768 and 375 px: before, `scrollWidth` exceeded `clientWidth` at every width above the mobile breakpoint; now it never does.

- **Headers of the application, database, compose and project pages no longer overflow on a phone** (the application
  page's "Delete" button was cut off at 375 px): the title row wraps (`flex-wrap`), the block next to the back arrow can
  shrink (`min-w-0`), badges wrap, and the monospace line under the title (image / git URL / slug) breaks anywhere instead
  of forcing the page wider; the project page's action buttons wrap too.

- **Tab strips scroll on their own when they are wider than the screen.** `TabsList` is `w-fit`, so the application page's
  ten tabs made the whole page 503 px wide on a 375 px phone; it now sits in a horizontally scrolling wrapper (scrollbar
  hidden, the cut-off tab at the edge shows there is more). Applies to every tab strip in the panel.
- **Project page instance cards: spacing and structure.** Looser spacing (20 px padding, 8 px title→subtitle, 12 px to the access row; 16 px between cards as on `/projects`), and a long
  name now truncates with an ellipsis instead of pushing the status badge out of the card (the header row is a grid item and needed `min-w-0`). The card is no longer one big `<a>`
  (links inside links are invalid): the name is the link to the detail page and stretches over the card, the access links sit above it, so they never open the detail page while a click
  anywhere else still does; keyboard focus shows a ring on the card.

- **"Create table" dialog (database Data tab) lines up.** The column header and every column row now share one grid template
  (Column, Type, Length, Null, PK, Default, delete), so the headings sit exactly over their fields and every row has the same
  widths; Null/PK toggles are centered under their headings and the delete buttons line up. Every field (table name, column name,
  Tipe, Panjang, Default) uses the default control height (28 px, no more mixed h-8 inputs and h-6 selects), the toggles and the
  delete button are vertically centered on it, and a disabled Panjang just dims instead of changing size. The dialog is wider
  (`sm:max-w-3xl`) so "bigserial (auto increment)" is not cut off. On a phone (< 640 px) each column becomes a small card with a
  label above every field instead of a cramped row, and the dialog scrolls inside the screen (`max-h` + `overflow-y-auto`) so the
  buttons stay reachable with many columns. The generated SQL, validation and PK/Null behavior are untouched (a real table was
  created through the dialog to check). Same pass: the add-member form on the project page (`project-members.tsx`) had an
  `h-8` input and select next to a short `sm` button; they are now the same height as the default controls.
- **Fields and buttons on one row are the same height now.** Root causes: (1) a few fields carried a height override (`<Input className="h-8">` = 32 px, `h-7`) next to a `Button size="sm"` (24 px) or a default button (28 px), so the input towered over the button; (2) `Button size="sm"`/`icon-sm` sitting beside default-size fields; (3) a real bug in `SelectTrigger`: inside a `<form>` Radix appends a hidden native `<select>` as the last child, so under Tailwind v4's `space-y-*` (margin-bottom on every non-last child) the trigger got a 4 px bottom margin and a button on an `items-end` row sat 4 px below the select — the trigger now has `mb-0`. Measured in the browser (`getBoundingClientRect` of every field/button pair on the same row, all pages, their tabs, the swarm card in both states): 13 mismatched pairs before, 0 after. Fixed: Docker Swarm (Init swarm row; node label editor), Server remote proxy form, Backup instance schedule form, Audit log filter, the Jobs form on application/database/compose pages and the database Backup schedule (select + button), volume backup select + button, environment editor and project member delete buttons (`icon-sm` → `icon`), and the new-database input in the data browser. Left alone on purpose: toolbars where everything is small (Terminal/Console task select + "Reconnect", members list role select, `SelectTrigger size="sm"` + `icon-sm` buttons) — they are uniform. `npm run check:ui` (`scripts/check-field-heights.mjs`, no new dependency, manual, not part of the build) flags field height overrides and rows that mix control heights; the convention is in `AGENTS.md`.

- **Template catalog cards have one height.** With 13 templates the rows took different heights depending on the description length (196 px vs 216 px); the grid now uses equal rows.

- **Environment is its own tab on the application page** (after Mount): the env editor, a short explanation (applies on the next deploy, `${{project.KEY}}` and the project's `${{database.<slug>.url}}` references) and its own Save button, which saves only the env (`PATCH` with `{ env }`). The field is gone from the Settings form, so the two can no longer overwrite each other: saving Settings no longer sends the env at all (it used to send whatever the form held). Creating an application still has the env field. Viewers see the env read-only (values masked, nothing to add or remove).

- **The New application form is split into cards** (the same form serves Settings, where what can be edited is unchanged). "Source" is two selectable cards (repo git / ready image) with an icon and one line each, a clear selected state and keyboard arrows, replacing the dropdown. Then a source-detail card (Repository git, or Image), "Network & access" (container port, access, health check), the create-only "Environment" card, and "Resources & advanced" (server, swarm, CPU/memory, deployment history, previews, build args). Choosing an image now shows only the image, registry credential and auto-update fields: "Git credentials" no longer stays visible next to them.

## [0.1.0-alpha.4] - 2026-09-29

### Added

- **"Update available" button at the bottom of the sidebar** (owner only, from `/auth/me`): a real link
  to Settings → Update aoox with an icon, a lime dot and the new version (`v0.1.0-alpha.4`); it becomes
  "Updating…" with a spinner while an update is being applied, and disappears by itself
  once the panel is back on the new version (the update card already reloads the page). In icon mode it
  is just the icon with a tooltip; it works in the mobile sheet and in light and dark themes. Other
  roles never receive the field and never see the button. The Update aoox card now also states the
  newest published version and when it was last checked (same signal as the sidebar), and explains
  when no badge is shown (image pinned to another tag, tag unknown, registry unreachable).
- **Sidebar header**: the logo is now the aoox favicon mark (`app/icon.svg` — dark tile, lime `$`), drawn
  by a single `BrandLogo` component with a hairline ring so the tile stays visible on the dark theme,
  replacing the old lime fish tile. The static "self-hosted PaaS" subtitle became the running version
  (e.g. `v0.1.0-alpha.4`, small mono, muted; "—" while unavailable), visible to every role and hidden in
  icon mode like the subtitle before it. The version is the API's, taken from `/auth/me` on the request
  the layout already makes; when the web image's own version differs (a partial update) a tooltip shows
  both. The sign-in page is unauthenticated and shows neither.
- **Page-navigation progress bar**: a thin lime (`--primary`) bar at the top of the screen while a page change is in
  flight — sidebar/card/tab clicks, `router.push/replace` (create app/database/compose, import, settings tabs) and browser
  back/forward. It appears only if the navigation takes longer than ~150 ms (no flicker on fast ones), stays until the new page's
  content — not just its skeleton — has arrived, and has a 15 s safety cap so a cancelled/failed navigation can't leave it
  hanging. `router.refresh()` (projects auto-refresh, deploy panel, live metrics…) never shows it: a refresh keeps the same
  URL. Decorative (`aria-hidden`; Next already announces route changes) and a static line under `prefers-reduced-motion`.
  Hand-written (~150 lines, no dependency) instead of `nextjs-toploader`: programmatic `router.push` only touches the History
  API once the page is ready, so any library needs a router wrapper anyway (`@/lib/use-router`, used where the code calls
  `push`/`replace`), and a small component gives exact control over refresh-vs-navigation and the "still on a skeleton" case.
  Client JS grew by roughly 12 KiB gzip in the measured build (about 4 KiB of that is this code; the rest is chunking noise).
- Route skeletons (`loading.tsx`) for `/projects`, project detail, and application/database/compose detail, sharing
  `components/custom/page-skeletons.tsx` (header + cards, or header + tab strip + panels) next to the existing generic dashboard
  one, so the sidebar and navbar stay put while the page loads. Skeleton roots carry `data-route-loading`, which is how the
  progress bar knows the content hasn't arrived yet.

### Changed

- Create form: choosing **Cara build → Situs statis** pre-fills **Port container** with 80 (nginx serves static
  sites on 80; the old default 3000 deployed "successfully" but the page never opened). Switching to another build
  type restores 3000, but only while the port is still an auto-filled value — a port the user typed is never
  overwritten. A hint ("Static sites are served by nginx on port 80.") shows under the field in create mode, and in edit
  mode when a static app's saved port isn't 80; editing never changes a saved port. Deliberately a hint, not
  validation — the API still accepts any port for static sites.

### Fixed

- Settings tab of an application: the card said every change applies on the next deploy, which is no
  longer true for Port host, domains and resource limits (applied directly, see the API changelog).
  The text now says so, the Port host field explains how the change will reach the app (container
  recreated now with a brief downtime / queued config deployment for a swarm service / applied when the
  stopped app is started / first deploy), and saving shows a single toast (loading, then success or
  error), e.g. "Host port applied, container recreated.", instead of only the inline "Saved.".
- Terminal on older installs: with `TERMINAL_SSH_USER` missing from `.env.dist` (installs made
  before the installer wrote it) the terminal used to fail with `TERMINAL_SSH_USER is not set`; the
  API now defaults to `root`, the Terminal settings card labels it "user default", and Settings →
  Infrastructure → Environment shows `root (default)` as the placeholder plus a note while the field is
  empty. When the terminal cannot connect to its target (wrong host/port, key problem, auth failure),
  the page now shows an alert linking to **Infrastructure → Environment** (host) or **Server remote**
  (remote server) instead of only the raw error text; for admins, who cannot open the owner-only
  Environment page, it names the page instead of linking.
- "Apply update" on Settings → Update aoox: a user upgrading a real VPS reported a red "Cannot
  reach the server" error right after clicking it, and the card just kept showing the old
  version forever with no indication of what was happening — even though the update itself had
  applied successfully. The error was expected (the `api`/`web` containers were mid-restart) but
  looked like a failure, and there was previously no polling at all: the card was a single static
  "reload the page yourself, eventually" message.
  - Clicking "Apply update" now opens a confirmation dialog first (panel will restart, ~1–3
    minutes, the page reloads itself when it's back), then the card switches to an "applying" view
    (step list, buttons disabled, no more Check/Apply) instead of the old always-visible buttons.
  - A connection failure while in that mode — a fetch failure, or the server action's own RPC
    rejecting because the web container it runs in was itself being replaced mid-request (Next
    surfaces that as a thrown rejection at the call site rather than routing it through the action's
    normal `try`/`catch`, so the call site now wraps it too) — is swallowed and retried, never shown
    as a red error. `applyInstanceUpdateAction` now distinguishes a real `ApiError` rejection (e.g.
    `INSTALL_DIR` not set — a genuine failure, shown as an error, does *not* enter applying mode) from
    "couldn't connect" (treated as "probably restarting, proceed").
  - A new `pingInstanceUpdateAction` polls a cheap API endpoint (`GET /instance/update/progress` — no
    registry calls, unlike the existing status endpoint) every few seconds, backing off from 3s up to
    a 10s cap, until it reports the panel is back on a new version — then a full
    `window.location.reload()`, since the old page's JS bundle no longer matches the new build.
  - A 5-minute timeout without a version change shows a clear message plus manual recovery steps
    (`docker ps -a`, `docker logs`, the manual `docker compose … up -d` command) instead of polling
    forever.
  - Reloading the page mid-update still shows the "applying" view and resumes polling instead of
    reverting to the normal buttons: the card's initial state comes from `status.applying`/
    `status.applyStartedAt`, both returned by `GET /instance/update` and backed by new persistent
    state on the API side (see its changelog) — this also means the elapsed-time-until-timeout is
    counted from when the update actually started, not from the reload.
  - The "done" check now requires **two** consecutive polls reporting `applying: false`, a couple
    seconds apart, before reloading — one successful poll only proves the `api` container answered
    with a new version, not that the `web` container (the one actually serving this poll, as a server
    action) has cycled to the new build too; it can still be the old one on its way out for a moment
    if it happens to restart slightly after `api` does. A poll that comes back reachable-but-still-
    applying resets that confirmation, so an earlier premature "done" from a stale response can't
    carry through to a later stale-again reading.

## [0.1.0-alpha.3] - 2026-09-28

### Added

- Registry page: new **"Delete image"** button on each repository row (icon button next to the tag
  count) that deletes the whole repository — every tag, its storage folder, and a garbage-collect
  pass on the API side — not just one tag. The confirm dialog fetches and shows which applications'
  current/running image looks like it points at this repo before letting the delete proceed (the API
  409s without confirmation otherwise); `ApiError` now carries the parsed error body's `details` so
  the action can read that `usage` array instead of only the message string. Uses `sonner` toasts
  (loading → success/error) rather than the plain inline error `delete-tag` uses, since this is a
  bigger, slower, less reversible action. The repository list also updates locally (no full refetch)
  when a repo is removed. The stale "No tags (the manifests were deleted), run garbage
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
- Settings → Notifications: new **"errors in application log"** toggle (off by default, like "deploy
  dimulai") for the API's new `on_app_error` event, which scans running apps' container logs for
  common error shapes and notifies once per app per check.
- Application form (Settings, edit only): new **"Ignore errors in logs"** switch (`ignoreErrorLogs`)
  to opt an app out of that log scan entirely, for apps whose normal output just looks like errors.
- Creating an application, database, compose stack (git or one-click template), or importing a
  project now shows a `toast.loading()` the moment you submit, updated in place to success/error
  (not stacked) once the result is known, plus a spinner + "Creating…" on the submit button and a
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
  (`isMongo`): the collection list ("Collections"), rows grid, column sorting, and CSV export all work,
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
  detail page gets a new "Resource usage" card above the Application/Compose stack/Database sections
  (`ProjectResourcePanel`, `project-resource-panel.tsx`) — the same CPU/Memori/Jaringan tile-plus-
  sparkline layout as the application/database `MetricsPanel`, minus the range picker (the API's
  `GET /projects/:id/resource-usage` is live-only, no stored history), polling every 15s to match the
  sampler. `ProjectsAutoRefresh` (the existing 4s poller that clears "deploying…" badges) now also
  triggers — at a calmer 10s — whenever any project has something running, so the list page's numbers
  keep updating without adding a second poller to the same page; still fully idle when every project is
  stopped.

### Changed

- "New application", "Compose stack", and "New database" on the project page are no longer dialogs —
  each is now its own full-width page (`/projects/[id]/applications/new`, `/projects/[id]/compose/new`,
  `/projects/[id]/databases/new`) with a breadcrumb/back link to the project and a "Cancel" button next
  to submit, since the application form in particular (Source, Access, Swarm, build args, …) was too
  packed for a dialog's width. The buttons on the project page are now plain links instead of dialog
  triggers; `create-application-dialog.tsx`, `create-compose-dialog.tsx`, and `create-database-dialog.tsx`
  are deleted. `application-form.tsx`/`compose-form.tsx` gained an optional `cancelHref` prop (renders
  the "Cancel" link, create pages only) and are otherwise unchanged; the application page's
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
  titles like `InfraPage`, dashboard "Total projects" card, dialog headers) at `-0.03em`, `h3`/
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
  `ValidationPipe` rejects unknown properties. Caught while manually verifying the new "New application"
  page above, not by `tsc`/lint/tests (the type is structurally valid, just semantically wrong for the
  create endpoint) — both actions now strip `ignoreErrorLogs` from the request body via a shared
  `omitIgnoreErrorLogs()` helper before posting.
- Settings → Integrations → Notifications: the **"domain DNS problem"** toggle (`onDnsIssue`) never
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
- Settings → Infrastructure → **Environment** (owner only): edit a whitelisted subset of the panel's
  own env vars (SSH-to-host settings for the web terminal, `PUBLIC_IP`, `REGISTRY_PUBLIC_HOST`)
  without SSH — mirrors the Domain panel card. Saving briefly restarts the api container.
- Application form: "Choose from registry" button next to the Image field (Source: Image) opens a
  picker (registry → repository → tag) instead of having to remember and retype the ref you just
  `docker push`ed. Reuses the same repository/tag endpoints as the Registry page's own browser.
- Terminal page and the application deploy panel's realtime log now detect when they were opened
  from a different origin than the panel's configured `WEB_ORIGIN` (e.g. by IP after a custom
  domain was set) and show a clear explanation instead of a raw "origin not allowed" error, with a
  button to open the same page on the correct domain — and skip wasting a log ticket on a
  connection the gateway will reject anyway.
- New application dialog: an "Access" step (IP & port / Domain / Later) between the deploy
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
- Application deploy panel: a callout ("This application has no access address") appears after a
  successful deploy when the app still has no host port and no domain, with buttons that jump
  straight to the Settings or Domain tab. This required converting the application detail page's
  outer `Tabs` from uncontrolled to a controlled client component (`application-tabs.tsx`) so a
  button click elsewhere in the tree can switch tabs.
- Project cards now show an amber "deploying…" badge next to any application/database/compose instance
  that has a deployment/provision in flight (new `deploying` flag from `GET /projects`) — previously
  a webhook-triggered redeploy gave no indication anywhere outside the application page itself that
  anything was happening. The `/projects` page polls itself (`router.refresh()` every 4s via the new
  `ProjectsAutoRefresh` client component) only while at least one instance is deploying, and stops on
  its own once the badge clears.
- Settings → Notifications: new "deploy started" toggle (off by default, unlike the other event toggles)
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
- The "Custom domain" input and its buttons in the registry card were different heights
  (`size="sm"` buttons at 24px next to a 28px input) — buttons now use the default size to match.
- Registry lokal card's "Alamat push" and "Login" line kept showing `localhost:5000` after setting
  a custom domain — they read `status.publicUrl` (always the pre-domain default) instead of
  `registry.url` (which the API already updates to the domain). Now uses `registry.url`, falling
  back to `publicUrl` only before the registry is provisioned. The one-time "Registry ready" dialog
  (shown right after provisioning, before a domain can exist) still shows `localhost:...` — that's
  correct there, since that's what actually works for `docker push` without extra config — but now
  adds a note that it only works run from the server itself, with a pointer to set a domain for
  access from elsewhere.

## [0.1.0-alpha.1] - 2026-09-26

### Added

- Settings → "Panel domain" (owner only): configure a custom domain for the dashboard/API from the
  running panel, without editing `docker-compose.domain.yml`/`.env.dist` over SSH.
- Registry → Local registry card: "Custom domain" field (owner/admin) to route the self-hosted
  registry through the built-in proxy with a real certificate.
- Registry provisioning dialog now lets you pick a storage backend (local disk or an existing S3
  destination) before creating the self-hosted registry.
- Settings → "aoox update" (owner only): check for and apply updates to the panel's own
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

[Unreleased]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.9...HEAD
[0.1.0-alpha.9]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.8...v0.1.0-alpha.9
[0.1.0-alpha.8]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.7...v0.1.0-alpha.8
[0.1.0-alpha.7]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.6...v0.1.0-alpha.7
[0.1.0-alpha.6]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.5...v0.1.0-alpha.6
[0.1.0-alpha.5]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.4...v0.1.0-alpha.5
[0.1.0-alpha.4]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.3...v0.1.0-alpha.4
[0.1.0-alpha.3]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.2...v0.1.0-alpha.3
[0.1.0-alpha.2]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.1...v0.1.0-alpha.2
[0.1.0-alpha.1]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.0...v0.1.0-alpha.1
[0.1.0-alpha.0]: https://github.com/hideandseeklab/aoox-web/releases/tag/v0.1.0-alpha.0
