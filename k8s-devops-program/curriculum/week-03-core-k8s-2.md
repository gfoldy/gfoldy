# Week 3: Core Kubernetes II: Networking, Storage, Scheduling

> **Status: scaffold.** The coach builds this out at the end of Week 2, based on your tier in `progress/plan.md`. Don't start it before then.

**Primary domains:** D4, D5 · **CKA weight:** Services & Networking (20%), Storage (10%) · **Budget:** 9 h by default (Foundation 10 h · Fast-track 7 h)

## Topics
- Service types, EndpointSlices, kube-proxy, CoreDNS
- Ingress and the Gateway API; ingress controller on the homelab
- NetworkPolicy (default-deny, namespace selectors, egress to DNS)
- PV/PVC/StorageClass, access modes, reclaim policy, volume expansion
- Scheduling: nodeSelector, affinity/anti-affinity, taints/tolerations, topology spread, priority

## Planned labs
- NetworkPolicy lab: default-deny namespace, then allow only what's needed
- Gateway API/Ingress routing on the homelab
- Scheduling puzzles on kind (3 nodes)

## Capstone milestone
Config, persistent storage, Ingress/Gateway

## Tier variants (filled in at build-out)
- **Foundation:** pre-work primer + guided lab before the core labs
- **Standard:** as above
- **Fast-track:** 60-90 min proof lab first; pass ≥ 80% → stretch lab only, 2 h banked

## Done when
_(filled in at build-out)_

## Interview reps
_(filled in at build-out)_
