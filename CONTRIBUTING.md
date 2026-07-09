# Contributing

Thanks for helping improve `tailwind-pattern-audit`.

## Development

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Use small fixtures under `test/fixtures` when adding extraction behavior. Prefer focused tests
for CLI behavior, report formatting, config validation, and schema compatibility.

## Pull Requests

- Keep changes scoped to one behavior or workflow.
- Add or update tests for user-visible behavior.
- Update `README.md` and `CHANGELOG.md` when CLI, config, action, or report output changes.
- Run `pnpm format` before pushing.

## Release Checklist

Releases are published by trusted publishing from version tags.

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
pnpm pack --dry-run
```

Then tag a committed version:

```bash
git tag vX.Y.Z
git push origin main vX.Y.Z
```
