# aoox-web

Next.js 16 (App Router) + React 19 + Tailwind 4 + shadcn/ui frontend for aoox
(self-hosted PaaS). Backend: `../aoox-api`.

Baca `AGENTS.md` — versi Next.js ini punya breaking changes; cek `node_modules/next/dist/docs/` sebelum menulis kode.

## Struktur folder (semua kode di `src/`, alias `@/*` → `src/*`)

- `src/app/` — routes/layouts App Router saja (UI tipis, tanpa bisnis logic).
- `src/features/<nama-feature>/` — semua bisnis logic, entity (data interface/type),
  server action, dan schema (validasi). Contoh:

  ```
  src/features/project/
  ├── project.entity.ts
  ├── project.schema.ts
  ├── project.actions.ts
  └── project.service.ts
  ```

- `src/components/ui/` — komponen dari provider (shadcn, dll). Jangan diedit manual.
- `src/components/custom/` — semua komponen custom buatan sendiri.
- `src/hooks/`, `src/lib/` — hooks dan util umum.

## Perintah

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint 9 (eslint-config-next belum mendukung v10); file hasil generate shadcn dikecualikan dari `react-hooks/set-state-in-effect`

## Git

- Jangan commit atau push kecuali diperintahkan secara eksplisit oleh user.

## Auth

- Sign-in memanggil `POST /auth/sign-in` di API lewat server action (`src/features/auth/auth.actions.ts`),
  lalu menyimpan `{ token, user }` di cookie httpOnly `aoox_session` (`auth.session.ts`).
- `src/proxy.ts` hanya redirect optimistis berdasarkan keberadaan cookie (`/sign-in`, `/setup`, `/invite/` publik).
- Anggota: `src/features/member/` (entity/queries/actions) + `members-card.tsx` di Settings (daftar user dengan select peran & hapus untuk owner, undangan menunggu,
  dialog **Undang** yang menampilkan tautan sekali — salin manual) dan halaman publik `/invite/[token]` (`accept-invite-form.tsx`: preview email/peran dari API,
  form nama+password, lalu `setSession` + redirect `/`). Semua anggota melihat semua project; peran hanya membatasi Settings/terminal.
  Halaman server memakai `getVerifiedSession()` (`GET /auth/me`, di-`cache()` per request) — cookie basi/secret berbeda → dianggap tidak login, bukan error.
- Onboarding: `/setup` (`setupAction`) tampil saat `GET /auth/setup-status` → `needsSetup`; `/sign-in` redirect ke sana.
- Panggilan HTTP ke API selalu dari server lewat `src/lib/api.ts` (`API_URL` di `.env.local`, lihat `.env.example`).
  Pengecualian: terminal (Socket.IO) konek langsung dari browser ke `PUBLIC_API_URL`, yang dibaca **saat request** di server component
  dan dikirim sebagai prop — jangan pakai `NEXT_PUBLIC_*` untuk ini karena akan di-inline saat build image.

## Dashboard

- Semua halaman terautentikasi ada di route group `src/app/(dashboard)/` — `layout.tsx`-nya
  memasang `SidebarProvider` + `AppSidebar` + `AppNavbar` (dropdown user di kanan) dan redirect ke `/sign-in` bila tidak ada session.
- Shell: `src/components/custom/app-sidebar.tsx` (menu navigasi ada di konstanta `NAV`), `app-navbar.tsx`, `user-menu.tsx`.
  Logo = `brand-logo.tsx` (SVG salmon inline di tile primary, dipakai header sidebar). Navbar: trigger sidebar, separator (`data-vertical:h-4 self-center` — default ui
  Separator `self-stretch` membuatnya setinggi header), lalu **breadcrumb** `app-breadcrumb.tsx` (shadcn `breadcrumb`): halaman detail menerbitkan crumb bernama lewat
  `<SetBreadcrumb items />` (`breadcrumb-store.ts`: store module-level + `useSyncExternalStore`; `useLayoutEffect` set/clear — bukan context, karena navbar dan page
  adalah sibling di layout), Settings lewat `SettingsTabs` (label tab), selain itu diturunkan dari pathname (`STATIC`). **Jangan** pakai `useSearchParams` di
  navbar: dibungkus Suspense, subtree crumb tidak ter-hydrate saat full load sampai interaksi pertama (store tidak pernah di-subscribe) — sebab itu label tab
  diterbitkan dari halaman Settings.
