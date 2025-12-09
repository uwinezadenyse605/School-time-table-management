Feedback Loops: Alert-Triggered CI/CD Automation

Overview
- A feedback loop connects monitoring alerts to automated CI/CD remediation.
- This ensures that when infrastructure or application issues are detected, the system can automatically respond.
- Workflows in this repository:
  - `.github/workflows/alert-triggered-remediation.yml` (v1 — manual + health checks)
  - `.github/workflows/alert-triggered-remediation-v2.yml` (v2 — investigate, remediate, analyze)

Alert → Action Mapping

| Alert Type | Severity | Detection | Automatic Action | Manual Follow-up |
|------------|----------|-----------|------------------|------------------|
| HighErrorRate (5m) | critical | error rate > 5% | Investigate logs, notify ops | Rollback if recent deploy |
| ErrorBudgetExhausted (30d) | warning → critical | monthly errors > 1% | Analyze burn rate, check HPA status | Scale capacity or fix root cause |
| HighCPUUsage | warning | CPU > 80% for 10m | HPA scales up automatically | Investigate if scaling ineffective |
| HighMemoryUsage | warning | memory > 85% for 10m | HPA scales up automatically | Check for memory leaks |
| ApplicationDown | critical | health checks fail for 1m | Restart pods, notify ops | Investigate logs; may need rollback |
| DatabaseDown | critical | db unreachable for 1m | Alert ops immediately; no auto-fix | Manual failover or recovery |

Workflow Triggers

1. **Manual Dispatch** (for testing)
   ```
   GitHub Actions → Run workflow → Select alert type, severity, action
   ```

2. **Alertmanager Webhook** (production)
   - Alertmanager sends alert details to GitHub via webhook
   - GitHub triggers `repository_dispatch` event
   - Workflow receives alert metadata and decides remediation

Example Alertmanager Config (monitoring/alertmanager.yml):
```yaml
receivers:
  - name: 'github-webhook'
    webhook_configs:
      - url: 'https://api.github.com/repos/uwinezadenyse605/School-time-table-management/dispatches'
        send_resolved: true
        headers:
          Accept: 'application/vnd.github+json'
          Authorization: 'token $GITHUB_PAT'
        custom_headers:
          X-GitHub-Event: 'alert-fired'

routes:
  - match:
      severity: critical
    receiver: 'github-webhook'
    group_wait: 1s
    repeat_interval: 1h
```

Setting Up Webhook Trigger

1. Generate GitHub Personal Access Token:
   ```bash
   # Create token with 'repo' and 'workflow' scopes
   # Token must have permission to trigger repository_dispatch events
   ```

2. Add token as secret in repository:
   ```bash
   # In GitHub repo settings → Secrets and variables → Actions
   # Add: GITHUB_PAT with your token value
   ```

3. Update Alertmanager config with webhook URL and token

4. Test webhook:
   ```bash
   curl -X POST \
     -H "Accept: application/vnd.github+json" \
     -H "Authorization: token YOUR_TOKEN" \
     -d '{"event_type":"alert-fired","client_payload":{"alert_type":"HighErrorRate","severity":"critical"}}' \
     https://api.github.com/repos/uwinezadenyse605/School-time-table-management/dispatches
   ```

Remediation Workflow Stages

**Stage 1: Alert Context** (output: alert metadata)
- Parse alert type, severity, action from inputs or webhook
- Output used by downstream jobs

**Stage 2: Investigate** (runs on critical or investigate action)
- Fetch pod status, deployment events, recent logs
- Perform alert-type-specific analysis
- Output diagnostics for human review

**Stage 3: Remediate** (runs on critical severity)
- Execute automatic remediation based on alert type:
  - **HighErrorRate / ApplicationDown**: suggest rollback, check deployment history
  - **HighCPU / HighMemory**: scale up via HPA or manual kubectl
  - **ErrorBudgetExhausted**: analyze burn rate and recommend actions
