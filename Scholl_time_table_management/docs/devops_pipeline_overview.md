# DevOps Pipeline Overview

This repository includes a simple CI pipeline using GitHub Actions. It demonstrates the following:

- Automated install and test on PRs and pushes to `develop` and `main`.
- MySQL service used in CI for integration tests.
- Docker image build step to validate containerization (can be extended to push to registry).
- Optional Slack notification for failures using `SLACK_WEBHOOK_URL` secret.

To extend: add CD steps to push images and deploy (e.g., to Kubernetes or ECS) with proper secrets and approvals.
