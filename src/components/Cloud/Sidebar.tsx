import { useTranslation } from "react-i18next";
import { forwardRef, useMemo, useCallback, memo } from "react";
import { Plus } from "lucide-react";

import cocoLogoImg from "@/assets/app-icon.png";
import { useConnectStore } from "@/stores/connectStore";
import { Server, Status } from "@/types/server";

interface SidebarProps {
  onAddServer: () => void;
  serverList: Server[];
}

interface ServerGroups {
  builtinServers: JSX.Element[];
  customServers: JSX.Element[];
}

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

export const Sidebar = forwardRef<{ refreshData: () => void }, SidebarProps>(
  ({ onAddServer, serverList }, _ref) => {
    const { t } = useTranslation();
    const currentService = useConnectStore((state) => state.currentService);
    const setCurrentService = useConnectStore(
      (state) => state.setCurrentService
    );

    const getServerItemClassName = useCallback((isSelected: boolean) => {
      return `flex cursor-pointer items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg mb-2 whitespace-nowrap ${
        isSelected
          ? "dark:bg-blue-900/20 dark:bg-blue-900 border border-[#0087ff]"
          : "bg-gray-50 dark:bg-gray-900 border border-[#e6e6e6] dark:border-gray-700"
      }`;
    }, []);

    // Extracted server item rendering
    const renderServerItem = useCallback(
      (item: Server) => {
        const isSelected = currentService?.id === item.id;
        return (
          <div
            key={item.id}
            className={getServerItemClassName(isSelected)}
            onClick={() => setCurrentService(item)}
          >
            <img
              src={item?.provider?.icon || cocoLogoImg}
              alt={`${item.name} logo`}
              className="w-5 h-5 flex-shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = cocoLogoImg;
              }}
            />
            <span className="font-medium truncate max-w-[140px]">
              {item.name}
            </span>
            <div className="flex-1" />
            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
              <StatusIndicator
                enabled={item.enabled}
                public={item.public}
                hasProfile={!!item?.profile}
                status={item.health?.status}
              />
            </button>
          </div>
        );
      },
      [currentService]
    );

    const { builtinServers, customServers } = useMemo(() => {
      const groups = serverList.reduce<ServerGroups>(
        (acc, item) => {
          const renderedItem = renderServerItem(item);
          if (item?.builtin) {
            acc.builtinServers.push(renderedItem);
          } else {
            acc.customServers.push(renderedItem);
          }
          return acc;
        },
        { builtinServers: [], customServers: [] }
      );
      return groups;
    }, [serverList, renderServerItem]);

    return (
      <div className="w-64 min-h-[550px] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-4 py-8">
          {/* Render Built-in Servers */}
          {builtinServers}

          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 mt-6">
            {t("cloud.sidebar.yourServers")}
          </div>

          {/* Render Non-Built-in Servers */}
          {customServers}

          <div className="space-y-2">
            <button
              className="w-full flex items-center justify-center p-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              onClick={onAddServer}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);
