# Week 1: Diagnostic

**Goal:** get an honest, measured baseline across 14 domains, so weeks 2-12 spend your time where it actually pays off.
**Budget:** about 9 h over 7 sessions.
**Output:** `progress/diagnostic/report.md` and `progress/plan.md`.

> This week isn't about learning. It's about measuring. A low score is useful data, so don't study for it, don't look things up beyond the allowed docs, and don't use AI for the answers. If you inflate this baseline, weeks 2-12 get aimed at the wrong things.

## Rules for all graded parts

| Allowed | Not allowed |
|---|---|
| kubernetes.io/docs, kubernetes.io/blog, helm.sh/docs (same as the CKA exam) | ChatGPT/Claude/Copilot for the task itself |
| registry.terraform.io docs, docs.github.com (Part D only) | Your old notes, repos, or Stack Overflow |
| `kubectl explain`, `--help`, `man` | Pausing the timer for "just a quick look" |

Stopped before the timer ran out? Write down where you got to. **Partial work earns partial credit.**

## Sessions

| # | Session | Time | Files |
|---|---|---|---|
| 0 | **Setup + self-rating.** Run `env-check.sh`, set up your shell, create the `diag` cluster, and fill in `self-ratings.csv` *before* seeing any tasks. | 45 min | `labs/week-01/env-check.sh`, `drills/shell-setup.md`, `progress/diagnostic/self-ratings.csv` |
| 1 | **Part A: Knowledge check.** 31 short-answer questions, closed book, no docs. | 60 min | `labs/week-01/part-a-knowledge.md` |
| 2 | **Part B: Build.** 12 build tasks + Dockerfile + metrics-server, then 3 admin tasks. Docs allowed. Auto-graded. | 150 min | `labs/week-01/part-b-build.md` |
| 3 | **Part C: Troubleshooting.** 8 broken tickets, including a broken node. Auto-graded. | 75 min + 10 min setup | `labs/week-01/part-c-troubleshooting.md` |
| 4 | **Part D: IaC + CI/CD.** Terraform module and GitHub Actions workflow, written from scratch. Coach-graded. | 60 min | `labs/week-01/part-d-iac-cicd.md` |
| 5 | **Speed drill + career audit.** | 15 min + 40 min | `drills/kubectl-speed-01.md`, `job-search/baseline-audit.md` |
| 6 | **Score + plan with the coach.** | 45 min | `progress/diagnostic/` |
| | **Total** | **≈ 9 h** | |

Sessions 1, 4, and 5 don't need the cluster, so you can do them on any evening. Do sessions 2 and 3 on days you have an unbroken 2.5 h block.

## Step by step

### Session 0: Setup (45 min)
1. `cd k8s-devops-program/labs/week-01 && ./env-check.sh`. Install anything flagged `MISS`.
2. Give Docker 4 CPUs and 6-8 GB RAM (Docker Desktop: Settings → Resources; Colima: `colima start --cpu 4 --memory 8`; OrbStack sizes itself automatically).
3. Follow `drills/shell-setup.md`: alias `k`, completion, `export do="--dry-run=client -o yaml"`. These are the same shortcuts you'll set up in the exam.
4. `./setup.sh`. This creates `kind-diag` (1 control plane + 2 workers). **Your homelab isn't touched.**
5. Fill in `progress/diagnostic/self-ratings.csv` with 0-4 for each domain, using the level table in `curriculum/adaptation-rules.md`. Do this **before** reading any task. The gap between your self-rating and your measured score is itself a result.
6. Fill in `progress/profile.md`.
7. Commit.

### Session 1: Part A (60 min, closed book)
- Write your answers in `labs/week-01/submissions/part-a-answers.md`. Short is fine; aim for 1-4 sentences each.
- When the timer ends, commit, then ask the coach: **"grade part A"**.

### Session 2: Part B (150 min)
- `kubectl config use-context kind-diag`. Start a 150-min timer.
- Do the build tasks. When the build is done, or at 120 min, run `./grade.sh build` and commit.
- Then do the admin tasks A1-A3 and run `./grade.sh admin`. Commit.
- Order matters: the drain in A3 can evict pods from B4-B6, so grade the build first.

### Session 3: Part C (75 min)
- `./break.sh`. Takes about 2 min, and **don't read it**. Then start the 75-min timer.
- Work the tickets in `part-c-troubleshooting.md`. Run `./grade.sh fix` whenever you like. **Your score is what it shows when the timer ends.** Commit right then.

### Session 4: Part D (60 min)
- Write the files in `labs/week-01/submissions/terraform/` and `.../ci/`. Run `terraform init -backend=false && terraform validate`.
- Commit, then **"grade part D"**.

### Session 5: Speed drill (15 min) + career audit (40 min)
- `drills/kubectl-speed-01.md`. Write your time into `manual-scores.csv` (row S1) using the table in the drill.
- `job-search/baseline-audit.md`. Then **"grade career"**.

### Session 6: Score + plan (45 min)
- Ask the coach: **"score the diagnostic"**. The coach runs `score.py`, walks you through `report.md`, and writes `progress/plan.md`.
- **Check in with the coach before starting Week 2.** The plan for weeks 2-12 depends on this conversation.

## Done when

- [ ] `progress/diagnostic/self-ratings.csv` was filled in before Part A
- [ ] `auto-scores.csv` has rows for B1-B12, D1, M1, A2, A3, C1-C8
- [ ] `manual-scores.csv` has no blank `earned` cells
- [ ] `report.md` generated, and `progress/plan.md` written and agreed
- [ ] `progress/weekly/week-01.md` filled in
- [ ] Everything committed and pushed
- [ ] `./reset.sh` run (or keep the cluster for practice, since it costs nothing but RAM)

## Interview reps for this week
1. "Walk me through how you'd debug a pod stuck in `CrashLoopBackOff`."
2. "Tell me about yourself, in 90 seconds, for a junior platform engineer role."
3. "What's the difference between how you'd grant AWS permissions to an EC2 instance and to a pod on EKS?"
