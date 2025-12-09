Phase 7 — Operate: Monitoring & Logging

Overview
- This document describes the monitoring and logging setup for the School Timetable Management system.
- Prometheus+Grafana are used for metrics collection and visualization.
- ELK (Elasticsearch / Logstash / Kibana) is used for logs; EFK (Elasticsearch / Fluentd / Kibana or Fluent Bit) is an alternative for Kubernetes.
- Alerting uses Alertmanager with Slack and PagerDuty receivers.

Prometheus
- Configuration: `monitoring/prometheus.yml`
- Rules: `monitoring/alert_rules.yml` (alerts) and `monitoring/recording_rules.yml` (recorded metrics & SLO calculations).
- New SLO/Error-Budget rules added:
  - `slo:error_rate:30d` — 30-day rolling error rate (5xx / total)
  - `slo:burnrate:5m` — short-window burn rate (ratio of recent error rate to objective)
  - `slo:error_budget_remaining:30d` — remaining error budget fraction (1 = full budget remaining, 0 = exhausted)

Grafana
- Provisioning in `monitoring/grafana/provisioning` with an example dashboard in `monitoring/grafana/dashboards/system-overview.json`.
- Recommended dashboards:
  - SLO Overview (error rate, error budget remaining, burn rate)
  - SLA / Availability panels
  - Latency (P50/P95/P99)
  - Request rate and error rate trends
  - Infrastructure (CPU, memory, disk)

Alerting (Error Budget focus)
- Existing alerts already include:
  - `HighErrorRate` (short-term critical) — triggers when recent error rate > 5% for 5m
  - `ErrorBudgetExhausted` (monthly) — triggers when 30-day error rate exceeds 1% budget
- New workflow suggestions:
  - Use `slo:burnrate:5m` to create transient burn-rate alerts:
    - Example: if burn-rate > 14 for 5m (i.e., 14x the allowed error rate), escalate to ops immediately.
  - Use `slo:error_budget_remaining:30d` thresholds for paging vs. warning:
    - Warning: remaining < 0.25 (25% of budget left)
    - Critical: remaining <= 0 (budget exhausted)
- Alertmanager routes critical to PagerDuty, warnings and info to Slack (configured in `monitoring/alertmanager.yml`).

Logging — ELK/EFK
- Docker Compose stack includes Elasticsearch, Logstash, Kibana (`monitoring/docker-compose.monitoring.yml`) and a `logstash` pipeline (`monitoring/logstash/pipeline/logstash.conf`).
- For Kubernetes, use EFK (Elasticsearch + Fluent Bit/Fluentd + Kibana):
  - Deploy Elasticsearch (preferably via Helm or operator for production)
  - Deploy Fluent Bit as a DaemonSet to collect pod logs and forward to Elasticsearch
  - Deploy Kibana to visualize logs
- Log best practices:
  - Structured JSON logs with fields: `timestamp`, `level`, `service`, `trace_id`, `span_id`, `request_id`, `path`, `status_code`, `duration`, `message`.
  - Avoid logging secrets; filter with Logstash/Fluentd.
  - Use indices per day `logs-YYYY.MM.DD` and index lifecycle management (ILM) in Elasticsearch.

Example Fluent Bit DaemonSet (high-level):
- Configure input to tail `/var/log/containers/*.log`
- Parse Docker JSON or Kubernetes format
- Enrich records with Kubernetes metadata
- Output to Elasticsearch endpoint

SLO / Error Budget Definitions
- Example SLO: Availability SLO = 99% success rate (i.e., error budget = 1%) over 30 days.
- SLO metric: `http_requests_total{job="school-timetable"}` and errors `http_requests_total{status=~"5.."}`
- Error budget math (implemented via recording rules):
  - error_rate_30d = increase(errors[30d]) / increase(requests[30d])
  - burn_rate_5m = (increase(errors[5m]) / increase(requests[5m])) / error_budget_threshold
  - error_budget_remaining = 1 - (error_rate_30d / error_budget_threshold)

Operational runbook (short)
- On `ErrorBudgetExhausted` (monthly critical):
  1. Triage logs in Kibana for recent 5xx spikes.
  2. Check Grafana SLO dashboard for burn rate and affected endpoints.
  3. If burn-rate high, rollback recent deployments or scale up capacity.
  4. Notify stakeholders and open incident if needed (PagerDuty).

Deployment & testing
- Local quickstart (monitoring folder):
```powershell
# from repository root
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
# visit Prometheus http://localhost:9090, Grafana http://localhost:3001, Kibana http://localhost:5601
```
- Kubernetes deployment (example):
```powershell
kubectl create namespace monitoring
kubectl apply -f k8s/monitoring.yaml -n monitoring
kubectl apply -f k8s/grafana-alertmanager.yaml -n monitoring
# port-forward as needed for local access
kubectl port-forward -n monitoring svc/prometheus 9090:9090
kubectl port-forward -n monitoring svc/grafana 3000:3000
kubectl port-forward -n monitoring svc/kibana 5601:5601
```

Next recommended improvements
- Create a dedicated SLO dashboard in Grafana using the recorded rules (`slo:error_rate:30d`, `slo:burnrate:5m`, `slo:error_budget_remaining:30d`).
- Add automated smoke tests in the CD pipeline to verify application health after deployments.
- Harden Elasticsearch with TLS and authentication for production.
- Consider using Thanos or Cortex for long-term metric storage if retention > 30d is required.

