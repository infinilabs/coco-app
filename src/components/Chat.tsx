import { useState, useEffect, useRef } from "react";
// import { invoke } from "@tauri-apps/api/core";
import { useHotkeys } from "react-hotkeys-hook";
import debounce from "lodash/debounce";
import { Textarea } from "@headlessui/react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { fetch } from "@tauri-apps/plugin-http";

import SendIcon from "../icons/Send";

export default function ChatInput() {
  const { t } = useTranslation();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [info, setInfo] = useState("");
  const isMac = true;

  useEffect(() => {
    const syncMessage = debounce(async () => {
      try {
        // await invoke("ask_sync", { message: JSON.stringify(message) });
      } catch (error) {
        console.error("Error syncing message:", error);
      }
    }, 300); // Debounce by 300ms

    syncMessage();
    return () => syncMessage.cancel(); // Cleanup debounce on unmount
  }, [message]);

  useHotkeys(
    isMac ? "meta+enter" : "ctrl+enter",
    async (event: KeyboardEvent) => {
      event.preventDefault();
      await handleSend();
    },
    {
      enableOnFormTags: true,
    },
    [message]
  );

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInfo("");
    setMessage(e.target.value);
  };

  const handleSend = async () => {
    if (!message) return;
    try {
      // await invoke("ask_send", { message: JSON.stringify(message) });

      // Send a GET request
      const response = await fetch("https://test.tauri.app/data.json", {
        method: "GET",
      });
      setInfo(JSON.stringify(response));
      // console.log(response.status); // e.g. 200
      // console.log(response.statusText); // e.g. "OK"
    } catch (error) {
      console.error("Error sending message:", error);
      setInfo(JSON.stringify(error));
    }
    setMessage("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  };

  return (
    <div className="w-[100%] h-[100%]">
      <div>{info}</div>
      <div className="relative flex dark:bg-app-gray-2/[0.98] dark:text-slate-200 items-center gap-1">
        <Textarea
          ref={inputRef}
          onChange={handleInput}
          spellCheck="false"
          autoFocus
          className={clsx(
            "mt-3 block w-full resize-none rounded-xl border border-transparent bg-white/10",
            "py-3 px-4 text-sm text-black placeholder-gray-500 shadow-md",
            // Transition for smoother appearance changes
            "transition-colors duration-300 ease-in-out",
            // Dark mode styles
            "dark:bg-gray-800 dark:text-white dark:placeholder-gray-400",
            "focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50",
            "dark:focus:border-white dark:focus:ring-white/25",
            "focus:outline-none"
          )}
          placeholder={t("InputMessage")}
        />
        <SendIcon
          size={30}
          className="absolute right-2 text-gray-400/80 dark:text-gray-600 cursor-pointer"
          onClick={handleSend}
          title={`Send message (${isMac ? "⌘⏎" : "⌃⏎"})`}
          aria-label="Send message"
        />
      </div>
    </div>
  );
}
