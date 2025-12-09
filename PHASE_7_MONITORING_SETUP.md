# Phase 7: Operate - Monitoring, Logging & Alerting Setup

## Summary

This phase implements comprehensive monitoring, logging, and alerting for the School Timetable Management system, including Prometheus metrics collection, Grafana dashboards, ELK stack for log aggregation, and Alertmanager for intelligent alert routing.

## Files Created

### Monitoring Configuration Files

#### Prometheus
- **`monitoring/prometheus.yml`** - Prometheus configuration with scrape targets
  - Application metrics (port 3000)
  - Node Exporter (system metrics)
  - cAdvisor (Docker metrics)
  - MySQL Exporter (database metrics)
  - Self-monitoring

- **`monitoring/alert_rules.yml`** - Prometheus alert rules (15 alerts)
  - Error Budget Alerts (HighErrorRate, ErrorBudgetExhausted)
  - Availability Alerts (ApplicationDown, DatabaseDown)
  - Performance Alerts (HighLatency, HighCPUUsage, HighMemoryUsage, DiskSpaceLow)
  - Database Alerts (ConnectionPoolExhausted, SlowQueries)
  - Request Rate Alerts

- **`monitoring/recording_rules.yml`** - Pre-computed recording rules
  - Request rate calculations
  - Error rate percentages
  - Latency percentiles (P50, P95, P99)
  - System resource usage percentages
  - Database metrics aggregations

#### Alertmanager
- **`monitoring/alertmanager.yml`** - Alert routing and notification configuration
  - Slack integration
  - PagerDuty integration (for critical alerts)
  - Alert inhibition rules
  - Routing based on severity

#### Logging (ELK Stack)
- **`monitoring/logstash/pipeline/logstash.conf`** - Logstash pipeline configuration
  - JSON log parsing
  - Timestamp extraction
  - Log level tagging
  - HTTP request parsing
  - Database query parsing
  - Sensitive data removal
  - GeoIP enrichment
  - Elasticsearch output with separate error index

#### Docker Compose
- **`monitoring/docker-compose.monitoring.yml`** - Complete monitoring stack
  - Prometheus (9090)
  - Grafana (3001)
  - Alertmanager (9093)
  - Node Exporter (9100)
  - cAdvisor (8080)
  - MySQL Exporter (9104)
  - Elasticsearch (9200)
  - Logstash (5000)
  - Kibana (5601)

#### Grafana Provisioning
- **`monitoring/grafana/provisioning/datasources/prometheus.yaml`** - Prometheus data source config
- **`monitoring/grafana/provisioning/dashboards/dashboard-provider.yaml`** - Dashboard provisioning config

### Kubernetes Manifests

- **`k8s/monitoring.yaml`** - Prometheus, Alertmanager, and RBAC configuration
  - Prometheus ConfigMap and Deployment
  - Alert rules ConfigMap
  - Service accounts and RBAC roles
  - Persistent volumes
  - ClusterRole for Kubernetes API access

- **`k8s/grafana-alertmanager.yaml`** - Grafana and system monitoring
  - Grafana Deployment
  - Datasource ConfigMap
  - Dashboard ConfigMap
  - Alertmanager Deployment
  - Node Exporter DaemonSet
  - Persistent volumes

### Application Metrics

- **`monitoring/prometheus-metrics.js`** - Node.js Prometheus client library wrapper
  - HTTP request metrics (duration, count, size)
  - Database query metrics (duration, count, connections)
  - Cache metrics (hits, misses, size)
  - Business metrics (timelines, classes, events)
  - Error tracking
  - Middleware for automatic HTTP instrumentation

### Documentation

- **`docs/monitoring_and_alerting.md`** (Comprehensive Guide)
  - Architecture overview
  - Local setup instructions
  - Prometheus configuration details
  - Alert rules explained
  - Alertmanager routing
  - Grafana dashboard creation
  - ELK stack usage and Kibana queries
  - Error budget tracking
  - Kubernetes deployment
  - Custom application metrics
  - Troubleshooting guide

- **`docs/error_budget_policy.md`** (SLO & Error Budget)
  - Service Level Objectives (SLOs)
  - Error budget calculation with examples
  - Alert thresholds by burn rate
  - Error budget allocation (60/20/10 split)
  - Feature freeze triggers and procedures
  - Escalation policy
  - Incident severity levels
  - Recovery procedures
  - Reporting templates

- **`MONITORING_QUICKSTART.md`** (Quick Start)
  - 5-minute setup guide
  - Service access URLs
  - Common monitoring queries
  - Key metrics to track
  - Troubleshooting common issues

## Key Features Implemented

### Prometheus (Metrics Collection)
✅ 8+ scrape targets configured
✅ 16+ recording rules for pre-computation
✅ 15 production-ready alert rules
✅ 30-day data retention
✅ Health checks for all services

