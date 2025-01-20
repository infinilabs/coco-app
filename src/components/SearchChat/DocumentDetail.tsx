import React from "react";

import { useAppStore } from "@/stores/appStore";
import source_default_img from "@/assets/images/source_default.png";

interface DocumentDetailProps {
  document: any;
}

export const DocumentDetail: React.FC<DocumentDetailProps> = ({ document }) => {
  const connector_data = useAppStore((state) => state.connector_data);
  const datasourceData = useAppStore((state) => state.datasourceData);
  const endpoint_http = useAppStore((state) => state.endpoint_http);

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
      return source_default_img;
    }

    if (icons?.includes("http")) {
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
          src={document?._source?.metadata?.web_view_link}
          style={{ width: "100%", height: "500px" }}
          title="Text Preview"
        />
      </div> */}

      <img
        src="https://images.unsplash.com/photo-1664575602276-acd073f104c1"
        alt="Document preview"
        className="w-full aspect-video object-cover rounded-xl shadow-md"
      />

      <div className="border-t border-t-[rgba(0,0,0,0.1)] dark:border-t-[rgba(255,255,255,0.1)] py-4 mt-4">
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Name</div>
          <div className="text-[#333] dark:text-[#D8D8D8] text-right w-60 truncate">
            {document?._source?.title || "-"}
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Source</div>
          <div className="text-[#333] dark:text-[#D8D8D8] flex justify-end text-right w-56 truncate">
            <img
              className="w-4 h-4 mr-1"
              src={getTypeIcon(document)}
              alt="icon"
            />
            {document?._source?.source?.name || "-"}
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Where</div>
          <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 truncate">
            -
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Updated at</div>
          <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 truncate">
            {document?._source?.updated || "-"}
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Update by</div>
          <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 truncate">
            {document?._source?.last_updated_by?.user?.username || "-"}
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Created by</div>
          <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 truncate">
            {document?._source?.owner?.username || "-"}
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Type</div>
          <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 truncate">
            {document?._source?.type || "-"}
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Size</div>
          <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 truncate">
            {document?._source?.size || "-"}
          </div>
        </div>
      </div>
    </div>
  );
};
