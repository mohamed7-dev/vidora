# Branches

## 1. Branch roles

- **`main` (production)**
  - Always reflects the **latest released** version.
  - Only updated via **merge of tested release branches** or **hotfixes**.
  - Protected: require PRs, passing CI, no direct pushes.

- **`develop` (integration / ongoing work)**
  - Where day‑to‑day development is integrated.
  - New features and non‑urgent fixes are merged here first.
  - Can be unstable between releases; used for internal testing.

- **`release/*` (stabilization for a given version)**
  - Branch from `develop` when you’re preparing a new version.
  - Example: `release/0.2.0`.
  - Only bug fixes, docs, and release‑prep (version bumps, changelog).
  - Merged into **`main`** when ready, and also back into **`develop`**.

- **`feature/*` (individual pieces of work)**
  - Branch from `develop`.
  - One feature / refactor / spike per branch.
  - Examples:
    - `feature/tray-locale-refresh`
    - `feature/history-page-i18n`
  - PR → `develop` when done.

- **`hotfix/*` (urgent production fixes)**
  - Branch from `main` to fix a production issue.
  - Example: `hotfix/crash-on-startup`.
  - After testing:
    - Merge into `main` (for immediate release).
    - Also merge into `develop` (and latest `release/*` if one is open) so the fix isn’t lost.

---

## 2. Typical workflows

### New feature

1. `git checkout develop`
2. `git checkout -b feature/some-feature`
3. Implement + tests.
4. Open PR `feature/some-feature -> develop`.
5. After review & CI: merge, delete feature branch.

### Prepare a new release

1. `git checkout develop`
2. `git checkout -b release/0.2.0`
3. Bump versions, update changelog, fix bugs, run thorough tests.
4. When stable:
   - Merge `release/0.2.0` into `main` (tag: `v0.2.0`).
   - Merge `release/0.2.0` back into `develop`.
   - Delete `release/0.2.0` branch.

### Production hotfix

1. `git checkout main`
2. `git checkout -b hotfix/fix-title-locale`
3. Implement fix, tests.
4. PR `hotfix/fix-title-locale -> main`.
5. After merge:
   - Tag a hotfix release (e.g. `v0.2.1`).
   - Merge `main` back into `develop` (and any active `release/*`).

---

## 4. Optional refinements

- **Testing levels tied to branches:**
  - `feature/*`: unit + fast checks.
  - `develop`: unit + integration.
  - `release/*` and `main`: full suite (including packaging, e2e, building AppImage/installer).

- **Naming conventions:**
  - `feature/i18n-history-page`
  - `feature/github-actions-release`
  - `hotfix/macos-startup-crash`
