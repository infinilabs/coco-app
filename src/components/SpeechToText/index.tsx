import { useRecording } from "@/hooks/useRecording";
import { useEventListener } from "ahooks";
import clsx from "clsx";
import { Check, Loader, Mic, X } from "lucide-react";
import { FC, useEffect, useRef, useState } from "react";

interface SpeechToTextProps {
  onChange?: (text: string) => void;
}

const DEFAULT_COUNTDOWN = 30;

let interval: ReturnType<typeof setInterval>;

const SpeechToText: FC<SpeechToTextProps> = (props) => {
  const { onChange } = props;
  const [isRecording, setIsRecording] = useState(false);
  const [converting, setConverting] = useState(false);
  const [countdown, setCountdown] = useState(DEFAULT_COUNTDOWN);
  const recordingRef = useRef<HTMLDivElement>(null);
  const { startRecording, stopRecording } = useRecording({
    container: recordingRef,
    onRecordEnd(blob) {
      console.log(123);

      // console.log("blob", blob);
    },
  });

  useEffect(() => {
    return resetRecordingState;
  }, []);

  useEffect(() => {
    console.log("isRecording", isRecording);
    if (isRecording) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      resetRecordingState();
    }
  }, [isRecording]);

  useEffect(() => {
    if (countdown > 0) return;

    handleOk();
  }, [countdown]);

  const resetRecordingState = () => {
    clearInterval(interval);
    stopRecording();
    setIsRecording(false);
    setConverting(false);
    setCountdown(DEFAULT_COUNTDOWN);
  };

  const handleStart = () => {
    startRecording();
    setIsRecording(true);
  };

  const handleOk = () => {
    stopRecording();

    clearInterval(interval);

    setConverting(true);

    setTimeout(() => {
      onChange?.("");

      resetRecordingState();
    }, 3000);
  };

  useEventListener("unhandledrejection", ({ reason }) => {
    console.log("reason", reason);
  });

  return (
    <>
      <div
        className={clsx(
          "p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition cursor-pointer"
        )}
      >
        <Mic className="size-4 text-[#999]" onClick={handleStart} />
      </div>

      <div
        className={clsx(
          "absolute inset-0 left-full flex items-center gap-1 px-1 rounded transition-all bg-[#ededed] dark:bg-[#202126]",
          {
            "!left-0": isRecording,
          }
        )}
      >
        <button
          disabled={converting}
          className={clsx(
            "flex items-center justify-center size-6 bg-white dark:bg-black rounded-full transition cursor-pointer",
            {
              "!cursor-not-allowed opacity-50": converting,
            }
          )}
          onClick={resetRecordingState}
        >
          <X className="size-4 text-[#0C0C0C] dark:text-[#999999]" />
        </button>

        <div className="flex items-center gap-1 flex-1 h-6 px-2 bg-white dark:bg-black rounded-full transition">
          <div ref={recordingRef} className="flex-1"></div>

          <span className="text-xs text-[#333] dark:text-[#999]">
            {countdown}
          </span>
        </div>

        <button
          disabled={converting}
          className="flex items-center justify-center size-6 text-white  bg-[#0072FF] rounded-full transition cursor-pointer"
          onClick={handleOk}
        >
          {converting ? (
            <Loader className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
        </button>
      </div>
    </>
  );
};

export default SpeechToText;
