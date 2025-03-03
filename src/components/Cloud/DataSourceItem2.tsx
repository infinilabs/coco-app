import SettingsToggle from "@/components/Settings/SettingsToggle";

interface DataSourceItemProps {
  icon?: string;
  name?: string;
  lastSyncTime?: string;
  status: "success" | "error" | "pending";
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function DataSourceItem2({
  icon,
  name,
  lastSyncTime,
  status = "success",
  enabled,
  onToggle,
}: DataSourceItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-[#202126] border border-[#E4E5EF] dark:border-[#272626]">
      <div className="flex items-center gap-3">
        {icon ? (
          <img src={icon} alt={name} className="w-5 h-5" />
        ) : (
          <div className="w-5 h-5 rounded bg-[#1990FF] flex items-center justify-center text-white text-xs font-medium">
            {name}
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-[#333333] dark:text-[#D8D8D8]">
            {name}
          </div>
          <div className="text-xs text-[#999999]">最近同步: {lastSyncTime}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            status === "success"
              ? "bg-[#38C200]"
              : status === "error"
              ? "bg-[#FF3838]"
              : "bg-[#999999]"
          }`}
        />
        <SettingsToggle
          checked={enabled}
          onChange={onToggle}
          label={`Toggle ${name}`}
          className="!h-5 !w-9"
        />
      </div>
    </div>
  );
}
