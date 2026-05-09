import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Camera as CameraIcon,
  CameraOff,
  FlipHorizontal,
  SwitchCamera,
  X,
} from "lucide-react";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

import platformAdapter from "@/utils/platformAdapter";
import { isMac } from "@/utils/platform";

interface CameraProps {
  onClose: () => void;
}

const Camera = ({ onClose }: CameraProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [mirrored, setMirrored] = useState(true);
  const [error, setError] = useState<string>("");
  const [flashVisible, setFlashVisible] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  const checkPermission = useCallback(async () => {
    if (isMac) {
      const authorized = await platformAdapter.checkCameraPermission();
      if (!authorized) {
        platformAdapter.requestCameraPermission();

        await new Promise<void>((resolve) => {
          const timer = setInterval(async () => {
            const granted = await platformAdapter.checkCameraPermission();
            if (granted) {
              clearInterval(timer);
              resolve();
            }
          }, 500);
        });
      }
    }
  }, []);

  const getDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to enumerate camera devices:", err);
      setError(t("camera.errorAccess"));
    }
  }, [selectedDeviceId, t]);

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
        audio: false,
      };

      const mediaStream =
        await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setError("");
    } catch (err) {
      console.error("Failed to access camera:", err);
      setError(t("camera.errorAccess"));
    }
  }, [selectedDeviceId, stream, t]);

  // Check permissions first
  useEffect(() => {
    checkPermission().then(() => {
      setPermissionChecked(true);
    });
  }, [checkPermission]);

  // Get devices after permission is granted
  useEffect(() => {
    if (permissionChecked) {
      getDevices();
    }
  }, [permissionChecked, getDevices]);

  // Start camera when device is selected
  useEffect(() => {
    if (selectedDeviceId && permissionChecked) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // `stream` is intentionally excluded from deps to avoid restarting the
    // camera on every stream change; the effect should only re-run when the
    // selected device changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId, permissionChecked]);

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

    const filePath = await save({
      defaultPath: `coco-photo-${Date.now()}.png`,
      filters: [{ name: "Image", extensions: ["png"] }],
    });

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
      {/* Header with title and close */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/80 flex-shrink-0">
        <span className="text-white/80 text-sm font-medium">
          {t("camera.title")}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          title={t("camera.close")}
        >
          <X size={16} />
        </button>
      </div>

      {/* Camera viewport */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <CameraOff size={48} />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
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
          className={`p-2 rounded-full transition-colors ${
            mirrored
              ? "bg-white/20 text-white"
              : "bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
          }`}
          title={t("camera.mirror")}
        >
          <FlipHorizontal size={20} />
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
