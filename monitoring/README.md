# Monitoring Stack Directory

This directory contains all monitoring, logging, and alerting configurations for the School Timetable Management system.

## Directory Structure

```
monitoring/
├── prometheus.yml                      # Prometheus configuration
├── alert_rules.yml                     # Alert rule definitions
├── recording_rules.yml                 # Recording rules for pre-computation
├── alertmanager.yml                    # Alert routing configuration
├── docker-compose.monitoring.yml       # Docker Compose stack
├── prometheus-metrics.js               # Node.js metrics instrumentation
├── logstash/
│   └── pipeline/
│       └── logstash.conf              # Log processing pipeline
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yaml        # Prometheus data source config
│   │   └── dashboards/
│   │       └── dashboard-provider.yaml # Dashboard provisioning config
│   └── dashboards/
│       └── system-overview.json       # Example dashboard
└── README.md                           # This file
```

## Quick Start

### Local Development

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services
docker-compose -f docker-compose.monitoring.yml ps

# Access services
open http://localhost:9090      # Prometheus
open http://localhost:3001      # Grafana (admin/admin)
open http://localhost:5601      # Kibana
open http://localhost:9093      # Alertmanager
```

### Kubernetes Deployment

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Deploy monitoring stack
kubectl apply -f ../k8s/monitoring.yaml
kubectl apply -f ../k8s/grafana-alertmanager.yaml

# Port forward for access
kubectl port-forward -n monitoring svc/prometheus 9090:9090
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

## Configuration Files

### prometheus.yml
Main Prometheus configuration file with:
- Global settings (scrape interval, evaluation interval)
- Alert manager configuration
- Scrape configs for:
  - Application metrics
  - System metrics (Node Exporter)
  - Container metrics (cAdvisor)
  - Database metrics (MySQL Exporter)
- Recording rules and alert rules paths

**Key settings:**
- `scrape_interval: 15s` - How often to scrape targets
- `evaluation_interval: 15s` - How often to evaluate rules
- `--storage.tsdb.retention.time=30d` - Data retention period

### alert_rules.yml
Production alert rules (15 total) organized by category:

**Error Budget Alerts (2)**
- `HighErrorRate` - Triggered when error rate exceeds 5%
- `ErrorBudgetExhausted` - Triggered when monthly budget exceeded

**Availability Alerts (2)**
- `ApplicationDown` - Service unreachable
- `DatabaseDown` - Database unreachable

**Performance Alerts (4)**
- `HighLatency` - P95 response time exceeds 1 second
- `HighCPUUsage` - CPU usage exceeds 80%
- `HighMemoryUsage` - Memory usage exceeds 85%
- `DiskSpaceLow` - Less than 10% disk space available

**Database Alerts (2)**
- `DatabaseConnectionPoolExhausted` - 80% of max connections
- `SlowQueries` - More than 1 slow query per second

**Traffic Alerts (2)**
- `AbnormalTrafficDrop` - Request rate drops to 50% of baseline
- `FailedHealthChecks` - Health check failures

**Additional (3)**
- Monitoring system-specific alerts

### recording_rules.yml
Pre-computed metrics for faster dashboard performance:
- Request rate aggregations (1m, 5m)
- Error rate calculations
- Latency percentiles (P50, P95, P99)
- Database metrics aggregations
- System resource percentages
- Availability ratios

### alertmanager.yml
Alert routing and notification configuration:
- Route alerts based on severity
- Slack integration for warnings/info
- PagerDuty integration for critical alerts
- Alert deduplication and grouping
- Alert inhibition rules

**Requires environment variables:**
```bash
SLACK_WEBHOOK_URL=<your-slack-webhook>
PAGERDUTY_SERVICE_KEY=<your-pagerduty-key>
```

### docker-compose.monitoring.yml
Complete monitoring stack with 9 services:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| prometheus | prom/prometheus | 9090 | Metrics collection |
| grafana | grafana/grafana | 3001 | Visualization |
| alertmanager | prom/alertmanager | 9093 | Alert routing |
| node-exporter | prom/node-exporter | 9100 | System metrics |
| cadvisor | gcr.io/cadvisor/cadvisor | 8080 | Docker metrics |
| mysqld-exporter | prom/mysqld-exporter | 9104 | Database metrics |
| elasticsearch | docker.elastic.co/elasticsearch | 9200 | Log storage |
| logstash | docker.elastic.co/logstash | 5000 | Log processing |
| kibana | docker.elastic.co/kibana | 5601 | Log visualization |

All services include:
- Health checks
- Persistent volumes
- Resource limits
- Automatic restart policies
- Container networking

### logstash/pipeline/logstash.conf
Log processing pipeline with:
- Multi-source input (TCP, Syslog, Files)
- JSON parsing and field extraction
- Timestamp normalization
- Error tagging
- Sensitive data removal
- GeoIP enrichment
- Elasticsearch output with separate error index

### prometheus-metrics.js
Node.js instrumentation library providing:
- HTTP request metrics (middleware)
- Database operation timing
- Cache hit/miss tracking
- Business metric recording
- Error tracking
- `/metrics` endpoint exposure

## Dashboard Files

### grafana/dashboards/system-overview.json
Example Grafana dashboard with panels for:
- Request rate
- Error rate
- P95 latency
- Database connections
- CPU usage
- Memory usage
- Request distribution
- Slow queries
- Application status

## Default Credentials

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| Prometheus | http://localhost:9090 | - | - |
| Grafana | http://localhost:3001 | admin | admin |
| Kibana | http://localhost:5601 | - | - |
| Alertmanager | http://localhost:9093 | - | - |

⚠️ Change Grafana password immediately in production!

## Environment Variables

Create `.env` file in project root:

```bash
# Required for alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Optional for PagerDuty integration
PAGERDUTY_SERVICE_KEY=your-pagerduty-service-key

