import { MoveRight } from "lucide-react";
import { FC, useEffect, useState } from "react";

import { useConnectStore } from "@/stores/connectStore";

interface PrevSuggestionProps {
  sendMessage: (message: string) => void;
}

const PrevSuggestion: FC<PrevSuggestionProps> = (props) => {
  const { sendMessage } = props;

  const currentAssistant = useConnectStore((state) => state.currentAssistant);

  const [list, setList] = useState<string[]>([]);

  useEffect(() => {
    const suggested = currentAssistant?._source?.chat_settings?.suggested || {};
    if (suggested.enabled) {
      setList(suggested.questions || []);
    } else {
      setList([]);
    }
  }, [JSON.stringify(currentAssistant)]);

  return (
    <ul className="absolute left-2 bottom-2 flex flex-col gap-2 p-0">
      {list.map((item) => {
        return (
          <li
            key={item}
            className="flex items-center self-start gap-2 px-3 py-2 leading-4 text-sm text-[#333] dark:text-[#d8d8d8] rounded-xl border border-black/15 dark:border-white/15 hover:!border-[#0072ff] hover:!text-[#0072ff] transition cursor-pointer"
            onClick={() => sendMessage(item)}
          >
            {item}

            <MoveRight className="size-4" />
          </li>
        );
      })}
    </ul>
  );
};

export default PrevSuggestion;
