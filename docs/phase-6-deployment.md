Phase 6 — Continuous Deployment (Kubernetes)

Overview
- This document describes the CD options added to the GitHub Actions workflow: rolling updates (default) and an optional blue-green strategy.
- It also documents recommended resource requests and limits and shows a simple capacity calculation.

Workflow summary
- `deploy` job in `.github/workflows/ci.yml` runs on `main` or tag refs and supports two strategies:
  - `rolling` (default): updates the `school-timetable` Deployment image via `kubectl set image` then waits for rollout.
  - `blue-green`: creates a `school-timetable-green` deployment, waits until it's ready, switches the `school-timetable` Service selector to `color: green`, and removes the old deployment.
- The workflow expects the following secrets to be configured in the repository settings:
  - `KUBE_CONFIG_DATA` — base64 encoded kubeconfig for the target cluster (required for kubectl to talk to the cluster).
  - `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (optional) — if you need to log in to a private registry.

Resource recommendations and calculation
- Baseline measured/assumed values for this Node.js application (small REST app):
  - Average memory footprint per pod (idle): ~100-150 MiB
  - Memory per concurrent active connection: ~1-5 MiB (varies heavily by request type)
  - Baseline CPU idle: ~50-100m
  - CPU per request under load: up to 200-400m depending on workload

Suggested Kubernetes resources (conservative starting point)
- For small to medium workloads (light traffic):
  - requests.cpu: "100m"
  - limits.cpu: "500m"
  - requests.memory: "128Mi"
  - limits.memory: "512Mi"
- For moderate workloads / production baseline:
  - requests.cpu: "250m"
  - limits.cpu: "750m"
  - requests.memory: "256Mi"
  - limits.memory: "1Gi"

Example capacity calculation
- Expected concurrent requests: 100
- Assume each active request consumes 50m CPU and 10Mi memory
  - CPU needed = 100 * 50m = 5000m = 5 CPU
  - Memory needed = 100 * 10Mi = 1000Mi ~ 1Gi
- If each pod has `limits.cpu: 500m` and `limits.memory: 512Mi`, pods required ~
  - CPU: 5 / 0.5 = 10 pods
  - Memory: 1Gi / 0.5Gi = 2 pods
- Use the larger value (10 pods) to satisfy both constraints — HPA should be configured with sensible min/max based on these numbers.

Notes
- The repository already contains `k8s/deployment-with-resources.yaml` and `k8s/hpa.yaml`. They provide a good starting point: `requests.cpu: 100m`, `limits.cpu: 500m`, and HPA targets CPU 70% / memory 80%.
- Tuning: run load tests (e.g. k6, ApacheBench) to measure realistic CPU/memory per request for your workload and update requests/limits accordingly.
- For blue-green deployments the Service must include a selector that supports a `color` (or `version`) label. See `k8s/blue-green-example.yaml` for an example.

Operational checklist before enabling CD
- Add `KUBE_CONFIG_DATA` secret (base64-encoded kubeconfig).
- If using private image registry, add `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets.
- Confirm that the service account referenced in manifests has rights to create/update/delete deployments and services, or use the provided kubeconfig bound to an appropriate K8s user/service-account.
- Consider adding pre-deployment integration tests or a smoke test step after rollout.

