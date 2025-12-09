# Phase 8: Monitor - Summary and Index

## Phase Overview

**Phase 8: Monitor** demonstrates advanced Kubernetes scaling (HPA) and implements a feedback loop where monitoring alerts automatically trigger remediation workflows.

**Duration**: 1-2 weeks for full implementation  
**Team**: DevOps/SRE, Application developers  
**Success Criteria**: Pods auto-scale under load, alerts trigger automatic remediation

## Phase 8 Deliverables

### 1. Horizontal Pod Autoscaler (HPA)
- **File**: `k8s/hpa.yaml`
- **Purpose**: Automatically scale pods based on CPU/memory metrics
- **Configuration**:
  - Min replicas: 2
  - Max replicas: 10
  - Scale up threshold: > 70% CPU or > 80% memory
  - Scale down threshold: < 50% utilization (conservative)
- **Features**:
  - Pod Disruption Budget (PDB) for availability
  - Aggressive scale-up (respond immediately)
  - Conservative scale-down (wait 5 minutes)

### 2. Deployment with Resource Limits
- **File**: `k8s/deployment-with-resources.yaml`
- **Purpose**: Define resource requests and limits for accurate HPA scaling
- **Includes**:
  - CPU: 100m request, 500m limit
  - Memory: 128Mi request, 512Mi limit
  - Liveness and readiness probes
  - Pod anti-affinity for distribution
  - ConfigMap and Secrets for configuration

### 3. Alert-Triggered Remediation Workflow
- **File**: `.github/workflows/alert-triggered-remediation.yml`
- **Purpose**: Automatically respond to Prometheus alerts with diagnostic and remediation tasks
- **Triggered By**: Manual dispatch or Alertmanager webhook
- **Alert Types**:
  - HighErrorRate → analyze logs, consider rollback
  - HighCPUUsage → check scaling status, optimize code
  - HighMemoryUsage → profile memory, restart pods
  - ApplicationDown → restart deployment, check logs
  - DatabaseDown → test connectivity, failover if needed
- **Jobs**:
  - health-check: Initial diagnostics
  - collect-diagnostics: Gather logs and metrics
  - respond-to-alert: Alert-specific remediation
  - notify-incident: Slack/PagerDuty notifications
  - post-incident-review: Summary and lessons learned

### 4. CI Workflow Enhancement
- **File**: `.github/workflows/ci.yml`
- **New Job**: `metrics-check`
- **Purpose**: Run health checks during CI pipeline
- **Metrics Checked**:
  - Response time
  - Error rate
  - CPU usage
  - Memory usage
  - Database connectivity

### 5. Load Testing Script
- **File**: `monitoring/load-test.js`
- **Purpose**: Generate realistic load to demonstrate HPA scaling
- **Tool**: k6 (load testing framework)
- **Load Profile**:
  - Stage 1: 10 VUs for 2 minutes
  - Stage 2: 50 VUs for 3 minutes (HPA scales up)
  - Stage 3: 100 VUs for 2 minutes (heavy load)
  - Ramp down: Gradual reduction (HPA scales down)
- **Metrics**:
  - Response time (p95 < 500ms, p99 < 1000ms)
  - Error rate (< 10%)
  - CPU and memory utilization

### 6. Documentation

#### `PHASE_8_HPA_SETUP.md`
Complete guide to HPA configuration and scaling:
- HPA architecture and metrics
- Deployment prerequisites and steps
- Live scaling demo walkthrough
- Monitoring with kubectl and Prometheus
- Troubleshooting guide
- Best practices
- Advanced custom metrics

#### `PHASE_8_ALERT_PIPELINE.md`
Alert-triggered workflow documentation:
- Architecture and feedback loop
- Alert types and remediation actions
- Webhook integration options
- Workflow execution flow
- Testing procedures
- Metrics for tracking
- Best practices and troubleshooting

#### `PHASE_8_INDEX.md` (this file)
Overview and cross-reference guide

## Quick Start

