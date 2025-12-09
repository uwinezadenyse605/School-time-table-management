# Phase 8: Alert-Triggered Pipeline (Feedback Loop)

## Overview

The **Alert-Triggered Pipeline** creates a feedback loop where monitoring alerts automatically trigger remediation workflows. When Prometheus detects an issue, it sends an alert to Alertmanager, which can notify GitHub Actions to run diagnostic and remediation tasks.

## Architecture

```
Prometheus (Metrics Collection)
         ↓
Alertmanager (Alert Processing)
         ↓
GitHub Actions Webhook (Trigger)
         ↓
Alert-Triggered Remediation Workflow
         ├→ Health Checks
         ├→ Collect Diagnostics
         ├→ Remediate (alert-specific)
         └→ Notify Team
```

## Alert Types and Remediation

### 1. High Error Rate Alert

**Detection**: Application error rate > 5% over 5 minutes

**Trigger Conditions**:
```promql
rate(http_request_total{status=~"5.."}[5m]) / rate(http_request_total[5m]) > 0.05
```

**Remediation Actions**:
- Check recent application logs
- Identify error patterns (database, external API, etc.)
- Trigger rollback if recent deployment caused issue
- Scale up pods if resource-constrained
- Alert on-call engineer with logs and metrics

**GitHub Actions Workflow**:
```yaml
- name: Handle HighErrorRate alert
  run: |
    # 1. Fetch recent logs
    kubectl logs -l app=school-timetable --tail=100
    # 2. Check deployment history
    kubectl rollout history deployment/school-timetable
    # 3. If necessary, trigger rollback
    kubectl rollout undo deployment/school-timetable
```

### 2. High CPU Usage Alert

**Detection**: Average CPU > 70% for 5 minutes

**Trigger Conditions**:
```promql
rate(container_cpu_usage_seconds_total{pod=~"school-timetable-.*"}[5m]) > 0.7
```

**Remediation Actions**:
- Check what processes are consuming CPU
- Review recent code changes for inefficiencies
- Scale up replicas (HPA may already be doing this)
- Profile hot code paths
- Alert if max replicas reached

**GitHub Actions Workflow**:
```yaml
- name: Handle HighCPUUsage alert
  run: |
    # 1. Check current scaling status
    kubectl get hpa school-timetable-hpa
    # 2. Check pod resource usage
    kubectl top pods -l app=school-timetable
    # 3. If at max replicas, alert team
    if [ $(kubectl get hpa -o json | jq '.items[0].spec.maxReplicas') = $(kubectl get hpa -o json | jq '.items[0].status.currentReplicas') ]; then
      echo "At max replicas - scaling limit reached!"
    fi
```

### 3. High Memory Usage Alert

**Detection**: Average memory > 80% for 5 minutes

**Trigger Conditions**:
```promql
sum(container_memory_usage_bytes{pod=~"school-timetable-.*"}) / 
sum(kube_pod_container_resource_limits{pod=~"school-timetable-.*", resource="memory"}) > 0.8
```

**Remediation Actions**:
- Check for memory leaks
- Review recent changes to data loading
- Restart affected pods (graceful)
- Increase memory limits if sustained
- Scale up replicas

**GitHub Actions Workflow**:
```yaml
- name: Handle HighMemoryUsage alert
  run: |
    # 1. Identify pods with high memory
    kubectl top pods -l app=school-timetable
    # 2. Check heap dumps or memory profiling
    # 3. Restart pods gracefully
    kubectl rollout restart deployment/school-timetable
    # 4. Monitor memory after restart
    sleep 30
    kubectl top pods -l app=school-timetable
```

### 4. Application Down Alert

**Detection**: Application unreachable or /healthz endpoint failing

**Trigger Conditions**:
```promql
rate(up{job="school-timetable"}[5m]) < 0.5
```

**Remediation Actions**:
- Check if pods are running
- Check if container logs show startup errors
- Attempt automatic restart
- Check recent deployments
- Trigger rollback if recent deployment
- Alert PagerDuty with critical severity

