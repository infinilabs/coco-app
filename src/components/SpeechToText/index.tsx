import { useEventListener, useReactive } from "ahooks";
import clsx from "clsx";
import { LucideIcon, Mic } from "lucide-react";
import { FC, useEffect } from "react";

interface SpeechToTextProps {
  Icon?: LucideIcon;
  onChange?: (transcript: string) => void;
}

let recognition: SpeechRecognition | null = null;

const SpeechToText: FC<SpeechToTextProps> = (props) => {
  const { Icon = Mic, onChange } = props;

  const state = useReactive({
    speaking: false,
  });

  useEffect(() => {
    return destroyRecognition;
  }, []);

  useEventListener("focusin", (event) => {
    const { target } = event;

    const isInputElement =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement;

    if (state.speaking && isInputElement) {
      target.blur();
    }
  });

  const handleSpeak = () => {
    if (state.speaking) {
      return destroyRecognition();
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";

    recognition.onresult = (event) => {
      const transcript = [...event.results]
        .map((result) => result[0].transcript)
        .join("");

      onChange?.(transcript);
    };

    recognition.onerror = destroyRecognition;

    recognition.onend = destroyRecognition;

    recognition.start();

    state.speaking = true;
  };

  const destroyRecognition = () => {
    if (recognition) {
      recognition.abort();
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition = null;
    }

    state.speaking = false;
  };

  return (
    <div
      className={clsx(
        "p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition cursor-pointer",
        {
          "bg-blue-100 dark:bg-blue-900": state.speaking,
        }
      )}
    >
      <Icon
        className={clsx("size-4 text-[#999] dark:text-[#999]", {
          "text-blue-500 animate-pulse": state.speaking,
        })}
        onClick={handleSpeak}
      />
    </div>
  );
};

export default SpeechToText;
