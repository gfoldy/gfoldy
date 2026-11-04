# Session Log

_The coach adds one entry per session, newest at the bottom._

<!-- template
## YYYY-MM-DD · Week N · Session X: <title>
- **Hours:** 1.5
- **Did:**
- **Evidence:** (commit / grader output / file)
- **Redo:** (items solved with hint-ladder step 4)
- **Blockers:**
- **Next:**
-->

## 2026-11-04 · Week 1 · Session 0: Setup + self-rating (in progress)
- **Hours:** ~1 (estimate)
- **Did:** Cloned the repo on the Mac and checked out the program branch. Installed `kubectl-hl` and added `~/.local/bin` to PATH. Reports `env-check.sh`, `setup.sh`, and the shell setup as done. Gave most of the profile answers.
- **Evidence:** screenshots of the clone and install. **Missing:** output from `env-check.sh`, `setup.sh`, and `kubectl hl`; pushed `self-ratings.csv`.
- **Redo:** none
- **Blockers:** none
- **Update:** Screenshots show awscli was installed and `git pull` worked. But `git commit` printed "nothing to commit", so **self-ratings were not saved**. Also, **there's no `kind-diag` context, so `setup.sh` hasn't completed.** Contexts are docker-desktop and rancher-desktop. Machine: M4, 16 GB. No IT job history.
- **Update 2:** `setup.sh` ✅ (kind-diag, 3 nodes Ready, v1.35.0; first live run of the script). First live `kubectl hl` run on docker-desktop found 2 tool bugs (header showed the wrong context; a Docker Desktop restart produced 13 noisy warnings). Fixed in v0.1.1. Self-ratings **still not pushed**. Opened in nano, but the GitHub copy is blank.
- **Next:** collect the missing evidence and remaining profile items, then Session 1 (Part A, 60 min, closed book).
