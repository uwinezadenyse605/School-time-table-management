# Monitoring, Logging, and Alerting Guide

## Overview

This document covers the complete monitoring, logging, and alerting setup for the School Timetable Management system. The stack includes:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Metrics visualization
- **ELK Stack**: Log aggregation and analysis (Elasticsearch, Logstash, Kibana)
- **Alertmanager**: Alert routing and notification
- **Exporters**: Node Exporter, cAdvisor, MySQL Exporter

## Architecture

### Metrics Flow
```
Application/Services
         ↓
    Prometheus Scrape
         ↓
  Time Series Database
         ↓
    Grafana Dashboards
    Alert Rules
```

### Logging Flow
```
Application Logs
         ↓
    Logstash Pipeline
         ↓
   Elasticsearch Index
         ↓
    Kibana Visualization
```

## Local Development Setup

### Starting the Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d

# Or individual services
docker-compose -f monitoring/docker-compose.monitoring.yml up -d prometheus
docker-compose -f monitoring/docker-compose.monitoring.yml up -d grafana
docker-compose -f monitoring/docker-compose.monitoring.yml up -d elasticsearch kibana
```

### Accessing the Services

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3001 | admin / admin |
| Kibana | http://localhost:5601 | - |
| Alertmanager | http://localhost:9093 | - |
| Node Exporter | http://localhost:9100 | - |
| cAdvisor | http://localhost:8080 | - |
| MySQL Exporter | http://localhost:9104 | - |

## Prometheus Configuration

### Scrape Configs

Prometheus automatically scrapes metrics from:

1. **Prometheus** (`localhost:9090`) - Self-monitoring
2. **Application** (`localhost:3000/metrics`) - Custom application metrics
3. **Node Exporter** (`node-exporter:9100`) - System metrics (CPU, Memory, Disk)
4. **cAdvisor** (`cadvisor:8080`) - Docker container metrics
5. **MySQL** (`mysqld-exporter:9104`) - Database metrics

### Recording Rules

Recording rules pre-compute common metric queries for faster dashboard loading:

- Request rates and error rates
- Latency percentiles (P50, P95, P99)
- Database connection ratios
- System resource usage percentages

View all rules in `monitoring/recording_rules.yml`

## Alert Rules

All alert rules are defined in `monitoring/alert_rules.yml` and grouped by category:

### Error Budget Alerts

**HighErrorRate**: Triggered when error rate exceeds 5% for 5 minutes
```
Threshold: 5% of requests return 5xx status
Severity: Critical
Action: Investigate application errors immediately
```

**ErrorBudgetExhausted**: Triggered when monthly error rate exceeds 1%
```
Threshold: 1% monthly error budget
Severity: Warning
Action: Track error budget and plan improvements
```

### Availability Alerts

**ApplicationDown**: Service is unreachable
```
Threshold: Service down for 1 minute
Severity: Critical
Action: Check application logs and health status
```

**DatabaseDown**: Database is unreachable
```
Threshold: MySQL unreachable for 1 minute
Severity: Critical
Action: Check database logs and connectivity
```

### Performance Alerts

**HighLatency**: API response times exceed threshold
```
Threshold: P95 latency > 1 second for 5 minutes
Severity: Warning
Action: Profile application and database queries
```

**HighCPUUsage**: CPU utilization exceeds threshold
```
Threshold: CPU usage > 80% for 10 minutes
Severity: Warning
Action: Check for resource-intensive processes
```

**HighMemoryUsage**: Memory utilization exceeds threshold
```
Threshold: Memory usage > 85% for 10 minutes
Severity: Warning
Action: Check for memory leaks
```

**DiskSpaceLow**: Available disk space below threshold
```
Threshold: < 10% free space for 5 minutes
Severity: Warning
Action: Clean up old logs and temporary files
```

### Database Alerts

**DatabaseConnectionPoolExhausted**: Connection limit approaching
```
Threshold: 80% of max connections for 5 minutes
Severity: Warning
Action: Investigate connection leaks or increase pool size
```

**SlowQueries**: Slow query rate exceeds threshold
```
Threshold: > 1 slow query per second for 5 minutes
Severity: Warning
Action: Analyze and optimize slow queries
```

## Alertmanager Configuration

### Alert Routing

Alerts are routed based on severity:

| Severity | Channel | Response Time | Repeat Interval |
|----------|---------|----------------|-----------------|
| critical | PagerDuty | 1 second | 1 hour |
| warning | Slack | 5 seconds | 4 hours |
| info | Slack | 30 seconds | 24 hours |

### Environment Variables for Alerts

Create a `.env` file with:

```bash
# Slack Integration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# PagerDuty Integration (for critical alerts)
PAGERDUTY_SERVICE_KEY=your-pagerduty-service-key
```

Load before starting alertmanager:
```bash
source .env
docker-compose -f monitoring/docker-compose.monitoring.yml up -d alertmanager
```

## Grafana Dashboards

### Creating Custom Dashboards

1. Open Grafana at http://localhost:3001
2. Login with default credentials (admin / admin)
3. Add Prometheus as a data source (auto-configured)
4. Create new dashboard and add panels

### Key Metrics to Monitor

#### Application Health
- Request rate (requests/sec)
- Error rate (% of requests with 5xx status)
- Response time (P50, P95, P99 latency)
- Active connections

#### System Health
- CPU usage (%)
- Memory usage (%)
- Disk I/O (bytes/sec)
- Network throughput

#### Database Health
- Connection count
- Query rate
- Slow query count
- Lock time
- Table scan rate

### Example Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Database connections
mysql_global_status_threads_connected / mysql_global_variables_max_connections

# CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

## ELK Stack (Logging)

### Elasticsearch

Elasticsearch stores logs in time-series indices:
- `logs-YYYY.MM.dd` - Application logs
- `errors-YYYY.MM.dd` - Error logs only

### Logstash

Logstash processes logs through a pipeline:

1. **Input**: Collects logs from multiple sources
   - TCP (port 5000)
   - Syslog (port 5140)
   - File monitoring

2. **Filter**: Parses and enriches logs
   - JSON parsing
   - Timestamp extraction
   - Error tagging
   - Sensitive data removal
   - GeoIP lookup

3. **Output**: Sends to Elasticsearch
   - Main index: `logs-*`
   - Error index: `errors-*`

### Kibana

Kibana provides log analysis and visualization:

1. **Discover**: Search and explore individual logs
   - Filter by timestamp, level, service
   - Search by keywords

2. **Visualize**: Create custom visualizations
   - Error rate over time
   - Logs by level
   - Top error messages

3. **Dashboard**: Combine visualizations
   - Application dashboard
   - Error dashboard
   - Performance dashboard

### Example Kibana Queries

```json
// Find all errors
{
  "query": {
    "match": {
      "level": "ERROR"
    }
  }
}

