import { MoveRight } from "lucide-react";
import { FC, useEffect, useState } from "react";

import { Get } from "@/api/axiosRequest";

interface PrevSuggestionProps {
  id: string;
  sendMessage: (message: string) => void;
}

const PrevSuggestion: FC<PrevSuggestionProps> = (props) => {
  const { id, sendMessage } = props;

  const [list, setList] = useState<string[]>([]);

  useEffect(() => {
    getList();
  }, [id]);

  const getList = async () => {
    if (!id) return;

    const url = `/integration/${id}/chat/_suggest`;

    const [error, res] = await Get(`/integration/${id}/chat/_suggest`);

    if (error) {
      console.error(url, error);

      return setList([]);
    }

    console.log("res", res);

    setList(res as any);
  };

  console.log("id", id);

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
