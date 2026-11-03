# Kubernetes / DevOps Training Program

A 12-week, 8-10 h/week program to go from "DevOps + AWS experience" to **CKA-certified with a public platform-engineering portfolio**, aimed at entry-level DevOps, Platform, and Cloud roles.

## Start here
1. Open Claude Code **in this folder** (`cd k8s-devops-program && claude`) so `CLAUDE.md` loads and Claude acts as your study coach.
2. Say: **"start week 1"**.
3. Follow `curriculum/week-01-diagnostic.md`.

## Layout
| Folder | Contents |
|---|---|
| `CLAUDE.md` | Coach instructions: how Claude teaches, grades, and adapts the plan |
| `curriculum/` | Week plans + `adaptation-rules.md` |
| `labs/` | Hands-on tasks; Week 1 includes setup, fault-injection, and auto-grading scripts |
| `drills/` | Timed reps for speed and recall |
| `capstone/` | Tiered portfolio project |
| `progress/` | Profile, session log, diagnostic scores, adapted plan, weekly reviews |
| `job-search/` | Career audit, target roles, resume, applications |

## Requirements (macOS)
Docker runtime (Docker Desktop, OrbStack, or Colima) with 6-8 GB RAM · `kind` · `kubectl` · `helm` · `terraform` · `awscli` · `python3`. Run `labs/week-01/env-check.sh` to check.

## Status
- ✅ Week 1 (diagnostic) fully built
- ⏳ Weeks 2-12 scaffolded; each is built out by the coach at the end of the week before, based on your results