- Pola per feature (contoh `src/features/project/`): `*.entity.ts`, `*.schema.ts` (zod), `*.queries.ts` (fetch server-side, pakai `requireToken()`),
  `*.actions.ts` (server action untuk mutasi, `revalidatePath` + `redirect`). Form client pakai `useActionState`.

## Terminal

- `/terminal` — xterm.js (`src/components/custom/terminal-view.tsx`, client-only via dynamic import) + `socket.io-client` ke namespace `/terminal` API.
  Font terminal = **Fira Code** (`next/font/google` → variabel `--font-terminal` di `layout.tsx`; xterm membaca family dari variabel itu), `lineHeight` 1.4.
  xterm mengukur sel glyph sekali saat `open()`, jadi font ditunggu dulu (`document.fonts.load`, dibatasi 1,5 s) dan di-refit lagi saat `loadingdone`. FitAddon membagi
  dengan tinggi sel *tak dibulatkan* sementara DOM merender baris dengan tinggi piksel bulat → baris terakhir bisa "tenggelam" di bawah kotak; `refit()` mengukur
  tinggi baris nyata (`.xterm-rows > div`) dan `term.resize` ke jumlah baris yang benar-benar muat (dijalankan lagi di rAF + 250 ms karena baris baru ada setelah paint pertama).
- `src/features/terminal/` — `terminal.protocol.ts` (cermin event API + `terminalNamespaceUrl`), `terminal.actions.ts` (`createTerminalTicket`),
  `terminal.entity.ts` + `terminal.queries.ts` (`getTerminalStatus` → `GET /terminal/status`, owner/admin).
- Settings menampilkan `terminal-card.tsx`: mode (SSH/lokal), public key otomatis dari API, dan perintah `authorized_keys` yang dijalankan user sekali di host.
  Pesan `error` dari gateway saat SSH gagal auth sudah berisi perintah yang sama, ditulis apa adanya ke xterm.
- Notifikasi: `src/features/notification/` (entity/queries/actions) + `notifications-card.tsx` di Settings — dialog tambah dengan field per tipe
  (Telegram token+chat id, Slack/Discord webhook URL, webhook URL, email = host/port/TLS/user/password/pengirim/penerima dipisah koma),
  empat toggle event (deploy sukses/gagal, backup gagal, container mati; Radix `Switch` dengan `name` → "on"), tombol kirim tes, hapus.
- Server remote: `src/features/server/` (`server.entity.ts`, `server.queries.ts` `listServers`/`getPlatformSshKey`, `server.actions.ts` create/delete/test) +
  `servers-card.tsx` di Settings (key platform + perintah, daftar server, tes koneksi yang menampilkan `authorizeCommand` bila ditolak, dialog tambah dengan private key opsional).
  `terminal-view.tsx` menerima `servers` dan menampilkan `<Select>` target ("Host aoox" / server); `createTerminalTicket(serverId?)` mengirim `serverId` di body tiket —
  target diikat ke tiket oleh API, bukan dikirim di handshake.
- `requireToken()` ada di `src/features/auth/auth.session.ts`, dipakai semua queries/actions.

## Prinsip

- Selalu ikuti dokumentasi resmi (Next.js di `node_modules/next/dist/docs/`, shadcn, dll.) untuk pemilihan paket dan pola kode.

## Docker

- `Dockerfile` mengikuti contoh resmi `vercel/next.js/examples/with-docker` (`output: "standalone"` di `next.config.ts`).
- Env runtime: `API_URL` (server → api, di compose `http://api:3001`) dan `PUBLIC_API_URL` (browser → api). Stack lengkap ada di `../aoox-api/docker-compose.dist.yml`.

## Registry

- `/registry` — tab "Registry lokal" (`self-hosted-registry-card.tsx`: provision/GC/hapus, kredensial ditampilkan sekali; `registry-repositories.tsx`: repo → tag, hapus tag dengan peringatan digest bersama)
  dan tab "Eksternal" (`external-registries.tsx`). `src/features/registry/` = entity, schema, queries, actions (`ActionResult<T>` untuk aksi non-form).

## Application

