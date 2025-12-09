# Phase 8: Scaling with HPA (Horizontal Pod Autoscaler)

## Overview

The **Horizontal Pod Autoscaler (HPA)** automatically scales the number of application pods based on observed metrics like CPU usage and memory consumption. This ensures your application can handle variable load efficiently.

## HPA Configuration

The HPA is configured in `k8s/hpa.yaml` with the following settings:

- **Target**: `school-timetable` Deployment
- **Min Replicas**: 2 (always keep at least 2 pods running)
- **Max Replicas**: 10 (never exceed 10 pods)
- **Metrics**:
  - CPU: Scale up when > 70% utilization
  - Memory: Scale up when > 80% utilization

### Scaling Behavior

**Scale Up** (Aggressive):
- Stabilization window: 0 seconds (respond immediately)
- Policy: Double the number of pods (100% increase) or add 2 pods every 30-60 seconds
- Selects the policy that scales up fastest (Max)

**Scale Down** (Conservative):
- Stabilization window: 300 seconds (wait 5 minutes before scaling down)
- Policy: Remove 50% of pods or 1 pod every 60 seconds
- Selects the policy that scales down slowest (Min) to prevent thrashing

### Pod Disruption Budget (PDB)

The PDB ensures at least 1 pod remains available during scaling events, preventing service disruption.

## Deployment with Resource Requests/Limits

The deployment must specify resource requests and limits for HPA to work:

```yaml
resources:
  requests:      # Minimum guaranteed resources
    memory: "128Mi"
    cpu: "100m"
  limits:        # Maximum allowed resources
    memory: "512Mi"
    cpu: "500m"
```

- **Requests**: Reserved resources per pod
- **Limits**: Maximum resources a pod can consume

HPA calculates utilization as: `(actual usage) / (requested amount) * 100%`

## Prerequisites

### 1. Metrics Server (Required)

HPA needs the Metrics Server to collect resource metrics from pods:

```bash
# Install Metrics Server (if not already installed)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify installation
kubectl get deployment metrics-server -n kube-system
```

### 2. MySQL Database

Ensure MySQL is running and accessible:

```bash
# Using local MySQL
mysql -u root -pexample -e "CREATE DATABASE IF NOT EXISTS school_timetable;"

# Or using Kubernetes MySQL
kubectl apply -f k8s/mysql.yaml
```

## Deployment Steps

### Step 1: Deploy the Application with Resource Limits

```bash
# Apply the deployment with resource requests/limits
kubectl apply -f k8s/deployment-with-resources.yaml

# Verify deployment
kubectl get deployments
kubectl get pods -l app=school-timetable

# Check resource requests/limits
kubectl describe pod <pod-name>
```

### Step 2: Deploy the HPA

```bash
# Apply the HPA configuration
kubectl apply -f k8s/hpa.yaml

# Verify HPA installation
kubectl get hpa school-timetable-hpa
kubectl describe hpa school-timetable-hpa

# Watch HPA status in real-time
kubectl get hpa school-timetable-hpa --watch
```

### Step 3: Verify Metrics Collection

```bash
# Wait for metrics to be available (can take 1-2 minutes)
kubectl top pod -l app=school-timetable
kubectl top nodes

# View HPA metrics
kubectl get hpa school-timetable-hpa
# Look at the TARGETS column:
# NAME                          REFERENCE                       TARGETS                    MINPODS   MAXPODS   REPLICAS   AGE
# school-timetable-hpa          Deployment/school-timetable    cpu: 5%/70%, memory: 10%/80% 2         10        2          2m
```

## Live Scaling Demo

### Demo 1: Generate Load to Trigger Scale-Up

```bash
# Terminal 1: Watch HPA and pods
kubectl get hpa school-timetable-hpa --watch

# Terminal 2: Watch pods scaling
kubectl get pods -l app=school-timetable --watch

# Terminal 3: Generate load using k6
# Install k6: https://k6.io/docs/getting-started/installation/
k6 run monitoring/load-test.js --vus 50 --duration 5m

# Or use Apache Bench (simpler)
ab -n 10000 -c 50 http://<service-ip>/api/timetables
```

### Expected Behavior

1. **Load starts**: Requests per second increases
2. **Metrics collected** (30-60 seconds): Metrics Server reports CPU/memory usage
3. **Scale-up triggered**: HPA detects > 70% CPU or > 80% memory
4. **Pods increase**: New pods are scheduled; you'll see DESIRED replicas increase
5. **Load distributed**: New pods help handle the increased traffic
6. **Load decreases**: After k6 finishes, traffic drops
7. **Scale-down begins** (after 5-minute stabilization window): HPA gradually reduces replicas
8. **Back to baseline**: Scales down to 2 replicas (minimum)

