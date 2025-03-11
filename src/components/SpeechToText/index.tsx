import { useReactive } from "ahooks";
import clsx from "clsx";
import { Mic } from "lucide-react";
import { ComponentType, FC } from "react";

interface SpeechToTextProps {
  Icon?: ComponentType<any>;
  onChange?: (transcript: string) => void;
}

interface State {
  speaking: boolean;
  transcript: string;
}

let recognition: SpeechRecognition;

const SpeechToText: FC<SpeechToTextProps> = (props) => {
  const { Icon = Mic, onChange } = props;

  const state = useReactive<State>({
    speaking: false,
    transcript: "",
  });

  const handleSpeak = async () => {
    if (state.speaking) {
      state.speaking = false;

      return recognition.stop();
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";

    recognition.onresult = (event) => {
      state.transcript = event.results[0][0].transcript;

      onChange?.(state.transcript);
    };

    recognition.start();

    state.speaking = true;
  };

  return (
    <div
      className={clsx(
        "p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition",
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
