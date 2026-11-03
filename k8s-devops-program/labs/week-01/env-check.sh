#!/usr/bin/env bash
# Week 1, Session 0: verify your macOS toolchain. Read-only.
set -uo pipefail

ok=0; bad=0
check() { # name cmd required(yes/no) install-hint
  if command -v "$1" >/dev/null 2>&1; then
    printf '  [ok]   %-10s %s\n' "$1" "$(eval "$2" 2>/dev/null | head -1)"
    ok=$((ok+1))
  else
    if [ "$3" = yes ]; then printf '  [MISS] %-10s required  -> %s\n' "$1" "$4"; bad=$((bad+1))
    else printf '  [--]   %-10s optional  -> %s\n' "$1" "$4"; fi
  fi
}

echo "Toolchain"
check docker    "docker version --format 'client {{.Client.Version}}'" yes "Docker Desktop, OrbStack, or 'brew install colima docker'"
check kind      "kind version"                    yes "brew install kind"
check kubectl   "kubectl version --client | head -1" yes "brew install kubectl"
check helm      "helm version --short"            yes "brew install helm"
check terraform "terraform version | head -1"     yes "brew tap hashicorp/tap && brew install hashicorp/tap/terraform"
check aws       "aws --version"                   yes "brew install awscli"
check git       "git --version"                   yes "xcode-select --install"
check python3   "python3 --version"               yes "xcode-select --install (needed for score.py)"
check jq        "jq --version"                    no  "brew install jq"
check k9s       "k9s version --short | head -1"   no  "brew install k9s (nice to have; NOT allowed in the CKA exam)"
check gh        "gh --version | head -1"          no  "brew install gh"

echo
echo "Docker daemon"
if docker info >/dev/null 2>&1; then
  echo "  [ok]   reachable ($(docker info --format '{{.OperatingSystem}}, {{.NCPU}} CPU, {{.MemTotal}} bytes RAM' 2>/dev/null))"
  mem=$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo 0)
  [ "$mem" -lt 6000000000 ] && echo "  [warn] Docker VM has <6 GB RAM; give it 6-8 GB for a 3-node kind cluster"
else
  echo "  [MISS] not reachable - start Docker Desktop / OrbStack / 'colima start --cpu 4 --memory 8'"; bad=$((bad+1))
fi

echo
echo "kubectl contexts (your homelab should be listed here)"
kubectl config get-contexts 2>/dev/null | sed 's/^/  /' || echo "  none"

echo
echo "AWS identity (only needed from Week 6; failure here is fine in Week 1)"
aws sts get-caller-identity --query 'Arn' --output text 2>/dev/null | sed 's/^/  /' || echo "  not configured"

echo
if [ "$bad" -eq 0 ]; then echo "All required tools present. Next: ./setup.sh"
else echo "$bad required item(s) missing. Fix them before Session 1."; fi