- Daftar aplikasi ada di halaman detail project (`create-application-dialog.tsx`); detail di `/applications/[id]` dengan tab Deploy
  (`application-deploy-panel.tsx`: tombol Deploy/Stop/Start, daftar deployment, log deployment & log container **streaming** via Socket.IO `/logs` — hook `src/features/application/use-logs-socket.ts`, protokol di `logs.protocol.ts`; `router.refresh()` saat status terminal)
  dan tab Pengaturan (`application-form.tsx`, dipakai juga untuk create).
- `src/features/application/` — entity (termasuk `ACTIVE_DEPLOYMENT_STATUSES`), schema zod (`hostPort` kosong → null), queries, actions.
- `application-form.tsx`: select **Server** (Host aoox / server remote dari `listServers()`, hanya tampil bila ada server; member mendapat 403 → daftar kosong) dengan
  catatan batasan remote (tanpa push registry, tanpa domain/proxy); detail aplikasi menampilkan badge nama server.
- `application-form.tsx`: field **Health check path** (`healthcheckPath`, kosong = null) dengan keterangan blue/green & prasyarat wget/curl/node/python3 di image.
- Halaman database kini bertab **Ringkasan / Data / Backup**. Tab Data = `database-data-browser.tsx` (daftar tabel/key di kiri dengan perkiraan baris, grid baris
  berhalaman 50 + sort per kolom, kotak SQL/perintah Redis dengan Ctrl+Enter, hasil dengan `NULL`/(kosong) dibedakan, badge `message`, pesan error engine apa adanya).
  `src/features/managed-database/data-browser.{entity,actions}.ts` (`listTablesAction`, `fetchTableRowsAction`, `runQueryAction`). `canWrite` dari role session
  (owner/admin) hanya mengubah teks keterangan — pagar sesungguhnya di API.
  Pemilih **database** di atas daftar tabel (non-Redis): `listSchemasAction`, `createSchemaAction` (input + tombol +), `dropSchemaAction` (ikon sampah, hanya non-utama,
  `window.confirm`); `dbParam` = undefined untuk db utama sehingga semua aksi data browser dikirim `db` hanya bila berpindah. Form jadwal backup punya switch
  "Semua database di server" (`backupAllDatabases`), daftar backup menandai `scope: all`.
  Tab Ringkasan: `database-panel.tsx` menerima `schemas` (dari `listSchemas`, hanya saat server running & bukan Redis) dan menampilkan select "Koneksi untuk database"
  bila >1 — memilih database lain hanya mengganti nama database & path URL (`withDatabase`), host/user/password sama.
- Buat tabel: `create-table-dialog.tsx` (tombol + di header daftar tabel, owner/admin, non-Redis) — form kolom (nama, tipe per engine dari `COLUMN_TYPES`, panjang varchar,
  NULL, PK, default) → `buildCreateTable()` (`src/features/managed-database/create-table.ts`, pure: validasi identifier, PK implisit NOT NULL) → pratinjau SQL → dijalankan
  lewat `runQueryAction` yang sama dengan kotak SQL (hak tulis dicek API). Setelah sukses daftar dimuat ulang dan tabel baru dibuka.
- Ekspor/impor SQL di header kotak SQL: **Ekspor SQL** = `<a href="/api/databases/[id]/export?db=">` (route handler mem-proxy stream dengan Bearer, `Content-Disposition`
  diteruskan); **Impor SQL** (owner/admin) = input file tersembunyi → `window.confirm` (nama, ukuran, database tujuan) → `importSqlAction(id, db, FormData)` (fetch multipart
  langsung ke API, bukan `api()` JSON) → notice hasil, daftar tabel dimuat ulang.
- `application-form.tsx`: field **Batas CPU (millicore)** & **Batas memori (MiB)** (`cpuMillicores`/`memoryMb`, kosong = null); halaman database punya card `database-resources.tsx`
  (`updateDatabaseResourcesAction` → `PATCH /databases/:id`). Keterangan di UI: berlaku langsung, mencabut batas = container dibuat ulang.
- `application-form.tsx`: select **Cara build** (`buildType` Dockerfile / Nixpacks); field Dockerfile hanya tampil untuk `dockerfile`, Nixpacks menampilkan catatan
  (build pertama lama, cache nonaktif, build args = env nixpacks).
