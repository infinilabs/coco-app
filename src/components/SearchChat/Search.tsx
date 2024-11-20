import React, { useEffect, useState } from "react";
import {
  Mic,
  Library,
  AudioLines,
  SquareChevronLeft,
  Send,
  Plus,
  Image,
} from "lucide-react";
import {
  WebviewWindow,
  getCurrentWebviewWindow,
} from "@tauri-apps/api/webviewWindow";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { motion } from "framer-motion";

import DropdownList from "./DropdownList";
import { Footer } from "./Footer";
import ChatSwitch from "./ChatSwitch";
import { SearchResults } from "./SearchResults";
import { tauriFetch } from "../../api/tauriFetchClient";

interface Tag {
  id: string;
  text: string;
}

interface SearchProps {
  changeMode: (isChatMode: boolean) => void;
  changeInput: (val: string) => void;
  isChatMode: boolean;
}

function Search({ changeMode, changeInput, isChatMode }: SearchProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [suggests, setSuggests] = useState<any[]>([]);
  const [isSearchComplete, setIsSearchComplete] = useState(false);
  const [input, setInput] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const getSuggest = async () => {
    try {
      const response = await tauriFetch({
        url: `/query/_search?query=${input}`,
        method: "GET",
      });
      console.log("_suggest", response);
      const data = response.data?.hits?.hits || [];
      if (data.length > 0) {
        await getCurrentWebviewWindow().setSize(new LogicalSize(680, 600));
      } else {
        await getCurrentWebviewWindow().setSize(new LogicalSize(680, 90));
      }
      setSuggests(data);
      setIsSearchComplete(true);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };
  const getDataList = async () => {
    if (isChatMode) {
      changeInput(input);
    } else {
      getSuggest();
      // setTags([...tags, { id: Date.now().toString(), text: input.trim() }]);
      // setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      getDataList();
    }
  };

  const removeTag = async (tagId: string) => {
    const newTag = tags.filter((tag) => tag.id !== tagId);
    setTags(newTag);
    if (newTag.length === 0) {
      await getCurrentWebviewWindow().setSize(new LogicalSize(680, 90));
    }
  };

  async function openChatAI() {
    return;
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
      url: "/gpt",
    });
    webview.once("tauri://created", function () {
      console.log("webview created");
    });
    webview.once("tauri://error", function (e) {
      console.log("error creating webview", e);
    });
  }

  useEffect(() => {
    if (selectedItem) {
      setTags([]);
    }
  }, [selectedItem]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0 }}
      className={`min-h-screen bg-opacity-0 flex items-start justify-center rounded-xl overflow-hidden ${
        tags.length > 0 ? "pb-32" : ""
      }`}
    >
      <div className="w-full rounded-xl overflow-hidden">
        <div className="b-none bg-[#F2F2F2] dark:bg-gray-800 rounded-xl overflow-hidden">
          {/* Search Bar */}
          <div className="relative">
            <div className="p-2.5 flex items-center bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all">
              <div className="flex flex-wrap gap-2 flex-1 h-6 items-center">
                {/* {tags.map((tag) => (
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
                ))} */}
                {!isChatMode && selectedItem ? (
                  <SquareChevronLeft
                    className="cursor-pointer text-gray-400 dark:text-gray-500"
                    onClick={() => setSelectedItem(null)}
                  />
                ) : null}
                <input
                  type="text"
                  className="text-3 flex-1 outline-none min-w-[200px] text-[#999] dark:text-gray-200 placeholder-text-3 placeholder-[#999] dark:placeholder-gray-500 bg-transparent"
                  placeholder="Ask whatever you want....."
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setIsSearchComplete(false);
                  }}
                  onKeyDown={handleKeyDown}
                />
              </div>
              <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full transition-colors">
                <Mic className="w-3 h-3 text-[#333] dark:text-gray-500" />
              </button>
              <button
                className={`ml-1 p-2 ${
                  input ? "bg-[rgba(66,133,244,1)]" : "bg-[#E4E5F0]"
                } rounded-full transition-colors`}
                onClick={() => getDataList()}
              >
                <Send className="w-3 h-3 text-white hover:text-[#333]" />
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center p-2 rounded-xl overflow-hidden bg-#F2F2F2">
            {isChatMode ? (
              <div className="flex gap-1 text-xs text-[#101010] dark:text-gray-300">
                <button
                  className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors "
                  onClick={openChatAI}
                >
                  <Library className="w-4 h-4 mr-1" />
                  Coco
                </button>
                <button className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-color">
                  <Plus className="w-4 h-4 mr-1" />
                  Upload
                </button>
              </div>
            ) : (
              <div className="flex gap-1 text-xs text-[#101010] dark:text-gray-300">
                <button
                  className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors "
                  onClick={openChatAI}
                >
                  <AudioLines className="w-4 h-4 mr-1" />
                </button>
                <button className="inline-flex items-center p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-color">
                  <Image className="w-4 h-4 mr-1" />
                </button>
              </div>
            )}

            {/* Switch */}
            <ChatSwitch
              isChat={isChatMode}
              changeMode={(value) => {
                changeMode(value);
                setInput("");
              }}
            />
          </div>
        </div>

        {/* Search Results Panel */}
        {!isChatMode && suggests.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2 }}
          >
            <DropdownList
              suggests={suggests}
              isSearchComplete={isSearchComplete}
              selected={(item) => setSelectedItem(item)}
            />
          </motion.div>
        ) : null}

        {!isChatMode && selectedItem ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.2 }}
          >
            <SearchResults />
          </motion.div>
        ) : null}
      </div>

      {!isChatMode && (suggests.length > 0 || selectedItem) ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.2 }}
        >
          <Footer isChat={false} name={selectedItem?.source} />
        </motion.div>
      ) : null}
    </motion.div>
  );
}

export default Search;
