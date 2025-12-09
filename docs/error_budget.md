# Error Budget Policy

Service: School Timetable API

- Target availability: 99.9% monthly ("three nines").
- Monthly error budget: 0.1% downtime (≈43.2 minutes per 30-day month).

When incidents consume >50% of the monthly error budget, triggers:

1. Immediate incident review and root cause analysis.
2. Freeze non-critical releases until budget is restored.
3. Add automated monitoring and possible rollbacks for the offending service.

Metrics: Use uptime checks (synthetic HTTP checks), error rate per minute, latency percentiles (p95/p99).
