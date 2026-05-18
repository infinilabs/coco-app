import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Camera as CameraIcon,
  CameraOff,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FlipHorizontal2,
  RefreshCcw,
  Settings as SettingsIcon,
  SwitchCamera,
} from "lucide-react";
import clsx from "clsx";

import platformAdapter from "@/utils/platformAdapter";
import { isMac } from "@/utils/platform";
import { useAppStore } from "@/stores/appStore";
import { copyToClipboard } from "@/utils";

/**
 * Permission state machine.
 *
 * macOS's TCC system distinguishes four states for camera access:
 *   - notDetermined: user has never been asked
 *   - granted:      user said yes
 *   - denied:       user said no (OS will NOT prompt again)
 *   - restricted:   blocked by parental controls / MDM
 *
 * The `tauri-plugin-macos-permissions-api` only exposes a boolean check, so
 * we distinguish "denied" from "notDetermined" empirically: after asking the
 * plugin to request permission, we attempt `getUserMedia` directly. If the
 * OS has already denied this app, `getUserMedia` rejects synchronously with
 * a `NotAllowedError`; if the user simply hasn't responded yet, it will
 * either resolve (granted) or hang waiting on the system prompt.
 */
type PermissionState =
  | "checking"
  | "prompting"
  | "granted"
  | "denied"
  | "restricted"
  | "error";

/** Map a DOMException name from getUserMedia to our permission state. */
function classifyMediaError(err: unknown): {
  state: PermissionState;
  name: string;
  message: string;
} {
  const e = err as { name?: string; message?: string } | null | undefined;
  const name = e?.name ?? "UnknownError";
  const message = e?.message ?? String(err);
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      // SecurityError on macOS Safari/WebKit typically means TCC denied.
      return { state: "denied", name, message };
    case "NotFoundError":
    case "OverconstrainedError":
    case "NotReadableError":
      // Hardware-level failure (no camera, in use by another app, …).
      return { state: "error", name, message };
    default:
      return { state: "error", name, message };
  }
}

