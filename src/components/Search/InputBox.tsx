import { ArrowBigLeft, Search, Send, Brain } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

import ChatSwitch from "@/components/Common/ChatSwitch";
import AutoResizeTextarea from "./AutoResizeTextarea";
import { useChatStore } from "@/stores/chatStore";
import StopIcon from "@/icons/Stop";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
import { metaOrCtrlKey } from "@/utils/keyboardUtils";
import SearchPopover from "./SearchPopover";
import { DataSource } from "@/types/commands";
import Copyright from "../Common/Copyright";
// import AudioRecording from "../AudioRecording";

interface ChatInputProps {
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
  hasFeature?: string[];
  isChatPage?: boolean;
  getDataSourcesByServer: (serverId: string) => Promise<DataSource[]>;
  setupWindowFocusListener: (callback: () => void) => Promise<() => void>;
  hideCoco?: () => void;
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
  hasModules?: string[];
  searchPlaceholder?: string;
  chatPlaceholder?: string;
}

export default function ChatInput({
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
  hasFeature = ["think", "search", "think_icon", "search_icon"],
  isChatPage = false,
  getDataSourcesByServer,
  setupWindowFocusListener,
  hideCoco,
  // checkScreenPermission,
  // requestScreenPermission,
  // getScreenMonitors,
  // getScreenWindows,
  // captureMonitorScreenshot,
  // captureWindowScreenshot,
  // openFileDialog,
  // getFileMetadata,
  // getFileIcon,
  hasModules,
  searchPlaceholder,
  chatPlaceholder,
}: ChatInputProps) {
  const { t } = useTranslation();

  const showTooltip = useAppStore(
    (state: { showTooltip: boolean }) => state.showTooltip
  );

  const isPinned = useAppStore((state) => state.isPinned);

  const sourceData = useSearchStore(
    (state: { sourceData: any }) => state.sourceData
  );
  const setSourceData = useSearchStore(
    (state: { setSourceData: any }) => state.setSourceData
  );

  useEffect(() => {
    return () => {
      changeInput("");
      setSourceData(undefined);
      setIsCommandPressed(false);
      pressedKeys.clear();
    };
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<{ reset: () => void; focus: () => void }>(null);

  const { curChatEnd, connected } = useChatStore();

  const [isCommandPressed, setIsCommandPressed] = useState(false);

  const handleToggleFocus = useCallback(() => {
    if (isChatMode) {
      textareaRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [isChatMode, textareaRef, inputRef]);

  const handleSubmit = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !disabled) {
      changeInput("");
      onSend(trimmedValue);
    }
  }, [inputValue, disabled, onSend]);

  const pressedKeys = new Set<string>();

  const handleEscapeKey = useCallback(() => {
    if (inputValue) {
      changeInput("");
    } else if (!isPinned) {
      hideCoco && hideCoco();
    }
  }, [inputValue, isPinned]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // console.log("handleKeyDown", e.code, e.key);

      if (e.key === "Escape") {
        handleEscapeKey();
        return;
      }

      pressedKeys.add(e.key);

      if (e.key === metaOrCtrlKey()) {
        setIsCommandPressed(true);
      }

      if (pressedKeys.has(metaOrCtrlKey())) {
        // e.preventDefault();
        switch (e.code) {
          case "Comma":
            setIsCommandPressed(false);
            break;
          case "KeyI":
            handleToggleFocus();
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
      setIsCommandPressed,
      disabledChange,
      curChatEnd,
    ]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    pressedKeys.delete(e.key);
    if (e.key === metaOrCtrlKey()) {
      setIsCommandPressed(false);
    }
  }, []);

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
      if (isChatMode) {
        textareaRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }).then((unlistener) => {
      unlisten = unlistener;
    });

    return () => {
      unlisten?.();
    };
  }, [isChatMode]);

  const DeepThinkClick = () => {
    setIsDeepThinkActive();
  };

  // const openWebsite = () => {
  //   window.open("https://coco.rs/");
  // };

  return (
    <div className={`w-full relative`}>
      <div
        className={`p-2 flex items-center dark:text-[#D8D8D8] bg-[#ededed] dark:bg-[#202126] rounded transition-all relative overflow-hidden`}
      >
        <div className="flex flex-wrap gap-2 flex-1 items-center relative">
          {!isChatMode && !sourceData ? (
            <Search className="w-4 h-4 text-[#ccc] dark:text-[#d8d8d8]" />
          ) : !isChatMode && sourceData ? (
            <ArrowBigLeft
              className="w-4 h-4 text-[#ccc] dark:text-[#d8d8d8] cursor-pointer"
              onClick={() => setSourceData(undefined)}
            />
          ) : null}

          {isChatMode ? (
            <AutoResizeTextarea
              ref={textareaRef}
              input={inputValue}
              setInput={(value: string) => {
                changeInput(value);
              }}
              connected={connected}
              handleKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              chatPlaceholder={chatPlaceholder}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              autoFocus
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              className="text-base font-normal flex-1 outline-none min-w-[200px] text-[#333] dark:text-[#d8d8d8] placeholder-text-xs placeholder-[#999] dark:placeholder-gray-500 bg-transparent"
              placeholder={
                searchPlaceholder || t("search.input.searchPlaceholder")
              }
              value={inputValue}
              onChange={(e) => {
                onSend(e.target.value);
              }}
            />
          )}
          {showTooltip && isCommandPressed && !isChatMode && sourceData ? (
            <div
              className={`absolute left-0 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#ededed] dark:shadow-[-6px_0px_6px_2px_#202126]`}
            >
              ←
            </div>
          ) : null}
          {showTooltip && isCommandPressed ? (
            <div
              className={`absolute ${
                !isChatMode && sourceData ? "left-7" : ""
              } w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#ededed] dark:shadow-[-6px_0px_6px_2px_#202126]`}
            >
              I
            </div>
          ) : null}
        </div>

        {/* <AudioRecording
          key={isChatMode ? "chat" : "search"}
          onChange={(text) => {
            changeInput(inputValue + text);
          }}
        /> */}

        {isChatMode && curChatEnd ? (
          <button
            className={`ml-1 p-1 ${
              inputValue
                ? "bg-[#0072FF]"
                : "bg-[#E4E5F0] dark:bg-[rgb(84,84,84)]"
            } rounded-full transition-colors`}
            type="submit"
            onClick={() => onSend(inputValue.trim())}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        ) : null}
        {isChatMode && !curChatEnd ? (
          <button
            className={`ml-1 px-1 bg-[#0072FF] rounded-full transition-colors`}
            type="submit"
            onClick={() => disabledChange()}
          >
            <StopIcon
              size={16}
              className="w-4 h-4 text-white"
              aria-label="Stop message"
            />
          </button>
        ) : null}

        {showTooltip && isChatMode && isCommandPressed ? (
          <div
            className={`absolute right-10 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
          >
            M
          </div>
        ) : null}

        {showTooltip && isChatMode && isCommandPressed ? (
          <div
            className={`absolute right-3 w-4 h-4 flex items-end justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
          >
            ↩︎
          </div>
        ) : null}

        {!connected && isChatMode ? (
          <div className="absolute top-0 right-0 bottom-0 left-0 px-2 py-4 bg-red-500/10 rounded-md font-normal text-xs text-gray-400 flex items-center gap-4">
            {t("search.input.connectionError")}
            <div
              className="w-[96px] h-[24px] bg-[#0061FF] rounded-[12px] font-normal text-xs text-white flex items-center justify-center cursor-pointer"
              onClick={reconnect}
            >
              {t("search.input.reconnect")}
            </div>
          </div>
        ) : null}
      </div>

      <div
        data-tauri-drag-region
        className="flex justify-between items-center py-2"
      >
        {isChatMode ? (
          <div className="flex gap-2 text-sm text-[#333] dark:text-[#d8d8d8]">
            {/* <InputExtra
              checkScreenPermission={checkScreenPermission}
              requestScreenPermission={requestScreenPermission}
              getScreenMonitors={getScreenMonitors}
              getScreenWindows={getScreenWindows}
              captureMonitorScreenshot={captureMonitorScreenshot}
              captureWindowScreenshot={captureWindowScreenshot}
              openFileDialog={openFileDialog}
              getFileMetadata={getFileMetadata}
              getFileIcon={getFileIcon}
            /> */}

            {hasFeature.includes("think") && (
              <button
                className={clsx(
                  "flex items-center gap-1 p-1 h-6 rounded-lg transition hover:bg-[#EDEDED] dark:hover:bg-[#202126]",
                  {
                    "!bg-[rgba(0,114,255,0.3)]": isDeepThinkActive,
                  }
                )}
                onClick={DeepThinkClick}
              >
                <Brain
                  className={`size-4 ${
                    isDeepThinkActive
                      ? "text-[#0072FF] dark:text-[#0072FF]"
                      : "text-[#333] dark:text-white"
                  }`}
                />
                {isDeepThinkActive && (
                  <span
                    className={
                      isDeepThinkActive ? "text-[#0072FF]" : "dark:text-white"
                    }
                  >
                    {t("search.input.deepThink")}
                  </span>
                )}
              </button>
            )}

            {hasFeature.includes("search") && (
              <SearchPopover
                isSearchActive={isSearchActive}
                setIsSearchActive={setIsSearchActive}
                getDataSourcesByServer={getDataSourcesByServer}
              />
            )}

            {!hasFeature.includes("search") && !hasFeature.includes("think") ? (
              <Copyright />
            ) : null}
          </div>
        ) : (
          <div
            data-tauri-drag-region
            className="w-28 flex gap-2 relative"
          ></div>
        )}

        {isChatPage || hasModules?.length !== 2 ? null : (
          <div className="relative w-16 flex justify-end items-center">
            {showTooltip && isCommandPressed ? (
              <div
                className={`absolute left-1 z-10 w-4 h-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]`}
              >
                S
              </div>
            ) : null}
            <ChatSwitch
              isChatMode={isChatMode}
              onChange={(value: boolean) => {
                value && disabledChange();
                changeMode && changeMode(value);
                setSourceData(undefined);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
