#!/usr/bin/env bash
# =====================================================================
#  SPOILER WARNING - do not read this file before finishing Part C.
#  It deploys the broken scenarios. Reading it = reading the answers.
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")"

CLUSTER="${DIAG_CLUSTER:-diag}"
CTX="kind-${CLUSTER}"
NS=diag-fix
k() { kubectl --context "$CTX" "$@"; }

echo "Preparing Part C ..."

# Reset node state left over from Part B admin tasks.
for n in $(k get nodes -o name); do k uncordon "${n#node/}" >/dev/null; done

# --- C8: node-level fault (applied first so workloads avoid that node) ---
docker exec "${CLUSTER}-worker" sh -c 'systemctl disable --now kubelet' >/dev/null 2>&1
printf "  waiting for a node to go NotReady"
for _ in $(seq 1 30); do
  st=$(k get node "${CLUSTER}-worker" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
  [ "$st" != "True" ] && break
  printf "."; sleep 5
done
echo
sleep 5  # let the node controller apply its NoSchedule taint

k delete namespace "$NS" --ignore-not-found --wait=true >/dev/null
k create namespace "$NS" >/dev/null

k apply -n "$NS" -f - >/dev/null <<'YAML'
# C1
apiVersion: apps/v1
kind: Deployment
metadata: {name: api, labels: {app: api}}
spec:
  replicas: 2
  selector: {matchLabels: {app: api}}
  template:
    metadata: {labels: {app: api}}
    spec:
      containers:
        - name: api
          image: nginx:1.27-alpne
          ports: [{containerPort: 80}]
---
# C2
apiVersion: apps/v1
kind: Deployment
metadata: {name: worker, labels: {app: worker}}
spec:
  replicas: 1
  selector: {matchLabels: {app: worker}}
  template:
    metadata: {labels: {app: worker}}
    spec:
      containers:
        - name: worker
          image: busybox:1.36
          command: ["sh", "-c", "echo worker starting in $MODE mode; sleep 36000"]
          env:
            - name: MODE
              valueFrom:
                configMapKeyRef: {name: worker-config, key: MODE}
---
# C3
apiVersion: apps/v1
kind: Deployment
metadata: {name: frontend, labels: {app: frontend}}
spec:
  replicas: 2
  selector: {matchLabels: {app: frontend}}
  template:
    metadata: {labels: {app: frontend}}
    spec:
      containers:
        - name: frontend
          image: nginx:1.27-alpine
          ports: [{containerPort: 80}]
---
apiVersion: v1
kind: Service
metadata: {name: frontend-svc}
spec:
  selector: {app: frontnd}
  ports: [{port: 80, targetPort: 80}]
---
# C4
apiVersion: apps/v1
kind: Deployment
metadata: {name: hungry, labels: {app: hungry}}
spec:
  replicas: 1
  selector: {matchLabels: {app: hungry}}
  template:
    metadata: {labels: {app: hungry}}
    spec:
      containers:
        - name: hungry
          image: nginx:1.27-alpine
          resources:
            requests: {cpu: "100", memory: 64Mi}
---
# C5
apiVersion: apps/v1
kind: Deployment
metadata: {name: checker, labels: {app: checker}}
spec:
  replicas: 1
  selector: {matchLabels: {app: checker}}
  template:
    metadata: {labels: {app: checker}}
    spec:
      containers:
        - name: checker
          image: nginx:1.27-alpine
          ports: [{containerPort: 80}]
          readinessProbe:
            httpGet: {path: /healthz, port: 8080}
            periodSeconds: 5
          livenessProbe:
            httpGet: {path: /healthz, port: 8080}
            initialDelaySeconds: 5
            periodSeconds: 5
---
# C6
apiVersion: v1
kind: ServiceAccount
metadata: {name: ci-bot}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: {name: deployment-viewer}
rules:
  - apiGroups: [""]
    resources: ["deployments"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: {name: ci-bot-view}
subjects:
  - kind: ServiceAccount
    name: ci-bot
    namespace: diag-fix
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: deploy-viewer
---
# C7
apiVersion: apps/v1
kind: Deployment
metadata: {name: backend, labels: {app: backend}}
spec:
  replicas: 2
  selector: {matchLabels: {app: backend}}
  template:
    metadata: {labels: {app: backend}}
    spec:
      containers:
        - name: backend
          image: nginx:1.27-alpine
          ports: [{containerPort: 80}]
---
apiVersion: v1
kind: Service
metadata: {name: backend-svc}
spec:
  selector: {app: backend}
  ports: [{port: 80, targetPort: 8080}]
YAML

cat <<'TXT'

Part C is live in namespace diag-fix. Timer starts now (75 minutes).
Read the tickets in part-c-troubleshooting.md. Do not re-read this script.
TXT
