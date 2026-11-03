#!/usr/bin/env bash
# Delete the diagnostic cluster. Your scores in ../../progress/ are kept.
set -euo pipefail
CLUSTER="${DIAG_CLUSTER:-diag}"
read -r -p "Delete kind cluster '$CLUSTER'? [y/N] " ans
[ "$ans" = "y" ] || [ "$ans" = "Y" ] || { echo "Aborted."; exit 0; }
kind delete cluster --name "$CLUSTER"
