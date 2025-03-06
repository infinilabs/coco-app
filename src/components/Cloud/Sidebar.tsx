import { useTranslation } from "react-i18next";
import { forwardRef } from "react";
import { Plus } from "lucide-react";

import cocoLogoImg from "@/assets/app-icon.png";
import { useConnectStore } from "@/stores/connectStore";

interface SidebarProps {
  onAddServer: () => void;
  serverList: any[];
}

export const Sidebar = forwardRef<{ refreshData: () => void }, SidebarProps>(
  ({ onAddServer, serverList }, _ref) => {
    const { t } = useTranslation();
    const currentService = useConnectStore((state) => state.currentService);
    const setCurrentService = useConnectStore(
      (state) => state.setCurrentService
    );

    const onAddServerClick = () => {
      onAddServer();
    };

    // Extracted server item rendering
    const renderServerItem = (item: any) => {
      return (
        <div
          key={item?.id}
          className={`flex cursor-pointer items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg mb-2 ${
            currentService?.id === item?.id
              ? "dark:bg-blue-900/20 dark:bg-blue-900 border border-[#0087ff]"
              : "bg-gray-50 dark:bg-gray-900 border border-[#e6e6e6] dark:border-gray-700"
          }`}
          onClick={() => setCurrentService(item)}
        >
          <img
            src={item?.provider?.icon || cocoLogoImg}
            alt="LogoImg"
            className="w-5 h-5"
          />
          <span className="font-medium">{item?.name}</span>
          <div className="flex-1" />
          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            {item.health?.status ? (
              <div className={`w-3 h-3 rounded-full bg-[${item.health?.status}]`} />
            ) : (
              <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-600" />
            )}
          </button>
        </div>
      );
    };

    return (
      <div className="w-64 min-h-[550px] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-4 py-8">
          {/* Render Built-in Servers */}
          <div>
            {serverList
              .filter((item) => item?.builtin)
              .map((item) => renderServerItem(item))}
          </div>

          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 mt-6">
            {t("cloud.sidebar.yourServers")}
          </div>

          {/* Render Non-Built-in Servers */}
          <div>
            {serverList
              .filter((item) => !item?.builtin)
              .map((item) => renderServerItem(item))}
          </div>

          <div className="space-y-2">
            <button
              className="w-full flex items-center justify-center p-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
              onClick={onAddServerClick}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }
);