const Camera = () => {
  const { t } = useTranslation();
  const withVisibility = useAppStore((state) => state.withVisibility);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use a ref to track stream to avoid stale closure issues in cleanup.
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [mirrored, setMirrored] = useState(true);
  const [permission, setPermission] = useState<PermissionState>("checking");
  const [lastError, setLastError] = useState<{
    name: string;
    message: string;
  } | null>(null);
  const [flashVisible, setFlashVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnosticsCopied, setDiagnosticsCopied] = useState(false);
  // Increment to trigger a re-check from the recovery panel.
  const [recheckNonce, setRecheckNonce] = useState(0);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize: check permissions, enumerate devices, start camera.
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setPermission("checking");
      setLastError(null);
      setReady(false);
      try {
        // Step 1: On macOS, check the native TCC status first so we can
        // distinguish the four states up front and avoid pointless polling
        // when the user has already denied.
        if (isMac) {
          let granted = await platformAdapter.checkCameraPermission();
          if (!granted) {
            // notDetermined OR denied. Ask the plugin to request — this is
            // a no-op for previously-denied apps.
            setPermission("prompting");
            platformAdapter.requestCameraPermission();

            // Poll briefly for granted. Use a SHORT timeout (8s) instead of
            // the old 60s — if the user denies we want to show the recovery
            // UI quickly, not stare at a spinner.
            const POLL_TIMEOUT_MS = 8000;
            const POLL_INTERVAL_MS = 500;
            const startedAt = Date.now();
            while (!granted && Date.now() - startedAt < POLL_TIMEOUT_MS) {
              if (cancelled) return;
              await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
              granted = await platformAdapter.checkCameraPermission();
            }

            if (!granted) {
              // Definitively classify by attempting getUserMedia. If the OS
              // already denied this app, it rejects immediately.
              if (cancelled) return;
              try {
                const probe = await navigator.mediaDevices.getUserMedia({
                  video: true,
                  audio: false,
                });
                // User granted right at the end of polling.
                granted = true;
                // Re-use this stream below to avoid a second prompt.
                streamRef.current = probe;
              } catch (err) {
                if (cancelled) return;
                const classified = classifyMediaError(err);
                console.error(
                  `[Camera] getUserMedia rejected: ${classified.name} - ${classified.message}`
                );
                setLastError({
                  name: classified.name,
                  message: classified.message,
                });
                setPermission(classified.state);
                return;
              }
            }
          }
        }
        if (cancelled) return;

        // Step 2: Request a stream (or reuse the probe stream from step 1).
        let initialStream: MediaStream;
        if (streamRef.current) {
          initialStream = streamRef.current;
        } else {
          try {
            initialStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } catch (err) {
            const classified = classifyMediaError(err);
            console.error(
              `[Camera] getUserMedia rejected: ${classified.name} - ${classified.message}`
            );
            if (!cancelled) {
              setLastError({
                name: classified.name,
                message: classified.message,
              });
              setPermission(classified.state);
            }
            return;
          }
        }
        if (cancelled) {
          initialStream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          return;
        }

        // Step 3: Enumerate devices now that we have permission.
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(
          (d) => d.kind === "videoinput"
        );
        if (cancelled) {
          initialStream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          return;
        }

        setDevices(videoDevices);

        // Step 4: Use the initial stream directly and set the selected device.
        streamRef.current = initialStream;
        setStream(initialStream);

        if (videoRef.current) {
          videoRef.current.srcObject = initialStream;
        }

        if (videoDevices.length > 0) {
          // Find the device that matches the current stream's track.
          const currentTrack = initialStream.getVideoTracks()[0];
          const trackSettings = currentTrack?.getSettings();
          const currentDeviceId = trackSettings?.deviceId || "";

          const matchedDevice = videoDevices.find(
            (d) => d.deviceId === currentDeviceId
          );
          setSelectedDeviceId(
            matchedDevice?.deviceId || videoDevices[0].deviceId
          );
        }

        setPermission("granted");
        setLastError(null);
      } catch (err) {
        const classified = classifyMediaError(err);
        console.error(
          `[Camera] initialization failed: ${classified.name} - ${classified.message}`
        );
        // Always release any probe stream we may have acquired before
        // the failure, otherwise the camera light stays on.
        stopCurrentStream();
        if (!cancelled) {
          setLastError({
            name: classified.name,
            message: classified.message,
          });
          setPermission(classified.state);
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      stopCurrentStream();
    };
  }, [t, stopCurrentStream, recheckNonce]);

  // Switch camera when device selection changes (after initial setup).
  useEffect(() => {
    if (permission !== "granted" || !ready || !selectedDeviceId) return;

    // Check if the current stream already uses the selected device.
    if (streamRef.current) {
      const currentTrack = streamRef.current.getVideoTracks()[0];
      const currentDeviceId = currentTrack?.getSettings()?.deviceId;
      if (currentDeviceId === selectedDeviceId) {
        return; // Already using this device.
      }
    }

    let cancelled = false;

    const switchToDevice = async () => {
      try {
        setReady(false);
        stopCurrentStream();

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDeviceId } },
          audio: false,
        });

        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        setLastError(null);
      } catch (err) {
        const classified = classifyMediaError(err);
        console.error(
          `[Camera] failed to switch camera: ${classified.name} - ${classified.message}`
        );
        if (!cancelled) {
          setLastError({
            name: classified.name,
            message: classified.message,
          });
          setPermission(classified.state);
        }
      }
    };

    switchToDevice();

    return () => {
      cancelled = true;
    };
  }, [selectedDeviceId, ready, permission, stopCurrentStream]);

  const takePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 150);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) return;

    const filePath = await withVisibility(() =>
      platformAdapter.saveFileDialog({
        defaultPath: `coco-photo-${Date.now()}.png`,
        filters: [{ name: "Image", extensions: ["png"] }],
      })
    );

    if (filePath) {
      const arrayBuffer = await blob.arrayBuffer();
      await platformAdapter.invokeBackend("save_camera_photo", {
        path: filePath,
        data: Array.from(new Uint8Array(arrayBuffer)),
      });
    }
  }, [mirrored, withVisibility]);

  const toggleMirror = useCallback(() => {
    setMirrored((prev) => !prev);
  }, []);

  const switchCamera = useCallback(() => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex(
      (d) => d.deviceId === selectedDeviceId
    );
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  }, [devices, selectedDeviceId]);

  // Open the macOS System Settings → Privacy → Camera pane directly.
  const openSystemSettings = useCallback(() => {
    if (isMac) {
      platformAdapter.openUrl(
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera"
      );
    }
  }, []);

  const recheck = useCallback(() => {
    stopCurrentStream();
    setRecheckNonce((n) => n + 1);
  }, [stopCurrentStream]);

  // Diagnostics info shown in the recovery panel.
  const diagnostics = useMemo(() => {
    return {
      bundleId: "rs.coco.app",
      appVersion: (typeof process !== "undefined" && process.env?.VERSION) || "unknown",
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      lastErrorName: lastError?.name ?? "none",
      lastErrorMessage: lastError?.message ?? "none",
      permissionState: permission,
    };
  }, [lastError, permission]);

  const copyDiagnostics = useCallback(async () => {
    const text = Object.entries(diagnostics)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    await copyToClipboard(text, true);
    setDiagnosticsCopied(true);
    setTimeout(() => setDiagnosticsCopied(false), 1500);
  }, [diagnostics]);

  const renderRecoveryPanel = () => {
    const isDenied = permission === "denied";
    const isRestricted = permission === "restricted";
    const titleKey = isRestricted
      ? "camera.restricted.title"
      : isDenied
      ? "camera.denied.title"
      : "camera.errorAccess";
    const bodyKey = isRestricted
      ? "camera.restricted.body"
      : isDenied
      ? "camera.denied.body"
      : "camera.error.body";

    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-8 text-white/80 max-w-md mx-auto">
        <CameraOff size={48} className="text-white/60" />
        <h3 className="text-base font-semibold text-white">{t(titleKey)}</h3>
        <p className="text-sm text-center text-white/70 whitespace-pre-line">
          {t(bodyKey)}
        </p>

        <div className="flex flex-col gap-2 w-full mt-2">
          {isMac && isDenied && (
            <button
              onClick={openSystemSettings}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white text-black hover:bg-white/90 transition-colors text-sm font-medium"
            >
              <SettingsIcon size={16} />
              {t("camera.actions.openSystemSettings")}
            </button>
          )}

          <button
            onClick={recheck}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors text-sm"
          >
            <RefreshCcw size={16} />
            {t("camera.actions.recheck")}
          </button>
        </div>

        <div className="w-full mt-4 border-t border-white/10 pt-3">
          <button
            onClick={() => setDiagnosticsOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/60 hover:text-white/80 transition-colors"
          >
            {diagnosticsOpen ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            {t("camera.diagnostics.title")}
          </button>

          {diagnosticsOpen && (
            <div className="mt-2 rounded-md bg-black/40 border border-white/10 p-3 text-xs font-mono text-white/70 select-text">
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
                {Object.entries(diagnostics).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-white/50">{k}</dt>
                    <dd className="break-all">{String(v)}</dd>
                  </div>
                ))}
              </dl>
              <button
                onClick={copyDiagnostics}
                className="mt-3 flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors"
              >
                {diagnosticsCopied ? (
                  <Check size={12} />
                ) : (
                  <Copy size={12} />
                )}
                {diagnosticsCopied
                  ? t("camera.diagnostics.copied")
                  : t("camera.diagnostics.copy")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const inRecoveryState =
    permission === "denied" ||
    permission === "restricted" ||
    permission === "error";

  return (
    <div className="flex flex-col h-full bg-black select-none overflow-hidden rounded-b-lg">
      {/* Camera viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {inRecoveryState ? (
          renderRecoveryPanel()
        ) : (
          <>
            {(permission === "checking" ||
              permission === "prompting" ||
              !ready) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 z-10">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
                <p className="text-sm">
                  {permission === "prompting"
                    ? t("camera.prompting")
                    : t("camera.initializing")}
                </p>
              </div>
            )}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onPlaying={() => setReady(true)}
              className="w-full h-full object-cover"
              style={{
                transform: mirrored ? "scaleX(-1)" : "none",
              }}
            />
            {flashVisible && (
              <div className="absolute inset-0 bg-white animate-pulse pointer-events-none" />
            )}
          </>
        )}
      </div>

      {/* Controls bar */}
      {!inRecoveryState && (
        <div className="flex items-center justify-center gap-4 py-3 px-4 bg-black/80 shrink-0">
          <button
            onClick={toggleMirror}
            className={clsx("p-2 rounded-full transition-colors", {
              "bg-white/20 text-white": mirrored,
              "bg-white/10 text-white/60 hover:text-white hover:bg-white/20":
                !mirrored,
            })}
            title={t("camera.mirror")}
          >
            <FlipHorizontal2 size={20} />
          </button>

          <button
            onClick={takePhoto}
            disabled={!stream}
            className="p-3 rounded-full bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={t("camera.takePhoto")}
          >
            <CameraIcon size={24} />
          </button>

          {devices.length > 1 && (
            <button
              onClick={switchCamera}
              className="p-2 rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
              title={t("camera.switchCamera")}
            >
              <SwitchCamera size={20} />
            </button>
          )}
        </div>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Camera;
