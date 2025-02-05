import React from "react";

import { useAppStore } from "@/stores/appStore";
import {formatter} from "@/utils/index"
import source_default_img from "@/assets/images/source_default.png";
import source_default_dark_img from "@/assets/images/source_default_dark.png";
import { useTheme } from "@/contexts/ThemeContext";
import { useConnectStore } from "@/stores/connectStore";

interface DocumentDetailProps {
  document: any;
}

export const DocumentDetail: React.FC<DocumentDetailProps> = ({ document }) => {
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

  return (
    <div className="p-4">
      <div className="font-normal text-xs text-[#666] dark:text-[#999] mb-2">
        Details
      </div>

      {/* <div className="mb-4">
        <iframe
          src={document?.metadata?.web_view_link}
          style={{ width: "100%", height: "500px" }}
          title="Text Preview"
        />
      </div> */}

      {/* <img
        src="https://images.unsplash.com/photo-1664575602276-acd073f104c1"
        alt="Document preview"
        className="w-full aspect-video object-cover rounded-xl shadow-md"
      /> */}

      <div className="py-4 mt-4">
        <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
          <div className="text-[#666]">Name</div>
          <div className="text-[#333] dark:text-[#D8D8D8] text-right w-60 break-words">
            {document?.title || "-"}
          </div>
        </div>

        <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
          <div className="text-[#666]">Source</div>
          <div className="text-[#333] dark:text-[#D8D8D8] flex justify-end text-right w-56 break-words">
            <img
              className="w-4 h-4 mr-1"
              src={getTypeIcon(document)}
              alt="icon"
            />
            {document?.source?.name || "-"}
          </div>
        </div>
        {/* <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Where</div>
          <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
            -
          </div>
        </div> */}
        {document?.updated ? (
          <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
            <div className="text-[#666]">Updated at</div>
            <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
              {document?.updated || "-"}
            </div>
          </div>
        ) : null}
        {document?.last_updated_by?.user?.username ? (
          <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
            <div className="text-[#666]">Update by</div>
            <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
              {document?.last_updated_by?.user?.username || "-"}
            </div>
          </div>
        ) : null}
        {document?.owner?.username ? (
          <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
            <div className="text-[#666]">Created by</div>
            <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
              {document?.owner?.username || "-"}
            </div>
          </div>
        ) : null}
        {document?.type ? (
          <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
            <div className="text-[#666]">Type</div>
            <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
              {document?.type || "-"}
            </div>
          </div>
        ) : null}
        {document?.size ? (
          <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
            <div className="text-[#666]">Size</div>
            <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
              {formatter.bytes(document?.size || 0)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
