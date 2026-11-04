# Program Outline

**12 weeks · 8-10 h/week · ~110 hours total**

**Goal:** go from "DevOps + AWS experience" to **CKA-certified, with a public portfolio and a tool you use every day**, ready to apply for entry-level DevOps, Platform, and Cloud roles.

---

## What you finish with

| Deliverable | Why it matters without a degree |
|---|---|
| **CKA certification** | A hands-on, performance-based credential that hiring managers recognize |
| **Capstone repo** | A platform you built and can demo in 10 minutes: app, Helm, CI/CD, GitOps, monitoring, security, and EKS at tiers 2-3 |
| **`kubectl hl`** | A daily-use cluster tool you wrote and tested, and something you can talk about at length in interviews |
| **Interview bank** | 30+ questions answered out loud and critiqued, one set per week |
| **Resume, LinkedIn, applications** | Rewritten around outcomes, with applications going out from Week 9 |

---

## How the program works

- **Claude is your coach** (`CLAUDE.md`). It plans each session, grades your work, gives hints instead of answers, logs your progress, and holds you to the time budget.
- **Week 1 measures you; it doesn't teach.** You're scored across 14 skill areas, and those scores reshape weeks 2-12.
- **Each content week runs in one of three tiers:**

  | Tier | Hours | What it means |
  |---|---|---|
  | **Foundation** | 10 h | Extra groundwork before the core labs |
  | **Standard** | 9 h | Runs as written |
  | **Fast-track** | 7 h | Pass a short proof lab and skip ahead. The 2 saved hours go to your weak spots |

- **Weeks are built just in time.** At each weekly review, the coach writes the next week's full plan based on where you actually are.
- **Evidence over effort.** Something only counts as done when there's a grader result, a commit, or an explanation in your own words.

---

## Phase 1: Baseline (Week 1)

### Week 1: Diagnostic
Seven sessions that measure where you really are. No studying, no AI.
- **Setup:** check your toolchain, set up exam-style shell aliases, create a disposable 3-node `kind` cluster, and rate yourself 0-4 in each area *before* seeing any tasks.
- **Part A:** 31 closed-book questions spanning Linux, containers, Kubernetes, AWS, CI/CD, observability, and cluster admin.
- **Part B:** 15 timed build tasks (Deployments, Services, config, storage, scheduling, RBAC, NetworkPolicy, Helm, Kustomize, a Dockerfile, metrics), plus an etcd backup and a node drain. Auto-graded.
- **Part C:** 8 broken "on-call tickets," including a dead node. Auto-graded.
- **Part D:** a Terraform module and a GitHub Actions pipeline, written from scratch.
- **Speed drill and career audit:** 10 kubectl tasks against the clock, plus a scored review of your resume, GitHub, LinkedIn, target roles, and pitch.
- **Scoring:** produces your report: tier for each week, extra work it triggers, when to take the CKA, and which capstone tier you build.

**You walk away with:** an honest skills map and a personal plan for weeks 2-12.

---

## Phase 2: Core Kubernetes (Weeks 2-4)
*The CKA's core material comes first, so it gets 10 weeks of spaced practice before the exam.*

### Week 2: Workloads & Configuration
Deployments, rollouts and rollbacks, StatefulSets, DaemonSets, Jobs and CronJobs, ConfigMaps and Secrets, requests and limits, probes, and init and sidecar containers. You rebuild the diagnostic tasks from memory and run your app on the homelab properly.
- **Capstone:** create the repo; containerize the app; Deployment and Service on the homelab.
- **`hl` check:** flag pods with no resource requests/limits; add a JSON output mode.