- All remediations include safeguards (e.g., won't auto-rollback; requires approval)

**Stage 4: Error Budget Analysis** (runs on ErrorBudgetExhausted)
- Query Prometheus for burn rate metrics
- Identify affected endpoints
- Recommend priority actions

**Stage 5: Notify** (runs always)
- Send summary to Slack
- Include run link for team review

Example Execution Paths

**Path A: HighErrorRate (critical)**
1. Prometheus alert fires: `HighErrorRate` severity=critical
2. Alertmanager webhook sends to GitHub
3. Workflow starts: alert-context → investigate → remediate → notify
4. Remediate job: checks rollout history, suggests rollback
5. Team reviews diagnostics and decides to rollback
6. Notification sent to Slack with investigation details

**Path B: ErrorBudgetExhausted (warning)**
1. Monthly batch evaluation fires: error rate > 1%
2. Alertmanager sends notification
3. Workflow starts: alert-context → investigate → budget-analysis
4. Budget analysis: queries burn rate, identifies if spike or gradual
5. Recommendation: if recent deploy caused spike, rollback; if gradual, scale capacity
6. Team notified for follow-up

**Path C: HighMemoryUsage (warning)**
1. Pod memory reaches 85% of limit
2. HPA automatically scales up (no workflow needed)
3. Alertmanager sends warning (informational)
4. Workflow investigate job: checks if memory leak present
5. Recommendation: monitor memory trend; if still growing, investigate code

Safeguards & Approval Gates

- **No automatic rollback**: rollout undo requires manual approval or a separate approval workflow
- **No database changes**: database-related alerts require manual ops intervention
- **Graceful degradation**: if kubeconfig is missing, steps skip safely with warnings
- **Slack notification**: always sent so team is aware of automatic actions

Testing Feedback Loops

Local (manual dispatch):
```bash
# 1. Push changes to develop
git push origin develop

# 2. Go to GitHub → Actions
# 3. Select "Alert-Triggered Remediation v2"
# 4. Run workflow → Fill inputs:
#    - alert_type: HighErrorRate
#    - severity: critical
#    - action: investigate
# 5. Watch output in Actions tab
```

Production (webhook):
```bash
# 1. Deploy Alertmanager with webhook config
# 2. Trigger an alert manually:
kubectl port-forward svc/prometheus 9090:9090
# Query in Prometheus that would trigger HighErrorRate
# 3. Watch GitHub Actions for auto-triggered workflow
# 4. Check Slack for notifications
```

Metrics to Monitor Loop Health

- Workflow execution frequency: should match alert firing rate
- Investigation duration: target < 5 minutes
- Mean time to remediate (MTTR): track improvements over time
- False positive rate: adjust alert thresholds if > 10%
- Team action rate: % of alerts requiring manual action (target < 20%)

Next Steps

1. **Enable webhook**: set up Alertmanager webhook in production cluster
2. **Add approval gate**: integrate GitHub Actions approval for rollback
3. **Enhance remediation**: add rollback job with canary validation
4. **Custom metrics**: add KEDA triggers for request-rate based scaling
5. **Runbook automation**: link alerts to runbooks (wiki, wiki.example.com)
6. **Dashboard**: create Grafana dashboard showing feedback loop timeline

Troubleshooting

**Webhook not triggering workflow**
- Verify GITHUB_PAT has 'workflow' scope
- Check Alertmanager logs: `kubectl logs -n monitoring alertmanager-0`
- Test webhook manually with curl

**Workflow fails with "kubeconfig not found"**
- Ensure KUBE_CONFIG_DATA secret is set in GitHub repo settings
- kubeconfig must be base64-encoded: `cat ~/.kube/config | base64`

**Remediation doesn't scale up**
- Verify HPA is deployed: `kubectl get hpa -n default`
- Check metrics-server running: `kubectl get deployment metrics-server -n kube-system`
- Look for "Failed to get resource metric" in HPA status

