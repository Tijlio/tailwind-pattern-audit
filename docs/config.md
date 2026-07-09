# Configuration

Create a starter config:

```bash
tailwind-pattern-audit init
```

Validate the resolved config:

```bash
tailwind-pattern-audit config validate
```

Print the resolved config, including defaults:

```bash
tailwind-pattern-audit config print
```

## Example

```json
{
  "$schema": "https://raw.githubusercontent.com/Tijlio/tailwind-pattern-audit/main/schemas/config.schema.json",
  "include": ["src/**/*.{js,jsx,ts,tsx,html,astro,vue,svelte}"],
  "exclude": ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  "minOccurrences": 2,
  "minClasses": 4,
  "hideLayoutOnly": true,
  "similar": true,
  "minSimilarity": 0.75,
  "ignoreFiles": ["src/generated/**"],
  "ignorePatterns": ["rounded-md border bg-white p-4"],
  "failOn": ["duplicates"],
  "maxGroups": 0
}
```

## Ignores

Use `ignoreFiles` for generated or vendor-like source files that should not affect report evidence.

Use `ignorePatterns` for intentional repeated class sets. Values are normalized before comparison,
so class order does not matter.

For one-off source-level ignores, use inline comments:

```tsx
// tailwind-pattern-audit-ignore-next-line
<div className="rounded-md border bg-white p-4" />

<div className="rounded-md border bg-white p-4" /> {/* tailwind-pattern-audit-ignore */}
```
