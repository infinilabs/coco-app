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
import { Post } from "@/api/axiosRequest";
import { useConnectStore } from "@/stores/connectStore";
import VisibleKey from "@/components/Common/VisibleKey";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
import { useExtensionsStore } from "@/stores/extensionsStore";
// import InputExtra from "./InputExtra";
// import AiSummaryIcon from "@/components/Common/Icons/AiSummaryIcon";

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
  showTooltip?: boolean;
  changeMode?: (isChatMode: boolean) => void;
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
  showTooltip,
  changeMode,
}: InputControlsProps) => {
  const { t } = useTranslation();

  const isTauri = useAppStore((state) => state.isTauri);

  const currentAssistant = useConnectStore((state) => state.currentAssistant);
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
      options?: {
        from?: number;
        size?: number;
        query?: string;
      }
    ): Promise<DataSource[]> => {
      if (
        !(
          assistantConfig.datasourceEnabled && assistantConfig.datasourceVisible
        )
      ) {
        return [];
      }

      const body: Record<string, any> = {
        id: serverId,
        from: options?.from || 0,
        size: options?.size || 1000,
      };

      body.query = {
        bool: {
          must: [{ term: { enabled: true } }],
        },
      };

      if (options?.query) {
        body.query.bool.must.push({
          query_string: {
            fields: ["combined_fulltext"],
            query: options?.query,
            fuzziness: "AUTO",
            fuzzy_prefix_length: 2,
            fuzzy_max_expansions: 10,
            fuzzy_transpositions: true,
            allow_leading_wildcard: false,
          },
        });
      }

      let response: any;
      if (isTauri) {
        response = await platformAdapter.invokeBackend("datasource_search", {
          id: serverId,
          options: body,
        });
      } else {
        body.id = undefined;
        const [error, res]: any = await Post("/datasource/_search", body);
        if (error) {
          console.error("_search", error);
          return [];
        }
        response = res?.hits?.hits?.map((item: any) => {
          return {
            ...item,
            id: item._source.id,
            name: item._source.name,
          };
        });
      }
      let ids = assistantConfig.datasourceIds;
      if (Array.isArray(ids) && ids.length > 0 && !ids.includes("*")) {
        response = response?.filter((item: any) => ids.includes(item.id));
      }
      return response || [];
    },
    [assistantConfig]
  );

  const getMCPByServer = useCallback(
    async (
      serverId: string,
      options?: {
        from?: number;
        size?: number;
        query?: string;
      }
    ): Promise<DataSource[]> => {
      if (!(assistantConfig.mcpEnabled && assistantConfig.mcpVisible)) {
        return [];
      }
      const body: Record<string, any> = {
        id: serverId,
        from: options?.from || 0,
        size: options?.size || 1000,
      };
      body.query = {
        bool: {
          must: [{ term: { enabled: true } }],
        },
      };

      if (options?.query) {
        body.query.bool.must.push({
          query_string: {
            fields: ["combined_fulltext"],
            query: options?.query,
            fuzziness: "AUTO",
            fuzzy_prefix_length: 2,
            fuzzy_max_expansions: 10,
            fuzzy_transpositions: true,
            allow_leading_wildcard: false,
          },
        });
      }

      let response: any;
      if (isTauri) {
        response = await platformAdapter.invokeBackend(
          "mcp_server_search",
          body
        );
      } else {
        body.id = undefined;
        const [error, res]: any = await Post("/mcp_server/_search", body);
        if (error) {
          console.error("_search", error);
          return [];
        }
        response = res?.hits?.hits?.map((item: any) => {
          return {
            ...item,
            id: item._source.id,
            name: item._source.name,
          };
        });
      }
      let ids = assistantConfig.mcpIds;
      if (Array.isArray(ids) && ids.length > 0 && !ids.includes("*")) {
        response = response?.filter((item: any) => ids.includes(item.id));
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

  return (
    <div
      data-tauri-drag-region
      className="flex justify-between items-center pt-2"
    >
      {isChatMode ? (
        <div className="flex gap-2 text-[12px] leading-3 text-[#333] dark:text-[#d8d8d8]">
          {/* {sessionId && (
        <InputExtra
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
      )} */}

          {source?.type === "deep_think" && source?.config?.visible && (
            <button
              className={clsx(
                "flex items-center gap-1 py-[3px] pl-1 pr-1.5 rounded-md transition hover:bg-[#EDEDED] dark:hover:bg-[#202126]",
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

          {source?.datasource?.enabled && source?.datasource?.visible && (
            <SearchPopover
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
              getDataSourcesByServer={getDataSourcesByServer}
            />
          )}

          {source?.mcp_servers?.enabled && source?.mcp_servers?.visible && (
            <MCPPopover
              isMCPActive={isMCPActive}
              setIsMCPActive={setIsMCPActive}
              getMCPByServer={getMCPByServer}
            />
          )}

          {!(source?.datasource?.enabled && source?.datasource?.visible) &&
          (source?.type !== "deep_think" || !source?.config?.visible) &&
          !(source?.mcp_servers?.enabled && source?.mcp_servers?.visible) ? (
            <div className="px-[9px]">
              <Copyright />
            </div>
          ) : null}
        </div>
      ) : (
        <div data-tauri-drag-region className="w-28 flex gap-2 relative">
          {!disabledExtensions.includes("AIOverview") &&
            isTauri &&
            aiOverviewServer &&
            aiOverviewAssistant && (
              <div
                className={clsx(
                  "inline-flex items-center gap-1 px-2 py-1 rounded-full hover:!text-[#881c94] cursor-pointer transition",
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
                  <Sparkles className="size-4" />
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
          {showTooltip && (
            <div className="absolute right-[52px] -top-2 z-10">
              <VisibleKey
                shortcut={modeSwitch}
                onKeyPress={() => {
                  changeMode && changeMode(!isChatMode);
                }}
              />
            </div>
          )}

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
