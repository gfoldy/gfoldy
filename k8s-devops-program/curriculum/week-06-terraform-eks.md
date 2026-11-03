# Week 6: Terraform & EKS

> **Status: scaffold.** The coach builds this out at the end of Week 5, based on your tier in `progress/plan.md`. Don't start it before then.

**Primary domains:** D9 · **CKA weight:** n/a (job-market skill) · **Budget:** 9 h by default (Foundation 10 h · Fast-track 7 h)

## Topics
- Terraform: modules, remote state with locking, workspaces vs directories, import blocks, moved blocks
- AWS networking for EKS: VPC, subnets, NAT, endpoints
- EKS: managed node groups vs Karpenter, add-ons, access entries, Pod Identity vs IRSA
- Cost control: tear down the same day, budgets/alerts

## Planned labs
- Terraform an EKS cluster with community modules, deploy the app, destroy
- Pod Identity: a pod that reads one S3 bucket and nothing else
- CI `terraform plan` on PR (sets up Week 7)

## Capstone milestone
Terraform for VPC + EKS (tier 2-3)

## Tier variants (filled in at build-out)
- **Foundation:** pre-work primer + guided lab before the core labs
- **Standard:** as above
- **Fast-track:** 60-90 min proof lab first; pass ≥ 80% → stretch lab only, 2 h banked

## Done when
_(filled in at build-out)_

## Interview reps
_(filled in at build-out)_
