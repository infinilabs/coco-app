import { Loader, Hammer, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { IChunkData } from "@/types/chat";
import { ExpandText } from "./ExpandText";

interface CallToolsProps {
  Detail?: any;
  ChunkData?: IChunkData;
  loading?: boolean;
}

export const CallTools = ({ Detail, ChunkData, loading }: CallToolsProps) => {
  const { t } = useTranslation();
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  const [data, setData] = useState<{ arguments: string; name: string; result: string }[]>([]);

  useEffect(() => {
    if (!Detail?.payload) return;
    setData(Detail.payload);
  }, [Detail?.payload]);

  useEffect(() => {
    if (!ChunkData?.tool_call_message_chunk) return;
    try {
      const parsed = JSON.parse(ChunkData.tool_call_message_chunk);
      setData((prev) => [...prev, parsed]);
    } catch (e) {

    }
  }, [ChunkData?.tool_call_message_chunk]);

  if (!ChunkData && !Detail) return null;

  const renderContent = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        return <ExpandText content={JSON.stringify(parsed, null, 2)} isJson />;
      }
      return <ExpandText content={text} />;
    } catch {
      return <ExpandText content={text} />;
    }
  };

  return (
    <div className="space-y-2 mb-3 w-full">
      <button
        onClick={() => setIsThinkingExpanded((prev) => !prev)}
        className="inline-flex items-center gap-2 px-2 py-1 rounded-xl transition-colors border border-[#E6E6E6] dark:border-[#272626]"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin text-[#1990FF]" />
          </>
        ) : (
          <>
            <Hammer className="w-4 h-4 text-[#38C200]" />
          </>
        )}

        <span className="text-xs text-[#999999]">
          {t(
            `assistant.message.steps.${ChunkData?.chunk_type || Detail.type}`,
            {
              count: Number(data.length || 0),
            }
          )}
        </span>

        {isThinkingExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      {isThinkingExpanded && (
        <div className="pl-2 border-l-2 border-[#e5e5e5] dark:border-[#4e4e56]">
          <div className="text-[#8b8b8b] dark:text-[#a6a6a6] space-y-2">
            {
              data.map((item, index) => (
                <div key={index} className="text-[#333333] dark:text-[#D8D8D8] p-3 rounded-lg border border-[#E6E6E6] dark:border-[#272626] bg-white dark:bg-[#1E1E1E] hover:bg-gray-50 dark:hover:bg-[#2C2C2C] transition-colors">
                  <div className="mb-3 text-sm font-medium">{item.name}</div>
                  <div className="mb-1 text-xs text-[#666666] dark:text-[#A3A3A3]">{t('labels.arguments')}</div>
                  <div className="pb-2 text-xs mb-2 border-b border-[#E6E6E6] dark:border-[#272626]">
                    {renderContent(item.arguments)}
                  </div>
                  <div className="mb-1 text-xs text-[#666666] dark:text-[#A3A3A3]">{t('labels.result')}</div>
                  <div className="">
                    {renderContent(item.result)}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};
