# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Versions below 1.0.0 may include breaking changes in a minor release.

## [Unreleased]

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

[Unreleased]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/hideandseeklab/aoox-web/compare/v0.1.0-alpha.0...v0.1.0-alpha.1
[0.1.0-alpha.0]: https://github.com/hideandseeklab/aoox-web/releases/tag/v0.1.0-alpha.0
