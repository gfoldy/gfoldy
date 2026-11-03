# Part C: Troubleshooting (75 minutes)

**Setup:** `./break.sh` (about 2 minutes). Start the timer when it finishes. **Don't read `break.sh`.**
**Context:** `kind-diag`. **Namespace:** `diag-fix`.
**Allowed:** kubernetes.io/docs, `kubectl explain`, `--help`, `man`. No AI.
**Grading:** `./grade.sh fix`. Run it as often as you like. Your score is what it shows at 75:00.

These are written like real on-call tickets: symptoms only. In `submissions/part-c-notes.md`, write one line per ticket: **root cause → fix → command that showed you the cause.** The coach reads these notes in the review, and a correct root cause there matters even when the grader gives full points.

Rule: fix the problem, don't delete the workload. Recreating an object is fine if it ends with the same name and intent.

---

| # | Ticket | Points |
|---|---|---|
| **C1** | "The `api` deployment has been rolling out for an hour and none of its pods ever come up." | 2 |
| **C2** | "`worker` won't start. It should be running in `batch` mode (env var `MODE=batch`)." | 2 |
| **C3** | "The `frontend` pods are all Running and Ready, but nothing reaches them through `frontend-svc`." | 2 |
| **C4** | "We deployed `hungry` this morning and it never got scheduled." | 2 |
| **C5** | "`checker` keeps restarting and never shows Ready. The app is fine; it serves on `/` port 80." | 2 |
| **C6** | "The CI pipeline uses ServiceAccount `ci-bot` and needs to **list deployments** in `diag-fix`. It gets `forbidden`. Give it exactly that, nothing more." | 3 |
| **C7** | "`backend` pods are Ready and `backend-svc` has endpoints, but connections to the Service are refused." | 2 |
| **C8** | "Monitoring says one of our nodes went `NotReady` around the time this incident started. Get it back, and make sure it stays fixed after a reboot." | 3 |

**Total: 18 points.**

When the timer ends: `./grade.sh fix`, then `git add -A && git commit -m "diag: part C"`.
