import { useEffect, useState, useRef, useCallback } from "react";
import { ChevronDownIcon, RefreshCw, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAppStore } from "@/stores/appStore";
import logoImg from "@/assets/icon.svg";
import platformAdapter from "@/utils/platformAdapter";
import { useClickAway } from "@/hooks/useClickAway";
import VisibleKey from "@/components/Common/VisibleKey";
import { useConnectStore } from "@/stores/connectStore";
import FontIcon from "@/components/Common/Icons/FontIcon";

interface AssistantListProps {
  showChatHistory?: boolean;
}

export function AssistantList({ showChatHistory = true }: AssistantListProps) {
  const { t } = useTranslation();
  const isTauri = useAppStore((state) => state.isTauri);
  const currentService = useConnectStore((state) => state.currentService);
  const currentAssistant = useConnectStore((state) => state.currentAssistant);
  const setCurrentAssistant = useConnectStore((state) => state.setCurrentAssistant);

  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useClickAway(menuRef, () => setIsOpen(false));
  const [assistants, setAssistants] = useState<any[]>([
    {
      id: "coco",
      name: "Coco AI",
      description: "Your Personal AI Assistant",
      icon: logoImg,
    },
    {
      id: "searchkit",
      name: "Searchkit 百晓生",
      description: "社区老司机，有事你叫我",
    },
    {
      id: "midjourney",
      name: "MidjourneyGPT",
      description: "Midjourney 提示词优化专家",
    },
  ]);

  
  const fetchAssistant = useCallback(async () => {
    if (!isTauri) return;
    if (!currentService?.id) return;
    platformAdapter
      .commands("assistant_search", {
        serverId: currentService?.id,
      })
      .then((res: any) => {
        res = res ? JSON.parse(res) : null;
        console.log("res", res);
        const assistantList = res?.hits?.hits || [];
        setAssistants(assistantList);
        if (assistantList.length > 0 && !currentAssistant) {
          setCurrentAssistant(assistantList[0]);
        }
      });
  }, []);

  useEffect(() => {
    fetchAssistant();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAssistant();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-6  p-1 px-1.5 flex items-center gap-1 rounded-full bg-white dark:bg-[#202126] text-sm/6 font-semibold text-gray-800 dark:text-[#d8d8d8] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
      >
        <div className="w-4 h-4 flex justify-center items-center bg-white rounded-full">
          {currentAssistant?._source?.icon?.startsWith("font_") ? (
            <FontIcon
              name={currentAssistant._source.icon}
              className="w-3 h-3"
            />
          ) : (
            <img
              src={logoImg}
              className="w-3 h-3"
              alt={t("assistant.message.logo")}
            />
          )}
        </div>
        <div className="max-w-[100px] truncate">
          {currentAssistant?._source?.name || "Coco AI"}
        </div>
        {showChatHistory && isTauri && (
          <ChevronDownIcon
            className={`size-4 text-gray-500 dark:text-gray-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {showChatHistory && isTauri && isOpen && (
        <div className="absolute z-50 top-full mt-1 left-0 w-64 rounded-xl bg-white dark:bg-[#202126] p-2 text-sm/6 text-gray-800 dark:text-white shadow-lg border border-gray-200 dark:border-gray-700 focus:outline-none max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="sticky top-0 mb-2 px-2 py-1 text-sm font-medium text-gray-900 dark:text-white bg-white dark:bg-[#202126] flex justify-between">
            <div>AI Assistant</div>
            <button
              onClick={handleRefresh}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
              disabled={isRefreshing}
            >
              <VisibleKey shortcut="R" onKeyPress={handleRefresh}>
                <RefreshCw
                  className={`h-4 w-4 text-[#0287FF] transition-transform duration-1000 ${
                    isRefreshing ? "animate-spin" : ""
                  }`}
                />
              </VisibleKey>
            </button>
          </div>
          {assistants.map((assistant) => (
            <button
              key={assistant._id}
              onClick={() => {
                setCurrentAssistant(assistant);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 rounded-lg p-1 py-1.5 mb-1 ${
                currentAssistant?._id === assistant._id
                  ? "bg-[#F3F4F6] dark:bg-[#1F2937]"
                  : "hover:bg-[#F3F4F6] dark:hover:bg-[#1F2937]"
              }
              }`}
            >
              {assistant._source?.icon?.startsWith("font_") ? (
                <FontIcon name={assistant._source?.icon} className="w-4 h-4" />
              ) : (
                <img
                  src={logoImg}
                  className="w-4 h-4 rounded-full"
                  alt={assistant.name}
                />
              )}
              <div className="text-left flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {assistant._source?.name || "-"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {assistant._source?.description || ""}
                </div>
              </div>
              {currentAssistant?._id === assistant._id && (
                <div className="flex items-center">
                  <VisibleKey
                    shortcut="↓↑"
                    shortcutClassName="w-6 -translate-x-4"
                  >
                    <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </VisibleKey>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
