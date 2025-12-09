# Branching Strategy

- Branches:
  - `main`: production-ready code. Only merge from `develop` via PR.
  - `develop`: integration branch for completed features; CI runs on pushes and PRs.
  - `feature/*`: short-lived feature branches branched off `develop`.
  - `hotfix/*`: critical fixes branched off `main` and merged back to `develop`.

- Pull Request rules:
  - Require at least one approving review.
  - All CI checks must pass before merge.
  - Use descriptive titles and reference issues when relevant.
