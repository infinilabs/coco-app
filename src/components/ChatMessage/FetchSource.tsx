import {
  ChevronUp,
  ChevronDown,
  SquareArrowOutUpRight,
  Globe,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { OpenURLWithBrowser } from "@/utils/index";
import type { IChunkData } from "@/components/Assistant/types";
import RetrieveIcon from "@/icons/Retrieve";

interface FetchSourceProps {
  Detail?: any;
  ChunkData?: IChunkData;
  loading?: boolean;
}

interface ISourceData {
  category: string;
  icon: string;
  id: string;
  size: number;
  source: {
    type: string;
    name: string;
    id: string;
  };
  summary: string;
  thumbnail: string;
  title: string;
  updated: string | null;
  url: string;
}

export const FetchSource = ({
  Detail,
  ChunkData,
  loading,
}: FetchSourceProps) => {
  const { t } = useTranslation();

  const [isSourceExpanded, setIsSourceExpanded] = useState(false);

  const [total, setTotal] = useState(0);
  const [data, setData] = useState<ISourceData[]>([]);

  useEffect(() => {
    if (!Detail?.payload) return;
    // console.log("Detail?.payload", Detail?.payload);
    setData(Detail?.payload);
    setTotal(Detail?.payload.length);
  }, [Detail?.payload]);

  useEffect(() => {
    if (!ChunkData?.message_chunk) return;

    if (!loading) {
      try {
        const match = ChunkData.message_chunk.match(
          // /\u003cPayload total=(\d+)\u003e/
          /<Payload total=(\d+)>/
        );
        if (match) {
          setTotal(Number(match[1]));
        }

        // const jsonMatch = ChunkData.message_chunk.match(/\[(.*)\]/s);
        const jsonMatch = ChunkData.message_chunk.match(/\[([\s\S]*)\]/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          setData(jsonData);
        }
      } catch (e) {
        console.error("Failed to parse fetch source data:", e);
      }
    }
  }, [ChunkData?.message_chunk, loading]);

  // Must be after hooks !!!
  if (!ChunkData && !Detail) return null;

  return (
    <div
      className={`mt-2 mb-2 max-w-full w-full md:w-[610px] ${
        isSourceExpanded
          ? "rounded-lg overflow-hidden border border-[#E6E6E6] dark:border-[#272626]"
          : ""
      }`}
    >
      <button
        onClick={() => setIsSourceExpanded((prev) => !prev)}
        className={`inline-flex justify-between items-center gap-2 px-2 py-1 rounded-xl transition-colors whitespace-nowrap ${
          isSourceExpanded
            ? "w-full"
            : "border border-[#E6E6E6] dark:border-[#272626]"
        }`}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <RetrieveIcon className="w-4 h-4 text-[#38C200] flex-shrink-0" />
          <span className="text-xs text-[#999999]">
            {t(
              `assistant.message.steps.${ChunkData?.chunk_type || Detail.type}`,
              {
                count: Number(total),
              }
            )}
          </span>
        </div>
        {isSourceExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#999999]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#999999]" />
        )}
      </button>

      {isSourceExpanded && (
        <>
          {/* {prefix && (
            <div className="px-3 py-2 bg-[#F7F7F7] dark:bg-[#1E1E1E] text-[#666666] dark:text-[#A3A3A3] text-xs leading-relaxed border-b border-[#E6E6E6] dark:border-[#272626]">
              {prefix}
            </div>
          )} */}
          {data?.map((item, idx) => (
            <div
              key={idx}
              onClick={() => item.url && OpenURLWithBrowser(item.url)}
              className="group flex items-center p-2 hover:bg-[#F7F7F7] dark:hover:bg-[#2C2C2C] border-b border-[#E6E6E6] dark:border-[#272626] last:border-b-0 cursor-pointer transition-colors"
            >
              <div className="w-full flex items-center gap-2">
                <div className="w-full md:w-[75%] flex items-center gap-1">
                  <Globe className="w-3 h-3 flex-shrink-0" />
                  <div className="text-xs text-[#333333] dark:text-[#D8D8D8] truncate font-normal group-hover:text-[#0072FF] dark:group-hover:text-[#0072FF]">
                    {item.title || item.category}
                  </div>
                </div>
                <div
                  className={`flex mobile:hidden w-[25%] items-center justify-end gap-2`}
                >
                  <span className="text-xs text-[#999999] dark:text-[#999999] truncate">
                    {item.source?.name}
                  </span>
                  <SquareArrowOutUpRight className="w-3 h-3 text-[#999999] dark:text-[#999999] flex-shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
