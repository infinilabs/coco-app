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
      <div className="min-h-screen px-4 pt-20 text-center">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />

        <div className="inline-block w-[100%] max-w-2xl text-left align-middle transition-all transform">
          <SearchChat />
        </div>
      </div>
    </div>
  );
}
