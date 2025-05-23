import { Brain } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { useKeyPress } from "ahooks";
import { cloneDeep, isEmpty } from "lodash-es";

import ChatSwitch from "@/components/Common/ChatSwitch";
import AutoResizeTextarea from "./AutoResizeTextarea";
import { useChatStore } from "@/stores/chatStore";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
import { metaOrCtrlKey } from "@/utils/keyboardUtils";
import SearchPopover from "./SearchPopover";
import MCPPopover from "./MCPPopover";
// import AudioRecording from "../AudioRecording";
import { DataSource } from "@/types/commands";
// import InputExtra from "./InputExtra";
import { useConnectStore } from "@/stores/connectStore";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import Copyright from "@/components/Common/Copyright";
import VisibleKey from "@/components/Common/VisibleKey";
import ConnectionError from "./ConnectionError";
import SearchIcons from "./SearchIcons";
import ChatIcons from "./ChatIcons";
import platformAdapter from "@/utils/platformAdapter";
import { Post } from "@/api/axiosRequest";
import { useExtensionsStore } from "@/stores/extensionsStore";
// import AiSummaryIcon from "../Common/Icons/AiSummaryIcon";

interface ChatInputProps {
  isTauri: boolean;
  onSend: (message: string) => void;
  disabled: boolean;
  disabledChange: () => void;
  changeMode?: (isChatMode: boolean) => void;
  isChatMode: boolean;
  inputValue: string;
  changeInput: (val: string) => void;
  reconnect: () => void;
  isSearchActive: boolean;
  setIsSearchActive: () => void;
  isDeepThinkActive: boolean;
  setIsDeepThinkActive: () => void;
  isMCPActive: boolean;
  setIsMCPActive: () => void;
  isChatPage?: boolean;
  setupWindowFocusListener: (callback: () => void) => Promise<() => void>;
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
  hideCoco?: () => void;
  hasModules?: string[];
  searchPlaceholder?: string;
  chatPlaceholder?: string;
}

