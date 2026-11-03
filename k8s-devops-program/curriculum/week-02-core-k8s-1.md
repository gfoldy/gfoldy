# Week 2: Core Kubernetes I: Workloads & Configuration

> **Status: scaffold.** The coach builds this out at the end of Week 1, based on your tier in `progress/plan.md`. Don't start it before then.

**Primary domains:** D2, D3 · **CKA weight:** Workloads & Scheduling (15%) · **Budget:** 9 h by default (Foundation 10 h · Fast-track 7 h)

## Topics
- Pods, ReplicaSets, Deployments, rollout strategies, rollbacks
- DaemonSets, StatefulSets, Jobs, CronJobs
- ConfigMaps, Secrets (and why base64 isn't encryption)
- Requests/limits, QoS classes, LimitRange, ResourceQuota
- Probes: liveness, readiness, startup
- Multi-container pods: init containers, sidecars

## Planned labs
- Rebuild B1-B10 from memory, timed, on a fresh kind cluster
- Run `diag-app` on the homelab with probes, config, and resources
- YAML-from-memory drills: Pod, Deployment, Job

## Capstone milestone
Repo created, app containerized, Deployment + Service on the homelab

## Tier variants (filled in at build-out)
- **Foundation:** pre-work primer + guided lab before the core labs
- **Standard:** as above
- **Fast-track:** 60-90 min proof lab first; pass ≥ 80% → stretch lab only, 2 h banked

## Done when
_(filled in at build-out)_

## Interview reps
_(filled in at build-out)_
