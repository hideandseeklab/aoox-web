# aoox-web

Dashboard for [aoox](https://github.com/hideandseeklab/aoox-api), a self-hosted PaaS. Built with
Next.js 16, React 19, Tailwind CSS and shadcn/ui.

Website: [aoox.dev](https://aoox.dev) · Docs: [aoox.dev/docs](https://aoox.dev/docs) · Changelog: [aoox.dev/changelog](https://aoox.dev/changelog)

Related repos: [aoox-api](https://github.com/hideandseeklab/aoox-api) (backend) ·
[aoox-cli](https://github.com/hideandseeklab/aoox-cli) (CLI) ·
[aoox-landing](https://github.com/hideandseeklab/aoox-landing) (website and docs).

## Development

```bash
npm install
npm run dev          # http://localhost:3000
```

To open the dev server from another machine (a LAN IP or a tunnel host) set `AOOX_DEV_ORIGINS` to a
comma-separated list of hosts, for example `AOOX_DEV_ORIGINS=192.168.1.20,dev.example.test npm run dev`
(hosts only, no scheme or port). Next 16 dev blocks client JavaScript and HMR from any other origin, so
selects and tabs stay dead without it. It is read by `next.config.ts` into `allowedDevOrigins` and ignored
in production builds.

Point it at a running [aoox-api](https://github.com/hideandseeklab/aoox-api) instance — see that
repo for backend setup, or use `docker-compose.dist.yml` there to run the full stack.

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm run start` — production build and start
- `npm run lint` — eslint
- `npm run typecheck` — `tsc --noEmit`
- `npm run check:ui` — flags fields and buttons of different heights on one row (heuristic, run by hand; not part of the build)

## Versioning

Versioned independently from `aoox-api`, `aoox-landing`, and `aoox-cli` — see [CHANGELOG.md](CHANGELOG.md).

## License

[Apache 2.0](LICENSE)