- Env: `env-editor.tsx` (client) = editor per baris dengan nilai disamarkan (input password + toggle tampilkan) dan mode teks untuk paste `.env`;
  submit tetap satu field teks `KEY=VALUE` (kontrak API tidak berubah — API tetap mengembalikan nilai asli, masking hanya di UI). Dipakai `application-form.tsx`
  (plus field build args dan hint slug database project) dan `project-form.tsx` (`showEnv`, env bersama di halaman project).
- Compose: `src/features/compose/` (entity/schema/queries/actions — aksi server harus `async function`, alias arrow ditolak Next) + `compose-form.tsx` (dipakai dialog
  `create-compose-dialog.tsx` di halaman project dan tab Pengaturan), `compose-panel.tsx` (client: deploy/stop/start/hapus, daftar container, log aksi terakhir; poll 3 detik selama
  `deploying`), route `/compose/[id]`. Halaman project menampilkan section **Stack compose** di antara Aplikasi dan Database.
  Tab Deploy compose diawali `compose-access-hint.tsx` (client): tanpa `serviceDomains` & `servicePorts` → Alert "belum punya alamat" (container stack hanya buka port di
  network Docker; arahkan ke tab Pengaturan → Akses, `*.localhost` untuk dev, ingatkan bila proxy belum jalan); selain itu tombol "Buka" per service — domain
  `http(s)://host[:port proxy]`, port host `http://<hostname browser>:<hostPort>`. Hostname dari `use-browser-host.ts` (`useSyncExternalStore` atas
  `window.location.hostname`, `null` di server) — stack selalu berjalan di mesin yang sama dengan panel, jadi host panel = host port yang dipublikasikan; tanpa API.
  Layout `/projects/[id]`: dua kolom di `lg` (`grid lg:grid-cols-[minmax(0,1fr)_400px]`) — Aplikasi, Stack compose, Database di kiri; card Pengaturan (sticky) di kanan;
  grid card resource memakai `sm:grid-cols-2 2xl:grid-cols-3` karena kolomnya lebih sempit.
- Template one-click: `/templates` (`templates-catalog.tsx` grid + pencarian, `deploy-template-dialog.tsx`: project, nama, fieldset **Akses** per service (host + HTTPS dan/atau port host — `servicePorts` ikut ke `deployTemplateAction`), field variabel —
  kosong = default/di-generate API) → `deployTemplateAction` (`src/features/template/`) → redirect ke `/compose/<id>`. Sidebar punya menu **Templates**; halaman project
  punya tombol **Dari template** (`/templates?project=<id>`). Stack `source: "template"`: `ComposeForm source="template"` (textarea `composeContent`, tanpa field git;
  hidden input `source` memilih `composeTemplateSchema` di action) dan kartu **Akses** `compose-domains.tsx` (`ComposeAccess`: satu daftar gabungan domain + port host
  dengan badge, form tambah dengan Tabs **Domain** / **IP & port** — field Service & Port container sama, lalu Host+HTTPS atau Port host; saran service dari katalog via
  `templateId`; `updateServiceDomainsAction` / `updateServicePortsAction`, keduanya PATCH `/compose-apps/:id`). Error 400 API (port sudah dipakai) tampil di bawah form. `ComposeApp.gitUrl` sekarang nullable — tampilkan `template · <id>` bila `source === "template"`.
- `/projects`: kartu `project-card.tsx` — nama, badge active/inactive (≥1 instance `running`), daftar instance dari `ProjectListItem.instances`
  (ikon per jenis, engine/jenis, titik status: hijau running, merah error, kuning berdenyut building/deploying/creating, abu lainnya) dan ringkasan `n/total berjalan`.
- Dashboard: `live-clock.tsx` di pojok kanan header (hari, tanggal, jam:menit:detik lokal, `useSyncExternalStore` dengan interval 1 s sebagai store; snapshot server `null`
  → placeholder, jadi tanpa hydration mismatch dan tanpa `setState` di effect yang ditolak lint).
- Dashboard: tiga card project di atas (`getProjectSummary` → total / aktif hijau `emerald` / tidak aktif merah `red`; warna hanya penguat, label tetap menyebut maknanya).
- Grafik realtime host di Dashboard (di bawah card Host): `host-live-chart.tsx` (owner/admin) — tiga area chart CPU %, RAM % & Storage % (berdampingan di layar lebar `lg:grid-cols-3`, bertumpuk di layar sempit; SVG `preserveAspectRatio="none"` + stroke non-scaling agar meregang penuh) skala tetap 0–100 dengan gridline 25 %, 5 menit terakhir,
  poll `fetchHostLiveAction` tiap 2 detik **hanya saat tab terlihat** (`visibilitychange` via `useSyncExternalStore`), hover crosshair + waktu (diformat di klien).
  Data awal dari `getHostLive()` di server; keterangan menampilkan porsi container aoox (CPU container "per core" dibagi jumlah core host).
