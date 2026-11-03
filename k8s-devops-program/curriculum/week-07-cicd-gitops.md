# Week 7: CI/CD & GitOps

> **Status: scaffold.** The coach builds this out at the end of Week 6, based on your tier in `progress/plan.md`. Don't start it before then.

**Primary domains:** D10, D2 · **CKA weight:** n/a (job-market skill) · **Budget:** 9 h by default (Foundation 10 h · Fast-track 7 h)

## Topics
- GitHub Actions: workflows, reusable workflows, OIDC to AWS (no static keys)
- Image build best practices, tagging, SBOM, scanning
- Argo CD: Applications, sync policies, app-of-apps/ApplicationSets
- Promotion between environments and image update strategies

## Planned labs
- Pipeline: lint → test → build → scan → push → bump the tag in the GitOps repo
- Argo CD on the homelab managing the capstone
- GitHub OIDC → AWS role for Terraform plan

## Capstone milestone
CI pipeline + GitOps delivery

## Tier variants (filled in at build-out)
- **Foundation:** pre-work primer + guided lab before the core labs
- **Standard:** as above
- **Fast-track:** 60-90 min proof lab first; pass ≥ 80% → stretch lab only, 2 h banked

## Done when
_(filled in at build-out)_

## Interview reps
_(filled in at build-out)_
