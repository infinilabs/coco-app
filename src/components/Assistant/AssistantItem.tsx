import { memo } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";

import VisibleKey from "@/components/Common/VisibleKey";
import FontIcon from "@/components/Common/Icons/FontIcon";
import logoImg from "@/assets/icon.svg";

interface AssistantItemProps {
  _id: string;
  _source?: {
    icon?: string;
    name?: string;
    description?: string;
  };
  name?: string;
  isActive: boolean;
  isHighlight: boolean;
  isKeyboardActive: boolean;
  onClick: () => void;
}

const AssistantItem = memo(
  ({
    _id,
    _source,
    name,
    isActive,
    isHighlight,
    isKeyboardActive = false,
    onClick,
  }: AssistantItemProps) => (
    <button
      key={_id}
      className={clsx(
        "w-full flex items-center h-[50px] gap-2 rounded-lg p-2 mb-1 transition",
        {
          "hover:bg-[#E6E6E6] dark:hover:bg-[#1F2937]": !isKeyboardActive,
          "bg-[#E6E6E6] dark:bg-[#1F2937]": isHighlight || isActive,
        }
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-center size-6 bg-white border border-[#E6E6E6] rounded-full overflow-hidden">
        {_source?.icon?.startsWith("font_") ? (
          <FontIcon name={_source?.icon} className="size-4" />
        ) : (
          <img src={logoImg} className="size-4 dark:drop-shadow-[0_0_6px_rgb(255,255,255)]" alt={name} />
        )}
      </div>
      <div className="text-left flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {_source?.name || "-"}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {_source?.description || ""}
        </div>
      </div>
      {isActive && (
        <div className="flex items-center">
          <VisibleKey shortcut="↓↑" shortcutClassName="w-6 -translate-x-4">
            <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </VisibleKey>
        </div>
      )}
    </button>
  )
);

export default AssistantItem;