### Demo 2: Observe Scaling Events

```bash
# View recent events
kubectl get events -l involvedObject.name=school-timetable-hpa --sort-by='.lastTimestamp'

# Check HPA detailed status
kubectl describe hpa school-timetable-hpa

# Example output:
# Metrics:
#   Resource cpu on pods  : 75%/70%
#   Resource memory on pods: 82%/80%
# Min replicas: 2
# Max replicas: 10
# Desired replicas: 6
# Current replicas: 4
# Events:
#   HorizontalPodAutoscaler combined from 2 aggregated sources of replica set "school-timetable-xyzabc" (6/6 updated replicas)
```

## Monitoring HPA Scaling

### Useful kubectl Commands

```bash
# Get HPA status
kubectl get hpa

# Get detailed HPA info
kubectl get hpa school-timetable-hpa -o yaml

# Watch HPA in real-time
kubectl get hpa school-timetable-hpa -w

# View HPA events
kubectl describe hpa school-timetable-hpa

# Check pod resource usage
kubectl top pods -l app=school-timetable

# View pod logs (useful for debugging)
kubectl logs -f deployment/school-timetable --all-containers=true
```

### Prometheus Metrics for HPA

If using Prometheus and Grafana (see Phase 7: Monitoring):

```promql
# Current number of replicas
kube_deployment_status_replicas{deployment="school-timetable"}

# Desired number of replicas
kube_deployment_spec_replicas{deployment="school-timetable"}

# CPU usage percentage
sum(rate(container_cpu_usage_seconds_total{pod=~"school-timetable-.*"}[1m])) / 
sum(kube_pod_container_resource_requests{pod=~"school-timetable-.*", resource="cpu"}) * 100

# Memory usage percentage
sum(container_memory_usage_bytes{pod=~"school-timetable-.*"}) / 
sum(kube_pod_container_resource_requests{pod=~"school-timetable-.*", resource="memory"}) * 100
```

## Troubleshooting

### HPA shows "unknown" for metrics

**Problem**: `TARGETS` column shows `<unknown>` or `<unset>`

**Solution**:
```bash
# Check if Metrics Server is running
kubectl get deployment metrics-server -n kube-system

# Check metrics-server logs
kubectl logs -n kube-system deployment/metrics-server

# Verify pod has resource requests
kubectl get pod <pod-name> -o yaml | grep -A5 resources

# Wait 1-2 minutes for metrics to stabilize
kubectl top pod -l app=school-timetable
```

### HPA not scaling

**Problem**: HPA exists but doesn't scale

**Solution**:
```bash
# Check HPA status
kubectl describe hpa school-timetable-hpa

# Verify metrics are being collected
kubectl get hpa school-timetable-hpa --watch

# Check for recent events
kubectl get events --sort-by='.lastTimestamp'

# Ensure deployment has sufficient resources to scale
kubectl describe deployment school-timetable

# Check cluster resources
kubectl top nodes
kubectl describe nodes
```

### Too many pods being created

**Problem**: HPA scales up to max replicas too quickly

**Solution**:
```yaml
# Adjust scale-up behavior in hpa.yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 60  # Wait 60 seconds before next scale-up
    policies:
      - type: Percent
        value: 50  # Scale up by 50% instead of 100%
        periodSeconds: 60
```

## Advanced: Custom Metrics

For scaling based on custom metrics (e.g., request latency, queue depth):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: school-timetable-hpa-custom
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: school-timetable
  minReplicas: 2
  maxReplicas: 10
  metrics:
    # Custom metric example
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"  # Scale if avg > 1000 requests/pod/sec
```

## Best Practices

1. **Set appropriate resource requests/limits**: HPA scales based on these values
2. **Monitor scaling decisions**: Use Prometheus + Grafana to track HPA behavior
3. **Test scaling before production**: Run load tests to ensure HPA works as expected
4. **Use PodDisruptionBudget**: Ensure service availability during scaling events
5. **Configure pod anti-affinity**: Spread pods across nodes for resilience
6. **Implement proper health checks**: HPA relies on pod readiness probes
7. **Alert on scaling events**: Monitor HPA scaling frequency to detect issues

## Next Steps

- Integrate HPA metrics with Prometheus and Grafana (see Phase 7)
- Set up alerts when HPA reaches max replicas (scaling limits)
- Implement Vertical Pod Autoscaler (VPA) for right-sizing resources
- Create observability dashboards showing scaling metrics
- Document runbooks for common scaling scenarios
