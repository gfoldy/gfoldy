# Labs

One folder per week. Each lab has task files, and where the work can be checked automatically, a `setup.sh` and a read-only `grade.sh`.

| Week | Folder | Cluster | Status |
|---|---|---|---|
| 1 | `week-01/` | kind (`kind-diag`) | ✅ built |
| 2-12 | `week-NN/` | homelab and/or kind, EKS in week 6+ | built just in time by the coach at each weekly review |

Conventions:
- Your work goes in `week-NN/submissions/` and gets committed. Commits are your evidence.
- The `kind` cluster is for disposable and CKA-style work. The homelab is for long-lived things (GitOps, monitoring, the capstone).
- AWS labs always end with `terraform destroy` and a cost note.
