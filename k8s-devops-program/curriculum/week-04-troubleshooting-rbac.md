# Week 4: Troubleshooting & RBAC

> **Status: scaffold.** The coach builds this out at the end of Week 3, based on your tier in `progress/plan.md`. Don't start it before then.

**Primary domains:** D6, D7 · **CKA weight:** Troubleshooting (30%), Cluster Architecture (25%) · **Budget:** 9 h by default (Foundation 10 h · Fast-track 7 h)

## Topics
- A systematic method: events → describe → logs → exec → node
- Node troubleshooting: kubelet, containerd/crictl, journalctl, certificates
- Control plane failure: broken static pod manifests
- Users, ServiceAccounts, Roles/ClusterRoles, aggregation, `auth can-i`
- Creating a user with a CSR and a kubeconfig

## Planned labs
- 10 new break/fix scenarios (graded, like Part C)
- Break and fix the control plane on kind (apiserver manifest typo, scheduler down)
- Least-privilege RBAC for a CI ServiceAccount

## Capstone milestone
RBAC for CI, runbook started. **Checkpoint 1** (mini-diagnostic D3-D7)

## kubectl hl check (~30 min)
`hl rbac`: cluster-admin bindings, wildcard verbs, with a test. See `hl/README.md`.

## Tier variants (filled in at build-out)
- **Foundation:** pre-work primer + guided lab before the core labs
- **Standard:** as above
- **Fast-track:** 60-90 min proof lab first; pass ≥ 80% → stretch lab only, 2 h banked

## Done when
_(filled in at build-out)_

## Interview reps
_(filled in at build-out)_
