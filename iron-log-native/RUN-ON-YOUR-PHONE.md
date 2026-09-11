# Run Iron Log on your iPhone (the 5-minute version)

This shows your app on your own phone instantly — no App Store, no Apple
account needed. It's how you preview the app while it's being built.

## What you need (one time)

- **On your iPhone:** the **Expo Go** app (from the App Store). ✅ you have this.
- **On your Mac:** **Node.js**. You do NOT install "Expo" on the Mac — the
  command below fetches it automatically.
- **iPhone and Mac on the same Wi-Fi.**

### Is Node.js on your Mac already?

Open the **Terminal** app and type:

```bash
node --version
```

- Prints a number like `v20.x` / `v22.x` → you're good.
- Says `command not found` → download the **LTS** installer from
  <https://nodejs.org> and run it. Then reopen Terminal.

## Every time you want to see the app

In Terminal, run these (the first line assumes the project is in your home
folder — adjust the path if you cloned it somewhere else):

```bash
cd ~/gfoldy/iron-log-native
npm install          # only needed the first time, or after code changes
cd apps/mobile
npx expo start
```

A **QR code** appears in the terminal.

- **iPhone:** open the **Camera** app, point it at the QR code, tap the
  banner that pops up → it opens in Expo Go.

That's it. The app loads on your phone. Log a workout, check the Progress
charts, build a split — the solo features all work right now.

The **People / Ranks** tabs will say "sign in once the API is live" — that's
expected until the backend is deployed (a separate, optional step).

## When something goes wrong

- **QR won't connect / spins forever:** make sure the phone and Mac are on the
  same Wi-Fi. If your Wi-Fi blocks devices from seeing each other (common on
  guest/office networks), run `npx expo start --tunnel` instead — slower, but
  works across networks.
- **A screen shows a red error:** screenshot it and send it over — that's a bug
  to fix, not something you did wrong.
- **"Metro" or cache weirdness:** stop the server (Ctrl+C) and rerun with
  `npx expo start -c` (the `-c` clears the cache).
- **To stop the server:** press `Ctrl + C` in the terminal.

## Good to know

- Leave `npx expo start` running while you use the app. When code changes, the
  app on your phone refreshes automatically.
- Nothing here touches the App Store or costs anything. Publishing to the App
  Store is a separate step later (needs an Apple Developer account).
