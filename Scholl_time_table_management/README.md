# School Timetable Management

Node.js + MySQL + Bootstrap example app implementing a small timetable CRUD API, a Bootstrap frontend, Docker support, tests, and a GitHub Actions CI pipeline.

Quick start (development using Docker Compose):

1. Copy .env.example to .env and edit if needed.
2. Start services:

```powershell
docker-compose up --build
```

3. Open http://localhost:3000

Run tests locally:

```powershell
npm ci
npm test
```

CI: GitHub Actions workflow at `.github/workflows/ci.yml` runs tests and builds the Docker image. Add `SLACK_WEBHOOK_URL` to repository secrets to enable failure notifications.

Docs are in the `docs/` folder: roadmap, error budget, branching, commit messages, PR/code review guidance.