### Deploy HPA (5 minutes)

```bash
# 1. Apply deployment with resource requests/limits
kubectl apply -f k8s/deployment-with-resources.yaml

# 2. Apply HPA configuration
kubectl apply -f k8s/hpa.yaml

# 3. Verify everything is running
kubectl get hpa
kubectl get pods -l app=school-timetable
kubectl top pods -l app=school-timetable
```

### Test Scaling (10 minutes)

```bash
# Terminal 1: Watch HPA
kubectl get hpa school-timetable-hpa --watch

# Terminal 2: Watch pods
kubectl get pods -l app=school-timetable --watch

# Terminal 3: Generate load
k6 run monitoring/load-test.js --vus 50 --duration 5m
```

### Test Alert Workflow (5 minutes)

```bash
# Manually trigger alert workflow
gh workflow run alert-triggered-remediation.yml \
  -f alert_type=HighErrorRate \
  -f severity=critical

# Check workflow execution
gh run watch --exit-status
```

## Key Metrics and Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Utilization | > 70% | Scale up (double or +2 pods) |
| Memory Utilization | > 80% | Scale up (double or +2 pods) |
| CPU Utilization | < 30% | Scale down (50% or -1 pod) after 5min |
| Memory Utilization | < 50% | Scale down (50% or -1 pod) after 5min |
| Error Rate | > 5% | Alert + trigger remediation |
| Application Down | 0 replicas healthy | Critical alert + PagerDuty |
| Database Down | Connection errors > 10/5min | Critical alert + failover |

## Monitoring and Observability

### HPA Metrics in Prometheus

```promql
# Current replica count
kube_deployment_status_replicas{deployment="school-timetable"}

# Desired replica count
kube_deployment_spec_replicas{deployment="school-timetable"}

# CPU utilization %
(sum(rate(container_cpu_usage_seconds_total{pod=~"school-timetable-.*"}[5m])) / 
 sum(kube_pod_container_resource_requests{pod=~"school-timetable-.*", resource="cpu"})) * 100

# Memory utilization %
(sum(container_memory_usage_bytes{pod=~"school-timetable-.*"}) / 
 sum(kube_pod_container_resource_requests{pod=~"school-timetable-.*", resource="memory"})) * 100
```

### Grafana Dashboards

Create dashboards to visualize:
- Replica count over time (step graph)
- CPU and memory utilization trends
- Request rate and error rate
- HPA scaling events (annotations)
- Pod startup/shutdown timeline

### Alert Rules (in Prometheus)

```yaml
- alert: HPA_MaxReplicasReached
  expr: kube_deployment_status_replicas{deployment="school-timetable"} >= 10
  
- alert: HPA_ScalingFailure
  expr: (increase(kube_deployment_updated_replicas{deployment="school-timetable"}[5m]) == 0) 
        and (kube_deployment_spec_replicas{deployment="school-timetable"} > 2)
```

## Integration with Other Phases

### Phase 7: Monitoring & Alerting
- HPA metrics fed to Prometheus
- Alerts trigger remediation workflows
- Grafana dashboards display HPA status
- Recording rules track scaling efficiency

### Phase 5: CI/CD
- `metrics-check` job runs during CI
- Alert-triggered workflow is a separate CI pipeline
- Deployment health checked before scaling

### Phase 4: Orchestration (Kubernetes)
- HPA manages deployment replicas
- PDB ensures pod availability
- Service maintains stable endpoint for load balancing

## Common Use Cases

### Use Case 1: Traffic Spike
**Scenario**: Black Friday surge in school scheduling  
**Result**: HPA detects high CPU → scales to 6-8 replicas → handles load → scales back down

### Use Case 2: Resource Leak
**Scenario**: Memory leak introduced in new deployment  
**Result**: Memory alert fires → remediation workflow runs → logs analyzed → rollback triggered

### Use Case 3: Database Failure
**Scenario**: MySQL pod crashes  
**Result**: Database down alert → remediation checks connectivity → failover initiated → team notified

