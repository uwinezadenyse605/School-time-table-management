# Monitoring Stack Quick Start Guide

## 5-Minute Setup

### Step 1: Start the Monitoring Stack
```bash
# Navigate to project root
cd /path/to/School-time-table-management

# Start all services including monitoring
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml up -d

# Wait for services to be healthy (2-3 minutes)
docker-compose -f monitoring/docker-compose.monitoring.yml ps
```

### Step 2: Verify Services are Running
```bash
# Check all monitoring containers
docker ps | grep "school-timetable"

# Should see:
# - prometheus
# - grafana
# - alertmanager
# - node-exporter
# - cadvisor
# - elasticsearch
# - logstash
# - kibana
```

### Step 3: Access the Dashboards

Open in your browser:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Kibana**: http://localhost:5601
- **Alertmanager**: http://localhost:9093

## Common Tasks

### View Application Metrics

1. Go to Prometheus (http://localhost:9090)
2. Click "Metrics" or use the query box
3. Type `http_requests_total` and click "Execute"
4. View the graph of request rates

### Create a Grafana Dashboard

1. Open Grafana (http://localhost:3001)
2. Login: admin / admin
3. Click "Create" → "Dashboard"
4. Click "Add panel"
5. Select "Prometheus" as data source
6. Enter query: `rate(http_requests_total[5m])`
7. Set title: "Request Rate"
8. Click "Save"

### Check Application Errors

1. Go to Kibana (http://localhost:5601)
2. Click "Discover"
3. Select `logs-*` index
4. Filter by `level: "ERROR"`
5. View error logs in real-time

### Test an Alert

```bash
# Trigger a test alert in Alertmanager
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "critical"
    },
    "annotations": {
      "summary": "Test alert for monitoring verification",
      "description": "This is a test alert"
    }
  }]'
```

## Monitoring Key Metrics

### Application Health
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Response time (P95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Database Health
```promql
# Active connections
mysql_global_status_threads_connected

# Connection usage
mysql_global_status_threads_connected / mysql_global_variables_max_connections

# Queries per second
rate(mysql_global_status_questions[5m])
```

### System Health
```promql
# CPU usage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# Disk usage
(1 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"})) * 100
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose -f monitoring/docker-compose.monitoring.yml logs prometheus
docker-compose -f monitoring/docker-compose.monitoring.yml logs elasticsearch

# Check disk space
df -h
docker system prune

# Restart services
docker-compose -f monitoring/docker-compose.monitoring.yml restart
```

### Prometheus has no data
```bash
# Check targets
curl http://localhost:9090/api/v1/targets

# Verify application metrics endpoint
curl http://localhost:3000/metrics

# Check prometheus logs
docker logs school-timetable-prometheus
```

### Elasticsearch won't start
```bash
# Check Elasticsearch logs
docker logs school-timetable-elasticsearch

# Increase system limits
sudo sysctl -w vm.max_map_count=262144

# Restart
docker-compose -f monitoring/docker-compose.monitoring.yml restart elasticsearch
```

### No logs in Kibana
```bash
# Check if index exists
curl http://localhost:9200/_cat/indices?v | grep logs

# Send test log
curl -X POST http://localhost:5000 \
  -H "Content-Type: application/json" \
  -d '{"timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'", "message": "test log", "level": "INFO"}'

# Check Logstash
docker logs school-timetable-logstash
```

## Next Steps

1. **Configure Alerts**
   - Edit `monitoring/alertmanager.yml`
   - Add your Slack webhook or PagerDuty key
   - Restart alertmanager: `docker-compose -f monitoring/docker-compose.monitoring.yml restart alertmanager`

2. **Create Custom Dashboards**
   - Build dashboards in Grafana matching your business metrics
   - Export as JSON for version control

3. **Set up Error Budget Tracking**
   - Define SLOs in `docs/error_budget_policy.md`
   - Create alerts for budget exhaustion
   - Monitor weekly burn rate

4. **Configure Application Logging**
   - Update application to send structured logs to Logstash (port 5000)
   - Add custom metrics with Prometheus client library
   - Export metrics at `/metrics` endpoint

5. **Deploy to Production**
   - Use `k8s/monitoring.yaml` and `k8s/grafana-alertmanager.yaml`
   - Update resource limits based on your environment
   - Configure persistent volumes

## Documentation Links

- [Monitoring & Alerting Guide](../docs/monitoring_and_alerting.md)
- [Error Budget Policy](../docs/error_budget_policy.md)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/grafana/latest/)
- [Elastic Stack Docs](https://www.elastic.co/guide/index.html)

## Getting Help

For issues or questions:
1. Check logs: `docker logs <container-name>`
2. Review docs in `docs/` directory
3. Check Prometheus targets: http://localhost:9090/targets
4. Verify services: `docker-compose ps`
