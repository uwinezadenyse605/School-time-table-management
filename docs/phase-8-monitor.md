Phase 8 — Monitor: Scaling & Feedback Loops

Overview
- This document describes Horizontal Pod Autoscaler (HPA) setup for the School Timetable application in Kubernetes.
- It covers scaling scenarios, tuning, and feedback loops that trigger CI/CD actions based on monitoring alerts.

HPA Configuration
- File: `k8s/hpa.yaml`
- Target: `school-timetable` Deployment
- Min/Max replicas: 2 to 10
- Metrics:
  - CPU utilization target: 70%
  - Memory utilization target: 80%
- Scaling behavior:
  - Scale-up: immediately (0s stabilization), allows 100% increase per 30s or +2 pods per 60s
  - Scale-down: conservative (300s stabilization), reduces by 50% per 60s or 1 pod per 60s

Scaling Scenarios & Examples

Scenario 1: Morning rush (8–9 AM)
- Expected: request rate increases from 10 req/s to 50 req/s
- Current state: 2 pods, ~5 req/s per pod
- Behavior:
  - Pod CPU rises from 20% to 70% → triggers scale-up
  - HPA adds 2 pods immediately (100% max per 30s) → 4 pods
  - Within 60s, 4 pods can handle ~40 req/s
  - If rate continues to 60 req/s, another scale-up to 6 pods within the next 30s
- Result: graceful horizontal scaling keeps latency stable

Scenario 2: Memory leak or unoptimized query
- Symptom: memory per pod drifts from 256Mi baseline to 450Mi
- HPA metric: memory utilization (request 256Mi, limit 512Mi) reaches 85% → triggers scale-up
- Limitation: HPA alone won't fix a leak; scaling adds more leaky pods
- Remedy: pair with monitoring alert `HighMemoryUsage` that triggers:
  - Alert to ops: "Investigate for memory leak"
  - Or: auto-remediation job to restart pods or trigger rollback (see feedback loop section)

Scenario 3: Afternoon traffic drop (4–5 PM)
- Traffic drops from 50 req/s to 10 req/s
- CPU per pod drops to 20%
- HPA scale-down takes 300s (5min) stabilization to avoid thrashing
- After 5min, pods scale down to 2 (min replicas)
- Cost savings: ~40% reduction in pod count during low-traffic periods

HPA Tuning Guidelines

For consistent latency (sub-second responses):
- Lower CPU target (e.g., 50–60%) → higher replica count but lower latency variance
- Use both CPU and memory targets to catch different bottleneck types

For cost optimization:
- Raise CPU target (e.g., 80–90%) → fewer replicas but risk of brief latency spikes
- Increase scale-down stabilization (e.g., 600s) to avoid rapid churn

For bursty traffic:
- Fast scale-up (0s stabilization, 100% growth) works well
- Can add KEDA (advanced HPA) for request-rate based scaling (see advanced section)

Default (current) config recommendations:
- Suitable for: steady-state production with predictable traffic
- Trade-off: balanced latency and cost
- If latency SLO < 200ms: consider lowering CPU target to 60%
- If cost is critical: raise CPU target to 85% and increase stabilization window

Feedback Loops: Alert-Triggered Automation

The workflow now includes a `respond-to-alert` job in `.github/workflows/alert-triggered-remediation.yml` that can be triggered by Alertmanager webhooks or manual dispatch. New improvements for Phase 8:

Alert → Action Map:
1. **HighErrorRate (short-term critical)**
   - Trigger: error rate > 5% for 5m
   - Action: investigate logs, may trigger rollback or restart pods
   - Example: `on-alert-high-error-rate` job checks recent deployments and rolls back if error rate persists

2. **ErrorBudgetExhausted (monthly critical)**
   - Trigger: 30-day error rate > 1%
   - Action: capacity check (see if under-replicated), or auto-scale if HPA is not responding
   - Example: `on-alert-budget-exhausted` job verifies HPA status, scales up min replicas if needed

3. **HighCPUUsage / HighMemoryUsage (infrastructure)**
   - These trigger scale-up via HPA automatically
   - Alert still sent to ops for investigation (may indicate regression)
   - Example: `on-alert-resource-usage` job can collect diagnostics and trigger deeper analysis

Workflow integration (added in Phase 8):
- The CI workflow's `deploy` job now includes a post-deployment smoke test step that confirms the app is responding.
- The alert-triggered remediation workflow can be triggered by Alertmanager webhook POSTs or manual GitHub Actions dispatch.
- Example: if `ErrorBudgetExhausted` fires, the webhook triggers the remediation job, which:
  1. Checks HPA status and current replica count
  2. Verifies Prometheus metrics for burn rate and affected endpoints
  3. If HPA is maxed out, notifies ops to investigate resource scaling
  4. If recent deployment is suspect, triggers rollback job

