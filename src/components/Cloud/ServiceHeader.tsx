import { memo } from "react";
import { Globe, RefreshCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

import Tooltip from "@/components/Common/Tooltip";
import SettingsToggle from "@/components/Settings/SettingsToggle";
import { OpenURLWithBrowser } from "@/utils";
import { useConnectStore } from "@/stores/connectStore";
import { useServers } from "@/hooks/useServers";

interface ServiceHeaderProps {
  refreshLoading?: boolean;
  refreshClick: (id: string) => void;
}

const ServiceHeader = memo(
  ({ refreshLoading, refreshClick }: ServiceHeaderProps) => {
    const { t } = useTranslation();

    const cloudSelectService = useConnectStore(
      (state) => state.cloudSelectService
    );

    const { enableServer, removeServer } = useServers();

    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Tooltip content={cloudSelectService?.endpoint}>
            <div className="flex items-center text-gray-900 dark:text-white font-medium cursor-pointer">
              {cloudSelectService?.name}
            </div>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <SettingsToggle
            checked={cloudSelectService?.enabled}
            className={clsx({
              "bg-red-600 focus:ring-red-500": !cloudSelectService?.enabled,
            })}
            label={
              cloudSelectService?.enabled
                ? t("cloud.enable_server")
                : t("cloud.disable_server")
            }
            onChange={enableServer}
          />

          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-md bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
            onClick={() =>
              OpenURLWithBrowser(cloudSelectService?.provider?.website)
            }
          >
            <Globe className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-md bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
            onClick={() => refreshClick(cloudSelectService?.id)}
          >
            <RefreshCcw
              className={`w-3.5 h-3.5 ${refreshLoading ? "animate-spin" : ""}`}
            />
          </button>
          {!cloudSelectService?.builtin && (
            <button
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-md bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
              onClick={() => removeServer(cloudSelectService?.id)}
            >
              <Trash2 className="w-3.5 h-3.5 text-[#ff4747]" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

export default ServiceHeader;
