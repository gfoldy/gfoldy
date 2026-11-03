# Capstone

One portfolio project, built a little each week, so by Week 12 you have a public repo you can walk an interviewer through in 10 minutes.

**The app:** `diag-app` from the Week 1 diagnostic grows into a small two-service system (API + worker, with a database or queue). It's deliberately simple: the point is the **platform around it**, not the app.

The tier is set by the diagnostic (`progress/diagnostic/report.md`, section 6). You can move up a tier at the Week 8 checkpoint, but never down. If time gets tight, cut stretch goals instead.

## Tiers

| | Tier 1: Solid foundation | Tier 2: Production app | Tier 3: Platform |
|---|---|---|---|
| Runs on | Homelab | Homelab + EKS (one deploy) | EKS, built by Terraform (+ homelab for dev) |
| Packaging | Helm chart | Helm or Kustomize, dev/prod overlays | Helm + Kustomize, multi-env |
| Delivery | GitHub Actions build + push | + Argo CD on the homelab | Argo CD app-of-apps, image promotion between envs |
| IaC | n/a | Terraform VPC + EKS (destroyed after demo) | Terraform modules, remote state, CI plan on PR |
| Observability | metrics-server + Prometheus/Grafana dashboard | + alerts, app metrics | + logs (Loki) and an SLO with a burn-rate alert |
| Security | non-root, resource limits, NetworkPolicy | + PSS restricted, image scanning in CI | + Kyverno/Gatekeeper policies, Pod Identity, secrets via External Secrets |
| Stretch | EKS deploy | traces | cost report, chaos test |

## Weekly milestones (filled in by the coach in `progress/plan.md`)

| Week | Milestone |
|---|---|
| 2 | Repo created, app containerized (from D-1), Deployment + Service on the homelab |
| 3 | Config, storage, Ingress |
| 4 | RBAC for CI, runbook started |
| 5 | Helm chart and/or Kustomize overlays |
| 6 | Terraform (tier 2-3) |
| 7 | CI pipeline + GitOps |
| 8 | Dashboards + alerts |
| 9 | Hardening |
| 10-11 | Light touch only (CKA focus) |
| 12 | README, architecture diagram, demo GIF/video, "what I'd do next" section |

## Done when (all tiers)
- [ ] Anyone can reproduce it from the README
- [ ] Architecture diagram
- [ ] `docs/decisions.md` with 5+ short "we chose X over Y because..." entries (these turn into interview answers)
- [ ] Demo recording ≤ 3 min
- [ ] Linked from your GitHub profile README and your resume
