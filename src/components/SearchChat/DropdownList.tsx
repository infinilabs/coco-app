import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";

interface DropdownListProps {
  selected: (item: any) => void;
  suggests: any[];
}

function DropdownList({ selected, suggests }: DropdownListProps) {
  const [selectedItem, setSelectedItem] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleOpenURL = async (url: string) => {
    if (!url) return;
    try {
      await open(url);
      console.log("URL opened in default browser");
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!suggests.length) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedItem((prev) =>
        prev === null || prev === 0 ? suggests.length - 1 : prev - 1
      );
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedItem((prev) =>
        prev === null || prev === suggests.length - 1 ? 0 : prev + 1
      );
    } else if (e.key === "Enter" && selectedItem !== null) {
      const item = suggests[selectedItem];
      if (item?._source?.url) {
        handleOpenURL(item?._source?.url);
      } else {
        selected(item);
      }
    }
  };

  useEffect(() => {
    if (suggests.length > 0) {
      setSelectedItem(0);
    }

    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, [suggests, selected]);

  useEffect(() => {
    if (selectedItem !== null && itemRefs.current[selectedItem]) {
      itemRefs.current[selectedItem]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedItem]);

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-100px)] mt-2.5 pb-12 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex-1 overflow-y-auto p-2">
        {suggests?.map((item, index) => {
          const isSelected = selectedItem === index;
          return (
            <button
              key={item._id}
              ref={(el) => (itemRefs.current[index] = el)}
              onClick={() => {
                setSelectedItem(index);
                if (item?._source?.url) {
                  handleOpenURL(item?._source?.url);
                } else {
                  selected(item);
                }
              }}
              className={`w-full p-2 text-xs flex items-center justify-between rounded-lg transition-colors ${
                isSelected
                  ? "bg-[#f2f2f2] dark:bg-blue-900/30"
                  : "hover:bg-[#f2f2f2] dark:hover:bg-gray-700/50"
              }`}
            >
              <div className="flex gap-2 items-center">
                <img className="w-4 h-4" src={item?._source?.icon} alt="icon" />
                <span className="text-[#666] dark:text-gray-100">
                  {item?._source?.source} / {item?._source?.title}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-[#999] dark:text-gray-400">
                  {item?._source?.type}
                </span>
                <div
                  className={`w-3.5 h-3.5 flex items-center justify-center text-[#e4e5ef] border border-[#e4e5ef] rounded-sm ${
                    isSelected ? "text-blue-500" : ""
                  }`}
                >
                  {index + 1}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DropdownList;
