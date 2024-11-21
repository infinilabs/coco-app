import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";

interface DropdownListProps {
  selected: (item: any) => void;
  suggests: any[];
  isSearchComplete: boolean;
}

function DropdownList({ selected, suggests, isSearchComplete }: DropdownListProps) {
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

      if (containerRef.current && isSearchComplete) {
        containerRef.current.focus();
      }
    }
  }, [JSON.stringify(suggests), isSearchComplete]);

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
      className="h-[calc(100vh-100px)] mt-2.5 pb-10 flex flex-col bg-search_bg_light dark:bg-chat_bg_dark bg-cover rounded-xl overflow-hidden focus:outline-none"
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
              className={`w-full h-10 px-2 text-sm flex items-center justify-between rounded-lg transition-colors ${
                isSelected
                  ? "bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.1)]"
                  : "hover:bg-[rgba(0,0,0,0.1)] dark:hover:bg-[rgba(255,255,255,0.1)]"
              }`}
            >
              <div className="flex gap-2 items-center">
                <img className="w-5 h-5" src={item?._source?.icon} alt="icon" />
                <span className="text-[#333] dark:text-[#d8d8d8]">
                  {item?._source?.source}/{item?._source?.title}
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-sm  text-[#666] dark:text-[#666]">
                  {item?._source?.type}
                </span>
                <div
                  className={`w-4 h-4 text-xs flex items-center justify-center text-[#e4e5ef] border border-[#e4e5ef] rounded-sm ${
                    isSelected ? "text-blue-500 dark:bg-white" : ""
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
