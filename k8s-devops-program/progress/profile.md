# Learner Profile

_Started in Week 1, Session 0 (2026-11-04). The coach reads this at the start of every session. **Bold "?"** marks something still to collect._

## Background
- **DevOps experience:** about 1 year of self-teaching. **?** Which tools were used and what was built (Docker, Terraform, CI, Linux)?
- **IT work experience:** none. The portfolio, the CKA, and the `kubectl hl` tool are the main proof of skill.
- **AWS:** no hands-on experience. awscli installed 2026-11-04. **?** Does an AWS account exist?
- **Kubernetes before this program:** homelab only
- **Certifications:** none
- **Degree:** none

## Homelab
- **Machine:** MacBook Air 13" (2025), Apple M4, 16 GB RAM, macOS Sequoia 15.6.1
- **Container runtime:** Docker Desktop (give it 4 CPUs and 8 GB for kind-diag). **Rancher Desktop is also installed.** Run only one at a time, because they fight over the Docker socket
- **Clusters (kubectl contexts):**
  - `docker-desktop`: Docker Desktop's kind-based cluster, 4 nodes (control-plane + 3 workers), v1.34.3, kindnet CNI, local-path storage. **Only system pods (15). No old experiments here.** Clean, so a good candidate for the long-lived homelab.
  - `rancher-desktop`: k3s. **?** Not checked yet; the old experiments are probably here.
  - `kind-diag`: Week 1 diagnostic cluster, 3 nodes, v1.35.0. Created by setup.sh on 2026-11-04 ✅
- **CNI, ingress controller, storage class:** not sure
- **What's running:** not sure. Lots of past experiments, and it's messy. → Inventory it with `kubectl hl` and `kubectl hl images`, then decide what to keep and what to tear down (planned for Week 2).

## Goals
- **Target roles:** DevOps Engineer, or any entry-level infrastructure role
- **Applying from:** **?**
- **CKA:** no voucher. Timing will be decided by the diagnostic (see `curriculum/adaptation-rules.md` §5).
- **Location / remote:** **?**

## Schedule
- **Weekly hours:** 8-10 (program default 9)
- **Study days/times:** irregular. Coach recommendation: fix 3-4 recurring blocks.
- **Days always off:** **?**

## Budget
- **AWS spend in Week 6:** approved. **?** Exact cap. Default until told otherwise: **$20/month**, with an AWS Budgets alert set up before any EKS lab.

## Coaching preferences
- **Feedback style:** blunt
- **Known weak spots:** AWS (no hands-on), homelab inventory unclear
