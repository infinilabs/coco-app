import React, { useState } from "react";
import { Mic, Filter, Upload } from "lucide-react";
import { Switch } from "@headlessui/react";
import {
  WebviewWindow,
  getCurrentWebviewWindow,
} from "@tauri-apps/api/webviewWindow";

import { SearchResults } from "./SearchResults";
import { Footer } from "./Footer";
import { LogicalSize } from "@tauri-apps/api/dpi";

interface Tag {
  id: string;
  text: string;
}

function Search() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [input, setInput] = useState("");
  const [isChatMode, setIsChatMode] = useState(false);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      setTags([...tags, { id: Date.now().toString(), text: input.trim() }]);
      setInput("");
      await getCurrentWebviewWindow().setSize(new LogicalSize(800, 600));
    }
  };

  const removeTag = async (tagId: string) => {
    const newTag = tags.filter((tag) => tag.id !== tagId);
    setTags(newTag);
    if (newTag.length === 0) {
      await getCurrentWebviewWindow().setSize(new LogicalSize(800, 110));
    }
  };

  async function openChatAI() {
    const webview = new WebviewWindow("chat", {
      title: "Coco AI",
      dragDropEnabled: true,
      center: true,
      width: 900,
      height: 700,
      alwaysOnTop: true,
      skipTaskbar: true,
      decorations: true,
      closable: true,
      url: "/chat",
    });
    webview.once("tauri://created", function () {
      console.log("webview created");
    });
    webview.once("tauri://error", function (e) {
      console.log("error creating webview", e);
    });
  }

  return (
    <div
      className={`min-h-screen flex items-start justify-center ${
        tags.length > 0 ? "pb-8" : ""
      } rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900`}
    >
      <div className="w-full space-y-4 rounded-xl overflow-hidden">
        <div className="border b-t-none border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {/* Search Bar */}
          <div className="relative">
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-2 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 focus-within:border-blue-400 dark:focus-within:border-blue-500 transition-all">
              <div className="flex flex-wrap gap-2 flex-1 min-h-12 items-center">
                {tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg text-sm"
                  >
                    {tag.text}
                    <button
                      onClick={() => removeTag(tag.id)}
                      className="ml-1.5 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="flex-1 outline-none min-w-[200px] text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent"
                  placeholder="有问题尽管问 Coco"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Mic className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center p-2 rounded-xl overflow-hidden">
            <div className="flex gap-3 text-xs">
              <button
                className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                onClick={openChatAI}
              >
                <Filter className="w-4 h-4 mr-2" />问 Coco
              </button>
              <button className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300">
                <Upload className="w-4 h-4 mr-2" />
                上传
              </button>
            </div>

            {/* Switch */}
            <div className="flex items-center text-xs">
              <span className="mr-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                Chat
              </span>
              <Switch
                checked={isChatMode}
                onChange={setIsChatMode}
                className={`${
                  isChatMode
                    ? "bg-blue-600 dark:bg-blue-500"
                    : "bg-gray-200 dark:bg-gray-700"
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900`}
              >
                <span
                  className={`${
                    isChatMode ? "translate-x-6" : "translate-x-1"
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
          </div>
        </div>

        {/* Search Results Panel */}
        {tags.length > 0 ? <SearchResults /> : null}
      </div>

      {tags.length > 0 ? <Footer /> : null}
    </div>
  );
}

export default Search;
