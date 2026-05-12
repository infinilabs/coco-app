import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Camera as CameraIcon,
  CameraOff,
  FlipHorizontal2,
  SwitchCamera,
} from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

import clsx from "clsx";

import platformAdapter from "@/utils/platformAdapter";
import { isMac } from "@/utils/platform";
import { useAppStore } from "@/stores/appStore";

const Camera = () => {
  const { t } = useTranslation();
  const withVisibility = useAppStore((state) => state.withVisibility);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use a ref to track stream to avoid stale closure issues in cleanup
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [mirrored, setMirrored] = useState(true);
  const [error, setError] = useState<string>("");
  const [flashVisible, setFlashVisible] = useState(false);
  const [ready, setReady] = useState(false);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize: check permissions, enumerate devices, start camera
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Step 1: Check/request macOS native camera permission
        if (isMac) {
          const authorized = await platformAdapter.checkCameraPermission();
          if (!authorized) {
            platformAdapter.requestCameraPermission();
            // Poll until permission is granted (timeout after 60 seconds)
            const POLL_TIMEOUT_MS = 60000;
            const POLL_INTERVAL_MS = 500;
            await new Promise<void>((resolve, reject) => {
              let elapsed = 0;
              const timer = setInterval(async () => {
                if (cancelled) {
                  clearInterval(timer);
                  reject(new Error("cancelled"));
                  return;
                }
                elapsed += POLL_INTERVAL_MS;
                if (elapsed >= POLL_TIMEOUT_MS) {
                  clearInterval(timer);
                  reject(new Error("Camera permission timeout"));
                  return;
                }
                const granted =
                  await platformAdapter.checkCameraPermission();
                if (granted) {
                  clearInterval(timer);
                  resolve();
                }
              }, POLL_INTERVAL_MS);
            });
          }
        }
        if (cancelled) return;

        // Step 2: Request an initial stream to trigger browser permission prompt
        // and enable device enumeration with labels
        let initialStream: MediaStream;
        try {
          initialStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err) {
          console.error("Camera getUserMedia failed:", err);
          if (!cancelled) {
            setError(t("camera.errorAccess"));
          }
          return;
        }
        if (cancelled) {
          initialStream.getTracks().forEach((track) => track.stop());
          return;
        }

        // Step 3: Enumerate devices now that we have permission
        const allDevices =
          await navigator.mediaDevices.enumerateDevices();
          console.log('allDevices',allDevices)
        const videoDevices = allDevices.filter(
          (d) => d.kind === "videoinput"
        );
        if (cancelled) {
          initialStream.getTracks().forEach((track) => track.stop());
          return;
        }

        console.log('videoDevices',videoDevices)

        setDevices(videoDevices);

        // Step 4: Use the initial stream directly and set the selected device
        streamRef.current = initialStream;
        setStream(initialStream);

        if (videoRef.current) {
          videoRef.current.srcObject = initialStream;
        }

        if (videoDevices.length > 0) {
          // Find the device that matches the current stream's track
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

        // ready will be set to true when the video fires onPlaying
        setError("");
      } catch (err) {
        console.error("Camera initialization failed:", err);
        if (!cancelled) {
          setError(t("camera.errorAccess"));
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      stopCurrentStream();
    };
  }, [t, stopCurrentStream]);

  // Switch camera when device selection changes (after initial setup)
  useEffect(() => {
    if (!ready || !selectedDeviceId) return;

    // Check if the current stream already uses the selected device
    if (streamRef.current) {
      const currentTrack = streamRef.current.getVideoTracks()[0];
      const currentDeviceId = currentTrack?.getSettings()?.deviceId;
      if (currentDeviceId === selectedDeviceId) {
        return; // Already using this device
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

        setError("");
      } catch (err) {
        console.error("Failed to switch camera:", err);
        if (!cancelled) {
          setError(t("camera.errorAccess"));
        }
      }
    };

    switchToDevice();

    return () => {
      cancelled = true;
    };
  }, [selectedDeviceId, ready, t, stopCurrentStream]);

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
      save({
        defaultPath: `coco-photo-${Date.now()}.png`,
        filters: [{ name: "Image", extensions: ["png"] }],
      })
    );

    if (filePath) {
      const arrayBuffer = await blob.arrayBuffer();
      await invoke("save_camera_photo", {
        path: filePath,
        data: Array.from(new Uint8Array(arrayBuffer)),
      });
    }
  }, [mirrored]);

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



  return (
    <div className="flex flex-col h-full bg-black select-none overflow-hidden rounded-b-lg">
      {/* Camera viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <CameraOff size={48} />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            {!ready && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80 z-10">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
                <p className="text-sm">{t("camera.initializing")}</p>
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
      <div className="flex items-center justify-center gap-4 py-3 px-4 bg-black/80 flex-shrink-0">
        <button
          onClick={toggleMirror}
          className={clsx("p-2 rounded-full transition-colors", {
            "bg-white/20 text-white": mirrored,
            "bg-white/10 text-white/60 hover:text-white hover:bg-white/20": !mirrored,
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

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Camera;
