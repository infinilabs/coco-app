import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SearchIcon, MessageCircleIcon } from "lucide-react";

import { SearchResults } from "./SearchResults";
import { ChatInterface } from "./ChatInterface";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setIsOpen: (isOpen: boolean) => void;
}

type Mode = "search" | "chat";

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  setIsOpen,
}) => {
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        isOpen ? onClose() : setIsOpen(true);
      }
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const toggleMode = () => {
    setMode((prev) => (prev === "search" ? "chat" : "search"));
    setQuery("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-20"
        >
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl">
            <div className="flex items-center p-4 border-b">
              <button
                onClick={toggleMode}
                className={`p-2 rounded-md transition-colors ${
                  mode === "search" ? "bg-blue-100 text-blue-600" : ""
                }`}
              >
                <SearchIcon size={20} />
              </button>
              <button
                onClick={toggleMode}
                className={`p-2 ml-2 rounded-md transition-colors ${
                  mode === "chat" ? "bg-blue-100 text-blue-600" : ""
                }`}
              >
                <MessageCircleIcon size={20} />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === "search" ? "Search for files..." : "Input Message..."}
                className="flex-1 ml-4 p-2 outline-none"
                autoFocus
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {mode === "search" ? (
                <SearchResults query={query} />
              ) : (
                <ChatInterface query={query} />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
