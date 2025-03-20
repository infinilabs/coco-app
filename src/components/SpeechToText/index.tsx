import { useAppStore } from "@/stores/appStore";
import { useReactive } from "ahooks";
import clsx from "clsx";
import { Check, Loader, Mic, X } from "lucide-react";
import { FC, useEffect } from "react";
import {
  checkMicrophonePermission,
  requestMicrophonePermission,
} from "tauri-plugin-macos-permissions-api";

interface SpeechToTextProps {
  onChange?: (text: string) => void;
}

interface State {
  speaking: boolean;
  converting: boolean;
  countdown: number;
}

const INITIAL_STATE: State = {
  speaking: false,
  converting: false,
  countdown: 30,
};

let interval: ReturnType<typeof setInterval>;

const SpeechToText: FC<SpeechToTextProps> = (props) => {
  const { onChange } = props;
  const state = useReactive({ ...INITIAL_STATE });
  const withVisibility = useAppStore((state) => state.withVisibility);

  useEffect(() => {
    return reset;
  }, []);

  useEffect(() => {
    if (state.speaking) {
      interval = setInterval(() => {
        state.countdown--;
      }, 1000);
    } else {
      reset();
    }
  }, [state.speaking]);

  useEffect(() => {
    if (state.countdown > 0) return;

    handleOk();
  }, [state.countdown]);

  const reset = () => {
    clearInterval(interval);

    Object.assign(state, INITIAL_STATE);
  };

  const checkPermission = async () => {
    return new Promise(async (resolved) => {
      const authorized = await checkMicrophonePermission();

      if (authorized) {
        return resolved(true);
      }

      requestMicrophonePermission();

      const timer = setInterval(async () => {
        const authorized = await checkMicrophonePermission();

        if (!authorized) return;

        clearInterval(timer);

        resolved(true);
      }, 1000);
    });
  };

  const handleCancel = () => {
    if (state.converting) return;

    reset();
  };

  const handleOk = () => {
    clearInterval(interval);

    state.converting = true;

    setTimeout(() => {
      onChange?.("");

      reset();
    }, 3000);
  };

  return (
    <>
      <div
        className={clsx(
          "p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition cursor-pointer"
        )}
      >
        <Mic
          className="size-4 text-[#999]"
          onClick={async () => {
            await withVisibility(checkPermission);

            state.speaking = true;
          }}
        />
      </div>

      <div
        className={clsx(
          "absolute inset-0 left-full flex items-center gap-1 px-1 rounded transition-all bg-[#ededed] dark:bg-[#202126]",
          {
            "!left-0": state.speaking,
          }
        )}
      >
        <div
          className={clsx(
            "flex items-center justify-center size-6 bg-white dark:bg-black rounded-full transition cursor-pointer",
            {
              "!cursor-not-allowed opacity-50": state.converting,
            }
          )}
          onClick={handleCancel}
        >
          <X className="size-4 text-[#0C0C0C] dark:text-[#999999]" />
        </div>

        <div className="flex items-center gap-1 flex-1 h-6 px-2 bg-white dark:bg-black rounded-full transition">
          <div className="flex-1">...</div>

          <span className="text-xs text-[#333] dark:text-[#999]">
            {state.countdown}
          </span>
        </div>

        <div
          className="flex items-center justify-center size-6 text-white  bg-[#0072FF] rounded-full transition cursor-pointer"
          onClick={handleOk}
        >
          {state.converting ? (
            <Loader className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
        </div>
      </div>
    </>
  );
};

export default SpeechToText;
