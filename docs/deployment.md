**Deployment**

- **Manifests**: `k8s/deployment.yaml`, `k8s/service.yaml`, `k8s/hpa.yaml`.
- The deployment uses a RollingUpdate strategy (maxSurge=1, maxUnavailable=0) to provide zero-downtime updates.
- Readiness probe checks `/api/health` to ensure pods are ready before traffic is routed.

**How the CD pipeline works**

- The `.github/workflows/cd.yml` workflow triggers on:
  - Push of tags matching `v*` (e.g. `v1.2.3`).
  - Manual `workflow_dispatch` where you can pass `image_tag`.

- The workflow expects a repository secret named `KUBE_CONFIG` that contains a base64-encoded kubeconfig for the target cluster. It also expects `DOCKERHUB_USERNAME` if using Docker Hub images.

**Resource sizing & calculations**

These are conservative defaults for a small Node.js service. Adjust based on real load tests.

- Per-pod assumptions (typical small Node.js API):
  - Baseline CPU idle: ~50m
  - Typical per-request CPU spike: 50-150m
  - Memory: 100-200Mi resident; allow buffer for concurrency and libraries

- Recommended Kubernetes resource settings (used in `k8s/deployment.yaml`):
  - `requests.cpu`: 250m (0.25 CPU)
  - `limits.cpu`: 500m (0.5 CPU)
  - `requests.memory`: 256Mi
  - `limits.memory`: 512Mi

- Example capacity planning (replicas = 3):
  - Total CPU requests = 3 * 0.25 = 0.75 cores
  - Total CPU limits = 3 * 0.5 = 1.5 cores
  - Total memory requests = 3 * 256Mi = 768Mi
  - Total memory limits = 3 * 512Mi = 1536Mi (~1.5Gi)

How to calculate for your needs:

- Measure average and p99 request CPU and memory under realistic load.
- Set per-pod request slightly above the average usage and limit above p99.
- Choose `replicas` = ceil(desired_concurrency / pod_capacity).

Example quick commands

- Deploy a tagged release (from local):

```bash
git tag v1.2.3
git push origin --tags
```

This will trigger the CD workflow and deploy the `v1.2.3` image (workflow expects the image to be published to your registry with the same tag).

If you prefer blue-green deployments instead of rolling updates
- You can implement blue-green by creating two deployments (e.g. `school-timetable-blue` and `school-timetable-green`) and switching a Service between them, or using an Ingress to switch traffic. This workflow currently implements rolling updates (recommended default). If you'd like, I can add an optional blue-green job.
