import { useState } from "react";
import { CommandPalette } from "./CommandPalette";

export default function MySearch() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsCommandPaletteOpen(true)}
        className="fixed bottom-4 right-4 p-4 bg-blue-500 text-white rounded-full"
      >
        Open the Command Palette
      </button>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        setIsOpen={setIsCommandPaletteOpen}
      />
    </div>
  );
}