### Alertmanager (Alert Routing)
✅ Severity-based routing (critical → PagerDuty, warning → Slack)
✅ Alert inhibition rules (deduplicate cascading alerts)
✅ Configurable retry intervals
✅ Support for multiple notification channels

### ELK Stack (Log Aggregation)
✅ JSON log parsing
✅ Multi-source log collection (TCP, Syslog, Files)
✅ Structured log enrichment
✅ Sensitive data removal
✅ Time-series indexing in Elasticsearch
✅ Kibana visualization and search

### Grafana (Visualization)
✅ Pre-configured Prometheus data source
✅ Provisions dashboards from ConfigMaps (Kubernetes)
✅ Auto-reload on configuration changes
✅ Built-in alerting capability

### Error Budget Management
✅ 99% SLO definition (7.2 hrs/month budget)
✅ Burn rate calculations
✅ Feature freeze policy
✅ Escalation procedures
✅ Weekly/monthly reporting templates

## Alert Rules Included (15 Total)

### Error Budget (2)
- `HighErrorRate` - Error rate > 5% for 5 min
- `ErrorBudgetExhausted` - Monthly error > 1%

### Availability (2)
- `ApplicationDown` - Service unreachable
- `DatabaseDown` - Database unreachable

### Performance (4)
- `HighLatency` - P95 latency > 1s
- `HighCPUUsage` - CPU > 80% for 10 min
- `HighMemoryUsage` - Memory > 85% for 10 min
- `DiskSpaceLow` - < 10% free space

### Database (2)
- `DatabaseConnectionPoolExhausted` - 80% pool usage
- `SlowQueries` - > 1 slow query/sec

### Traffic (3)
- `AbnormalTrafficDrop` - Request rate < 50% of baseline
- `FailedHealthChecks` - Health check failures
- (Plus monitoring system alerts)

## Default Credentials

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| Grafana | http://localhost:3001 | admin | admin |
| Prometheus | http://localhost:9090 | - | - |
| Kibana | http://localhost:5601 | - | - |
| Alertmanager | http://localhost:9093 | - | - |

⚠️ **Important**: Change Grafana password immediately in production!

## Quick Start

### Local Development
```bash
# Start all services
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d

# Access dashboards
open http://localhost:9090      # Prometheus
open http://localhost:3001      # Grafana (admin/admin)
open http://localhost:5601      # Kibana
open http://localhost:9093      # Alertmanager
```

### Production (Kubernetes)
```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Deploy monitoring stack
kubectl apply -f k8s/monitoring.yaml
kubectl apply -f k8s/grafana-alertmanager.yaml

# Access services
kubectl port-forward -n monitoring svc/prometheus 9090:9090
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

## Integration with Application

To add metrics to Node.js application:

```javascript
const metrics = require('./monitoring/prometheus-metrics');
const express = require('express');
const app = express();

// Initialize metrics middleware
metrics.init(app);

// Automatically tracks:
// - HTTP request duration
// - Request/response sizes
// - Status codes
// - Route labels

// Access metrics at:
// GET /metrics
```

## Next Steps

1. **Configure Notifications**
   - Add Slack webhook to alertmanager.yml
   - Add PagerDuty integration for P1 incidents
   - Test alert routing

2. **Create Custom Dashboards**
   - Build business metric dashboards in Grafana
   - Export as JSON for version control
   - Set up alerts based on dashboards

3. **Instrument Application**
   - Add prometheus-metrics.js to application
   - Implement custom business metrics
   - Track domain-specific KPIs

4. **Set Up Log Forwarding**
   - Configure application to send logs to Logstash
   - Create Kibana dashboards for log analysis
   - Set up log retention policies

5. **Define SLOs**
   - Adjust alert thresholds based on business needs
   - Update error budget allocation
   - Establish incident response procedures

## Environment Variables Required

Create `.env` file:
```bash
# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty (optional)
PAGERDUTY_SERVICE_KEY=your-service-key

# Elasticsearch (optional)
ELASTICSEARCH_HOST=elasticsearch:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=elastic
```

## Monitoring Resources

- CPU: Prometheus ~500m, Grafana ~250m, Elasticsearch ~512m
- Memory: Prometheus ~512Mi, Grafana ~256Mi, Elasticsearch ~512Mi
- Storage: Prometheus ~10Gi, Elasticsearch ~20Gi, Grafana ~5Gi per month

Adjust based on your scale and retention policies.

## Related Documentation

- [Full Monitoring & Alerting Guide](./docs/monitoring_and_alerting.md)
- [Error Budget Policy](./docs/error_budget_policy.md)
- [CI/CD Pipeline Docs](./)
- [Kubernetes Deployment](./k8s/)
