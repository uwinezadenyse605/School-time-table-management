# Phase 7: Operate - Index & Navigation

## Welcome to Phase 7: Operate

This phase implements comprehensive **monitoring, logging, and alerting** for the School Timetable Management system. The stack is production-ready and includes Prometheus, Grafana, ELK Stack, and Alertmanager.

---

## 📋 Quick Navigation

### Getting Started (5 minutes)
👉 **Start here:** [`MONITORING_QUICKSTART.md`](./MONITORING_QUICKSTART.md)
- 5-minute setup guide
- Access service URLs
- Common tasks

### Complete Documentation
📚 **Main guide:** [`docs/monitoring_and_alerting.md`](./docs/monitoring_and_alerting.md)
- Architecture overview
- Detailed configuration
- All features explained
- Best practices

### Error Budget & SLOs
📊 **Policy:** [`docs/error_budget_policy.md`](./docs/error_budget_policy.md)
- SLO definitions
- Error budget tracking
- Feature freeze procedures
- Incident management

### Project Structure
📁 **Directory guide:** [`monitoring/README.md`](./monitoring/README.md)
- File descriptions
- Configuration details
- Troubleshooting

### Implementation Details
✅ **Summary:** [`PHASE_7_DELIVERABLES.md`](./PHASE_7_DELIVERABLES.md)
- Complete deliverables list
- 17 files created
- 15 alert rules
- Resource specifications

### Verification
🔍 **Checklist:** [`PHASE_7_CHECKLIST.md`](./PHASE_7_CHECKLIST.md)
- Implementation checklist
- Success criteria
- Verification steps

---

## 📁 File Structure

```
.
├── MONITORING_QUICKSTART.md              ← Start here!
├── PHASE_7_DELIVERABLES.md              ← Complete summary
├── PHASE_7_CHECKLIST.md                 ← Verification checklist
├── PHASE_7_MONITORING_SETUP.md           ← Phase overview
├── docs/
│   ├── monitoring_and_alerting.md        ← Main documentation
│   └── error_budget_policy.md            ← SLO & policy
├── monitoring/
│   ├── README.md                         ← Directory guide
│   ├── prometheus.yml                    ← Prometheus config
│   ├── alert_rules.yml                   ← Alert rules (15 alerts)
│   ├── recording_rules.yml               ← Recording rules (20+)
│   ├── alertmanager.yml                  ← Alert routing
│   ├── docker-compose.monitoring.yml     ← Docker stack (9 services)
│   ├── prometheus-metrics.js             ← Node.js instrumentation
│   ├── logstash/
│   │   └── pipeline/
│   │       └── logstash.conf            ← Log processing
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/prometheus.yaml
│       │   └── dashboards/dashboard-provider.yaml
│       └── dashboards/
│           └── system-overview.json     ← Example dashboard
├── k8s/
│   ├── monitoring.yaml                  ← Prometheus for K8s
│   └── grafana-alertmanager.yaml        ← Grafana/Alertmanager for K8s
└── README.md                            ← Project root
```

---

## 🚀 Quick Start

### Local Development (Docker)

```bash
# 1. Start the stack
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d

# 2. Verify services
docker-compose -f monitoring/docker-compose.monitoring.yml ps

# 3. Access dashboards
open http://localhost:9090      # Prometheus
open http://localhost:3001      # Grafana (admin/admin)
open http://localhost:5601      # Kibana
open http://localhost:9093      # Alertmanager
```

### Kubernetes Production

```bash
# 1. Create namespace
kubectl create namespace monitoring

# 2. Deploy stack
kubectl apply -f k8s/monitoring.yaml
kubectl apply -f k8s/grafana-alertmanager.yaml

# 3. Access services
kubectl port-forward -n monitoring svc/prometheus 9090:9090
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

---

## 📊 What's Included

### Monitoring Components (5)
| Component | Purpose | Port |
|-----------|---------|------|
| **Prometheus** | Metrics collection | 9090 |
| **Grafana** | Visualization | 3001 |
| **Node Exporter** | System metrics | 9100 |
| **cAdvisor** | Container metrics | 8080 |
| **MySQL Exporter** | Database metrics | 9104 |

### Logging Components (3)
| Component | Purpose | Port |
|-----------|---------|------|
| **Elasticsearch** | Log storage | 9200 |
| **Logstash** | Log processing | 5000 |
| **Kibana** | Log visualization | 5601 |

### Alert Management
| Component | Purpose | Port |
|-----------|---------|------|
| **Alertmanager** | Alert routing | 9093 |

### Alert Rules (15)
**Error Budget (2):** HighErrorRate, ErrorBudgetExhausted
**Availability (2):** ApplicationDown, DatabaseDown
**Performance (4):** HighLatency, HighCPU, HighMemory, DiskSpaceLow
**Database (2):** ConnectionPoolExhausted, SlowQueries
**Traffic (3):** TrafficDrop, HealthCheckFail, + system alerts

---

## 🔐 Default Credentials

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| Grafana | http://localhost:3001 | admin | admin |
| Prometheus | http://localhost:9090 | - | - |
| Kibana | http://localhost:5601 | - | - |
| Alertmanager | http://localhost:9093 | - | - |

⚠️ **Change Grafana password in production!**

---

## 📚 Documentation by Task

### I want to...

#### Start Monitoring Right Now
→ [`MONITORING_QUICKSTART.md`](./MONITORING_QUICKSTART.md) (5 min read)

#### Understand the Full Architecture
→ [`docs/monitoring_and_alerting.md`](./docs/monitoring_and_alerting.md) (20 min read)

#### Configure Error Budgets & SLOs
→ [`docs/error_budget_policy.md`](./docs/error_budget_policy.md) (15 min read)

#### Set Up Alerts
→ See `monitoring/alert_rules.yml` + [alert guide](./docs/monitoring_and_alerting.md#alert-rules)

#### Create Grafana Dashboards
→ See [`docs/monitoring_and_alerting.md#grafana-dashboards`](./docs/monitoring_and_alerting.md#grafana-dashboards)

