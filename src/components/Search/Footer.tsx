import { ArrowDown01, Command, CornerDownLeft } from "lucide-react";
import { emit } from "@tauri-apps/api/event";

import logoImg from "@/assets/icon.svg";
import source_default_img from "@/assets/images/source_default.png";
import source_default_dark_img from "@/assets/images/source_default_dark.png";
import { useSearchStore } from "@/stores/searchStore";
import { useAppStore } from "@/stores/appStore";
import { useTheme } from "@/contexts/ThemeContext";
import { useConnectStore } from "@/stores/connectStore";
import { isMac } from "@/utils/keyboardUtils";
interface FooterProps {
  isChat: boolean;
  name?: string;
}

export default function Footer({}: FooterProps) {
  const sourceData = useSearchStore((state) => state.sourceData);

  const connector_data = useConnectStore((state) => state.connector_data);
  const datasourceData = useConnectStore((state) => state.datasourceData);

  const endpoint_http = useAppStore((state) => state.endpoint_http);

  const { theme } = useTheme();

  function findConnectorIcon(item: any) {
    const id = item?.source?.id || "";

    const result_source = datasourceData[endpoint_http]?.find(
      (data: any) => data.id === id
    );

    const connector_id = result_source?.connector?.id;

    const result_connector = connector_data[endpoint_http]?.find(
      (data: any) => data.id === connector_id
    );

    return result_connector;
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

  function openSetting() {
    emit("open_settings", "");
  }

  return (
    <div
      data-tauri-drag-region
      className="px-4 z-999 mx-[1px] h-8 absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between rounded-xl rounded-t-none overflow-hidden"
    >
      <div className="flex items-center">
        <div className="flex items-center space-x-2">
          {sourceData?.source?.name ? (
            <img className="w-4 h-4" src={getTypeIcon(sourceData)} alt="icon" />
          ) : (
            <img
              src={logoImg}
              className="w-4 h-4 cursor-pointer"
              onClick={openSetting}
            />
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {sourceData?.source?.name || "v1.0.0"}
          </span>
        </div>

        {/* {name ? (
          <div className="flex gap-2 items-center text-[#666] text-xs">
            <AppWindowMac className="w-5 h-5" /> {name}
          </div>
        ) : null} */}
      </div>

      <div className="flex items-center gap-3">
        <div className="gap-1 flex items-center text-[#666] dark:text-[#666] text-xs">
          <span className="mr-1.5 ">Select:</span>
          <kbd className="coco-modal-footer-commands-key pr-1">
            {isMac ? (
              <Command className="w-3 h-3" />
            ) : (
              <span className="h-3 leading-3 inline-flex items-center text-xs">
                Ctrl
              </span>
            )}
          </kbd>
          +
          <kbd className="coco-modal-footer-commands-key pr-1">
            <ArrowDown01 className="w-3 h-3" />
          </kbd>
        </div>
        <div className="flex items-center text-[#666] dark:text-[#666] text-xs">
          <span className="mr-1.5 ">Open: </span>
          <kbd className="coco-modal-footer-commands-key pr-1">
            <CornerDownLeft className="w-3 h-3" />
          </kbd>
        </div>
      </div>
    </div>
  );
}