# Optional for Elasticsearch auth
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=changeme
```

Load environment variables:
```bash
source .env
docker-compose -f docker-compose.monitoring.yml up -d
```

## Common Commands

### Start services
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### Stop services
```bash
docker-compose -f docker-compose.monitoring.yml down
```

### View logs
```bash
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
docker-compose -f docker-compose.monitoring.yml logs -f logstash
```

### Health check
```bash
docker-compose -f docker-compose.monitoring.yml ps
```

### Clean up volumes (careful!)
```bash
docker-compose -f docker-compose.monitoring.yml down -v
```

## Useful Prometheus Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active connections
mysql_global_status_threads_connected

# CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage
(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100

# Application uptime
up{job="school-timetable"}
```

## Useful Kibana Queries

```json
// Find all errors
{ "query": { "match": { "level": "ERROR" } } }

// Errors from last 24 hours
{ "query": { "range": { "@timestamp": { "gte": "now-24h" } } } }

// Slow database queries
{ "query": { "range": { "query_time": { "gte": 5 } } } }

// 500 errors
{ "query": { "match": { "status_code": 500 } } }

// Specific service
{ "query": { "match": { "service": "school-timetable" } } }
```

## Troubleshooting

### Prometheus not scraping
- Check targets: http://localhost:9090/targets
- Verify application has `/metrics` endpoint
- Check network connectivity between containers
- Review logs: `docker logs school-timetable-prometheus`

### Grafana won't connect to Prometheus
- Verify Prometheus is running: `docker ps | grep prometheus`
- Check data source configuration in Grafana UI
- Ensure Prometheus hostname is correct (use service name: `prometheus`)

### Elasticsearch won't start
```bash
# Increase system limits
sudo sysctl -w vm.max_map_count=262144

# Check logs
docker logs school-timetable-elasticsearch
```

### No logs in Kibana
- Verify Elasticsearch indices: `curl http://localhost:9200/_cat/indices?v`
- Check Logstash is running: `docker logs school-timetable-logstash`
- Send test log: `curl -X POST http://localhost:5000 -H "Content-Type: application/json" -d '{"message":"test"}'`

## Resource Requirements

| Component | CPU | Memory | Storage |
|-----------|-----|--------|---------|
| Prometheus | 500m | 512Mi | 10Gi |
| Grafana | 250m | 256Mi | 5Gi |
| Alertmanager | 100m | 128Mi | 2Gi |
| Elasticsearch | 500m | 512Mi | 20Gi |
| Logstash | 200m | 256Mi | 2Gi |
| Node Exporter | 100m | 50Mi | - |
| cAdvisor | 100m | 100Mi | - |
| MySQL Exporter | 100m | 50Mi | - |

Adjust based on your environment and data retention policies.

## Documentation

For detailed documentation, see:
- [Complete Monitoring Guide](../docs/monitoring_and_alerting.md)
- [Error Budget Policy](../docs/error_budget_policy.md)
- [Quick Start Guide](../MONITORING_QUICKSTART.md)
- [Phase 7 Implementation](../PHASE_7_MONITORING_SETUP.md)

## Support

For issues:
1. Review logs: `docker logs <container-name>`
2. Check Prometheus targets: http://localhost:9090/targets
3. Verify service connectivity
4. Review documentation files
5. Check Docker resource limits

## Next Steps

1. Configure Slack/PagerDuty integration
2. Create custom Grafana dashboards
3. Add application metrics instrumentation
4. Set up log forwarding from application
5. Establish SLOs and error budget tracking
6. Train team on monitoring tools