### Week 3: Networking, Storage & Scheduling
How Services and DNS actually work, Ingress and the Gateway API, NetworkPolicy (default-deny and then allowing only what's needed), persistent volumes and StorageClasses, and scheduling rules (affinity, taints, topology spread).
- **Capstone:** config, persistent storage, external access through Ingress/Gateway.
- **`hl` check:** `hl netpol`, which finds namespaces with no default-deny policy.

### Week 4: Troubleshooting & RBAC
A repeatable debugging method, node failures (kubelet, containerd, certificates), a broken control plane, users and ServiceAccounts, least-privilege RBAC, and creating a user with a kubeconfig. Ten new graded break/fix scenarios.
- **Capstone:** a scoped RBAC identity for CI; start an ops runbook.
- **`hl` check:** `hl rbac`, which flags anything bound to cluster-admin and wildcard permissions.
- **🔶 Checkpoint 1:** a 60-minute mini-diagnostic. It can change your tiers for weeks 5-9 and decides whether to buy the CKA voucher.

---

## Phase 3: The DevOps Toolchain (Weeks 5-9)
*What job posts ask for. Each week adds a layer to your capstone.*

### Week 5: Helm & Kustomize
Write your own Helm chart (values, templates, hooks, upgrade and rollback), install third-party charts responsibly, and build Kustomize overlays for dev and prod.
- **Capstone:** a Helm chart and/or Kustomize overlays.
- **`hl` check:** report failed or stuck Helm releases.

### Week 6: Terraform & EKS
Terraform beyond the basics (modules, remote state with locking, imports), AWS networking for EKS, node groups, add-ons, and giving pods AWS access with Pod Identity or IRSA. You build, deploy to, and **destroy** an EKS cluster the same day to keep costs low.
- **Capstone:** Terraform for the VPC and EKS (tiers 2-3).
- **`hl` check:** run the health report across homelab and EKS in one go.
- **Career track starts** (1 h/week), unless the diagnostic started it in Week 2.

### Week 7: CI/CD & GitOps
GitHub Actions properly: reusable workflows, OIDC to AWS with no stored keys, image build, scan, and push. Then Argo CD: Applications, sync policies, app-of-apps, and promoting images between environments.
- **Capstone:** the full pipeline from commit to cluster, with Argo CD deploying.
- **`hl` check:** flag Argo CD apps that are OutOfSync or Degraded.

### Week 8: Observability
Prometheus and PromQL, Grafana dashboards built on the golden signals, Alertmanager and SLO burn-rate alerts, logs with Loki, and an introduction to tracing. You break things on purpose and debug them using only dashboards and logs.
- **Capstone:** dashboards and working alerts.
- **`hl` check:** `hl alerts`, which shows firing Prometheus alerts in your terminal.
- **🔶 Checkpoint 2:** a 90-minute CKA-style mini-mock. This decides whether you book the exam for Week 12.

### Week 9: Security
Pod Security Standards, Kyverno policies, supply chain (Trivy scanning, cosign signing, SBOMs), External Secrets with AWS Secrets Manager, and a CIS benchmark run.
- **Capstone:** harden everything to the "restricted" standard; add a scan gate in CI.
- **`hl` check:** `hl audit`, which flags privileged pods, pods running as root, and hostPath mounts.
- **Applications start.** The capstone is demo-able and the CKA is booked.

---

## Phase 4: Certify & Launch (Weeks 10-12)
*No new topics. Speed, exam technique, and shipping.*

### Week 10: CKA Prep I
Build a real kubeadm cluster on VMs and upgrade it by one version. Practice an etcd backup and full restore. Learn the exam environment and a time strategy. Drills target your weakest areas, and the hours banked in fast-track weeks land here.
- **killer.sh simulator, session 1** at the end of the week.

### Week 11: CKA Prep II
Fix what killer.sh exposed. Two full timed mocks. Target: every common task done in under 4 minutes.
- **killer.sh simulator, session 2.**

### Week 12: Exam & Polish
Light review, then no new material in the 48 hours before the exam. **Take the CKA.** Finish the capstone (README, architecture diagram, ≤ 3-minute demo, decisions log), package `kubectl hl`, and push applications.

---

## Running alongside every week

| Track | Time | What it is |
|---|---|---|
| **Capstone** | 1-1.5 h/week from Week 2 | One portfolio project, a layer per week. Its size (Tier 1/2/3) is set by your diagnostic, and you can move up at Checkpoint 2 |
| **`kubectl hl`** | Daily use + ~30 min/week to build | Your homelab tool. Use it every morning; add one check per week |
| **Drills** | ~1 h/week (daily 15 min if speed is weak) | Timed kubectl reps, YAML from memory, break/fix scenarios |
| **Interview reps** | 15-20 min at each weekly review | 2-3 questions on the week's topic, answered out loud and critiqued like a hiring manager would |
| **Job search** | 1 h/week from Week 6 (or Week 2) | Target roles, resume, LinkedIn, then applications from Week 9 |

---

## Decision points

| When | What gets decided |
|---|---|
| End of Week 1 | Tier for each week, triggered extras, CKA timeline, capstone tier |
| End of Week 4 | Re-tier weeks 5-9; buy the CKA voucher? |
| End of Week 8 | Book the CKA for Week 12, or move to Week 13-14; move up a capstone tier? |
| End of Week 10 | Week 11 focus areas, based on killer.sh results |

---

## A typical week (Standard tier, 9 h)

| Block | Time |
|---|---|
| Concepts: short reading plus Q&A with the coach | 1.5 h |
| Core labs | 4 h |
| Drills | 1 h |
| Capstone + `hl` check | 1.5 h |
| Weekly review + interview reps | 1 h |

---

## Where things live

| Folder | Contents |
|---|---|
| `CLAUDE.md` | Coach instructions |
| `curriculum/` | Week plans + the rules for adapting them |
| `labs/` | Hands-on tasks with setup and grading scripts |
| `drills/` | Timed practice |
| `hl/` | The `kubectl hl` daily tool |
| `capstone/` | Portfolio project spec and tiers |
| `progress/` | Profile, session log, scores, your plan, weekly reviews |
| `job-search/` | Career audit, target roles, resume, applications |
