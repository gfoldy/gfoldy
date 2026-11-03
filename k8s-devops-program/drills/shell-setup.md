# Shell Setup (exam-style)

Set this up once on your Mac (zsh). Then practice typing the **exam version** from memory until it takes under 2 minutes, because the CKA terminal starts out nearly bare.

## On your Mac (`~/.zshrc`)
```bash
source <(kubectl completion zsh)
alias k=kubectl
compdef __start_kubectl k
export do="--dry-run=client -o yaml"   # k run x --image=nginx $do > x.yaml
export now="--force --grace-period 0"  # k delete pod x $now
alias kn='kubectl config set-context --current --namespace'
```

## Exam version (bash, type this from memory)
```bash
alias k=kubectl                         # usually pre-configured, but check
source <(kubectl completion bash)
complete -o default -F __start_kubectl k
export do="--dry-run=client -o yaml"
export now="--force --grace-period 0"
```

## vim (`~/.vimrc`), for editing YAML
```vim
set expandtab tabstop=2 shiftwidth=2 autoindent number
```

## Habits that save minutes
- Always start from generated YAML: `k create deploy web --image=nginx $do > web.yaml`.
- `k explain pod.spec.containers.livenessProbe --recursive | less` beats searching the docs.
- Set the namespace per task (`kn diag-build`) instead of typing `-n` every time.
- In the exam, run the `kubectl config use-context ...` line each task gives you. Every time.
