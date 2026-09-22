# LFT — roadmap / idea parking lot

Ideas captured so we don't lose them. Not started unless noted. Rough effort
and feasibility notes included so any of these is easy to pick up later.

## In progress
- **Logo + theme polish** — LFT dark / electric-green identity across every
  screen (Today done; Progress, Ranks, Split still to match; metallic-silver
  treatment on big display numbers).

## Planned

### Rest timer  ·  feasibility: easy, no native build needed
A countdown timer between sets.
- Auto-start when a set is checked done (with a per-exercise default rest, e.g.
  90s / 120s / 180s), plus a manual start and quick +15s / −15s / skip.
- Show it inline on the Today set row and/or as a slim sticky bar.
- Fire a local notification + haptic when it hits zero so it works with the
  screen off — via `expo-notifications` (in Expo Go for foreground; a dev build
  makes background/locked-screen alerts reliable).
- All app-side/JS; no HealthKit or watch target required. Could ship well
  before the health/watch work.

### Apple Health + Apple Watch sync  ·  feasibility: needs a dev build (not Expo Go)
Two related but separate pieces:
1. **Apple Health (HealthKit)** — read/write workouts, bodyweight, active
   energy. Doable with a HealthKit library behind an Expo **config plugin**
   (e.g. `@kingstinct/react-native-healthkit`). Requires a custom **EAS dev
   build** — HealthKit is not in the Expo Go sandbox — plus the HealthKit
   entitlement and Info.plist usage strings, and an Apple Developer account.
   Scope v1: write each finished LFT session as a HealthKit strength-training
   workout; pull bodyweight into the Body tab.
2. **Apple Watch companion app** — logging sets / seeing the rest timer on the
   wrist. Bigger lift: a native **watchOS target** in a bare/prebuilt project,
   built in Xcode, communicating via WatchConnectivity. Realistically a phase 2
   after the phone app is on TestFlight.
- Dependency: both need the move off Expo Go to an EAS build anyway — good to
  pair with the TestFlight milestone.

## Later / maybe
- Real gym photo in the Today hero (instead of the gradient).
- Uploadable profile photo (currently initials tile).
- Follower / following counts + "Friends" badge on the profile.
