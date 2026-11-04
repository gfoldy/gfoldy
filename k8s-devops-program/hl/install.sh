#!/usr/bin/env bash
# Put kubectl-hl on your PATH so `kubectl hl` (and `k hl`) work.
# Symlinks, so `git pull` updates the tool without re-installing.
set -euo pipefail
SRC="$(cd "$(dirname "$0")" && pwd)/kubectl-hl"
DEST_DIR="${1:-$HOME/.local/bin}"

mkdir -p "$DEST_DIR"
chmod +x "$SRC"
ln -sf "$SRC" "$DEST_DIR/kubectl-hl"
echo "Linked $DEST_DIR/kubectl-hl -> $SRC"

case ":$PATH:" in
  *":$DEST_DIR:"*) ;;
  *) echo
     echo "$DEST_DIR is not on your PATH. Add this to ~/.zshrc and open a new terminal:"
     echo "  export PATH=\"$DEST_DIR:\$PATH\"" ;;
esac

if command -v kubectl >/dev/null 2>&1 && kubectl plugin list 2>/dev/null | grep -q kubectl-hl; then
  echo "kubectl sees the plugin. Try: kubectl hl"
fi
