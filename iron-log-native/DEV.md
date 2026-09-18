# Iron Log — day-to-day dev loop

The fast path for seeing changes on your phone.

## The one-word update

After Claude pushes a change, open a Terminal and run:

```bash
ironlog
```

That's it — it syncs your copy to exactly what was pushed, reinstalls
dependencies only if they changed, kills any stale Metro server, and starts
Expo with a clean cache. Then scan the QR in Expo Go.

`ironlog --fast` skips the cache clear (a little quicker; use it for most
changes, fall back to plain `ironlog` if something looks stale).

### One-time setup (makes `ironlog` work)

Add the alias to your shell, once:

```bash
echo "alias ironlog='bash ~/gfoldy/iron-log-native/scripts/refresh.sh'" >> ~/.zshrc
source ~/.zshrc
```

(If your repo isn't at `~/gfoldy`, point the path at wherever it lives.)

### Without the alias

Same thing, from the `apps/mobile` folder:

```bash
npm run go          # = the sync + start script
npm run go -- --fast
```

## Why not `git pull`?

`git pull` merges, and it silently no-ops when your local branch is stale —
which is exactly what made earlier updates "not show up." Since all edits are
pushed from Claude Code and you only *view* locally, the script does a
`git reset --hard origin/<branch>` so your working tree always matches the
push byte-for-byte. **This discards local edits** — intended here. If you ever
start editing files locally, stop using it and let Claude know.

## Handy checks

```bash
git rev-parse --short HEAD                 # which commit you're on
grep -c "0a0c0b" apps/mobile/src/theme.ts  # sanity-check a change landed
```
