import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

import {
  ActionType,
  ButtonConfig,
  IconConfig,
  resolveLucideIcon,
} from "@/components/Settings/Advanced/components/Selection/config";

const requiresAssistant = (type?: string) =>
  type === "ask_ai" || type === "translate" || type === "summary";

function IconRenderer({ icon }: { icon?: IconConfig }) {
  if (icon?.type === "lucide") {
    const Comp = resolveLucideIcon(icon?.name);
    if (Comp) {
      return (
        <Comp
          className="size-4 transition-transform duration-150"
          style={icon?.color ? { color: icon.color } : undefined}
        />
      );
    }
    return (
      <Search
        className="size-4 transition-transform duration-150"
        style={icon?.color ? { color: icon.color } : undefined}
      />
    );
  }
  if (icon?.type === "custom" && icon?.dataUrl) {
    return (
      <img
        src={icon.dataUrl}
        className="size-4 rounded"
        alt=""
        style={
          icon?.color
            ? { filter: `drop-shadow(0 0 0 ${icon.color})` }
            : undefined
        }
      />
    );
  }
  return <Search className="size-4 text-[#6366F1]" />;
}

function ToolbarButton({
  btn,
  onClick,
  showLabel,
}: {
  btn: ButtonConfig;
  onClick: () => void;
  showLabel: boolean;
}) {
  const { t } = useTranslation();
  const label = btn?.labelKey ? t(btn.labelKey) : btn?.label || btn?.id || "";
  return (
    <button
      className="flex items-center gap-1 p-1 rounded-md cursor-pointer whitespace-nowrap transition-all duration-150"
      onClick={onClick}
      title={label}
    >
      <IconRenderer icon={btn?.icon} />
      {showLabel && (
        <span className="text-[12px] transition-opacity duration-150">
          {label}
        </span>
      )}
    </button>
  );
}

export default function SelectionToolbar({
  buttons,
  iconsOnly,
  onAction,
  className,
  requireAssistantCheck = true,
}: {
  buttons: ButtonConfig[];
  iconsOnly: boolean;
  onAction: (type: ActionType, assistantId?: string) => void;
  className?: string;
  requireAssistantCheck?: boolean;
}) {
  const visibleButtons = (Array.isArray(buttons) ? buttons : []).filter((btn: any) => {
    if (!requireAssistantCheck) return true;
    const type = btn?.action?.type;
    if (requiresAssistant(type)) {
      return Boolean(btn?.action?.assistantId);
    }
    return true;
  });

  return (
    <div
      className={clsx(
        "flex items-center gap-1 flex-nowrap overflow-hidden",
        className
      )}
    >
      {visibleButtons.map((btn) => (
        <ToolbarButton
          key={btn.id}
          btn={btn}
          onClick={() => onAction(btn.action.type, btn.action.assistantId)}
          showLabel={!iconsOnly}
        />
      ))}
    </div>
  );
}