export default function ChatInput({
  isTauri,
  onSend,
  disabled,
  changeMode,
  isChatMode,
  inputValue,
  changeInput,
  disabledChange,
  reconnect,
  isSearchActive,
  setIsSearchActive,
  isDeepThinkActive,
  setIsDeepThinkActive,
  isMCPActive,
  setIsMCPActive,
  isChatPage = false,
  setupWindowFocusListener,
  hasModules = [],
  searchPlaceholder,
  chatPlaceholder,
}: ChatInputProps) {
  const { t } = useTranslation();

  const currentAssistant = useConnectStore((state) => state.currentAssistant);

  const showTooltip = useAppStore((state) => state.showTooltip);

  const sourceData = useSearchStore((state) => state.sourceData);
  const setSourceData = useSearchStore((state) => state.setSourceData);

  // const sessionId = useConnectStore((state) => state.currentSessionId);
  const modifierKey = useShortcutsStore((state) => state.modifierKey);
  const modeSwitch = useShortcutsStore((state) => state.modeSwitch);
  const returnToInput = useShortcutsStore((state) => state.returnToInput);
  const deepThinking = useShortcutsStore((state) => state.deepThinking);

  useEffect(() => {
    return () => {
      changeInput("");
      setSourceData(undefined);
      pressedKeys.clear();
    };
  }, []);

  const textareaRef = useRef<{ reset: () => void; focus: () => void }>(null);

  const { curChatEnd, connected } = useChatStore();

  const setModifierKeyPressed = useShortcutsStore((state) => {
    return state.setModifierKeyPressed;
  });
  const setBlurred = useAppStore((state) => state.setBlurred);

  useEffect(() => {
    const handleFocus = () => {
      setBlurred(false);
      setModifierKeyPressed(false);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const handleToggleFocus = useCallback(() => {
    textareaRef.current?.focus();
  }, [textareaRef]);

  const handleSubmit = useCallback(() => {
    const trimmedValue = inputValue.trim();
    console.log("handleSubmit", trimmedValue, disabled);
    if (trimmedValue && !disabled) {
      changeInput("");
      onSend(trimmedValue);
    }
  }, [inputValue, disabled, onSend]);

  const pressedKeys = new Set<string>();

  useKeyPress(`${modifierKey}.${returnToInput}`, handleToggleFocus);

  const visibleContextMenu = useSearchStore((state) => {
    return state.visibleContextMenu;
  });

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      pressedKeys.add(e.key);

      if (pressedKeys.has(metaOrCtrlKey())) {
        // e.preventDefault();
        switch (e.code) {
          case "Comma":
            console.log("Comma");
            break;
          case "ArrowLeft":
            setSourceData(undefined);
            break;
          case "KeyM":
            console.log("KeyM");
            break;
          case "Enter":
            isChatMode && (curChatEnd ? handleSubmit() : disabledChange?.());
            break;
          case "KeyO":
            console.log("KeyO");
            break;
          case "KeyU":
            console.log("KeyU");
            break;
          case "KeyN":
            console.log("KeyN");
            break;
          case "KeyG":
            console.log("KeyG");
            break;
          default:
            break;
        }
      }
    },
    [
      handleToggleFocus,
      isChatMode,
      handleSubmit,
      setSourceData,
      disabledChange,
      curChatEnd,
      visibleContextMenu,
    ]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    pressedKeys.delete(e.key);
    if (e.key === metaOrCtrlKey()) {
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      changeInput(value);
      if (!isChatMode) {
        onSend(value);
      }
    },
    [changeInput, isChatMode, onSend]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    setupWindowFocusListener(() => {
      textareaRef.current?.focus();
    }).then((unlistener) => {
      unlisten = unlistener;
    });

    return () => {
      unlisten?.();
    };
  }, [isChatMode]);

  const [lineCount, setLineCount] = useState(1);

  const source = currentAssistant?._source;

  const assistantConfig = useMemo(() => {
    return {
      datasourceEnabled: source?.datasource?.enabled,
      datasourceVisible: source?.datasource?.visible,
      datasourceIds: source?.datasource?.ids,
      mcpEnabled: source?.mcp_servers?.enabled,
      mcpVisible: source?.mcp_servers?.visible,
      mcpIds: source?.mcp_servers?.ids,
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
  const goAskAi = useSearchStore((state) => state.goAskAi);
  const setGoAskAi = useSearchStore((state) => state.setGoAskAi);
  const setAskAiMessage = useSearchStore((state) => state.setAskAiMessage);
  const quickAiAccessAssistant = useExtensionsStore((state) => {
    return state.quickAiAccessAssistant;
  });
  const selectedAssistant = useSearchStore((state) => {
    return state.selectedAssistant;
  });
  const assistantRef = useRef<any>(null);

  const assistant = useMemo(() => {
    return selectedAssistant ?? quickAiAccessAssistant;
  }, [quickAiAccessAssistant, selectedAssistant]);

  const handleAskAi = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    assistantRef.current = cloneDeep(assistant);

    if (!assistantRef.current) return;

    event.preventDefault();

    const { value } = event.currentTarget;

    if (!selectedAssistant && isEmpty(value)) return;

    changeInput("");
    setGoAskAi(true);
    setAskAiMessage(!goAskAi && selectedAssistant ? "" : value);
  };

  const renderSearchIcon = () => {
    return (
      <SearchIcons
        lineCount={lineCount}
        isChatMode={isChatMode}
        sourceData={sourceData}
        assistant={assistantRef.current}
        setSourceData={setSourceData}
      />
    );
  };

  const renderExtraIcon = () => {
    return (
      <div className="flex items-center gap-2">
        <ChatIcons
          lineCount={lineCount}
          isChatMode={isChatMode}
          curChatEnd={curChatEnd}
          inputValue={inputValue}
          onSend={onSend}
          disabledChange={disabledChange}
        />

        {showTooltip && !isChatMode && sourceData && (
          <div
            className={`absolute ${
              lineCount === 1 ? "-top-[5px]" : "top-[calc(100%-25px)]"
            } left-2`}
          >
            <VisibleKey shortcut="←" />
          </div>
        )}

        {/* {showTooltip && (
          <div
            className={clsx(
              `absolute ${
                lineCount === 1 ? "-top-[5px]" : "top-[calc(100%-25px)]"
              } left-2`,
              {
                "left-8": !isChatMode && sourceData,
              }
            )}
          >
            <VisibleKey shortcut={returnToInput} />
          </div>
        )} */}

        {!isChatMode && !goAskAi && assistant && (
          <div className="flex items-center gap-2 text-sm text-[#AEAEAE] dark:text-[#545454] whitespace-nowrap">
            <span>
              {t("search.askCocoAi.title", {
                replace: [assistant.name],
              })}
            </span>
            <div className="flex items-center justify-center w-8 h-[20px] text-xs rounded-md border border-black/10 dark:border-[#545454]">
              Tab
            </div>
          </div>
        )}

        {/* <AudioRecording
          key={isChatMode ? "chat" : "search"}
          onChange={(text) => {
            changeInput(inputValue + text);
          }}
        /> */}

        {showTooltip && isChatMode && (
          <div
            className={`absolute ${
              lineCount === 1 ? "-top-[5px]" : "top-[calc(100%-30px)]"
            }  right-[12px]`}
          >
            <VisibleKey shortcut="↩︎" />
          </div>
        )}

        {!connected && isChatMode ? (
          <ConnectionError reconnect={reconnect} connected={connected} />
        ) : null}
      </div>
    );
  };

  const renderTextarea = () => {
    return (
      <VisibleKey
        shortcut={returnToInput}
        rootClassName="flex-1 flex items-center justify-center"
        shortcutClassName="!left-0 !translate-x-0"
      >
        <AutoResizeTextarea
          ref={textareaRef}
          input={inputValue}
          setInput={handleInputChange}
          connected={connected}
          handleKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            const { key, shiftKey } = e;

            const { value } = e.currentTarget;

            if (key === "Backspace" && value === "") {
              return setGoAskAi(false);
            }

            if (key === "Tab") {
              return handleAskAi(e);
            }

            if (key === "Enter" && !shiftKey) {
              if (goAskAi) {
                return handleAskAi(e);
              }

              e.preventDefault();
              handleSubmit();

              if (!isChatMode) {
                onSend(inputValue);
              }
            }
          }}
          chatPlaceholder={
            isChatMode
              ? chatPlaceholder
              : searchPlaceholder || t("search.input.searchPlaceholder")
          }
          lineCount={lineCount}
          onLineCountChange={setLineCount}
        />
      </VisibleKey>
    );
  };

  return (
    <div className={`w-full relative`}>
      <div
        className={`p-2 flex items-center dark:text-[#D8D8D8] bg-[#ededed] dark:bg-[#202126] rounded-md transition-all relative overflow-hidden`}
      >
        {lineCount === 1 ? (
          <div className="relative flex items-center gap-2 w-full">
            {renderSearchIcon()}

            {renderTextarea()}

            {renderExtraIcon()}
          </div>
        ) : (
          <div className="relative w-full">
            {renderTextarea()}

            <div className="flex items-center mt-2">
              <div className="flex-1">{renderSearchIcon()}</div>

              <div className="self-end">{renderExtraIcon()}</div>
            </div>
          </div>
        )}
      </div>

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
            {/* <AiSummaryIcon color={"#881c94"} /> */}
          </div>
        )}

        {isChatPage || hasModules?.length !== 2 ? null : (
          <div className="relative w-16 flex justify-end items-center">
            {showTooltip && (
              <div className="absolute right-[52px] -top-2 z-10">
                <VisibleKey shortcut={modeSwitch} />
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
    </div>
  );
}
