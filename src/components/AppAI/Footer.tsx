import {
  Command,
  ArrowDown01,
  AppWindowMac,
  CornerDownLeft,
} from "lucide-react";

import logoImg from "@/assets/app-icon.png";
import source_default_img from "@/assets/images/source_default.png";
import source_default_dark_img from "@/assets/images/source_default_dark.png";
import { useSearchStore } from "@/stores/searchStore";
import { useAppStore } from "@/stores/appStore";
import { useTheme } from "@/contexts/ThemeContext";

interface FooterProps {
  isChat: boolean;
  name?: string;
}

export default function Footer({ name }: FooterProps) {
  const sourceData = useSearchStore((state) => state.sourceData);
  const connector_data = useAppStore((state) => state.connector_data);
  const datasourceData = useAppStore((state) => state.datasourceData);
  const endpoint_http = useAppStore((state) => state.endpoint_http);

  const { theme } = useTheme();

  function findConnectorIcon(item: any) {
    const id = item?._source?.source?.id || "";

    const result_source = datasourceData.find(
      (data: any) => data._source.id === id
    );

    const connector_id = result_source?._source?.connector?.id;

    const result_connector = connector_data.find(
      (data: any) => data._source.id === connector_id
    );

    return result_connector?._source;
  }

  function getTypeIcon(item: any) {
    const connectorSource = findConnectorIcon(item);
    const icons = connectorSource?.icon;

    if (!icons) {
      return theme === "dark" ? source_default_dark_img : source_default_img;
    }

    if (icons?.startsWith("http://") || icons?.startsWith("https://")) {
      return icons;
    } else {
      return endpoint_http + icons;
    }
  }

  return (
    <div
      data-tauri-drag-region
      className="px-4 z-999 mx-[1px] h-10 absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-xl rounded-t-none overflow-hidden"
    >
      <div className="flex items-center">
        <div className="flex items-center space-x-2">
          {sourceData?._source?.source?.name ? (
            <img className="w-5 h-5" src={getTypeIcon(sourceData)} alt="icon" />
          ) : (
            <img src={logoImg} className="w-5 h-5" />
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {sourceData?._source?.source?.name || "Version 1.0.0"}
          </span>
        </div>

        {name ? (
          <div className="flex gap-2 items-center text-[#666] text-xs">
            <AppWindowMac className="w-5 h-5" /> {name}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="gap-1 flex items-center text-[#666] dark:text-[#666] text-sm">
          <span className="mr-1.5 ">Quick open</span>
          <kbd className="docsearch-modal-footer-commands-key pr-1">
            <Command className="w-3 h-3" />
          </kbd>
          <kbd className="docsearch-modal-footer-commands-key pr-1">
            <ArrowDown01 className="w-3 h-3" />
          </kbd>
        </div>
        <div className="flex items-center text-[#666] dark:text-[#666] text-sm">
          <span className="mr-1.5 ">Open</span>
          <kbd className="docsearch-modal-footer-commands-key pr-1">
            <CornerDownLeft className="w-3 h-3" />
          </kbd>
        </div>
      </div>
    </div>
  );
}
