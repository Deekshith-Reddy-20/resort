# Dependency audit (13 October 2026)

Do not treat a green Vercel build as a proof that the tree is fully patched.

Package manager: **npm** workspaces, lockfileVersion 3. Node `24.x`. Next.js remains **15.5.27** (not 16).

## Applied (safe)

| Change | Why |
|---|---|
| `vitest` 2.x → 5.0.4 (web + inventory) | Patches critical `tinypool` RCE, `@vitest/mocker`, `esbuild`/`vite` used only by tests |
| Root `overrides.postcss` = `8.5.30` | Next 15 still vendors old PostCSS; npm’s only “fix” was Next 16.4 |
| `lint`: `next lint` → `eslint .` | Next 15.5 deprecates `next lint`; ESLint 9 is supported via CLI + `eslint.config.mjs` |
| Remove `.eslintrc.json` | Avoid dual legacy/flat config |
| `npm install-scripts approve unrs-resolver@1.12.2` | Native postinstall for ESLint import resolver. Not a global allow |
| `trustedDependencies` / `allowScripts` | Records that allowlist |

`esbuild@0.21.5` is gone from the tree (it came from Vite 5 under Vitest 2). Vite 8 (Vitest 5) does not pull that package, so there is no esbuild install script to approve.

## Remaining `npm audit` (dev/build only)

`npm audit --omit=dev` → **0 vulnerabilities**.

Remaining 9 findings are **Tailwind CSS 3 / ESLint plugin glob tooling**. `npm audit fix --force` would install **Tailwind 4.3.3**, which is a breaking CSS rewrite and was not applied.

| Advisory | Severity | Production runtime? | Mitigation |
|---|---|---|---|
| GHSA-vfj7-8cjw-p6xm `braces` (all published versions) | high | No. File-glob in Tailwind/chokidar/ESLint at **install/build**. No patched npm release. | Do not pass untrusted glob patterns. Stay on Tailwind 3. |
| chokidar / micromatch / fast-glob / tailwindcss / eslint-config-next (via braces) | high | No. Same chain. | Same. |
| GHSA-rj75-hqrm-r3gf `postcss-selector-parser` < 7.1.6 | moderate | Build-time CSS. Override to 7.1.6 **breaks** Tailwind 3 (`postcss-nested@6`). | Unpatched until Tailwind 4. |

## Explicitly not done

- Next.js 16 (audit’s PostCSS parent “fix”)
- Tailwind 4
- `npm audit fix --force`
- Approving all install scripts (`npm install-scripts approve --all`)
