import { memo, useCallback } from "react";
import { Globe, RefreshCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";

import Tooltip from "@/components/Common/Tooltip";
import SettingsToggle from "@/components/Settings/SettingsToggle";
import { OpenURLWithBrowser } from "@/utils";
import { useConnectStore } from "@/stores/connectStore";
import platformAdapter from "@/utils/platformAdapter";

interface ServiceHeaderProps {
  refreshLoading?: boolean;
  refreshClick: (id: string) => void;
  fetchServers: (force: boolean) => Promise<void>;
}

const ServiceHeader = memo(
  ({ refreshLoading, refreshClick, fetchServers }: ServiceHeaderProps) => {
    const { t } = useTranslation();

    const currentService = useConnectStore((state) => state.currentService);
    const setCurrentService = useConnectStore(
      (state) => state.setCurrentService
    );

    const enable_coco_server = useCallback(
      async (enabled: boolean) => {
        if (enabled) {
          await platformAdapter.commands("enable_server", currentService?.id);
        } else {
          await platformAdapter.commands("disable_server", currentService?.id);
        }

        setCurrentService({ ...currentService, enabled });

        await fetchServers(false);
      },
      [currentService?.id]
    );

    const removeServer = (id: string) => {
      platformAdapter.commands("remove_coco_server", id).then((res: any) => {
        console.log("remove_coco_server", id, JSON.stringify(res));
        fetchServers(true).then((r) => {
          console.log("fetchServers", r);
        });
      });
    };

    return (
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Tooltip content={currentService?.endpoint}>
            <div className="flex items-center text-gray-900 dark:text-white font-medium cursor-pointer">
              {currentService?.name}
            </div>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <SettingsToggle
            checked={currentService?.enabled}
            className={clsx({
              "bg-red-600 focus:ring-red-500": !currentService?.enabled,
            })}
            label={
              currentService?.enabled
                ? t("cloud.enable_server")
                : t("cloud.disable_server")
            }
            onChange={enable_coco_server}
          />

          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-[6px] bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
            onClick={() =>
              OpenURLWithBrowser(currentService?.provider?.website)
            }
          >
            <Globe className="w-3.5 h-3.5" />
          </button>
          <button
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-[6px] bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
            onClick={() => refreshClick(currentService?.id)}
          >
            <RefreshCcw
              className={`w-3.5 h-3.5 ${refreshLoading ? "animate-spin" : ""}`}
            />
          </button>
          {!currentService?.builtin && (
            <button
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 rounded-[6px] bg-white dark:bg-gray-800 border border-[rgba(228,229,239,1)] dark:border-gray-700"
              onClick={() => removeServer(currentService?.id)}
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
