#!/usr/bin/env bash
# Week 1 diagnostic: create the disposable "diag" kind cluster and namespaces.
# Safe to re-run. Does NOT touch your homelab cluster.
set -euo pipefail
cd "$(dirname "$0")"

CLUSTER="${DIAG_CLUSTER:-diag}"
CTX="kind-${CLUSTER}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "MISSING: $1 (run ./env-check.sh)"; exit 1; }; }
need docker; need kind; need kubectl

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not reachable. Start Docker Desktop / OrbStack / Colima first."
  exit 1
fi

if kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
  echo "kind cluster '$CLUSTER' already exists - reusing it."
else
  kind create cluster --config kind-diag.yaml --name "$CLUSTER"
fi

kubectl --context "$CTX" wait --for=condition=Ready nodes --all --timeout=180s
kubectl --context "$CTX" create namespace diag-build --dry-run=client -o yaml | kubectl --context "$CTX" apply -f -

echo
echo "Ready. Your diagnostic context is: $CTX"
echo "Switch to it with:  kubectl config use-context $CTX"
kubectl --context "$CTX" get nodes -o wide
