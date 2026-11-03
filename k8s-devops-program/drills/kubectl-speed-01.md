# kubectl Speed Drill 01

**Setup:** `kubectl create ns drill && kubectl config set-context --current --namespace drill`
**Rules:** imperative commands and `$do` YAML generation only. Docs allowed, but every lookup costs time. Start a stopwatch, do all 10, stop it.

1. Pod `p1`, image `nginx:1.27-alpine`, label `tier=web`.
2. Deployment `d1`, image `httpd:2.4-alpine`, 2 replicas.
3. Expose `d1` as ClusterIP Service `d1-svc`, port 80.
4. ConfigMap `cm1` with `color=blue` and `size=large`.
5. Secret `s1` (generic) with `token=abc123`.
6. Pod `p2`, image `busybox:1.36`, command `sleep 3600`, written to `p2.yaml` first, then applied.
7. Scale `d1` to 4.
8. Set `d1`'s image to `httpd:2.4.62-alpine`.
9. Job `j1`, image `busybox:1.36`, command `echo done`.
10. Print just the pod IPs of all pods in the namespace (one jsonpath command).

**Check:** `kubectl get po,deploy,svc,cm,secret,job` and go through them yourself. A task done wrong counts as not done.

## Scoring (row S1 in `progress/diagnostic/manual-scores.csv`)

| All 10 correct in | Score |
|---|---|
| ≤ 8 min | 4 |
| ≤ 12 min | 3 |
| ≤ 18 min | 2 |
| ≤ 25 min | 1 |
| slower | 0 |

Take the time score, then subtract 1 for each wrong or missing task (minimum 0).

**Cleanup:** `kubectl delete ns drill`
