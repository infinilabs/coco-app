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
} from "lucide-react";
import clsx from "clsx";

import { useSelectionStore } from "@/stores/selectionStore";
import { copyToClipboard } from "@/utils";
import cocoLogoImg from "@/assets/app-icon.png";
import platformAdapter from "@/utils/platformAdapter";

// Simple animated selection window content
export default function SelectionWindow() {
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

  const selectionEnabled = useSelectionStore((state) => state.selectionEnabled);
  const setSelectionEnabled = useSelectionStore(
    (state) => state.setSelectionEnabled
  );

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
          textRef.current = ""; // 立即同步 ref，避免旧值
          setVisible(false);
          const win = await getCurrentWinSafe();
          win?.hide();
          return;
        }

        setText(incoming);
        textRef.current = incoming; // 立即同步 ref，避免依赖后续渲染
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

  const copy = async () => {
    try {
      await copyToClipboard(text.trim(), true);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      platformAdapter.error("复制失败");
    }
  };

  const openMain = async () => {
    try {
      await platformAdapter.commands("show_coco");
    } catch {
      await platformAdapter.emitEvent("show-coco");
      await platformAdapter.showWindow();
    }
  };

  const askAI = useCallback(async () => {
    const payloadText = (textRef.current || "").trim(); // 冻结点击时文本
    if (!payloadText) return;

    await openMain();
    await new Promise((r) => setTimeout(r, 120));
    await platformAdapter.emitEvent("selection-ask-ai", { text: payloadText });
    if (!isSpeaking) {
      await close();
    }
  }, []);

  const translate = useCallback(async () => {
    const payloadText = (textRef.current || "").trim(); // 冻结点击时文本
    if (!payloadText) return;

    await openMain();
    await new Promise((r) => setTimeout(r, 120));
    await platformAdapter.emitEvent("selection-action", {
      action: "translate",
      text: payloadText,
    });
    if (!isSpeaking) {
      await close();
    }
  }, []);

  const searchMain = useCallback(async () => {
    const payloadText = (textRef.current || "").trim(); // 冻结点击时文本
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

      // 朗读期间暂停自动隐藏
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
        <div
          data-tauri-drag-region="false"
          className="rounded-md bg-black/5 dark:bg-white/5 px-2 py-1 leading-4 text-[12px] text-ellipsis whitespace-nowrap overflow-hidden"
        >
          {text || "未检测到文本"}
        </div>
      </div>

      <div
        data-tauri-drag-region="false"
        className="flex items-center gap-2 px-3 py-2 flex-nowrap overflow-hidden"
      >
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

        <div>||</div>

        <button
          className="group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/8 dark:hover:bg-white/15 hover:ring-1 hover-black/10 dark:hover:ring-white/10 cursor-pointer whitespace-nowrap transition-all duration-150"
          onClick={searchMain}
          title="搜索"
        >
          <Search className="size-4 text-[#6366F1] transition-transform duration-150 group-hover:scale-105 group-hover:opacity-90" />
          <span className="text-[13px] transition-opacity duration-150 group-hover:opacity-90">
            搜索
          </span>
        </button>

        <button
          className="group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/8 dark:hover:bg-white/15 hover:ring-1 hover-black/10 dark:hover:ring-white/10 cursor-pointer whitespace-nowrap transition-all duration-150"
          onClick={askAI}
          title="AI 问答"
        >
          <Bot className="size-4 text-[#0287FF] transition-transform duration-150 group-hover:scale-105 group-hover:opacity-90" />
          <span className="text-[13px] transition-opacity duration-150 group-hover:opacity-90">
            问答
          </span>
        </button>

        <button
          className="group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/8 dark:hover:bg-white/15 hover:ring-1 hover-black/10 dark:hover:ring-white/10 cursor-pointer whitespace-nowrap transition-all duration-150"
          onClick={translate}
          title="翻译"
        >
          <Languages className="size-4 text-[#10B981] transition-transform duration-150 group-hover:scale-105 group-hover:opacity-90" />
          <span className="text-[13px] transition-opacity duration-150 group-hover:opacity-90">
            翻译
          </span>
        </button>

        <button
          className="group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/8 dark:hover:bg-white/15 hover:ring-1 hover-black/10 dark:hover:ring-white/10 cursor-pointer whitespace-nowrap transition-all duration-150"
          onClick={copy}
          title="复制"
        >
          <Copy className="size-4 text-[#64748B] transition-transform duration-150 group-hover:scale-105 group-hover:opacity-90" />
          {copied ? (
            <span
              className="text-[12px] text-[#10B981]"
              role="status"
              aria-live="polite"
            >
              已复制
            </span>
          ) : (
            <span className="text-[13px] transition-opacity duration-150 group-hover:opacity-90">
              复制
            </span>
          )}
        </button>

        <button
          className="group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/8 dark:hover:bg-white/15 hover:ring-1 hover-black/10 dark:hover:ring-white/10 cursor-pointer whitespace-nowrap transition-all duration-150"
          onClick={speak}
          title="朗读"
        >
          <Volume2 className="size-4 text-[#F59E0B] transition-transform duration-150 group-hover:scale-105 group-hover:opacity-90" />
          <span className="text-[13px] transition-opacity duration-150 group-hover:opacity-90">
            朗读
          </span>
        </button>
        {isSpeaking && (
          <div className="flex items-center gap-2">
            <button
              className="group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/8 dark:hover:bg-white/15 hover:ring-1 hover:ring-black/10 dark:hover:ring-white/10 cursor-pointer whitespace-nowrap transition-all duration-150"
              onClick={stopSpeak}
              title="停止朗读"
              aria-label="停止朗读"
            >
              <X className="size-4 transition-transform duration-150 group-hover:scale-105 group-hover:opacity-90" />
              <span className="text-[13px] transition-opacity duration-150 group-hover:opacity-90">
                停止
              </span>
            </button>
            <button
              className="group flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/8 dark:hover:bg-white/15 hover:ring-1 hover:ring-black/10 dark:hover:ring-white/10 cursor-pointer whitespace-nowrap transition-all duration-150"
              onClick={speak}
              title={isPaused ? "继续" : "暂停"}
              aria-pressed={isPaused}
              aria-label={isPaused ? "继续朗读" : "暂停朗读"}
            >
              {isPaused ? (
                <Play className="size-4 transition-transform duration-150 group-hover:scale-105 group-hover:opacity-90" />
              ) : (
                <Pause className="size-4 transition-transform duration-150 group-hover:scale-105 group-hover:opacity-90" />
              )}
              <span className="text-[13px] transition-opacity duration-150 group-hover:opacity-90">
                {isPaused ? "继续" : "暂停"}
              </span>
            </button>
            <label className="flex items-center gap-1 text-[13px]">
              <span className="sr-only">音量</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="朗读音量"
              />
            </label>
          </div>
        )}

        <label className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/8 dark:hover:bg-white/15 hover:ring-1 hover:ring-black/10 dark:hover:ring-white/10 cursor-pointer whitespace-nowrap transition-all duration-150">
          <input
            type="checkbox"
            checked={!selectionEnabled}
            onChange={(e) => {
              const next = e.target.checked;
              setSelectionEnabled(!next);
              if (next) close();
            }}
            title="不再提示"
          />
          <span className="text-[13px]">不再提示</span>
        </label>

        <button
          className="group px-2 py-1 rounded-md hover:bg-black/8 dark:hover:bg-black/15 hover:ring-1 hover:ring-black/10 dark:hover:ring-white/10 cursor-pointer transition-all duration-150"
          onClick={close}
          title="关闭"
        >
          <X className="size-4 transition-transform duration-150 group-hover:scale-105 group-hover:opacity-90" />
        </button>
      </div>
    </div>
  );
}
