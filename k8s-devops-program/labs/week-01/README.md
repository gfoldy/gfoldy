# Lab: Week 1 Diagnostic

Run everything from this directory. The full schedule is in `curriculum/week-01-diagnostic.md`.

| File | What it is |
|---|---|
| `env-check.sh` | Session 0: checks the toolchain (read-only) |
| `kind-diag.yaml`, `setup.sh` | Creates the disposable 3-node `kind-diag` cluster |
| `part-a-knowledge.md` | 31 closed-book questions |
| `part-b-build.md` | Build + admin tasks. `app/` and `kustomize-start/` are inputs for it |
| `break.sh` | **Spoiler.** Deploys the Part C faults |
| `part-c-troubleshooting.md` | 8 tickets |
| `part-d-iac-cicd.md` | Terraform + GitHub Actions, written from scratch |
| `grade.sh build\|admin\|fix` | Auto-grader. Writes `progress/diagnostic/auto-scores.csv` |
| `answer-key.md` | **Spoiler.** Coach's grading key |
| `submissions/` | Your answers and files go here (commit them) |
| `reset.sh` | Deletes the kind cluster |

Environment variables: `DIAG_CLUSTER` (default `diag`) and `DIAG_CONTEXT` (default `kind-$DIAG_CLUSTER`).

**Why kind and not the homelab?** The diagnostic needs a cluster that's identical for every run, is built on kubeadm the way the CKA environment is, and is safe to break (Part C stops a kubelet). Keep your homelab for the long-lived work in later weeks.

**Caveats**
- `B9` enforcement and `C8` depend on kind internals. If you run the diagnostic on a non-kind cluster, `A2`, `C8`, and the image-size check in `D-1` won't grade correctly.
- On Apple Silicon, images build as arm64 and kind nodes are arm64 too, so `kind load docker-image` just works.
