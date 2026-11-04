# Week 9: Security

> **Status: scaffold.** The coach builds this out at the end of Week 8, based on your tier in `progress/plan.md`. Don't start it before then.

**Primary domains:** D7, D2 · **CKA weight:** Cluster Architecture (security bits) · **Budget:** 9 h by default (Foundation 10 h · Fast-track 7 h)

## Topics
- Pod Security Standards/Admission, securityContext
- Policy engines: Kyverno or Gatekeeper
- Supply chain: image scanning (Trivy), signing (cosign), SBOMs
- Secrets: External Secrets + AWS Secrets Manager, encryption at rest
- Network segmentation, audit logs, CIS benchmark (kube-bench)

## Planned labs
- Harden the capstone to PSS restricted
- Kyverno policies: block :latest, require limits, require non-root
- Trivy in CI with a severity gate

## Capstone milestone
Hardening. Job applications start

## kubectl hl check (~30 min)
`hl audit`: privileged, root, hostPath, with a test. See `hl/README.md`.

## Tier variants (filled in at build-out)
- **Foundation:** pre-work primer + guided lab before the core labs
- **Standard:** as above
- **Fast-track:** 60-90 min proof lab first; pass ≥ 80% → stretch lab only, 2 h banked

## Done when
_(filled in at build-out)_

## Interview reps
_(filled in at build-out)_