- Monitoring: `src/features/monitoring/` (`getHostOverview`, `getMetrics`, server action `fetchMetricsAction` untuk polling klien) + `metrics-panel.tsx`
  (client; KPI row CPU/memori/jaringan dengan sparkline SVG satu seri — ink `muted-foreground`, titik terkini `primary`, hover membaca sampel terdekat;
  poll tiap 15 detik = interval sampler API) di tab Deploy aplikasi dan halaman database; `host-overview-card.tsx` (server) di Dashboard untuk owner/admin dengan meter
  disk Docker bertumpuk (satu hue, langkah makin terang). Pola chart mengikuti skill `dataviz`.
- Preview PR: `previews-panel.tsx` di tab Webhook (daftar preview: status, host, tautan buka, log, hapus; poll 5 detik selama `building`) +
  toggle `previewsEnabled` dan `previewDomain` di `application-form.tsx` (`src/features/application/preview.entity.ts`, `listPreviews`, `fetchPreviewsAction`, `deletePreviewAction`).
  `metrics-panel.tsx` memformat waktu hanya di klien (`useSyncExternalStore` mounted) untuk menghindari hydration mismatch.
  Sparkline `metrics-panel.tsx` diregang selebar tile (`preserveAspectRatio="none"`, stroke non-scaling, penanda garis tegak); tile Jaringan menampilkan
  laju masuk per detik (`rxRate`: selisih counter kumulatif antar sampel / detik, clamp 0 saat counter reset).
- Daftar backup (DB & volume) memakai `local` dari API: `remoteKey` tanpa `local` ditampilkan "hanya di S3" — restore/unduh tetap bisa (API menarik dari S3).
- **Backup volume** (`volume-backups.tsx`, di bawah tab Mount; `src/features/volume-backup/`): backup per volume (pilih volume bila >1), daftar unduh/restore/hapus, jadwal + retensi +
  tujuan S3 per aplikasi (`updateVolumeBackupScheduleAction` → `PATCH /applications/:id/backup-schedule`). Volume terpilih diturunkan dari props (fallback volume pertama), bukan
  `useState` awal — komponen pertama kali dirender saat belum ada volume. Unduhan lewat `/api/volume-backups/[id]/download`.
- `application-jobs.tsx` dan `application-mounts.tsx` menerima **`owner`** (`JobOwner`: application|database|compose; `MountOwner`: application|database) — path API dari
  `ownerBase()`, revalidasi halaman dari `ownerPage()` (compose: `/compose/<id>`). Halaman database punya tab Mount & Jobs; halaman compose tab Jobs dengan select `service`
  (nama service diambil dari container stack yang berjalan — stack yang belum di-deploy tidak punya pilihan).
- Tab **Jobs** (`application-jobs.tsx`): job cron per aplikasi (`src/features/job/` entity/queries/actions). Riwayat run dimuat saat baris dibuka (bukan di effect — aturan
  React Compiler `set-state-in-effect`), di-poll tiap 2 detik selama ada run `running`, lalu `router.refresh()` supaya `lastStatus`/`lastRunAt` di header ikut segar.
  Notifikasi punya toggle baru `onJobFailure`.
- Tab **Mount** (`application-mounts.tsx`): daftar mount (file = textarea + "Simpan & terapkan"; hapus volume menanyakan purge via `confirm`) + form tambah
  (volume/bind/file; bind hanya bila `canBind` = owner/admin dari `getVerifiedSession`). Aksi `addMountAction`/`updateMountAction`/`deleteMountAction`, query `listMounts`.
- Tab **Domain** (`application-domains.tsx`): tambah/hapus hostname + toggle HTTPS (aktif hanya bila proxy punya `acmeEmail`); tombol Rollback di panel deploy.
- Cek DNS per domain (tombol radar di `application-domains.tsx`): `checkDomainDnsAction` → `GET /applications/:id/domains/:domainId/dns`, hasil badge `ok|salah arah|belum ada|?` + pesan;
  bila IP publik dideteksi otomatis, pesan menyarankan `PUBLIC_IP` di API. `DnsCheck` di `application.entity.ts`.