// Find slow database queries (> 5 seconds)
{
  "query": {
    "range": {
      "query_time": {
        "gte": 5
      }
    }
  }
}

// Find errors from specific service
{
  "query": {
    "match": {
      "service": "school-timetable"
    }
  }
}
```

## Error Budget Management

### Error Budget Definition

**Monthly Error Budget**: 99% availability = 1% error budget = ~7.2 hours downtime/month

### Tracking Error Budget

1. Monitor actual error rate in Grafana
2. Calculate remaining budget: `(Allowable Errors - Actual Errors) / Allowable Errors`
3. Alert when budget drops below 50%
4. Implement feature freeze when budget exhausted

### Example Calculation

```
Total requests in month: 100,000,000
Allowable errors (1%): 1,000,000
Actual errors: 500,000

Error budget spent: 50%
Remaining: 500,000 errors
Days remaining to use budget: 15 days
```

## Kubernetes Deployment

### Deploy Monitoring Stack

```bash
# Create monitoring namespace
kubectl create namespace monitoring

# Deploy Prometheus, Grafana, Alertmanager
kubectl apply -f k8s/monitoring.yaml
kubectl apply -f k8s/grafana-alertmanager.yaml

# Verify deployments
kubectl get pods -n monitoring
kubectl get svc -n monitoring
```

### Accessing Services in Kubernetes

```bash
# Port forward Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Port forward Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000

# Port forward Alertmanager
kubectl port-forward -n monitoring svc/alertmanager 9093:9093
```

### Auto-scaling Based on Metrics

Enable Horizontal Pod Autoscaler using metrics:

```bash
kubectl apply -f k8s/hpa.yaml
```

The HPA scales application pods based on:
- CPU usage > 80%
- Custom metrics (request rate, error rate)

## Custom Application Metrics

### Instrumentation

Add Prometheus instrumentation to your Node.js app:

```javascript
const prometheus = require('prom-client');

// Define custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Middleware to record metrics
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });
  });
  next();
});

// Expose metrics endpoint
const register = prometheus.register;
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### Useful Metrics to Track

```javascript
// Request counter
const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Database query duration
const dbQueryDuration = new prometheus.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration'
});

// Cache hit rate
const cacheHits = new prometheus.Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits'
});

// Business metrics
const timelinesCreated = new prometheus.Counter({
  name: 'timelines_created_total',
  help: 'Total timelines created'
});
```

## Troubleshooting

### Prometheus not scraping metrics

1. Check if targets are healthy: http://localhost:9090/targets
2. Verify application is exposing `/metrics` endpoint
3. Check logs: `docker logs school-timetable-prometheus`
4. Ensure network connectivity between containers

### Alerts not firing

1. Check alert rules syntax: http://localhost:9090/alerts
2. Verify metric data exists in Prometheus
3. Check Alertmanager status: http://localhost:9093
4. Test with `curl -X POST http://localhost:9093/api/v1/alerts`

### Logs not appearing in Kibana

1. Check Logstash is running: `docker logs school-timetable-logstash`
2. Verify Elasticsearch has indices: `curl localhost:9200/_aliases`
3. Check if logs are being sent to Logstash (port 5000)
4. Review Logstash configuration: `monitoring/logstash/pipeline/logstash.conf`

### High disk usage

1. Check Elasticsearch disk usage: `curl localhost:9200/_cat/indices?v`
2. Delete old indices: `curl -X DELETE localhost:9200/logs-2024.01.*`
3. Adjust Prometheus retention: Update `--storage.tsdb.retention.time` in prometheus config
4. Enable index lifecycle management (ILM) in Elasticsearch

## Best Practices

1. **Set Meaningful Alerts**: Only alert on issues requiring action
2. **Keep Historical Data**: 30 days for Prometheus, 90 days for logs
3. **Document Runbooks**: Link alert descriptions to runbook URLs
4. **Test Alerts**: Manually trigger alerts to verify notification channels
5. **Review Regularly**: Monthly review of alert effectiveness
6. **Avoid Alert Fatigue**: Tune thresholds to reduce false positives
7. **Correlation**: Use multiple signals to detect issues
8. **SLO-based Alerts**: Align alerts with Service Level Objectives

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Elastic Stack Documentation](https://www.elastic.co/guide/index.html)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/overview/)
