# Releasing

`aoox-web` is versioned independently from `aoox-api`, `aoox-landing`, and `aoox-cli` — see the
[Versioning](README.md#versioning) note in the README.

## Checklist

1. Make sure everything you want in this release is merged into `main`.
2. Move the `## [Unreleased]` entries in [CHANGELOG.md](CHANGELOG.md) into a new version section
   (e.g. `## [0.1.0-alpha.1] - 2026-10-01`), and add the compare/tag links at the bottom of the file.
3. Bump, tag, and push — all in one command:
   ```bash
   npm version 0.1.0-alpha.1
   ```
   This updates `package.json`, commits it, creates the git tag `v0.1.0-alpha.1`, and (via the
   `postversion` script) pushes the commit and the tag — do not tag manually, do not `git push`
   separately, and do not edit the version number by hand.
4. This triggers [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml),
   which builds the image and pushes it to Docker Hub as:
   - `hideandseeklab/aoox-web:0.1.0-alpha.1` (matches the tag, without the `v`)
   - `hideandseeklab/aoox-web:latest`

   Watch it run under the repo's **Actions** tab. It needs the `DOCKERHUB_USERNAME` and
   `DOCKERHUB_TOKEN` repository secrets to be set.
5. Once the workflow finishes, confirm the new tag is listed at
   `https://hub.docker.com/r/hideandseeklab/aoox-web/tags`.
6. (Optional) Create a GitHub Release from the pushed tag and paste in the CHANGELOG.md entry for
   this version.

## First release only

`postversion` only runs on a *version change* — `npm version` refuses to re-set the version already
in `package.json` (this repo's very first tag, `v0.1.0-alpha.0`, was cut before this hook existed).
For that one-time case, tag and push directly instead of using `npm version`:
```bash
git tag v0.1.0-alpha.0
git push --follow-tags
```

## If something needs a same-day fix after a release

Don't overwrite the tag. Fix forward: merge the fix, then cut a new patch-ish version
(e.g. `0.1.0-alpha.2`) through the same checklist above. Git tags in this project are never
force-moved once pushed.

## Coordinating with aoox-api

`aoox-web` and `aoox-api` don't have to release together — the version numbers are independent.
If this release needs a minimum `aoox-api` version (a new endpoint, a changed response shape),
note it in that release's CHANGELOG entry.