- `/settings` dikelompokkan dalam `Tabs` (`?tab=` = deep link, default `account`): **Akun** (account-card, api-tokens-card), **Tim** (members-card + link audit log; owner/admin),
  **Integrasi** (git-credentials-card, notifications-card, backup-destinations-card). Card di dalam tab tetap grid `lg:grid-cols-2`; data dimuat sekaligus di server.
  Tab-nya **terkontrol oleh URL** (`settings-tabs.tsx`: `useSearchParams` → `router.replace(?tab=)`) sehingga grup sidebar **Settings** (`app-sidebar.tsx`: Akun / Tim /
  Integrasi + Audit log; Tim & Audit hanya owner/admin, memakai flag `showTerminal` yang sama) selalu sinkron dengan tab yang terbuka. Menu "Settings" di grup Platform dihapus.
- **Infrastruktur** = grup sidebar sendiri, **satu halaman per komponen host** di `app/(dashboard)/infra/<slug>/page.tsx` (sebelumnya satu tab penuh card): `proxy`
  (semua member; `canManage` untuk tombol), `servers`, `terminal`, `swarm`, `disk` (owner/admin, `notFound()` untuk member), `backup` (owner saja). Tiap halaman hanya
  memuat data card-nya sendiri dan memakai `infra-page.tsx` (judul + deskripsi + `SetBreadcrumb` "Infrastruktur › …"; card full width). `/infra` redirect ke `/infra/proxy`.
  `INFRA_NAV` di `app-sidebar.tsx` (flag `manage`/`owner`; prop `isOwner` baru dari layout). Teks bantuan yang dulu menyebut "Settings → Infrastruktur" kini "Infrastruktur → Reverse proxy".
- `/infra/proxy` — `proxy-card.tsx` (provision/hapus Traefik); `src/features/proxy/` entity, queries, actions.
- Di produksi web bisa dilayani lewat proxy dengan domain sendiri (`docker-compose.domain.yml` di repo API): `WEB_ORIGIN`/`PUBLIC_API_URL` harus https
  dan sama dengan domain itu — cookie `Secure` mengikuti `WEB_ORIGIN`, dan gateway terminal menolak `Origin` lain.
- Tab **Webhook** (`application-webhook.tsx`): URL + salin + buat ulang. Form aplikasi punya select **Kredensial Git** (`"none"` → dikirim sebagai null).
- Secret webhook (di tab yang sama, bagian "Secret (tanda tangan)"): `setWebhookSecretAction(id, enabled)` (PUT/DELETE `/applications/:id/webhook/secret`), secret ditampilkan + salin,
  tombol aktifkan/rotasi/nonaktifkan; instruksi provider menyebut field Secret / Secret token bila aktif.
- Sign-in dua langkah: `signInAction` mengembalikan `challengeToken` bila API menjawab `requiresTwoFactor`; `sign-in-form.tsx` lalu memakai `useActionState` kedua
  (`signInTwoFactorAction`) — hasil langkah 2 menentukan tampilan: ada `challengeToken` = tetap di langkah kode (kode salah), tidak ada = kembali ke langkah 1 (challenge kedaluwarsa).
- `servers-card.tsx` menyisipkan `server-proxy-panel.tsx` per server: status (diambil saat diminta, lewat SSH), port HTTP/HTTPS, email ACME, staging, Provision/Provision ulang/Hapus
  (`provisionServerProxyAction`/`serverProxyStatusAction`/`removeServerProxyAction`). `Server` entity membawa setting proxy. Teks form aplikasi & backup volume tidak lagi menyebut batasan server remote.
- `notifications-card.tsx`: toggle `onDiskLow` & `onCertificateFailure`; channel webhook punya field `secret` (opsional, type password) dengan penjelasan header tanda tangan.
- `application-form.tsx`: select **Sumber** (`sourceType` git|image): `image` menampilkan `imageRef` + select kredensial registry (`imageRegistryId`, `"public"` → null) dan
  menyembunyikan blok git (`hidden`, tetap ter-submit). Validasi per sumber di `applicationSchema` = `baseSchema.superRefine` (gitUrl wajib untuk git, imageRef untuk image).
  Halaman project & aplikasi memuat `listRegistries()` (member → `[]`).