### Use Case 4: Slow Query
**Scenario**: New endpoint has unindexed query  
**Result**: CPU alert fires → diagnostics collected → query analyzed → index added → deploy fix

## Dependencies and Prerequisites

### Kubernetes
- Metrics Server (installed)
- 10+ available CPU cores (for max replicas)
- 2GB+ available memory (for 10 pods @ 128Mi each)

### Tools
- `kubectl` with cluster access
- `k6` for load testing
- `gh` CLI for GitHub Actions
- Prometheus + Grafana (Phase 7)

### Configuration
- Resource requests/limits on deployment
- Prometheus scrape config for HPA metrics
- Alertmanager webhook configured
- GitHub RBAC token with repo access

## Success Metrics

- [ ] HPA successfully scales from 2 to 10 replicas under load
- [ ] Average response time remains < 500ms during scaling
- [ ] Pod creation/termination completes within 30 seconds
- [ ] Alert workflow triggers within 5 minutes of alert firing
- [ ] Remediation actions execute without manual intervention
- [ ] Scale-down completes within 10 minutes of load reduction
- [ ] Pod Disruption Budget prevents more than 1 pod termination
- [ ] Zero service disruption during scaling events

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| HPA shows "unknown" metrics | Install Metrics Server: `kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml` |
| Pods not scaling | Check resource requests: `kubectl get pod -o yaml \| grep -A2 requests` |
| Too many pods created | Adjust scale-up stabilization window to 60s |
| Alerts not triggering | Verify Alertmanager webhook URL and GitHub token |
| Remediation failing | Check RBAC: `kubectl describe sa school-timetable` |

## Files and Locations

```
k8s/
  ├── hpa.yaml                           # HPA + PDB configuration
  ├── deployment-with-resources.yaml     # Deployment with resource limits
monitoring/
  ├── load-test.js                       # k6 load testing script
.github/workflows/
  ├── alert-triggered-remediation.yml   # Alert-triggered workflow
  ├── ci.yml                             # Updated with metrics-check job
PHASE_8_HPA_SETUP.md                     # HPA detailed guide
PHASE_8_ALERT_PIPELINE.md                # Alert workflow guide
PHASE_8_INDEX.md                         # This file
```

## Next Steps and Future Enhancements

### Short Term (1-2 weeks)
- [ ] Deploy HPA to development environment
- [ ] Run load tests and validate scaling behavior
- [ ] Configure alert webhooks with Alertmanager
- [ ] Test each alert type's remediation workflow
- [ ] Create Grafana dashboards for HPA metrics

### Medium Term (1-2 months)
- [ ] Deploy to staging environment
- [ ] Run chaos engineering tests
- [ ] Implement custom metrics (request latency, queue depth)
- [ ] Add cost optimization based on scaling patterns
- [ ] Integrate with financial/billing system

### Long Term (2-3 months)
- [ ] Multi-region deployment with cross-region failover
- [ ] Machine learning for predictive scaling
- [ ] Federated Prometheus for multi-cluster monitoring
- [ ] Advanced AIOps for root cause analysis
- [ ] Self-healing systems for automatic remediation

## Related Documentation

- **Phase 7**: [Monitoring & Alerting](PHASE_7_MONITORING_SETUP.md)
- **Phase 5**: [CI/CD Pipeline](PHASE_5_CI_CD_SETUP.md)
- **Phase 4**: [Kubernetes Orchestration](docs/orchestration.md)
- **Kubernetes**: [HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- **k6**: [Load Testing Guide](https://k6.io/docs/getting-started/)

## Contact and Support

For questions or issues with Phase 8:
- Check troubleshooting sections in `PHASE_8_HPA_SETUP.md`
- Review alert logs: `kubectl logs -l app=alertmanager`
- Check workflow logs: `gh run view --log <run-id>`
- Open GitHub issue in repository

---

**Phase 8 Status**: ✅ Complete  
**Last Updated**: December 2024  
**Version**: 1.0
