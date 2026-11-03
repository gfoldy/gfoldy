#!/usr/bin/env bash
# Week 1 diagnostic auto-grader.
#   ./grade.sh build   -> Part B build tasks (B1-B12, D1-app, M1)
#   ./grade.sh admin   -> Part B admin tasks (A2, A3)
#   ./grade.sh fix     -> Part C troubleshooting (C1-C8)
# Results are written to ../../progress/diagnostic/auto-scores.csv
# (re-running a part replaces that part's rows - your best attempt
#  is NOT kept; the coach grades your first timed attempt, so commit
#  the CSV right after each timed run).
#
# Works with macOS's default bash 3.2. Read-only against the cluster
# except for short-lived "grader-probe-*" pods it uses to test traffic.
set -uo pipefail
cd "$(dirname "$0")"

CLUSTER="${DIAG_CLUSTER:-diag}"
CTX="${DIAG_CONTEXT:-kind-${CLUSTER}}"
OUT="../../progress/diagnostic/auto-scores.csv"
PART="${1:-}"

k() { kubectl --context "$CTX" "$@"; }
jp() { k get "$@" 2>/dev/null; }   # usage: jp <kind> <name> -n ns -o jsonpath=...

TMP_ROWS="$(mktemp)"
TOTAL=0; MAX=0

record() { # id domain earned max note
  printf '%s,%s,%s,%s,auto,"%s"\n' "$1" "$2" "$3" "$4" "$5" >> "$TMP_ROWS"
  TOTAL=$((TOTAL + $3)); MAX=$((MAX + $4))
  if [ "$3" -eq "$4" ]; then mark="PASS"; elif [ "$3" -eq 0 ]; then mark="FAIL"; else mark="PART"; fi
  printf '  %-4s %-4s %s/%s  %s\n' "$1" "$mark" "$3" "$4" "$5"
}

# Run a one-shot busybox pod and print what wget returns (empty on failure).
probe() { # ns url [labels]
  local ns="$1" url="$2" labels="${3:-role=frontend}"
  k run "grader-probe-$$-$RANDOM" -n "$ns" --image=busybox:1.36 --restart=Never \
    --labels="$labels" --rm -i --quiet --pod-running-timeout=90s \
    --command -- wget -qO- -T 4 "$url" 2>/dev/null
}

ready_eq_desired() { # ns deploy -> 0 if readyReplicas == spec.replicas > 0
  local want got
  want=$(jp deploy "$2" -n "$1" -o jsonpath='{.spec.replicas}')
  got=$(jp deploy "$2" -n "$1" -o jsonpath='{.status.readyReplicas}')
  [ -n "$want" ] && [ "$want" != "0" ] && [ "$got" = "$want" ]
}

can_i() { # verb resource ns sa
  k auth can-i "$1" "$2" -n "$3" --as="system:serviceaccount:$3:$4" 2>/dev/null
}

