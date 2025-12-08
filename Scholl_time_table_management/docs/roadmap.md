# DevOps Roadmap

Phases and tools

- Phase 1: Plan
  - Choose app: Node.js + MySQL + Bootstrap frontend
  - Tools: GitHub (repo), Docs in repo, Slack for notifications
- Phase 2: Code
  - Git branching: feature/*, develop, main
  - Code reviews via Pull Requests
- Phase 3: Build
  - CI: GitHub Actions for build and test
  - Containerization: Docker multi-stage + docker-compose for local dev
- Phase 4: Test
  - Unit tests: Jest
  - Integration tests: Supertest + MySQL service in CI
  - Notifications: Slack (webhook) for failed CI

Deployment

- Build Docker image in CI. Push to registry (optional). Deploy with your infra (K8s, ECS, or simple VM/docker-compose running image).