- `application-form.tsx`: cara build ketiga **Situs statis (nginx)** → field `staticBuildCommand` (kosong = null), `staticOutputDir` (kosong → `dist`), switch `staticSpa`
  (Radix Switch dengan `name` mengirim `on`; `readForm` menormalkan ke `"on" | ""`, `parse` mengubah ke boolean seperti `previewsEnabled`).
- `disk-card.tsx` di `/settings` (owner/admin; `src/features/maintenance/`): bar pemakaian Docker, "Bisa dibebaskan", tombol **Bersihkan sekarang** (owner; sinkron, bisa ~1 menit)
  + toggle GC registry, laporan terakhir. Form aplikasi punya field `deploymentKeep` (default "10" di `readForm`).
- `/settings` memuat `account-card.tsx` (`src/features/account/`): ganti password, aktifkan 2FA (dialog QR + konfirmasi kode → dialog kode cadangan sekali), nonaktifkan dengan password.
  `members-card.tsx`: owner bisa set password & nonaktifkan 2FA anggota non-owner (`prompt`/`confirm`). `/settings/audit-log` (`audit-log-table.tsx`, `src/features/audit-log/`):
  owner/admin, filter `action`, cursor `before`, detail body per baris. `AuthUser.twoFactorEnabled` opsional (hanya dari `/auth/me`).
- `/settings` memuat `api-tokens-card.tsx` (`src/features/api-token/`): buat token (nama + kedaluwarsa) → dialog plaintext sekali + contoh curl, daftar prefix/last used, cabut;
  link ke `${publicApiUrl}/docs`. `Date.now()` dibaca sekali via `useState` (React Compiler menolak fungsi impure di render).
- `/settings` juga memuat `git-credentials-card.tsx`; `src/features/git-credential/` entity, queries, actions.

## Managed database

- Section **Database** di halaman project (`create-database-dialog.tsx`), detail di `/databases/[id]` (`database-panel.tsx`: start/stop, kredensial dengan mask/salin,
  URL internal & eksternal, hapus dengan/tanpa volume; auto-refresh selama `creating`). `src/features/managed-database/` entity, schema, queries, actions.
- Backup: `database-backups.tsx` di bawah panel (backup sekarang, daftar dengan unduh/restore/hapus, dialog konfirmasi restore, form jadwal cron preset/kustom + jumlah simpan).
  Data via `listBackups`, aksi `createBackupAction`/`restoreBackupAction`/`deleteBackupAction`/`updateBackupScheduleAction` (cron, keep, `backupDestinationId`).
  Form jadwal punya select "Tujuan S3" (`local` = null) dari `listBackupDestinations`; backup yang tersalin ke S3 (`remoteKey`) diberi ikon awan.
- Tujuan backup S3: `src/features/backup-destination/` (entity/queries/actions create/delete/test) + `backup-destinations-card.tsx` di Settings (owner/admin):
  dialog tambah (nama, endpoint kosong = AWS, bucket, region, prefix, access key, secret key sekali tulis, switch path-style), tes koneksi, hapus.
  Unduhan tidak bisa membawa header Bearer dari `<a href>`, jadi lewat route handler `src/app/api/backups/[id]/download/route.ts` yang membaca cookie session
  dan mem-proxy stream dari API (`Content-Disposition` diteruskan).

## Ekspor/impor project

- `export-project-button.tsx` (halaman project; dropdown "Tanpa rahasia" / "Dengan password database" — yang kedua hanya untuk owner, dari `getSession()` di page) mengunduh lewat
  route handler `src/app/api/projects/[id]/export/route.ts` (cookie → Bearer, `Content-Disposition` `<slug>.aoox.json`, `?includeSecrets=true` diteruskan).
- `import-project-dialog.tsx` (halaman `/projects`, di samping New project): file dibaca & di-`JSON.parse` di browser lalu `importProjectAction(file, name?)`
  (`src/features/project-transfer/`, `POST /projects/import`). Tanpa warning → langsung ke project baru; ada warning → laporan (jumlah dibuat + daftar warning) dulu, tombol "Buka project".

## Backup instance