**GitHub Actions Workflow**:
```yaml
- name: Handle ApplicationDown alert
  run: |
    # 1. Check pod status
    kubectl get pods -l app=school-timetable
    # 2. Check logs for errors
    kubectl logs -l app=school-timetable --tail=50 --previous
    # 3. Try to recover
    kubectl rollout restart deployment/school-timetable
    # 4. Wait for recovery
    kubectl rollout status deployment/school-timetable --timeout=5m
```

### 5. Database Down Alert

**Detection**: Database connection errors or connectivity checks failing

**Trigger Conditions**:
```promql
increase(db_connection_errors_total[5m]) > 10
```

**Remediation Actions**:
- Check database service status
- Verify network connectivity
- Check database credentials
- Attempt connection pool reset
- Trigger failover if replicated setup
- Alert database team

**GitHub Actions Workflow**:
```yaml
- name: Handle DatabaseDown alert
  run: |
    # 1. Test database connectivity
    mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "SELECT 1"
    # 2. Check database service
    kubectl get svc -l app=mysql
    # 3. Check application logs for connection errors
    kubectl logs -l app=school-timetable | grep -i "database\|connection"
    # 4. If using replication, check status
    mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD -e "SHOW SLAVE STATUS"
```

## Alert Webhook Integration

### Option 1: Manual Trigger (Testing)

For testing the alert workflow without setting up webhooks:

```bash
# Trigger alert manually
gh workflow run alert-triggered-remediation.yml \
  -f alert_type=HighErrorRate \
  -f severity=critical
```

### Option 2: Alertmanager Webhook

Configure Alertmanager to send alerts to GitHub Actions webhook:

**In `monitoring/alertmanager.yml`**:
```yaml
receivers:
  - name: github-webhook
    webhook_configs:
      - url: https://api.github.com/repos/uwinezadenyse605/School-time-table-management/dispatches
        send_resolved: true
        headers:
          Authorization: token ${{ secrets.GITHUB_TOKEN }}
          Content-Type: application/json
        client_auth:
          bearer_token: ${{ secrets.GITHUB_TOKEN }}
```

**GitHub Actions workflow trigger**:
```yaml
on:
  repository_dispatch:
    types: [prometheus-alert]
```

### Option 3: Webhook Receiver Service

Deploy a webhook receiver service that translates Alertmanager alerts to GitHub Actions:

```bash
# Deploy webhook receiver (example using Node.js)
cat > webhook-receiver.js << 'EOF'
const express = require('express');
const { Octokit } = require('@octokit/rest');

const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

app.post('/alerts', async (req, res) => {
  const alerts = req.body.alerts;
  
  for (const alert of alerts) {
    const alertType = alert.labels.alertname;
    const severity = alert.labels.severity;
    
    // Trigger GitHub Actions workflow
    await octokit.actions.createWorkflowDispatch({
      owner: 'uwinezadenyse605',
      repo: 'School-time-table-management',
      workflow_id: 'alert-triggered-remediation.yml',
      ref: 'develop',
      inputs: {
        alert_type: alertType,
        severity: severity,
      },
    });
  }
  
  res.status(202).send('Alerts received');
});

app.listen(8080, () => console.log('Webhook receiver listening on port 8080'));
EOF
```

## Workflow Execution Flow

### Workflow: `alert-triggered-remediation.yml`

1. **Health Check Job**: Runs initial diagnostics
2. **Collect Diagnostics Job**: Gathers logs, metrics, deployment history
3. **Respond to Alert Job**: Executes alert-specific remediation
4. **Notify Incident Job**: Sends notifications (critical alerts only)
5. **Post-Incident Review Job**: Generates summary and lessons learned

### Job Dependencies

```
health-check
    ↓
collect-diagnostics
    ↓
respond-to-alert
    ├→ notify-incident (if critical)
    │      ↓
    │  post-incident-review
    │
    └→ (skip notify if not critical)
           ↓
       post-incident-review
```

## Testing the Feedback Loop

### Test 1: Manual Alert Trigger

