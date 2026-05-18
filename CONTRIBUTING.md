# Contributing to Coco AI

Thanks for your interest in contributing! This document collects a few
practical notes that aren't obvious from the code alone.

## Development setup

```bash
pnpm install
pnpm tauri dev
```

## macOS: camera / microphone / accessibility permissions

Coco AI requests several sensitive macOS permissions (camera, microphone,
accessibility, screen recording, automation). The macOS privacy database
(TCC) keys grants by the tuple **(bundle id, code-signing identity)**. This
has two practical consequences for contributors:

### 1. Dev builds and release builds share a bundle id

Both `pnpm tauri dev` and the released `Coco-AI.app` use the bundle id
`rs.coco.app` (see `src-tauri/tauri.conf.json`). They are signed
differently (ad-hoc / personal identity vs. the team identity used in
CI), but the OS often surfaces them under the same row in
**System Settings → Privacy & Security**.

If you ever click **Don't Allow** on a dev build, the OS remembers that
denial and will **not** prompt again — including for the released app.
`getUserMedia()` and friends will then reject immediately with
`NotAllowedError`, and `requestCameraPermission()` becomes a no-op.

### 2. Resetting permissions

If permissions get into a bad state while developing, reset them from a
Terminal:

```bash
# Reset just one service:
tccutil reset Camera           rs.coco.app
tccutil reset Microphone       rs.coco.app
tccutil reset Accessibility    rs.coco.app
tccutil reset ScreenCapture    rs.coco.app
tccutil reset AppleEvents      rs.coco.app

# Or reset everything for this app at once:
tccutil reset All              rs.coco.app
```

Then relaunch Coco AI. The OS will prompt fresh the next time the
feature is used.

> Coco AI cannot run `tccutil` itself because it is sandboxed
> (`com.apple.security.app-sandbox` is set in `src-tauri/Entitlements.plist`)
> and `tccutil` is blocked from the sandbox. Settings → Privacy in the
> app surfaces the same instructions.

## Modifying `Info.plist`

Each `NS*UsageDescription` key in `src-tauri/Info.plist` MUST appear
exactly once. Duplicate keys cause undefined behavior in the macOS plist
parsers used during signing/notarization and can lead to a key being
silently stripped from the bundled `Info.plist`. The result is that the
OS refuses to show the TCC prompt and the feature fails for users with
no recoverable error message.

This invariant is enforced by `scripts/check-info-plist.cjs` and the
`.github/workflows/info-plist-check.yml` workflow. You can run the check
locally:

```bash
node scripts/check-info-plist.cjs
```

## Windows hosting the Camera component

`getUserMedia()` requires a "secure context". Any Tauri window that
renders `src/components/Search/Camera.tsx` (or that ever might) must set
`"useHttpsScheme": true` in its window config in
`src-tauri/tauri.conf.json`. The `main` window already does. If you add
a new window that hosts the camera, set this flag — otherwise the camera
will work in `tauri dev` (which loads `http://localhost:6060`, treated
as secure) but fail in production.
