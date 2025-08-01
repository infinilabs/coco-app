import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useKeyPress, useSize } from "ahooks";
import clsx from "clsx";

import AutoResizeTextarea from "./AutoResizeTextarea";
import { useChatStore } from "@/stores/chatStore";
import { useAppStore } from "@/stores/appStore";
import { useSearchStore } from "@/stores/searchStore";
// import AudioRecording from "../AudioRecording";
import { useConnectStore } from "@/stores/connectStore";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import VisibleKey from "@/components/Common/VisibleKey";
import SearchIcons from "./SearchIcons";
import ChatIcons from "./ChatIcons";
import { useKeyboardHandlers } from "@/hooks/useKeyboardHandlers";
import { useAssistantManager } from "./AssistantManager";
import InputControls from "./InputControls";
import { useExtensionsStore } from "@/stores/extensionsStore";
import AudioRecording from "../AudioRecording";
import { getUploadedAttachmentsId, isDefaultServer } from "@/utils";
import { useTauriFocus } from "@/hooks/useTauriFocus";
import { SendMessageParams } from "../Assistant/Chat";
import { isEmpty } from "lodash-es";

interface ChatInputProps {
  onSend: (params: SendMessageParams) => void;
  disabled: boolean;
  disabledChange: () => void;
  changeMode?: (isChatMode: boolean) => void;
  isChatMode: boolean;
  inputValue: string;
  changeInput: (val: string) => void;
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
  checkScreenPermission,
  requestScreenPermission,
  getScreenMonitors,
  getScreenWindows,
  captureWindowScreenshot,
  captureMonitorScreenshot,
  openFileDialog,
  getFileMetadata,
  getFileIcon,
}: ChatInputProps) {
  const { t } = useTranslation();

  const { currentAssistant } = useConnectStore();

  const { sourceData, goAskAi } = useSearchStore();

  const { modifierKey, returnToInput, setModifierKeyPressed } =
    useShortcutsStore();
  const { isTauri, language, setBlurred } = useAppStore();

  useEffect(() => {
    return () => {
      changeInput("");
    };
  }, []);

  const textareaRef = useRef<{ reset: () => void; focus: () => void }>(null);

  const { curChatEnd } = useChatStore();
  const { setSearchValue, visibleExtensionStore, selectedExtension } =
    useSearchStore();
  const { uploadAttachments } = useChatStore();

  useTauriFocus({
    onFocus() {
      setBlurred(false);
      setModifierKeyPressed(false);
    },
  });

  const handleToggleFocus = useCallback(() => {
    textareaRef.current?.focus();
  }, [textareaRef]);

  const handleSubmit = useCallback(() => {
    const trimmedValue = inputValue.trim();

    console.log("handleSubmit", trimmedValue, disabled);

    if ((trimmedValue || !isEmpty(uploadAttachments)) && !disabled) {
      changeInput("");
      onSend({
        message: trimmedValue,
        attachments: getUploadedAttachmentsId(),
      });
    }
  }, [inputValue, disabled, onSend, uploadAttachments]);

  useKeyboardHandlers();

  useKeyPress(`${modifierKey}.${returnToInput}`, handleToggleFocus);

  const handleInputChange = useCallback(
    (value: string) => {
      changeInput(value);
      setSearchValue(value);
      if (!isChatMode) {
        onSend({ message: value });
      }
    },
    [changeInput, isChatMode, onSend]
  );

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

  const { askAI, askAIRef, assistantDetail, handleKeyDownAutoResizeTextarea } =
    useAssistantManager({
      isChatMode,
      inputValue,
      handleSubmit,
      changeInput,
    });

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
      placeholder: source?.chat_settings?.placeholder,
    };
  }, [currentAssistant]);

  const disabledExtensions = useExtensionsStore((state) => {
    return state.disabledExtensions;
  });

  const akiAiTooltipPrefix = useMemo(() => {
    if (language === "zh") {
      if (/^[a-zA-Z]/.test(askAI?.name)) {
        return "问 ";
      }

      return "问";
    }

    return "Ask";
  }, [language, askAI]);

  const { currentService } = useConnectStore();
  const [visibleAudioInput, setVisibleAudioInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useSize(containerRef);
  const searchIconRef = useRef<HTMLDivElement>(null);
  const searchIconSize = useSize(searchIconRef);
  const extraIconRef = useRef<HTMLDivElement>(null);
  const extraIconSize = useSize(extraIconRef);

  useEffect(() => {
    setVisibleAudioInput(isDefaultServer());
  }, [currentService]);

  const renderSearchIcon = () => (
    <div ref={searchIconRef} className="w-fit">
      <SearchIcons
        lineCount={lineCount}
        isChatMode={isChatMode}
        assistant={askAIRef.current}
      />
    </div>
  );

  const renderExtraIcon = () => (
    <div ref={extraIconRef} className="flex items-center gap-2 w-fit">
      {isChatMode && (
        <ChatIcons
          lineCount={lineCount}
          isChatMode={isChatMode}
          curChatEnd={curChatEnd}
          inputValue={inputValue}
          onSend={onSend}
          disabledChange={disabledChange}
        />
      )}

      {!isChatMode &&
        (sourceData || visibleExtensionStore || selectedExtension) && (
          <div
            className={`absolute ${
              lineCount === 1 ? "-top-[5px]" : "top-[calc(100%-25px)]"
            } left-2`}
          >
            <VisibleKey shortcut="←" />
          </div>
        )}

      {/* 
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
     */}

      {!isChatMode &&
        isTauri &&
        !goAskAi &&
        askAI &&
        !disabledExtensions.includes("QuickAIAccess") &&
        !visibleExtensionStore && (
          <div className="flex items-center gap-2 text-sm text-[#AEAEAE] dark:text-[#545454] whitespace-nowrap">
            <span>
              {t("search.askCocoAi.title", {
                replace: [akiAiTooltipPrefix, askAI.name],
              })}
            </span>
            <div className="flex items-center justify-center w-8 h-[20px] text-xs rounded-md border border-black/10 dark:border-[#545454]">
              Tab
            </div>
          </div>
        )}

      {visibleAudioInput && (
        <AudioRecording
          key={isChatMode ? "chat" : "search"}
          onChange={(text) => {
            const nextValue = inputValue + text;

            changeInput(nextValue);
            setSearchValue(nextValue);
          }}
        />
      )}
    </div>
  );

  const renderTextarea = () => {
    return (
      <VisibleKey
        shortcut={returnToInput}
        rootClassName="flex-1 flex items-center justify-center"
        shortcutClassName="!left-0 !translate-x-0"
      >
        <AutoResizeTextarea
          ref={textareaRef}
          isChatMode={isChatMode}
          input={inputValue}
          setInput={handleInputChange}
          handleKeyDown={handleKeyDownAutoResizeTextarea}
          chatPlaceholder={
            isChatMode
              ? assistantConfig.placeholder || chatPlaceholder
              : goAskAi
              ? assistantDetail?._source?.chat_settings?.placeholder
              : searchPlaceholder || t("search.input.searchPlaceholder")
          }
          lineCount={lineCount}
          onLineCountChange={setLineCount}
          firstLineMaxWidth={
            (containerSize?.width ?? 0) -
            (searchIconSize?.width ?? 0) -
            (extraIconSize?.width ?? 0)
          }
        />
      </VisibleKey>
    );
  };

  return (
    <div className={`w-full relative`}>
      <div
        className={`p-2 flex items-center dark:text-[#D8D8D8] bg-[#ededed] dark:bg-[#202126] rounded-md transition-all relative overflow-hidden`}
      >
        <div
          ref={containerRef}
          className={clsx("relative w-full", {
            "flex items-center gap-2": lineCount === 1,
          })}
        >
          {lineCount === 1 && renderSearchIcon()}

          {renderTextarea()}

          {lineCount === 1 && renderExtraIcon()}

          {lineCount > 1 && (
            <div className="flex items-center mt-2">
              <div className="flex-1">{renderSearchIcon()}</div>

              <div className="self-end">{renderExtraIcon()}</div>
            </div>
          )}
        </div>
      </div>

      <InputControls
        isChatMode={isChatMode}
        isChatPage={isChatPage}
        hasModules={hasModules}
        searchPlaceholder={searchPlaceholder}
        chatPlaceholder={chatPlaceholder}
        isSearchActive={isSearchActive}
        setIsSearchActive={setIsSearchActive}
        isDeepThinkActive={isDeepThinkActive}
        setIsDeepThinkActive={setIsDeepThinkActive}
        isMCPActive={isMCPActive}
        setIsMCPActive={setIsMCPActive}
        changeMode={changeMode}
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
    </div>
  );
}