```bash
# Trigger a critical error rate alert
gh workflow run alert-triggered-remediation.yml \
  -f alert_type=HighErrorRate \
  -f severity=critical

# Check workflow status
gh run list --workflow=alert-triggered-remediation.yml --limit 1
```

### Test 2: Simulate High Error Rate

```bash
# Generate errors to trigger alert
for i in {1..1000}; do
  curl -X GET http://localhost:3000/api/invalid/endpoint 2>/dev/null &
done
wait

# Check Prometheus for alert firing
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.alertname=="HighErrorRate")'
```

### Test 3: Simulate High CPU Load

```bash
# Generate CPU load
docker exec school-timetable-test npm run benchmark || true

# Check HPA and pod metrics
kubectl get hpa --watch

# Trigger alert manually
gh workflow run alert-triggered-remediation.yml \
  -f alert_type=HighCPUUsage \
  -f severity=warning
```

### Test 4: Monitor Feedback Loop

```bash
# Terminal 1: Watch HPA
kubectl get hpa --watch

# Terminal 2: Watch pods
kubectl get pods -l app=school-timetable --watch

# Terminal 3: Generate load
k6 run monitoring/load-test.js --vus 50 --duration 5m

# Terminal 4: Monitor GitHub Actions
gh run watch --exit-status
```

## Metrics for Alert-Triggered Workflow

### Key Metrics to Track

```promql
# Alert firing rate
rate(ALERTS{alertname!=""}[5m])

# Remediation workflow success rate
rate(workflow_run_success{workflow="alert-triggered-remediation"}[1h]) / 
rate(workflow_run_total{workflow="alert-triggered-remediation"}[1h])

# Time from alert to remediation
histogram_quantile(0.95, rate(alert_to_remediation_duration_seconds_bucket[5m]))

# Number of incidents per alert type
count by (alertname) (ALERTS)
```

### Prometheus Recording Rules

Add to `monitoring/recording_rules.yml`:

```yaml
- name: alert_remediation
  interval: 30s
  rules:
    - record: alert:remediation:success_rate
      expr: |
        rate(workflow_run_success{workflow="alert-triggered-remediation"}[1h]) /
        rate(workflow_run_total{workflow="alert-triggered-remediation"}[1h])
    
    - record: alert:response_time:p95
      expr: |
        histogram_quantile(0.95, rate(alert_to_remediation_duration_seconds_bucket[5m]))
```

## Best Practices

1. **Differentiate by Severity**: Critical alerts get immediate action, warnings get logged
2. **Avoid Alert Storms**: Use inhibition rules to suppress dependent alerts
3. **Graceful Degradation**: Remediation should not make things worse
4. **Audit Trail**: Log all remediation actions for compliance
5. **Runbook References**: Link alerts to documented runbooks
6. **Team Notifications**: Route different alert types to different teams
7. **Rate Limiting**: Prevent webhook flooding from alerting too frequently
8. **Idempotency**: Remediation should be safe to run multiple times

## Troubleshooting

### Alerts not triggering workflows

**Check**:
```bash
# Verify webhook is configured in Alertmanager
kubectl logs -l app=alertmanager | grep webhook

# Check GitHub token permissions
gh auth status

# Verify webhook receiver is running
kubectl get pods -l app=webhook-receiver
```

### Remediation not working

**Check**:
```bash
# View workflow logs
gh run view <run-id>

# Check RBAC permissions
kubectl describe sa school-timetable

# Verify deployment exists
kubectl get deployment school-timetable
```

### Too many alerts

**Solution**:
```yaml
# Configure alert inhibition in alertmanager.yml
inhibit_rules:
  # Don't alert on HighErrorRate if Application is already down
  - source_match:
      alertname: ApplicationDown
    target_match:
      alertname: HighErrorRate
    equal: ['instance']
```

## Next Steps

- Integrate with PagerDuty for on-call management
- Implement ChatOps (Slack/Teams commands) for manual remediation
- Add capacity planning alerts (resource exhaustion forecast)
- Create custom metrics-based alerts for business logic
- Implement alert fatigue analysis and tuning
