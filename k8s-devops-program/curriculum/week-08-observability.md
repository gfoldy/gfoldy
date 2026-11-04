# Week 8: Observability

> **Status: scaffold.** The coach builds this out at the end of Week 7, based on your tier in `progress/plan.md`. Don't start it before then.

**Primary domains:** D11 · **CKA weight:** Troubleshooting: monitoring cluster components · **Budget:** 9 h by default (Foundation 10 h · Fast-track 7 h)

## Topics
- Prometheus: scraping, ServiceMonitors, PromQL basics, recording rules
- Grafana dashboards; the golden signals for the app
- Alertmanager: routing, silences, SLO burn-rate alerts
- Logs with Loki/Promtail or Fluent Bit; tracing basics (OpenTelemetry)

## Planned labs
- kube-prometheus-stack on the homelab, app metrics and a dashboard
- Write 3 alerts, trigger them on purpose
- Debug an incident using only dashboards and logs

## Capstone milestone
Dashboards + alerts. **Checkpoint 2** (CKA mini-mock, decides the exam booking)

## kubectl hl check (~30 min)
`hl alerts`: firing Prometheus alerts, with a test. See `hl/README.md`.

## Tier variants (filled in at build-out)
- **Foundation:** pre-work primer + guided lab before the core labs
- **Standard:** as above
- **Fast-track:** 60-90 min proof lab first; pass ≥ 80% → stretch lab only, 2 h banked

## Done when
_(filled in at build-out)_

## Interview reps
_(filled in at build-out)_
