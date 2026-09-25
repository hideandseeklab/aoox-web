# aoox-web

Dashboard for [aoox](https://github.com/hideandseeklab/aoox-api), a self-hosted PaaS. Built with
Next.js 16, React 19, Tailwind CSS and shadcn/ui.

## Development

```bash
npm install
npm run dev          # http://localhost:3000
```

Point it at a running [aoox-api](https://github.com/hideandseeklab/aoox-api) instance — see that
repo for backend setup, or use `docker-compose.dist.yml` there to run the full stack.

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm run start` — production build and start
- `npm run lint` — eslint
- `npm run typecheck` — `tsc --noEmit`

## Versioning

Versioned independently from `aoox-api`, `aoox-landing`, and `aoox-cli` — see [CHANGELOG.md](CHANGELOG.md).

## License

[Apache 2.0](LICENSE)
