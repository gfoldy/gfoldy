# kubectl hl: daily homelab helper

A `kubectl` plugin for the things you do every day on a homelab cluster: *is anything broken?*, *why is it broken?*, and *clean up the mess.* It's one Python file with no dependencies. It talks to the cluster only through `kubectl`, so it uses your normal contexts and permissions.

```
kubectl hl                       # morning health report
kubectl hl why <target>          # walk the troubleshooting method on something broken
kubectl hl clean [--yes]         # failed pods + finished jobs (dry run by default)
kubectl hl images                # what's running; flags floating :latest tags
```

## Install (macOS)

```bash
cd k8s-devops-program/hl
./install.sh
```

This symlinks `kubectl-hl` into `~/.local/bin`, so `git pull` updates it. If that folder isn't on your PATH yet, the script prints the line to add to `~/.zshrc`. With the `k` alias from `drills/shell-setup.md`, `k hl` works too.

Requires `python3` (comes with the Xcode command line tools) and `kubectl`. The cert check uses `openssl`, which macOS already has.

## Commands

### `kubectl hl` (also `kubectl hl status`)
One screen covering:
- **Nodes:** Ready status, version, and how much of each node's CPU and memory is already claimed by pod requests.
- **Findings, worst first:** NotReady or cordoned nodes, disk/memory pressure, unbound PVCs, TLS certs expiring within 30 days, workloads with fewer pods available than they should have, and pods that are crash-looping, failing to pull their image, unschedulable, unready, restarting a lot, or evicted.
- **Warning events from the last hour,** grouped and counted.

Every finding comes with the next command to run, usually a `kubectl hl why ...`.

**Exit codes:** `0` all clear, `1` warnings, `2` critical, `3` can't reach the cluster. That makes it usable in scripts and cron.

| Flag | Effect |
|---|---|
| `-n NS` | Check one namespace only (nodes are still shown) |
| `-q` | Findings only |
| `--events 180` | Widen the event window to 180 minutes |
| `--notify` | Send a macOS notification if anything is wrong (see the morning check below) |
| `--context ctx` | Check another cluster, e.g. `kind-diag` |

### `kubectl hl why <target>`
Runs the same troubleshooting method the CKA expects, in order, and then tells you the **likely cause**:

1. **Containers:** current state, last termination (reason and exit code), resources, probes
2. **Events:** what `kubectl describe` would show you
3. **Logs:** from containers that aren't ready; uses `--previous` automatically if the container restarted
4. **Services** that select the pod
5. **Likely cause:** rules for the common failures:

| Symptom | What it tells you |
|---|---|
| ImagePullBackOff / ErrImagePull | Bad image name or tag, registry access, or pull secrets. Quotes the kubelet's error |
| CreateContainerConfigError | A ConfigMap, Secret, or key is missing, and which one |
| OOMKilled / exit 137 / exit 0 / other exit codes | What each one means for that container |
| Unschedulable | Not enough CPU/memory, selector or affinity mismatch, untolerated taint, or unbound PVC |
| Probe aimed at a port the container doesn't declare | Which probe and which port. A failing probe's message is quoted |
| Service targetPort that matches no container port | Which Service and port |
| Pod sits on a NotReady node | Points you at the kubelet on that node |

Targets: `pod-name`, `deploy/x`, `sts/x`, `ds/x`, `job/x`, `svc/x`. For a workload it lists every pod and diagnoses the worst one. For a Service it checks the selector (and shows which labels *do* exist when nothing matches), endpoints, and port mapping.

Run it on your Week 1 Part C tickets **after** you've graded them: it catches C1-C5 and C7 by itself.

### `kubectl hl clean`
Lists failed or evicted pods, completed bare pods, and Jobs that finished more than 24 hours ago (`--older-than` changes that). It leaves alone anything that already cleans itself up: Jobs created by a CronJob, Jobs with `ttlSecondsAfterFinished`, and pods that belong to a Job. **Deletes nothing without `--yes`.**

### `kubectl hl images`
Every image in use, with pod count and namespaces. Flags `:latest` and untagged images, so you can pin them and make upgrades deliberate.

## Morning check (launchd)

`launchd/com.homelab.hl-morning.plist` runs `kubectl hl --notify` at 08:00. You only get a notification if something's wrong, and the full report goes to `/tmp/hl-morning.log`. Install steps are in the comment at the top of the file.

## The daily habit

| When | Run |
|---|---|
| Morning (or let launchd do it) | `k hl` |
| Something's red | `k hl why <thing>`, then fix it yourself with kubectl |
| Friday | `k hl clean`, then `k hl clean --yes` |
| Before upgrading anything | `k hl images` |

## Growing it with the program

You build this tool out as you go. Each week, you add the check that week teaches. You write it, with the coach giving hints the usual way. By Week 12 it's a real portfolio piece: a tool you use daily, with tests, that covers the whole program.

| Week | Check you add |
|---|---|
| 2 | `hl status`: pods with no resource requests/limits; a `-o json` output mode |
| 3 | `hl netpol`: namespaces with no default-deny NetworkPolicy; Ingress/Gateway routes with no backend |
| 4 | `hl rbac`: subjects bound to `cluster-admin`; ServiceAccounts with wildcard verbs |
| 5 | `hl status`: Helm releases in `failed` / `pending-*` state |
| 6 | `--context` loop: run the report across homelab + EKS in one go |
| 7 | `hl status`: Argo CD Applications OutOfSync or Degraded |
| 8 | `hl alerts`: firing Prometheus alerts (via the Alertmanager API) |
| 9 | `hl audit`: privileged pods, pods running as root, `hostPath` mounts |
| 10 | `hl status`: control-plane certificate expiry and etcd backup age |
| 12 | Package it: `brew` tap or krew manifest, README demo GIF |

Every new check gets a test in `test_kubectl_hl.py`, in the same style as the existing ones: plain functions over fixture JSON.

## Development

```bash
python3 -m unittest -v test_kubectl_hl.py     # 32 tests, no cluster needed
```

The design keeps everything testable without a cluster:
- **Checks** (`check_*`, `diagnose_pod`, `find_cleanable`) are pure functions: Kubernetes JSON in, findings out.
- **All cluster access** goes through `Kube`, and the tests replace its runner with a fake.
- **The fixture cluster** in the tests (`broken_cluster()`) mirrors the Week 1 Part C failures.

**Status:** v0.1.0. Tested against fixtures only, not yet against a live cluster. Run it on your homelab and the `kind-diag` cluster, and report anything that looks off.