# ------------------------------------------------------------------ PART B
grade_build() {
  local ns=diag-build
  echo "Part B - build tasks (namespace $ns)"

  # B1 deployment spec
  local p=0
  if jp deploy web -n $ns -o name >/dev/null; then
    [ "$(jp deploy web -n $ns -o jsonpath='{.spec.template.metadata.labels.app}')" = "web" ] && p=$((p+1))
    [ "$(jp deploy web -n $ns -o jsonpath='{.spec.template.spec.containers[0].ports[0].containerPort}')" = "80" ] && p=$((p+1))
    [ "$(jp deploy web -n $ns -o jsonpath='{.spec.template.spec.containers[0].resources.requests.cpu}')" = "50m" ] &&
    [ "$(jp deploy web -n $ns -o jsonpath='{.spec.template.spec.containers[0].resources.requests.memory}')" = "64Mi" ] && p=$((p+1))
    [ "$(jp deploy web -n $ns -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}')" = "128Mi" ] && p=$((p+1))
    record B1 D3 $p 4 "deployment web: labels/port/requests/limits"
  else record B1 D3 0 4 "deployment web not found"; fi

  # B2 scale + rollout + rollback
  p=0
  if jp deploy web -n $ns -o name >/dev/null; then
    [ "$(jp deploy web -n $ns -o jsonpath='{.spec.replicas}')" = "5" ] && ready_eq_desired $ns web && p=$((p+1))
    [ "$(jp deploy web -n $ns -o jsonpath='{.spec.template.spec.containers[0].image}')" = "nginx:1.27-alpine" ] && p=$((p+1))
    rev=$(jp deploy web -n $ns -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
    [ -n "$rev" ] && [ "$rev" -ge 3 ] && p=$((p+1))
    record B2 D3 $p 3 "web: 5 ready replicas, rolled back to 1.27, revision>=3 (rev=${rev:-none})"
  else record B2 D3 0 3 "deployment web not found"; fi

  # B3 service
  p=0
  if jp svc web-svc -n $ns -o name >/dev/null; then
    [ "$(jp svc web-svc -n $ns -o jsonpath='{.spec.type}')" = "ClusterIP" ] &&
    [ "$(jp svc web-svc -n $ns -o jsonpath='{.spec.ports[0].port}')" = "8080" ] && p=$((p+1))
    eps=$(jp endpoints web-svc -n $ns -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w | tr -d ' ')
    [ "$eps" -ge 1 ] && p=$((p+1))
    probe $ns "http://web-svc.$ns.svc.cluster.local:8080" | grep -qi "nginx" && p=$((p+1))
    record B3 D4 $p 3 "web-svc ClusterIP:8080, endpoints=$eps, reachable by FQDN"
  else record B3 D4 0 3 "service web-svc not found"; fi

  # B4 configmap/secret/env/volume
  p=0
  if jp pod config-pod -n $ns -o name >/dev/null; then
    [ "$(k exec -n $ns config-pod -- printenv APP_MODE 2>/dev/null)" = "diagnostic" ] && p=$((p+1))
    [ "$(k exec -n $ns config-pod -- printenv DB_PASSWORD 2>/dev/null)" = "s3cr3t" ] &&
    [ "$(jp secret app-secret -n $ns -o jsonpath='{.data.DB_PASSWORD}')" != "" ] && p=$((p+1))
    [ "$(k exec -n $ns config-pod -- cat /etc/app/LOG_LEVEL 2>/dev/null)" = "debug" ] && p=$((p+1))
    record B4 D3 $p 3 "config-pod: env from CM, env from Secret, CM mounted at /etc/app"
  else record B4 D3 0 3 "pod config-pod not found"; fi

  # B5 PVC
  p=0
  [ "$(jp pvc data-pvc -n $ns -o jsonpath='{.status.phase}')" = "Bound" ] && p=$((p+1))
  [ -n "$(k exec -n $ns writer -- cat /data/out.txt 2>/dev/null)" ] && p=$((p+2))
  record B5 D5 $p 3 "data-pvc Bound; writer wrote /data/out.txt"

  # B6 node selection
  p=0
  if [ "$(jp pod pinned -n $ns -o jsonpath='{.status.phase}')" = "Running" ]; then
    node=$(jp pod pinned -n $ns -o jsonpath='{.spec.nodeName}')
    [ "$(jp node "$node" -o jsonpath='{.metadata.labels.disk}')" = "ssd" ] &&
    jp pod pinned -n $ns -o json | grep -q '"disk"' && p=2
  fi
  record B6 D5 $p 2 "pod pinned running on a disk=ssd node via selector/affinity"

  # B7 cronjob + manual job
  p=0
  [ "$(jp cronjob ticker -n $ns -o jsonpath='{.spec.schedule}')" = "*/5 * * * *" ] && p=$((p+1))
  [ "$(jp job ticker-manual -n $ns -o jsonpath='{.status.succeeded}')" = "1" ] &&
  [ "$(jp job ticker-manual -n $ns -o jsonpath='{.metadata.annotations.cronjob\.kubernetes\.io/instantiate}')" = "manual" ] && p=$((p+1))
  record B7 D3 $p 2 "cronjob ticker */5; job ticker-manual created from it and succeeded"

  # B8 RBAC
  p=0
  [ "$(can_i list pods $ns reader)" = "yes" ] && p=$((p+1))
  [ "$(can_i watch pods $ns reader)" = "yes" ] && p=$((p+1))
  [ "$(can_i delete pods $ns reader)" = "no" ] && [ "$(can_i list secrets $ns reader)" = "no" ] && p=$((p+1))
  [ "$(jp rolebinding -n $ns -o jsonpath='{.items[*].roleRef.name}' | tr ' ' '\n' | grep -cx pod-reader)" -ge 1 ] && p=$((p+1))
  record B8 D7 $p 4 "SA reader: get/list/watch pods only, via Role pod-reader"

  # B9 network policy (spec check; enforcement depends on CNI)
  p=0
  if jp networkpolicy web-allow-frontend -n $ns -o name >/dev/null; then
    [ "$(jp networkpolicy web-allow-frontend -n $ns -o jsonpath='{.spec.podSelector.matchLabels.app}')" = "web" ] && p=$((p+1))
    [ "$(jp networkpolicy web-allow-frontend -n $ns -o jsonpath='{.spec.ingress[0].from[0].podSelector.matchLabels.role}')" = "frontend" ] && p=$((p+1))
    [ "$(jp networkpolicy web-allow-frontend -n $ns -o jsonpath='{.spec.ingress[0].ports[0].port}')" = "80" ] && p=$((p+1))
    blocked="not enforced by this CNI"
    probe $ns "http://web-svc:8080" "role=intruder" | grep -qi nginx || blocked="enforced"
    record B9 D4 $p 3 "netpol web-allow-frontend selector/from/port ($blocked)"
  else record B9 D4 0 3 "networkpolicy web-allow-frontend not found"; fi

  # B10 probes
  p=0
  if jp deploy probed -n $ns -o name >/dev/null; then
    [ -n "$(jp deploy probed -n $ns -o jsonpath='{.spec.template.spec.containers[0].readinessProbe.httpGet.port}')" ] && p=$((p+1))
    [ -n "$(jp deploy probed -n $ns -o jsonpath='{.spec.template.spec.containers[0].livenessProbe}')" ] && ready_eq_desired $ns probed && p=$((p+1))
    record B10 D3 $p 2 "deployment probed: httpGet readiness + liveness, all Ready"
  else record B10 D3 0 2 "deployment probed not found"; fi

  # B11 kustomize
  p=0
  [ -f kustomize-start/overlays/diag/kustomization.yaml ] && p=$((p+1))
  [ "$(jp deploy kz-hello -n $ns -o jsonpath='{.spec.replicas}')" = "2" ] && p=$((p+1))
  jp svc kz-hello -n $ns -o name >/dev/null && p=$((p+1))
  record B11 D8 $p 3 "overlay file exists; kz-hello deployment (2 replicas) + service applied"

  # B12 helm
  p=0
  if command -v helm >/dev/null 2>&1; then
    helm --kube-context "$CTX" status hello -n $ns 2>/dev/null | grep -q "STATUS: deployed" && p=$((p+1))
    [ "$(jp deploy hello -n $ns -o jsonpath='{.spec.replicas}')" = "2" ] && p=$((p+1))
    [ "$(jp deploy hello -n $ns -o jsonpath='{.spec.template.spec.containers[0].image}')" = "nginx:1.27-alpine" ] && ready_eq_desired $ns hello && p=$((p+1))
    record B12 D8 $p 3 "helm release hello deployed, 2 replicas, nginx:1.27-alpine, Ready"
  else record B12 D8 0 3 "helm not installed"; fi

  # D-1 container image
  p=0
  if ready_eq_desired $ns diag-app; then
    p=$((p+1))
    probe $ns "http://diag-app.$ns.svc.cluster.local:8080/" | grep -q "diag-app ok" && p=$((p+1))
    uid=$(probe $ns "http://diag-app.$ns.svc.cluster.local:8080/whoami" | sed -n 's/^uid=//p')
    [ -n "$uid" ] && [ "$uid" != "0" ] && p=$((p+1))
    img=$(jp deploy diag-app -n $ns -o jsonpath='{.spec.template.spec.containers[0].image}')
    size=$(docker image inspect "$img" --format '{{.Size}}' 2>/dev/null || echo 0)
    [ "$size" -gt 0 ] && [ "$size" -lt 30000000 ] && p=$((p+1))
    record D1 D2 $p 4 "diag-app Ready, served via svc, uid=${uid:-?} (non-root), image $((size/1000000))MB (<30MB)"
  else record D1 D2 0 4 "deployment diag-app not Ready (or missing)"; fi

  # M1 metrics
  if k top nodes >/dev/null 2>&1; then record M1 D11 3 3 "metrics API serving (kubectl top nodes works)"
  else record M1 D11 0 3 "kubectl top nodes fails"; fi
}

grade_admin() {
  echo "Part B - admin tasks"
  if docker exec "${CLUSTER}-control-plane" test -s /var/lib/etcd/diag-snap.db 2>/dev/null; then
    record A2 D12 3 3 "etcd snapshot at /var/lib/etcd/diag-snap.db on control plane"
  else record A2 D12 0 3 "no snapshot at /var/lib/etcd/diag-snap.db on ${CLUSTER}-control-plane"; fi

  local node="${CLUSTER}-worker2" p=0
  [ "$(jp node "$node" -o jsonpath='{.spec.unschedulable}')" = "true" ] && p=$((p+1))
  owners=$(k get pods -A --field-selector "spec.nodeName=$node" \
    -o jsonpath='{range .items[*]}{.metadata.ownerReferences[0].kind}{"\n"}{end}' 2>/dev/null | grep -vcx DaemonSet)
  [ "$owners" -eq 0 ] && p=$((p+1))
  record A3 D12 $p 2 "$node cordoned and drained (non-DaemonSet pods left: $owners)"
}

grade_fix() {
  local ns=diag-fix
  echo "Part C - troubleshooting (namespace $ns)"
  ready_eq_desired $ns api && record C1 D6 2 2 "api Ready" || record C1 D6 0 2 "api not Ready"

  p=0
  ready_eq_desired $ns worker && p=$((p+1))
  pod=$(jp pods -n $ns -l app=worker --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')
  [ -n "$pod" ] && [ "$(k exec -n $ns "$pod" -- printenv MODE 2>/dev/null)" = "batch" ] && p=$((p+1))
  record C2 D6 $p 2 "worker Ready with MODE=batch"

  p=0
  eps=$(jp endpoints frontend-svc -n $ns -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w | tr -d ' ')
  [ "$eps" -ge 1 ] && p=$((p+1))
  probe $ns "http://frontend-svc" | grep -qi nginx && p=$((p+1))
  record C3 D6 $p 2 "frontend-svc has endpoints ($eps) and serves traffic"

  ready_eq_desired $ns hungry && record C4 D6 2 2 "hungry scheduled and Ready" || record C4 D6 0 2 "hungry not Ready"

  p=0
  ready_eq_desired $ns checker && p=$((p+1))
  restarts=$(jp pods -n $ns -l app=checker -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}')
  sleep 15
  restarts2=$(jp pods -n $ns -l app=checker -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}')
  [ -n "$restarts" ] && [ "$restarts" = "$restarts2" ] && ready_eq_desired $ns checker && p=$((p+1))
  record C5 D6 $p 2 "checker Ready and not restart-looping"

  p=0
  [ "$(can_i list deployments.apps $ns ci-bot)" = "yes" ] && p=$((p+2))
  [ "$(can_i delete deployments.apps $ns ci-bot)" = "no" ] && [ "$(can_i list secrets $ns ci-bot)" = "no" ] && [ $p -gt 0 ] && p=$((p+1))
  record C6 D7 $p 3 "ci-bot can list deployments (and nothing more)"

  probe $ns "http://backend-svc" | grep -qi nginx && record C7 D6 2 2 "backend-svc serves traffic" \
    || record C7 D6 0 2 "backend-svc does not serve traffic"

  p=0
  [ "$(jp node "${CLUSTER}-worker" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')" = "True" ] && p=$((p+2))
  docker exec "${CLUSTER}-worker" systemctl is-enabled kubelet >/dev/null 2>&1 && [ $p -gt 0 ] && p=$((p+1))
  record C8 D6 $p 3 "${CLUSTER}-worker Ready, kubelet enabled (survives reboot)"
}

case "$PART" in
  build) PREFIXES="B D1 M1"; grade_build ;;
  admin) PREFIXES="A2 A3"; grade_admin ;;
  fix)   PREFIXES="C"; grade_fix ;;
  *) echo "usage: $0 build|admin|fix"; exit 1 ;;
esac

# Replace this part's previous rows, keep everything else.
mkdir -p "$(dirname "$OUT")"
[ -f "$OUT" ] || echo "item,domain,earned,max,source,note" > "$OUT"
KEEP="$(mktemp)"
pattern=$(echo "$PREFIXES" | sed 's/ /|/g')
grep -Ev "^(${pattern})[0-9]*," "$OUT" > "$KEEP" || true
cat "$KEEP" "$TMP_ROWS" > "$OUT"
rm -f "$KEEP" "$TMP_ROWS"

echo
echo "Part total: $TOTAL / $MAX   (saved to progress/diagnostic/auto-scores.csv)"
echo "Commit it now:  git add -A && git commit -m 'diag: grade $PART'"
