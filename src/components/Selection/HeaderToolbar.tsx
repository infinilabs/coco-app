import { Separator } from "@radix-ui/react-separator";

import cocoLogoImg from "@/assets/app-icon.png";
import SelectionToolbar from "@/components/Selection/Toolbar";
import type { ActionConfig, ButtonConfig } from "@/components/Settings/Advanced/components/Selection/config";

export default function HeaderToolbar({
  buttons,
  iconsOnly,
  onAction,
  onLogoClick,
  className,
  rootRef,
  children,
}: {
  buttons: ButtonConfig[];
  iconsOnly: boolean;
  onAction: (action: ActionConfig) => void;
  onLogoClick?: () => void;
  className?: string;
  rootRef?: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
}) {
  return (
    <div
      ref={rootRef}
      data-tauri-drag-region="false"
      className={`flex items-center gap-1 p-1 flex-nowrap overflow-hidden ${className ?? ""}`}
    >
      <img
        src={cocoLogoImg}
        alt="Coco Logo"
        className="w-6 h-6"
        onClick={onLogoClick}
        onError={(e) => {
          try {
            (e.target as HTMLImageElement).src = "/src-tauri/assets/logo.png";
          } catch {}
        }}
      />

      <Separator
        orientation="vertical"
        decorative
        className="mx-2 h-4 w-px bg-gray-300 dark:bg-white/30 shrink-0"
      />

      <SelectionToolbar
        buttons={buttons}
        iconsOnly={iconsOnly}
        onAction={onAction}
        requireAssistantCheck={false}
      />

      {children}
    </div>
  );
}
