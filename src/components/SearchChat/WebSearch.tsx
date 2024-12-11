import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Calculator,
  Calendar,
  Mail,
  Music,
  User,
} from "lucide-react";

import SearchChat from ".";

interface CommandItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
}

export default function WebSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [search] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    {
      id: "settings",
      icon: <Settings className="w-5 h-5" />,
      title: "Settings",
      description: "Adjust your preferences",
      action: () => console.log("Settings clicked"),
    },
    {
      id: "calculator",
      icon: <Calculator className="w-5 h-5" />,
      title: "Calculator",
      description: "Perform quick calculations",
      action: () => console.log("Calculator clicked"),
    },
    {
      id: "calendar",
      icon: <Calendar className="w-5 h-5" />,
      title: "Calendar",
      description: "View your schedule",
      action: () => console.log("Calendar clicked"),
    },
    {
      id: "mail",
      icon: <Mail className="w-5 h-5" />,
      title: "Mail",
      description: "Check your inbox",
      action: () => console.log("Mail clicked"),
    },
    {
      id: "music",
      icon: <Music className="w-5 h-5" />,
      title: "Music",
      description: "Control playback",
      action: () => console.log("Music clicked"),
    },
    {
      id: "profile",
      icon: <User className="w-5 h-5" />,
      title: "Profile",
      description: "View your profile",
      action: () => console.log("Profile clicked"),
    },
  ];

  const filteredCommands = commands.filter(
    (command) =>
      command.title.toLowerCase().includes(search.toLowerCase()) ||
      command.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
        // setIsOpen(false);
      }
    },
    [filteredCommands, selectedIndex]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 text-center">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />

        <div className="inline-block w-full max-w-2xl my-16 text-left align-middle transition-all transform">
          <SearchChat />
          {/* <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center px-4 border-b border-gray-200">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                autoFocus
                type="text"
                className="w-full px-4 py-4 text-gray-700 bg-transparent border-none focus:outline-none focus:ring-0"
                placeholder="Search commands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="w-32 flex items-center gap-1">
                <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded-md">
                  Esc
                </kbd>
                <span className="text-gray-400">to close</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-14 text-center text-gray-500">
                  No results found.
                </div>
              ) : (
                <div className="py-2">
                  {filteredCommands.map((command, index) => (
                    <div
                      key={command.id}
                      className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                        selectedIndex === index
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        command.action();
                        setIsOpen(false);
                      }}
                    >
                      <div
                        className={`${
                          selectedIndex === index
                            ? "text-blue-600"
                            : "text-gray-400"
                        }`}
                      >
                        {command.icon}
                      </div>
                      <div>
                        <div className="font-medium">{command.title}</div>
                        <div
                          className={`text-sm ${
                            selectedIndex === index
                              ? "text-blue-500"
                              : "text-gray-500"
                          }`}
                        >
                          {command.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
