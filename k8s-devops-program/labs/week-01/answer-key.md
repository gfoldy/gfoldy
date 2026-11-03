# ⚠️ ANSWER KEY: SPOILERS ⚠️

**Garrett: don't open this until the coach has graded the part you're on.** It's here so grading stays consistent from one session to the next.

**Scoring per question:** **2** = correct and complete (key points below) · **1** = partly right, or right but vague · **0** = wrong, missing, or "I don't know". Grade strictly. Generous grading here makes weeks 2-12 worse.

---

## Part A

| Q | 2-point answer must include |
|---|---|
| 1 | `ss -tlnp \| grep 8080` (or `lsof -i :8080`, `netstat -tlnp`), and that you need sudo/root to see the PID of another user's process. |
| 2 | DNS resolution (resolver → recursive lookup → A/AAAA) → TCP 3-way handshake to 443 → TLS handshake (ClientHello with SNI, cert check against trusted CAs, key exchange) → HTTP request (GET, Host header) → response. 1 pt if TLS or DNS is missing. |
| 3 | 256 addresses. Normal Linux networking gives 254 usable; **AWS gives 251**, because AWS reserves 5 (network, VPC router .1, DNS .2, future use .3, broadcast). |
| 4 | `systemctl status <svc>` (state, exit code, last log lines) and `journalctl -u <svc>` (full logs; `-e`/`-f`/`--since`). |
| 5 | An image is an immutable layered filesystem plus metadata. A container is a running instance with a writable layer. Each instruction makes a cached layer, so copying the deps manifest first means source changes don't bust the dependency-install cache. |
| 6 | ENTRYPOINT = the executable. CMD = default args, or the default command if there's no ENTRYPOINT (easily overridden). Non-root: limits the blast radius of a container escape or app RCE; required by restricted PSS and many platforms; stops writes to system paths. |
| 7 | Deployment: stateless web/API. StatefulSet: databases/Kafka, anything needing stable identity, ordered rollout, or per-pod PVCs. DaemonSet: one pod per node (log shippers, CNI, node exporter). |
| 8 | A Deployment manages **ReplicaSets**, which manage pods. A rolling update creates a new ReplicaSet and scales it up as the old one scales down. maxSurge = how many extra pods above desired are allowed; maxUnavailable = how many below desired are allowed during the rollout. |
| 9 | The scheduler uses **requests**. Over the memory limit → **OOMKilled** (container restarted). Over the CPU limit → **throttled**, not killed. |
| 10 | ClusterIP: internal virtual IP. NodePort: ClusterIP + a port on every node. LoadBalancer: NodePort + a cloud LB. Ingress: L7 HTTP routing (host/path) through an ingress controller, not a Service type. |
| 11 | `db` → `db.web.svc.cluster.local` (same namespace, through the search domains). `db.data` → `db.data.svc.cluster.local`. |
| 12 | Default: all pods can talk to all pods (allow-all). Once any policy selects a pod for a direction (ingress/egress), that direction becomes deny-by-default except what the policies allow. Policies are additive. |
| 13 | PV = a piece of storage. PVC = a request for storage, bound to a PV. StorageClass = how to provision dynamically. Dynamic provisioning creates the PV when a PVC is made. RWO = mounted read-write by a single node; RWX = many nodes. |
| 14 | Taints repel pods from nodes; a toleration allows (doesn't force) scheduling there. Affinity/nodeSelector attract pods to nodes. To *dedicate* nodes you need both. |
| 15 | Insufficient CPU/memory, unbound PVC, nodeSelector/affinity matches no node, untolerated taints, quota. `kubectl describe pod` → Events (scheduler message). |
| 16 | `kubectl describe pod`, `kubectl logs <pod>`, `kubectl logs <pod> --previous` (`-p`). Also `kubectl get events`. Key flag: `--previous`. |
| 17 | Selector matches pod labels → endpoints exist (`kubectl get endpoints`/`endpointslices`) → targetPort matches the container port → pods Ready (readiness) → NetworkPolicy → DNS → test from a pod in the cluster (curl the pod IP, then the Service). |
| 18 | Role/RoleBinding are namespaced; ClusterRole/ClusterRoleBinding are cluster-wide (and cover non-namespaced resources). **Yes**, a RoleBinding can reference a ClusterRole, which grants those permissions only in the RoleBinding's namespace. |
| 19 | `kubectl auth can-i delete secrets -n prod --as=system:serviceaccount:ci:deployer` |
| 20 | Any 3 of: `runAsNonRoot`, `runAsUser`, `readOnlyRootFilesystem`, `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`, `seccompProfile: RuntimeDefault`, `privileged: false`. PSS levels: **privileged, baseline, restricted**. |
| 21 | Helm: templating + values + release lifecycle (install/upgrade/rollback, packaging/distribution). Kustomize: template-free overlays/patches on plain YAML, built into kubectl. Helm for distributing/consuming third-party apps; Kustomize for per-environment variants of your own manifests. (Combining them is a valid answer.) |
| 22 | Installs if the release doesn't exist, otherwise upgrades it. Render: `helm template`, or `helm install/upgrade --dry-run` (with `--debug`). |
| 23 | State maps config to real resource IDs and attributes. Remote state + locking stops concurrent applies from corrupting it, and shares it with the team. AWS: S3 backend with **DynamoDB locking (legacy)** or **S3-native locking `use_lockfile = true`** (Terraform ≥ 1.10). Also mentions encryption/versioning on the state bucket. |
| 24 | plan = diff only; apply = make the changes. Drift = real infra differs from state/config (detected by plan/refresh). Bring in existing resources with `import` blocks (≥ 1.5) or `terraform import`, then write matching config until plan shows no changes. |
| 25 | **EKS Pod Identity** (Pod Identity Agent + association between SA and IAM role) and **IRSA** (OIDC provider + annotated ServiceAccount + role trust policy). Mentions blocking pod access to IMDS / node role (hop limit 1) for the 2-point answer. |
| 26 | CI: merge often, auto build+test every change. Continuous delivery: every change is *releasable*, prod deploy needs manual approval. Continuous deployment: every passing change goes to prod automatically. |
| 27 | An in-cluster agent continuously reconciles cluster state to what's declared in Git (pull model, drift correction, Git as the audit log). CI `kubectl apply` is push: CI needs cluster creds and there's no ongoing reconciliation. Rollback = `git revert` (the agent syncs). Argo also has UI rollback, but Git is the source of truth. |
| 28 | Metrics: cheap aggregated numbers for alerting/trends. Logs: detailed discrete events for debugging. Traces: request path and latency across services. Golden signals: **latency, traffic, errors, saturation**. |
| 29 | Prometheus scrapes HTTP `/metrics` endpoints on an interval (finding targets through service discovery). Each unique label combination is a new time series, so unbounded labels blow up memory/storage and query cost. |
| 30 | kube-apiserver (front door, auth, validation), etcd (state store), kube-scheduler (assigns pods to nodes), kube-controller-manager (reconcile loops), cloud-controller-manager (cloud integration). Every node: kubelet, container runtime (containerd), kube-proxy (or a CNI replacement), CNI agent. |
| 31 | etcd holds all cluster state, so losing it means losing the cluster config. Upgrade: upgrade kubeadm on the first control plane → `kubeadm upgrade plan` → `kubeadm upgrade apply vX.Y.Z` → drain node → upgrade kubelet+kubectl → restart kubelet → uncordon. Then other control planes (`kubeadm upgrade node`), then workers one at a time (drain → kubeadm upgrade node → kubelet → uncordon). One minor version at a time; snapshot etcd first. |

## Part B: A1 (written, 2 pts)

- 1 pt: versions (`kubectl get nodes -o wide` shows kubelet version and container runtime).
- 1 pt: pod CIDR (`kubectl get nodes -o jsonpath='{.items[*].spec.podCIDR}'`, or `--cluster-cidr` in the kube-controller-manager manifest) **and** service CIDR (`--service-cluster-ip-range` in `/etc/kubernetes/manifests/kube-apiserver.yaml`) **and** the static pod path `/etc/kubernetes/manifests` (`staticPodPath` in `/var/lib/kubelet/config.yaml`).
- Partial: 1 pt if 2 of the 3 items in that second point are right.

## Part C: root causes (for reviewing his notes)

| # | Root cause | Expected fix |
|---|---|---|
| C1 | Image typo `nginx:1.27-alpne` → ImagePullBackOff | `kubectl set image` to `nginx:1.27-alpine` |
| C2 | References ConfigMap `worker-config` key `MODE`, which doesn't exist → CreateContainerConfigError | `kubectl create configmap worker-config --from-literal=MODE=batch` |
| C3 | Service selector `app: frontnd` (typo) → no endpoints | Fix the selector to `app: frontend` |
| C4 | Requests `cpu: "100"` (100 cores) → FailedScheduling: Insufficient cpu | Lower the request to something sane (e.g. 50m-250m) |
| C5 | Readiness and liveness probes hit port 8080 `/healthz`; nginx serves 80 `/` | Fix both probes to port 80, path `/` |
| C6 | RoleBinding `roleRef` names `deploy-viewer`, but the Role is `deployment-viewer`; **and** the Role uses apiGroup `""` instead of `apps` | Recreate the RoleBinding (roleRef is immutable) and fix the Role's apiGroups to `["apps"]` |
| C7 | `backend-svc` targetPort 8080, container listens on 80 | targetPort 80 |
| C8 | kubelet stopped **and disabled** on `diag-worker` | `docker exec -it diag-worker bash` → `systemctl enable --now kubelet`; check with `journalctl -u kubelet` |

Watch for in the review: did he look at **Events** first? Did he fix C6 by widening permissions (a cluster-wide grant, `*` verbs)? That loses the least-privilege point and is worth discussing.

## Part D rubrics

### T1 Terraform (6 pts)
| Pts | Criterion |
|---|---|
| 1 | `terraform validate` passes and `fmt -check` is clean (VALIDATE.txt shows it) |
| 1 | Version constraints for Terraform and the AWS provider; separate `aws_s3_bucket_versioning`, `aws_s3_bucket_server_side_encryption_configuration`, and `aws_s3_bucket_public_access_block` resources (provider ≥ v4 style, not inline blocks) |
| 1 | All 4 public-access-block flags set to true |
| 1 | Variable `validation` block with a sensible regex (`can(regex(...))`) and a useful error message |
| 1 | Tags merged (`merge(var.tags, {...})`, or provider `default_tags`) |
| 1 | Outputs present; commented backend block includes bucket, key, region, `encrypt = true`, and locking (`use_lockfile = true` or `dynamodb_table`) |

### G1 GitHub Actions (6 pts)
| Pts | Criterion |
|---|---|
| 1 | `on:` has `pull_request` + `push` on `main`, each with a `paths:` filter |
| 1 | Lint step (e.g. `hadolint/hadolint-action`) and a build on every trigger |
| 1 | Push is gated: `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` (or `push:` input to the build action built from that condition) |
| 1 | Logs in to GHCR with `GITHUB_TOKEN`; tags include the short SHA and `latest` |
| 1 | `permissions:` is minimal: `contents: read`, `packages: write` (only on the push job/step, ideally) |
| 1 | Actions pinned to versions; GitOps answer: CI stops `kubectl apply`/holding cluster creds and instead commits an image tag bump to a config repo (or Argo Image Updater does it) |

## Speed drill (S1)
Use the table in `drills/kubectl-speed-01.md`. Tasks done wrong count as not done.

## Career audit (J1-J5)
Use the rubric in `job-search/baseline-audit.md`.
