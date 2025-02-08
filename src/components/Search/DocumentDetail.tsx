import React from "react";

import { formatter } from "@/utils/index";
import TypeIcon from "@/components/Common/Icons/TypeIcon";

interface DocumentDetailProps {
  document: any;
}

export const DocumentDetail: React.FC<DocumentDetailProps> = ({ document }) => {
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
            <TypeIcon item={document} className="w-4 h-4 mr-1" />
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
