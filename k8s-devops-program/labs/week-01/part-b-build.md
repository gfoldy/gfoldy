# Part B: Build (150 minutes)

**Context:** `kubectl config use-context kind-diag`. **Namespace:** `diag-build`, unless a task says otherwise.
**Allowed:** kubernetes.io/docs, helm.sh/docs, `kubectl explain`, `--help`. **No AI, no old notes.**
**Grading:** `./grade.sh build` after the build tasks, then `./grade.sh admin` after A1-A3. The grader checks the **end state**, so names, labels, and values must match exactly.

Tip: a task you skip still teaches you something. Skip anything that's eating more than 12 minutes and come back to it.

---

## Build tasks

**B1. Deployment (D3, 4 pts)**
Create Deployment `web`: image `nginx:1.27-alpine`, 3 replicas, pod label `app=web`, container port 80. Container resources: requests `cpu: 50m`, `memory: 64Mi`, limit `memory: 128Mi`.

**B2. Scale, roll out, roll back (D3, 3 pts)**
Scale `web` to 5 replicas. Update its image to `nginx:1.28-alpine` and wait for the rollout to finish. The new version turns out to be bad, so roll back to the previous revision using rollout history (don't just set the image again).
_End state: image `nginx:1.27-alpine`, 5 ready replicas, revision ≥ 3._

**B3. Service (D4, 3 pts)**
Expose `web` with a ClusterIP Service named `web-svc` on port **8080**, forwarding to container port 80. Prove it works from a temporary pod using the Service's fully qualified DNS name.

**B4. Config and secrets (D3, 3 pts)**
- ConfigMap `app-config` with `APP_MODE=diagnostic` and `LOG_LEVEL=debug`.
- Secret `app-secret` with `DB_PASSWORD=s3cr3t`.
- Pod `config-pod` (image `busybox:1.36`, command `sleep 3600`) that has:
  - env var `APP_MODE` from the ConfigMap
  - env var `DB_PASSWORD` from the Secret
  - the whole ConfigMap mounted as files at `/etc/app`

**B5. Persistent storage (D5, 3 pts)**
PVC `data-pvc`, 100Mi, `ReadWriteOnce`, using the cluster's default StorageClass. Pod `writer` (`busybox:1.36`) mounts it at `/data`, writes the current date to `/data/out.txt`, then sleeps.

**B6. Node selection (D5, 2 pts)**
Label node `diag-worker` with `disk=ssd`. Create pod `pinned` (`nginx:1.27-alpine`) that can only be scheduled on nodes with that label.

**B7. CronJob (D3, 2 pts)**
CronJob `ticker` that runs `busybox:1.36` with `echo tick` every 5 minutes. Then, without waiting, create a Job named `ticker-manual` **from** that CronJob and let it complete.

**B8. RBAC (D7, 4 pts)**
ServiceAccount `reader`. Role `pod-reader` allowing `get`, `list`, and `watch` on pods. Bind it to `reader`. Verify with `kubectl auth can-i` that `reader` can list pods but can't delete them.

**B9. NetworkPolicy (D4, 3 pts)**
NetworkPolicy `web-allow-frontend`: pods labeled `app=web` accept ingress **only** from pods labeled `role=frontend` in the same namespace, and only on TCP port 80.
_The grader checks the spec, and reports whether your CNI actually enforces it._

**B10. Probes (D3, 2 pts)**
Deployment `probed` (`nginx:1.27-alpine`, 2 replicas) with an HTTP readiness probe and a liveness probe on `/`, port 80. All replicas must end up Ready.

**B11. Kustomize (D8, 3 pts)**
`kustomize-start/base/` holds a Deployment and Service named `hello`. Create an overlay at `kustomize-start/overlays/diag/kustomization.yaml` that sets namespace `diag-build`, adds name prefix `kz-`, and sets replicas to 2. Apply it with `kubectl apply -k`. **Don't edit the base.**

**B12. Helm (D8, 3 pts)**
Create a chart with `helm create hello` (put it in `submissions/hello/`). Install it as release `hello` in `diag-build` with 2 replicas and image `nginx:1.27-alpine`, set **through a values file** (`submissions/hello-values.yaml`), not `--set`.

**D-1. Container image (D2, 4 pts)**
`app/` contains a small Go web server (listens on 8080; `/`, `/whoami`, `/healthz`). Write `app/Dockerfile` so that:
- the build is multi-stage, and the final image is **under 30 MB**
- the container runs as a **non-root** user
- the image is tagged `diag-app:v1`

Get it into the kind cluster (no registry) and run it as Deployment `diag-app` (1 replica) with a Service `diag-app` on port 8080.
_The grader calls `/whoami` and expects a non-zero UID._

**M1. Metrics (D11, 3 pts)**
Make `kubectl top nodes` and `kubectl top pods -A` work on this cluster. (Something extra is needed on kind. Figuring out what is part of the task.)

➡ Run `./grade.sh build`, then commit.

---

## Admin tasks

**A1. Cluster facts (D12, 2 pts, written)**
In `submissions/part-b-admin-answers.md`, record:
1. The Kubernetes version on each node, and the container runtime and its version.
2. The cluster's **pod CIDR** and **service CIDR**, plus the command or file where you found each one.
3. The directory where the control plane's static pod manifests live, and how you confirmed it.

**A2. etcd backup (D12, 3 pts)**
Take an etcd snapshot and save it as `/var/lib/etcd/diag-snap.db` **on the control-plane node**.
_Notes: kind nodes are Docker containers (`docker exec -it diag-control-plane bash`). `etcdctl` isn't installed on the node itself, so find somewhere in the cluster where it is. You need the right endpoint and TLS flags._

**A3. Node maintenance (D12, 2 pts)**
Safely drain `diag-worker2` for maintenance. **Leave it cordoned** at the end. (`break.sh` uncordons it for Part C.)
_Some of your B-task pods may be on that node. Deciding how to handle them is part of the task._

➡ Run `./grade.sh admin`, then commit.
