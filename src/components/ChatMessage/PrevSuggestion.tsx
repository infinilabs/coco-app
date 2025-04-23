import { MoveRight } from "lucide-react";
import { FC, useEffect, useState } from "react";

import { Get } from "@/api/axiosRequest";
import { useAppStore } from "@/stores/appStore";

interface PrevSuggestionProps {
  sendMessage: (message: string) => void;
}

const PrevSuggestion: FC<PrevSuggestionProps> = (props) => {
  const { sendMessage } = props;

  const isTauri = useAppStore((state) => state.isTauri);

  const headersStr = localStorage.getItem("headers") || "{}";
  const headers = JSON.parse(headersStr);
  const id = headers["APP-INTEGRATION-ID"] || "cvkm9hmhpcemufsg3vug";
  // console.log("id", id);

  const [list, setList] = useState<string[]>([]);

  useEffect(() => {
    if (!isTauri) getList();
  }, [id]);

  const getList = async () => {
    if (!id) return;

    const url = `/integration/${id}/chat/_suggest`;
    const [error, res] = await Get(url);
    if (error) {
      console.error(url, error);
      return setList([]);
    }
    console.log("chat/_suggest", res);
    setList(Array.isArray(res) ? res : []);
  };

  return (
    <ul className="absolute left-2 bottom-2 flex flex-col gap-2">
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