#### Analyze Logs in Kibana
→ See [`docs/monitoring_and_alerting.md#kibana`](./docs/monitoring_and_alerting.md#kibana)

#### Deploy to Kubernetes
→ See `k8s/` + [`docs/monitoring_and_alerting.md#kubernetes-deployment`](./docs/monitoring_and_alerting.md#kubernetes-deployment)

#### Add Application Metrics
→ See `monitoring/prometheus-metrics.js` + [`docs/monitoring_and_alerting.md#custom-application-metrics`](./docs/monitoring_and_alerting.md#custom-application-metrics)

#### Troubleshoot Issues
→ See [`monitoring/README.md#troubleshooting`](./monitoring/README.md#troubleshooting)

---

## 📈 Key Metrics You'll Track

### Application Health
- Request rate (requests/sec)
- Error rate (% errors)
- P95 latency (response time)
- Active connections

### System Health
- CPU usage (%)
- Memory usage (%)
- Disk usage (%)
- Network throughput

### Database Health
- Connection count
- Query rate
- Slow query count
- Lock time

### Error Budget
- Monthly error budget (1% = 7.2 hrs)
- Actual error rate
- Days until budget exhausted
- Burn rate

---

## ✅ Implementation Status

All components are **complete and production-ready**:

- ✅ Prometheus with 5 scrape targets
- ✅ 15 alert rules configured
- ✅ 20+ recording rules
- ✅ Grafana with example dashboard
- ✅ ELK stack fully configured
- ✅ Alertmanager with 3 notification channels
- ✅ Kubernetes manifests
- ✅ Application instrumentation library
- ✅ 1600+ lines of documentation
- ✅ Troubleshooting guides
- ✅ Best practices documented

---

## 🎯 Next Steps

1. **Configure Notifications** (5 min)
   ```bash
   # Add your Slack/PagerDuty credentials
   export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
   export PAGERDUTY_SERVICE_KEY=...
   ```

2. **Start the Stack** (2 min)
   ```bash
   docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d
   ```

3. **Access Dashboards** (1 min)
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001
   - Kibana: http://localhost:5601

4. **Create Custom Dashboards** (20 min)
   - See [Grafana guide](./docs/monitoring_and_alerting.md#grafana-dashboards)

5. **Add Application Metrics** (30 min)
   - See [instrumentation guide](./monitoring/prometheus-metrics.js)

6. **Configure Log Forwarding** (15 min)
   - Update app to send logs to Logstash port 5000

7. **Define SLOs** (30 min)
   - See [error budget policy](./docs/error_budget_policy.md)

---

## 🔍 File Quick Reference

| File | Purpose | Lines |
|------|---------|-------|
| prometheus.yml | Prometheus configuration | 60 |
| alert_rules.yml | 15 alert rules | 200 |
| recording_rules.yml | 20+ recording rules | 70 |
| alertmanager.yml | Alert routing config | 60 |
| logstash.conf | Log processing pipeline | 90 |
| docker-compose.monitoring.yml | Docker stack definition | 300 |
| prometheus-metrics.js | Node.js instrumentation | 400 |
| monitoring_and_alerting.md | Main documentation | 800+ |
| error_budget_policy.md | SLO/policy document | 500+ |
| MONITORING_QUICKSTART.md | Quick start guide | 300+ |

**Total: 17 files, 3500+ lines of configuration & documentation**

---

## 📞 Support & Troubleshooting

### Common Issues

**Services won't start?**
→ See [`monitoring/README.md#troubleshooting`](./monitoring/README.md#troubleshooting)

**No metrics appearing?**
→ See [Prometheus troubleshooting](./docs/monitoring_and_alerting.md#prometheus-not-scraping-metrics)

**No logs in Kibana?**
→ See [logs troubleshooting](./docs/monitoring_and_alerting.md#logs-not-appearing-in-kibana)

**Alerts not firing?**
→ See [alert troubleshooting](./docs/monitoring_and_alerting.md#alerts-not-firing)

**Need help?**
1. Check logs: `docker logs <container-name>`
2. Review [`monitoring/README.md`](./monitoring/README.md)
3. Check Prometheus targets: http://localhost:9090/targets
4. See troubleshooting sections in docs

---

## 📖 Related Documentation

- [CI/CD Pipeline](./docs/devops_pipeline_overview.md)
- [Deployment Guide](./docs/deployment.md)
- [Kubernetes Setup](./k8s/)
- [Branching Strategy](./docs/branching_strategy.md)

---

**Phase 7: Operate is complete!** Your monitoring, logging, and alerting infrastructure is ready for production. Start with the [Quick Start Guide](./MONITORING_QUICKSTART.md) and refer to the [Main Documentation](./docs/monitoring_and_alerting.md) for details.

Good luck! 🚀
