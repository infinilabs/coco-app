import { useAppStore } from "@/stores/appStore";
import { useReactive } from "ahooks";
import clsx from "clsx";
import { Check, Loader, Mic, X } from "lucide-react";
import { FC, useEffect, useRef } from "react";
import {
  checkMicrophonePermission,
  requestMicrophonePermission,
} from "tauri-plugin-macos-permissions-api";
import { useWavesurfer } from "@wavesurfer/react";
import RecordPlugin from "wavesurfer.js/dist/plugins/record.esm.js";
import { pick } from "lodash-es";

interface AudioRecordingProps {
  onChange?: (text: string) => void;
}

interface State {
  isRecording: boolean;
  converting: boolean;
  countdown: number;
}

const INITIAL_STATE: State = {
  isRecording: false,
  converting: false,
  countdown: 30,
};

let interval: ReturnType<typeof setInterval>;

const AudioRecording: FC<AudioRecordingProps> = (props) => {
  const { onChange } = props;
  const state = useReactive({ ...INITIAL_STATE });
  const containerRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef<RecordPlugin>();
  const withVisibility = useAppStore((state) => state.withVisibility);

  const { wavesurfer } = useWavesurfer({
    container: containerRef,
    height: 20,
    waveColor: "#0072ff",
    progressColor: "#999",
    barWidth: 4,
    barRadius: 4,
    barGap: 2,
  });

  useEffect(() => {
    if (!wavesurfer) return;

    const record = wavesurfer.registerPlugin(
      RecordPlugin.create({
        scrollingWaveform: true,
        renderRecordedAudio: false,
      })
    );

    record.on("record-end", (blob) => {
      const recordedUrl = URL.createObjectURL(blob);
      console.log("recorded:", recordedUrl);

      // setAudioUrl(recordedUrl);
    });

    recordRef.current = record;

    return resetState;
  }, [wavesurfer]);

  useEffect(() => {
    if (!state.isRecording) return;

    interval = setInterval(() => {
      if (state.countdown <= 0) {
        handleOk();
      }

      state.countdown--;
    }, 1000);
  }, [state.isRecording]);

  const resetState = (otherState: Partial<State> = {}) => {
    clearInterval(interval);
    recordRef.current?.stopRecording();
    Object.assign(state, { ...INITIAL_STATE, ...otherState });
  };

  const checkPermission = async () => {
    const authorized = await checkMicrophonePermission();

    if (authorized) return;

    requestMicrophonePermission();

    return new Promise(async (resolved) => {
      const timer = setInterval(async () => {
        const authorized = await checkMicrophonePermission();

        if (!authorized) return;

        clearInterval(timer);

        resolved(true);
      }, 500);
    });
  };

  const startRecording = async () => {
    await withVisibility(checkPermission);
    state.isRecording = true;
    recordRef.current?.startRecording();
  };

  const handleOk = () => {
    resetState({ converting: true, countdown: state.countdown });

    setTimeout(() => {
      onChange?.("");

      resetState();
    }, 3000);
  };

  return (
    <>
      <div
        className={clsx(
          "p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition cursor-pointer"
        )}
      >
        <Mic className="size-4 text-[#999]" onClick={startRecording} />
      </div>

      <div
        className={clsx(
          "absolute inset-0 flex items-center gap-1 px-1 rounded translate-x-full transition-all bg-[#ededed] dark:bg-[#202126]",
          {
            "!translate-x-0": state.isRecording || state.converting,
          }
        )}
      >
        <button
          disabled={state.converting}
          className={clsx(
            "flex items-center justify-center size-6 bg-white dark:bg-black rounded-full transition cursor-pointer",
            {
              "!cursor-not-allowed opacity-50": state.converting,
            }
          )}
          onClick={() => resetState()}
        >
          <X className="size-4 text-[#0C0C0C] dark:text-[#999999]" />
        </button>

        <div className="flex items-center gap-1 flex-1 h-6 px-2 bg-white dark:bg-black rounded-full transition">
          <div ref={containerRef} className="flex-1"></div>

          <span className="text-xs text-[#333] dark:text-[#999]">
            {state.countdown}
          </span>
        </div>

        <button
          disabled={state.converting}
          className="flex items-center justify-center size-6 text-white  bg-[#0072FF] rounded-full transition cursor-pointer"
          onClick={handleOk}
        >
          {state.converting ? (
            <Loader className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
        </button>
      </div>
    </>
  );
};

export default AudioRecording;
