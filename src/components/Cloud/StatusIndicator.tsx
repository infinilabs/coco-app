import { useMemo, memo } from "react";

import { Status } from "@/types/server";

type StatusIndicatorProps = {
  enabled: boolean;
  public: boolean;
  hasProfile: boolean;
  status?: Status;
};

const StatusIndicator = memo(
  ({ enabled, public: isPublic, hasProfile, status }: StatusIndicatorProps) => {
    // If service is enabled AND (public OR (private AND logged in)) AND service is available
    // Otherwise show gray status
    const isActive =
      enabled && (isPublic || (!isPublic && hasProfile)) && status;

    const statusColorClass = useMemo(() => {
      if (!isActive) return "bg-gray-400 dark:bg-gray-600";
      switch (status) {
        case "green":
          return "bg-green-500";
        case "yellow":
          return "bg-yellow-500";
        case "red":
          return "bg-red-500";
        default:
          return "bg-gray-400 dark:bg-gray-600";
      }
    }, [isActive, status]);

    return (
      <div
        className={`w-3 h-3 rounded-full ${statusColorClass}`}
        role="status"
        aria-label={isActive ? "active" : "inactive"}
      />
    );
  }
);

export default StatusIndicator;