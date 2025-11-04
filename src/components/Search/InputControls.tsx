import { useCallback, useMemo } from "react";
import { Brain, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

import SearchPopover from "./SearchPopover";
import MCPPopover from "./MCPPopover";
import ChatSwitch from "@/components/Common/ChatSwitch";
import Copyright from "@/components/Common/Copyright";
import type { DataSource } from "@/types/commands";
import platformAdapter from "@/utils/platformAdapter";
import { useConnectStore } from "@/stores/connectStore";
import VisibleKey from "@/components/Common/VisibleKey";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
import { useExtensionsStore } from "@/stores/extensionsStore";
import { parseSearchQuery, SearchQuery } from "@/utils";
import InputUpload from "./InputUpload";

interface InputControlsProps {
  isChatMode: boolean;
  isDeepThinkActive: boolean;
  setIsDeepThinkActive: () => void;
  isSearchActive: boolean;
  setIsSearchActive: () => void;
  isMCPActive: boolean;
  setIsMCPActive: () => void;
  isChatPage?: boolean;
  hasModules?: string[];
  searchPlaceholder?: string;
  chatPlaceholder?: string;
  changeMode?: (isChatMode: boolean) => void;
  checkScreenPermission: () => Promise<boolean>;
  requestScreenPermission: () => void;
  getScreenMonitors: () => Promise<any[]>;
  getScreenWindows: () => Promise<any[]>;
  captureMonitorScreenshot: (id: number) => Promise<string>;
  captureWindowScreenshot: (id: number) => Promise<string>;
  openFileDialog: (options: {
    multiple: boolean;
  }) => Promise<string | string[] | null>;
  getFileMetadata: (path: string) => Promise<any>;
  getFileIcon: (path: string, size: number) => Promise<string>;
}

const InputControls = ({
  isChatMode,
  isDeepThinkActive,
  setIsDeepThinkActive,
  isSearchActive,
  setIsSearchActive,
  isMCPActive,
  setIsMCPActive,
  isChatPage,
  hasModules,
  changeMode,
  checkScreenPermission,
  requestScreenPermission,
  getScreenMonitors,
  getScreenWindows,
  captureWindowScreenshot,
  captureMonitorScreenshot,
  openFileDialog,
  getFileMetadata,
  getFileIcon,
}: InputControlsProps) => {
  const { t } = useTranslation();

  const isTauri = useAppStore((state) => state.isTauri);

  const { currentAssistant } = useConnectStore();
  const { modeSwitch, deepThinking } = useShortcutsStore();

  const source = currentAssistant?._source;

  const assistantConfig = useMemo(() => {
    return {
      datasourceEnabled: source?.datasource?.enabled,
      datasourceVisible: source?.datasource?.visible,
      datasourceIds: source?.datasource?.ids,
      mcpEnabled: source?.mcp_servers?.enabled,
      mcpVisible: source?.mcp_servers?.visible,
      mcpIds: source?.mcp_servers?.ids,
      placeholder: source?.chat_settings?.placeholder,
    };
  }, [currentAssistant]);

  const getDataSourcesByServer = useCallback(
    async (
      serverId: string,
      searchQuery: SearchQuery = {}
    ): Promise<DataSource[]> => {
      searchQuery.from ??= 0;
      searchQuery.size ??= 1000;

      const queryParams = parseSearchQuery({
        ...searchQuery,
        fuzziness: 5,
        filters: {
          enabled: true,
        },
      });
      const response = await platformAdapter.searchDataSources(
        serverId,
        queryParams
      );

      let ids = assistantConfig.datasourceIds;
      if (Array.isArray(ids) && ids.length > 0 && !ids.includes("*")) {
        return response?.filter((item: any) => ids.includes(item.id)) || [];
      }
      return response || [];
    },
    [assistantConfig]
  );

  const getMCPByServer = useCallback(
    async (
      serverId: string,
      searchQuery: SearchQuery = {}
    ): Promise<DataSource[]> => {
      searchQuery.from ??= 0;
      searchQuery.size ??= 1000;

      const queryParams = parseSearchQuery({
        ...searchQuery,
        fuzziness: 5,
        filters: {
          enabled: true,
        },
      });

      const response = await platformAdapter.searchMCPServers(
        serverId,
        queryParams
      );

      let ids = assistantConfig.mcpIds;
      if (Array.isArray(ids) && ids.length > 0 && !ids.includes("*")) {
        return response?.filter((item: any) => ids.includes(item.id)) || [];
      }
      return response || [];
    },
    [assistantConfig]
  );

  const enabledAiOverview = useSearchStore((state) => {
    return state.enabledAiOverview;
  });
  const setEnabledAiOverview = useSearchStore((state) => {
    return state.setEnabledAiOverview;
  });
  const disabledExtensions = useExtensionsStore((state) => {
    return state.disabledExtensions;
  });
  const aiOverviewServer = useExtensionsStore((state) => {
    return state.aiOverviewServer;
  });
  const aiOverviewAssistant = useExtensionsStore((state) => {
    return state.aiOverviewAssistant;
  });
  const aiOverviewShortcut = useShortcutsStore((state) => state.aiOverview);
  const { visibleExtensionStore } = useSearchStore();

  return (
    <div
      data-tauri-drag-region
      className="flex justify-between items-center pt-2"
    >
      {isChatMode ? (
        <div className="flex gap-2 text-[12px] leading-3 text-[#333] dark:text-[#d8d8d8]">
          {source?.upload?.enabled && (
            <InputUpload
              checkScreenPermission={checkScreenPermission}
              requestScreenPermission={requestScreenPermission}
              getScreenMonitors={getScreenMonitors}
              getScreenWindows={getScreenWindows}
              captureMonitorScreenshot={captureMonitorScreenshot}
              captureWindowScreenshot={captureWindowScreenshot}
              openFileDialog={openFileDialog}
              getFileMetadata={getFileMetadata}
              getFileIcon={getFileIcon}
            />
          )}

          {source?.type === "deep_think" && source?.config?.visible && (
            <button
              className={clsx(
                "flex items-center justify-center gap-1 h-[20px] px-1 rounded-md transition hover:bg-[#EDEDED] dark:hover:bg-[#202126]",
                {
                  "!bg-[rgba(0,114,255,0.3)]": isDeepThinkActive,
                }
              )}
              onClick={setIsDeepThinkActive}
            >
              <VisibleKey
                shortcut={deepThinking}
                onKeyPress={setIsDeepThinkActive}
              >
                <Brain
                  className={`size-3 ${
                    isDeepThinkActive
                      ? "text-[#0072FF] dark:text-[#0072FF]"
                      : "text-[#333] dark:text-white"
                  }`}
                />
              </VisibleKey>
              {isDeepThinkActive && (
                <span
                  className={`${
                    isDeepThinkActive ? "text-[#0072FF]" : "dark:text-white"
                  }`}
                >
                  {t("search.input.deepThink")}
                </span>
              )}
            </button>
          )}

          <SearchPopover
            datasource={source?.datasource}
            isSearchActive={isSearchActive}
            setIsSearchActive={setIsSearchActive}
            getDataSourcesByServer={getDataSourcesByServer}
          />

          <MCPPopover
            mcp_servers={source?.mcp_servers}
            isMCPActive={isMCPActive}
            setIsMCPActive={setIsMCPActive}
            getMCPByServer={getMCPByServer}
          />

          {!source?.upload?.enabled &&
            !(source?.datasource?.enabled && source?.datasource?.visible) &&
            (source?.type !== "deep_think" || !source?.config?.visible) &&
            !(source?.mcp_servers?.enabled && source?.mcp_servers?.visible) && (
              <div className="px-[9px]">
                <Copyright />
              </div>
            )}
        </div>
      ) : (
        <div data-tauri-drag-region className="w-28 flex gap-2 relative">
          {!disabledExtensions.includes("AIOverview") &&
            isTauri &&
            aiOverviewServer &&
            aiOverviewAssistant &&
            !visibleExtensionStore && (
              <div
                className={clsx(
                  "inline-flex items-center gap-1 h-[20px] px-1 rounded-full hover:!text-[#881c94] cursor-pointer transition",
                  [
                    enabledAiOverview
                      ? "text-[#881c94]"
                      : "text-[#333] dark:text-[#d8d8d8]",
                  ],
                  {
                    "bg-[#881C94]/20 dark:bg-[#202126]": enabledAiOverview,
                  }
                )}
                onClick={() => {
                  setEnabledAiOverview(!enabledAiOverview);
                }}
              >
                <VisibleKey
                  shortcut={aiOverviewShortcut}
                  onKeyPress={() => {
                    setEnabledAiOverview(!enabledAiOverview);
                  }}
                >
                  <Sparkles className="size-3" />
                </VisibleKey>

                <span
                  className={clsx("text-xs", { hidden: !enabledAiOverview })}
                >
                  AI Overview
                </span>
              </div>
            )}
        </div>
      )}

      {isChatPage || hasModules?.length !== 2 ? null : (
        <div className="relative w-16 flex justify-end items-center">
          <div className="absolute right-[52px] -top-2 z-10">
            <VisibleKey
              shortcut={modeSwitch}
              onKeyPress={() => {
                changeMode && changeMode(!isChatMode);
              }}
            />
          </div>

          <ChatSwitch
            isChatMode={isChatMode}
            onChange={(value: boolean) => {
              changeMode && changeMode(value);
            }}
          />
        </div>
      )}
    </div>
  );
};

export default InputControls;
