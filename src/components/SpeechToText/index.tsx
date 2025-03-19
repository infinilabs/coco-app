import clsx from "clsx";
import { Check, Loader, Mic, X } from "lucide-react";
import { FC, useEffect, useState } from "react";

interface SpeechToTextProps {
  onChange?: (text: string) => void;
}

let interval: ReturnType<typeof setInterval>;

const SpeechToText: FC<SpeechToTextProps> = (props) => {
  const { onChange } = props;
  const [speaking, setSpeaking] = useState(false);
  const [converting, setConverting] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    return reset;
  }, []);

  useEffect(() => {
    if (speaking) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      reset();
    }
  }, [speaking]);

  useEffect(() => {
    if (countdown > 0) return;

    handleOk();
  }, [countdown]);

  const reset = () => {
    clearInterval(interval);

    setSpeaking(false);
    setConverting(false);
    setCountdown(30);
  };

  const handleCancel = () => {
    if (converting) return;

    setSpeaking(false);
  };

  const handleOk = () => {
    clearInterval(interval);

    setConverting(true);

    setTimeout(() => {
      onChange?.("");

      setConverting(false);
      setSpeaking(false);
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
          onClick={() => {
            setSpeaking(true);
          }}
        />
      </div>

      <div
        className={clsx(
          "absolute inset-0 left-full flex items-center gap-1 px-1 rounded transition-all bg-[#ededed] dark:bg-[#202126]",
          {
            "!left-0": speaking,
          }
        )}
      >
        <div
          className={clsx(
            "flex items-center justify-center size-6 bg-white dark:bg-black rounded-full transition cursor-pointer",
            {
              "!cursor-not-allowed opacity-50": converting,
            }
          )}
          onClick={handleCancel}
        >
          <X className="size-4 text-[#0C0C0C] dark:text-[#999999]" />
        </div>

        <div className="flex items-center gap-1 flex-1 h-6 px-2 bg-white dark:bg-black rounded-full transition">
          <div className="flex-1">...</div>

          <span className="text-xs text-[#333] dark:text-[#999]">
            {countdown}
          </span>
        </div>

        <div
          className="flex items-center justify-center size-6 text-white  bg-[#0072FF] rounded-full transition cursor-pointer"
          onClick={handleOk}
        >
          {converting ? (
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
