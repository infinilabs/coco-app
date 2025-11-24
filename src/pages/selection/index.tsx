import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Copy,
  Languages,
  Search,
  X,
  Volume2,
  Pause,
  Play,
  FileText,
} from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Separator } from "@radix-ui/react-separator";

import { useSelectionStore } from "@/stores/selectionStore";
import { copyToClipboard } from "@/utils";
import cocoLogoImg from "@/assets/app-icon.png";
import platformAdapter from "@/utils/platformAdapter";

// Simple animated selection window content
export default function SelectionWindow() {
  const { t } = useTranslation();
  
  const [text, setText] = useState("");
  const [visible, setVisible] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [volume, setVolume] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const textRef = useRef<string>("");

  const AUTO_HIDE_KEY = "selection_auto_hide_ms";
  const autoHideMs = useMemo(() => {
    const v = Number(localStorage.getItem(AUTO_HIDE_KEY));
    return Number.isFinite(v) && v > 0 ? v : 5000;
  }, []);
  const timerRef = useRef<number | null>(null);

  const scheduleAutoHide = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      close();
    }, autoHideMs);
  };

  useEffect(() => {
    try {
      const updateVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    } catch {}

    const unlistenPromise = platformAdapter.listenEvent(
      "selection-text",
      async ({ payload }: any) => {
        const incoming =
          typeof payload === "string" ? payload : String(payload?.text ?? "");
        const trimmed = incoming.trim();

        const getCurrentWinSafe = async () => {
          try {
            return await platformAdapter.getCurrentWebviewWindow();
          } catch {
            return null;
          }
        };

        if (!useSelectionStore.getState().selectionEnabled) {
          setVisible(false);
          const win = await getCurrentWinSafe();
          win?.hide();
          return;
        }

        if (!trimmed) {
          setText("");
          textRef.current = ""; // sync ref immediately to avoid stale value
          setVisible(false);
          const win = await getCurrentWinSafe();
          win?.hide();
          return;
        }

        setText(incoming);
        textRef.current = incoming; // sync ref immediately to avoid relying on render
        setAnimatingOut(false);
        setVisible(true);

        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        scheduleAutoHide();
      }
    );

    return () => {
      unlistenPromise
        .then((fn) => {
          try {
            fn();
          } catch {}
        })
        .catch(() => {});
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoHideMs]);

  useEffect(() => {
    useSelectionStore.getState().initSync();
  }, []);

  const close = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {}
    setIsSpeaking(false);
    setIsPaused(false);
    setAnimatingOut(true);
    setTimeout(async () => {
      setVisible(false);
      const win = await platformAdapter.getCurrentWebviewWindow();
      win?.hide();
    }, 150);
  };

  const openMain = async () => {
    try {
      await platformAdapter.commands("show_coco");
    } catch {
      await platformAdapter.emitEvent("show-coco");
      await platformAdapter.showWindow();
    }
  };

  const handleChatAction = useCallback(
    async (assistantId?: string) => {
      const payloadText = (textRef.current || "").trim();
      if (!payloadText) return;

      await openMain();
      await new Promise((r) => setTimeout(r, 120));

      await platformAdapter.emitEvent("selection-action", {
        action: "chat",
        text: payloadText,
        assistantId,
      });

      if (!isSpeaking) {
        await close();
      }
    },
    [openMain, isSpeaking, close]
  );

  const searchMain = useCallback(async () => {
    const payloadText = (textRef.current || "").trim();
    console.log("searchMain payload", payloadText);
    if (!payloadText) return;

    await openMain();
    await new Promise((r) => setTimeout(r, 120));
    await platformAdapter.emitEvent("selection-action", {
      action: "search",
      text: payloadText,
    });
    if (!isSpeaking) {
      await close();
    }
  }, []);

  const stopSpeak = () => {
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const speak = useCallback(async () => {
    try {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (isSpeaking && !isPaused) {
        window.speechSynthesis.pause();
        setIsPaused(true);
        return;
      }
      if (isSpeaking && isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(trimmed);
      const zhVoice =
        voicesRef.current.find((v) => /zh|cn/i.test(v.lang)) ||
        window.speechSynthesis.getVoices().find((v) => /zh|cn/i.test(v.lang));
      if (zhVoice) utterance.voice = zhVoice;
      utterance.rate = 1;
      utterance.volume = volume;

      // pause auto-hide while speaking
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        utteranceRef.current = null;
        scheduleAutoHide();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        utteranceRef.current = null;
        scheduleAutoHide();
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setIsPaused(false);
    } catch (e) {
      console.error("TTS 播放失败", e);
      stopSpeak();
      scheduleAutoHide();
    }
  }, [text]);

  const handleCopy = useCallback(async () => {
    const payloadText = (textRef.current || "").trim();
    if (!payloadText) return;

    try {
      await copyToClipboard(payloadText, true);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("Copy failed:", e);
    }
  }, []);

  const getActionHandler = (type: string, assistantId?: string) => {
    switch (type) {
      case "ask_ai":
      case "translate":
      case "summary":
        return () => handleChatAction(assistantId);
      case "copy":
        return handleCopy;
      case "search":
        return searchMain;
      case "speak":
        return speak;
      default:
        return () => {};
    }
  };

  // Render buttons from store; hide ones requiring assistant without assistantId
  const toolbarConfig = useSelectionStore((s) => s.toolbarConfig);
  const iconsOnly = useSelectionStore((s) => s.iconsOnly);

  const requiresAssistant = (type?: string) =>
    type === "ask_ai" || type === "translate" || type === "summary";

  const visibleButtons = useMemo(
    () =>
      (Array.isArray(toolbarConfig) ? toolbarConfig : []).filter((btn: any) => {
        const type = btn?.action?.type;
        if (requiresAssistant(type)) {
          return Boolean(btn?.action?.assistantId);
        }
        return true;
      }),
    [toolbarConfig]
  );

  // Lucide icon map for dynamic rendering
  const LUCIDE_ICON_MAP: Record<string, any> = {
    Search,
    Bot,
    Languages,
    FileText,
    Copy,
    Volume2,
  };

  // Component: render icon (lucide or custom)
  const IconRenderer = ({ icon }: { icon?: any }) => {
    // Support lucide icon or custom image
    if (icon?.type === "lucide") {
      const Icon =
        LUCIDE_ICON_MAP[icon?.name as string] || LUCIDE_ICON_MAP.Search;
      return (
        <Icon
          className="size-4 transition-transform duration-150"
          style={icon?.color ? { color: icon.color } : undefined}
        />
      );
    }
    if (icon?.type === "custom" && icon?.dataUrl) {
      return (
        <img
          src={icon.dataUrl}
          className="size-4 rounded"
          alt=""
          style={
            icon?.color
              ? { filter: `drop-shadow(0 0 0 ${icon.color})` }
              : undefined
          }
        />
      );
    }
    // default
    return <Search className="size-4 text-[#6366F1]" />;
  };

  // Component: single toolbar button
  const ToolbarButton = ({
    btn,
    onClick,
  }: {
    btn: any;
    onClick: () => void;
  }) => {
    const label = btn?.labelKey ? t(btn.labelKey) : btn?.label || btn?.id || "";
    return (
      <button
        className="flex items-center gap-1 p-1 rounded-md cursor-pointer whitespace-nowrap transition-all duration-150"
        onClick={onClick}
        title={label}
      >
        <IconRenderer icon={btn?.icon} />
        {!iconsOnly && (
          <span className="text-[13px] transition-opacity duration-150">
            {label}
          </span>
        )}
      </button>
    );
  };

  // Component: header logo
  const HeaderLogo = () => {
    return (
      <img
        src={cocoLogoImg}
        alt="Coco Logo"
        className="w-6 h-6"
        onClick={openMain}
        onError={(e) => {
          try {
            (e.target as HTMLImageElement).src = "/src-tauri/assets/logo.png";
          } catch {}
        }}
      />
    );
  };

  // Component: selected text preview
  const TextPreview = ({ text }: { text: string }) => {
    return (
      <div className="relative">
        <div
          data-tauri-drag-region="false"
          className="rounded-md bg-black/5 dark:bg-white/5 px-2 py-1 leading-4 text-[12px] text-ellipsis whitespace-nowrap overflow-hidden"
        >
          {text || t("selection.noText")}
        </div>
        {copied && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-start pl-2">
            <span className="px-2 py-1 rounded bg-black/75 text-white text-[12px]">
              {t("selection.copied")}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Component: speak controls
  const SpeakControls = () => {
    return (
      <div className="flex items-center gap-1">
        <button
          className="flex items-center gap-1 p-1 rounded-md cursor-pointer whitespace-nowrap transition-all duration-150"
          onClick={stopSpeak}
          title={t("selection.speak.stopTitle")}
          aria-label={t("selection.speak.stopAria")}
        >
          <X className="size-4 transition-transform duration-150" />
          {!iconsOnly && (
            <span className="text-[13px] transition-opacity duration-150">
              {t("selection.speak.stopLabel")}
            </span>
          )}
        </button>
        <button
          className="flex items-center gap-1 p-1 rounded-md cursor-pointer whitespace-nowrap transition-all duration-150"
          onClick={speak}
          title={
            isPaused
              ? t("selection.speak.resumeTitle")
              : t("selection.speak.pauseTitle")
          }
          aria-pressed={isPaused}
          aria-label={
            isPaused
              ? t("selection.speak.resumeAria")
              : t("selection.speak.pauseAria")
          }
        >
          {isPaused ? (
            <Play className="size-4 transition-transform duration-150" />
          ) : (
            <Pause className="size-4 transition-transform duration-150" />
          )}
          {!iconsOnly && (
            <span className="text-[13px] transition-opacity duration-150">
              {isPaused
                ? t("selection.speak.resumeLabel")
                : t("selection.speak.pauseLabel")}
            </span>
          )}
        </button>
        <label className="flex items-center gap-1 text-[13px]">
          <span className="sr-only">{t("selection.speak.volumeSr")}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label={t("selection.speak.volumeAria")}
          />
        </label>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={(e) => {
        if (e.target === containerRef.current && !isSpeaking) {
          close();
        }
      }}
      className={clsx(
        "m-0 p-0 w-full h-full",
        "text-[13px] select-none",
        "bg-white dark:bg-[#1E293B]",
        "text-[#111] dark:text-[#ddd]",
        "rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.25)] border border-white/20 dark:border-[#2A3443]",
        "transition-all duration-150",
        {
          "translate-y-0": visible && !animatingOut,
          "translate-y-1": !visible || animatingOut,
        }
      )}
    >
      <div className="px-2 pt-1">
        <TextPreview text={text} />
      </div>

      <div
        data-tauri-drag-region="false"
        className="flex items-center gap-1 p-1 flex-nowrap overflow-hidden"
      >
        <HeaderLogo />

        <Separator
          orientation="vertical"
          decorative
          className="mx-2 h-4 w-px bg-gray-300 dark:bg-white/30 shrink-0"
        />

        {visibleButtons.map((btn: any) => {
          const { type, assistantId } = btn?.action;
          return (
            <ToolbarButton
              key={btn.id}
              btn={btn}
              onClick={getActionHandler(type, assistantId)}
            />
          );
        })}

        {isSpeaking && <SpeakControls />}
      </div>
    </div>
  );
}