- `instance-backup-card.tsx` (Settings → Infrastruktur, hanya owner — page memuat `listInstanceBackups`/`getInstanceBackupSettings` dari `src/features/instance-backup/` bila role owner):
  Backup sekarang, daftar (unduh via `/api/instance-backups/[id]/download`, restore dengan dialog konfirmasi, hapus), form jadwal (preset/kustom, simpan, tujuan S3), "Restore dari file"
  (multipart `restoreInstanceUploadAction`). Setelah restore: `router.refresh()` + laporan warning dari API (ENCRYPTION_KEY/JWT_SECRET); `revalidatePath("/", "layout")` karena semua data berubah.

## Update otomatis image

- Form aplikasi (bagian image): switch `autoUpdate` + interval menit (`autoUpdateIntervalMinutes`, zod 5–1440); `application-deploy-panel.tsx` tombol **Cek update image**
  (`checkImageUpdateAction(id, deploy=true)` → `POST /applications/:id/check-image`) dengan pesan hasil (baseline/terbaru/berubah → pilih deployment baru); riwayat menandai
  `kind === "auto-update"` dengan ⟳.

## Docker Swarm

- `swarm-card.tsx` (Settings → Infrastruktur, owner/admin; aksi hanya owner): status, init (advertise addr opsional), daftar node (drain/aktifkan, hapus), perintah join (salin),
  jumlah app mode service, keluar (dinonaktifkan selama ada app service). `src/features/swarm/` entity/queries/actions.
- Form aplikasi: field **Mode deploy** (container/service) + **Replika** hanya tampil bila `swarmActive` (halaman app memuat `getSwarmStatus()`; member → null → tersembunyi) atau app
  sudah `service`. Header app menampilkan badge `service running/desired` dari `ApplicationDetail.service`.
- Multi-node: form punya select **Penempatan** (`swarmNodeId`, "any" = null) bila mode service dan ada > 1 node (`swarmNodes` dari status); badge header `service n/m` menampilkan
  task per node di `title`; kartu Swarm memperingatkan registry `localhost:` bila node > 1 (`status.registry.reachableFromNodes`).
- Panel deploy app service: tabel task (slot, node, state, sejak, error; "(node lain)" bila bukan host) + badge n/m; metrik menampilkan "jumlah N task"; riwayat menandai deployment
  `config` (⚙, "konfigurasi") yang dibuat saat mode/replika/node/limit diubah.
- Form service: **Constraint tambahan** (`swarmConstraint`, zod regex sama dengan API), **Rolling update** (`updateParallelism`/`updateDelaySeconds`) dan **Urutan** (`updateOrder`);
  kartu Swarm: `NodeLabels` (input `key=value …` per node, tombol Simpan muncul saat berubah → `updateNodeAction(id, {labels})`).

## Anggota project

- `project-members.tsx` di kolom kanan halaman project (di bawah Pengaturan): daftar anggota (implisit: owner/admin platform & pembuat; eksplisit: select peran + keluarkan),
  form tambah by e-mail + peran — hanya bila `myRole === "admin"`; tombol Hapus project juga hanya admin. Data `listProjectMembers` (`src/features/project-member/`).
  Daftar project & summary sudah difilter API per akses, web tidak perlu memfilter lagi.
- Viewer: halaman project menyembunyikan tombol buat (app/compose/template/database) dan Hapus (`canWrite = myRole !== "viewer"`); halaman aplikasi menampilkan badge "Baca saja"
  alih-alih tombol Hapus (`ApplicationDetail.projectRole`, juga ada di detail database). Panel lain belum menyembunyikan aksi — API menolak 403 dengan pesan jelas.

## Riwayat metrik

- `metrics-panel.tsx` punya pemilih rentang (1 jam / 24 jam / 7 hari / 30 hari, `METRIC_RANGES`): `1h` tetap polling 15 detik dari sampler live, rentang lain memanggil
  `fetchMetricsAction(target, id, range)` sekali saat dipilih lalu ikut polling; panel juga tampil saat container mati bila ada riwayat tersimpan, dengan catatan resolusi
  (menit/jam) dan jumlah titik.

## Railpack

- Form aplikasi: opsi **Railpack (deteksi otomatis, cache build)** di select "Cara build" + penjelasan (cache antar deploy, butuh BuildKit di host, tidak untuk server remote).
  Kartu Disk menampilkan hasil prune cache BuildKit (`CleanupReport.buildkitCache`).
