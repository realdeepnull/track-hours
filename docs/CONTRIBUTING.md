# Contributing

Contributions, bug reports, and feature requests are welcome. This guide covers the workflow and conventions for contributing to Track Hours.

---

## Quick Start

```bash
git clone <repo-url>
cd track-hours
npm install
npm run electron:dev   # verify everything works
```

See [Getting Started](getting-started.md) for environment setup.

---

## Workflow

1. **Fork & branch** — create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
2. **Develop** — keep commits focused and atomic.
3. **Lint & test** before pushing:
   ```bash
   npm run lint
   npm test
   ```
4. **Open a Pull Request** — describe what changed and why. Link any related issues.

---

## Commit Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. All commit messages **must** adhere to this format:

```
<type>(<scope>): <short summary>
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, missing semi-colons, etc. (no logic change) |
| `refactor` | Code change that is neither a fix nor a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, or dependency updates |

### Scopes

Common scopes: `timer`, `entries`, `projects`, `reports`, `export`, `settings`, `storage`, `update`, `electron`, `readme`, `docs`.

### Examples

```
feat(timer): add pause/resume support
fix(export): correct UTF-8 BOM encoding for CSV
docs(readme): add contributing section
refactor(storage): extract electron detection into signal
chore(deps): upgrade electron to v43
```

> Conventional Commits are required because the changelog and release versioning are generated automatically from commit history via [Release Please](https://github.com/googleapis/release-please).

---

## Code Style

### TypeScript & Angular

- **Standalone components** — no NgModules. Do not set `standalone: true` (default in Angular v20+).
- **Change detection** — do not set `ChangeDetectionStrategy.OnPush` explicitly (default in Angular v22+).
- **Inputs/Outputs** — use `input()`, `output()`, and `model()` functions, not decorators.
- **Host bindings** — put inside the `@Component`/`@Directive` `host` object, not `@HostBinding`/`@HostListener`.
- **DI** — use `inject()` instead of constructor injection.
- **Services** — use `providedIn: 'root'` (or the `@Service` decorator for new singletons in Angular v22+).
- **State** — signals only. Use `computed()` for derived state; never `mutate()`.

### Templates

- Use native control flow (`@if`, `@for`, `@switch`) — not `*ngIf`, `*ngFor`, `*ngSwitch`.
- Use `class` and `style` bindings — not `ngClass` or `ngStyle`.
- Keep templates simple; move complex logic to the component.
- Prefer inline templates for small components.

### Accessibility

- All components must pass AXE checks.
- Follow WCAG AA: focus management, color contrast, ARIA attributes.
- Use `NgOptimizedImage` for static images (not for base64).

### TypeScript Strictness

- Strict mode is enabled — avoid `any`; use `unknown` when type is uncertain.
- Prefer type inference when the type is obvious.

---

## Linting & Formatting

- ESLint config: `eslint.config.js`
- Prettier: `prettier` (config in `package.json` or `.prettierrc`)
- Lint patterns: `src/**/*.ts`, `src/**/*.html`

Run before every commit:

```bash
npm run lint
```

---

## Testing

- Framework: **Vitest** via `@angular/build:unit-test`.
- Test files: `*.spec.ts` alongside the code under test.
- Run tests with:

  ```bash
  npm test
  ```

When testing services that use Electron IPC, mock `window.electronAPI` in the test setup.

---

## Releases

Releases are automated via [Release Please](https://github.com/googleapis/release-please) (config in `release-please-config.json`). You do not need to cut releases manually — maintainers merge the generated release PR.

Packaging is handled by `electron-builder` (config in `package.json` under the `build` key).

---

## License

By contributing, you agree that your contributions are licensed under the **MIT License (Non-Commercial)** — see the [LICENSE](../LICENSE) file.
```