Setting up Alert Webhooks (Alertmanager → GitHub)
1. Generate a GitHub Personal Access Token (PAT) with `repo` and `workflow` scopes
2. In Alertmanager config (`monitoring/alertmanager.yml`), add a webhook receiver:
   ```yaml
   receivers:
     - name: 'github-webhook'
       webhook_configs:
         - url: 'https://api.github.com/repos/uwinezadenyse605/School-time-table-management/dispatches'
           send_resolved: true
           headers:
             Accept: 'application/vnd.github+json'
             Authorization: 'token YOUR_GITHUB_PAT'
           http_sd_configs:
             - targets: []
   ```
3. Add route in Alertmanager to send critical alerts to GitHub webhook:
   ```yaml
   routes:
     - match:
         severity: critical
       receiver: 'github-webhook'
   ```
4. This triggers the `alert-triggered-remediation` workflow with alert details

HPA Metrics in Prometheus
- `kube_hpa_status_current_replicas` — current replica count
- `kube_hpa_status_desired_replicas` — target replica count (after HPA decision)
- `kube_hpa_status_condition{condition="ScalingActive"}` — whether HPA is active (1 if true)
- `kube_pod_resource_requests_cpu_cores` — requested CPU per pod
- `kube_pod_resource_limits_cpu_cores` — CPU limit per pod

Grafana Dashboard Panels for Phase 8 (recommended additions):
- **HPA Status**: current vs desired replicas over time
- **Scaling Decisions**: count of scale-up/scale-down events per hour
- **Pod Count vs Request Rate**: correlation of pod count and incoming request rate
- **Resource Utilization Trend**: CPU and memory % over time, colored by replica count
- **Alert Firing Timeline**: when alerts fire relative to scaling events

Testing HPA
```bash
# Apply HPA and deployment
kubectl apply -f k8s/deployment-with-resources.yaml
kubectl apply -f k8s/hpa.yaml

# Generate synthetic load
kubectl run -it --image=busybox --restart=Never load-gen -- /bin/sh
# Inside the pod:
while true; do wget -q -O- http://school-timetable/api/health; done

# Watch HPA status
kubectl get hpa school-timetable-hpa --watch

# View HPA metrics
kubectl describe hpa school-timetable-hpa

# Check replica count increase
kubectl get deployment school-timetable --watch
```

Advanced: Custom Metrics & KEDA
- Current config uses CPU/memory (Resource metrics)
- For request-rate based scaling, use custom metrics or KEDA (Kubernetes Event-Driven Autoscaling)
- See `k8s/hpa-advanced.yaml` for KEDA example (Prometheus custom metric)
- KEDA allows scaling based on:
  - Request rate (from Prometheus)
  - Queue depth (from Kafka, RabbitMQ)
  - Database connections
  - Application-specific metrics

Operational Checklist
- [ ] HPA min/max replicas set appropriately for your SLA
- [ ] CPU and memory resource requests/limits set on all containers (required for HPA to work)
- [ ] Metrics-server deployed in cluster (usually default in managed K8s)
- [ ] Alertmanager webhook configured to trigger remediation workflows
- [ ] Grafana dashboards include HPA and scaling metrics
- [ ] Load testing performed to verify scale-up/scale-down behavior
- [ ] Alert thresholds tuned to your SLO (e.g., CPU 70% for P95 latency SLO)

Runbook: HPA Not Scaling
1. Verify metrics-server is running: `kubectl get deployment metrics-server -n kube-system`
2. Check if pod resource requests are set: `kubectl describe pod <pod-name> | grep -A5 Requests`
3. Verify Prometheus metrics are available: `kubectl port-forward svc/prometheus 9090:9090` and query `container_cpu_usage_seconds_total`
4. Check HPA status: `kubectl describe hpa school-timetable-hpa`
5. Look for "Failed to get resource metric": this means metrics-server can't reach the kubelet
6. Increase HPA evaluation interval if scaling decisions are infrequent: `--horizontal-pod-autoscaler-sync-period=30s`

Next Steps
- Deploy HPA and run load tests to tune min/max replicas and thresholds
- Implement KEDA for request-rate based scaling if traffic is bursty
- Create SLO dashboard with HPA status, scaling events, and error budget burn rate
- Set up alert webhooks to GitHub Actions for automated remediation workflows
