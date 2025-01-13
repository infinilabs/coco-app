import React from "react";
import HugoImg from "@/assets/hugo_site/icon.png";

interface DocumentDetailProps {
  documentId?: string;
}

export const DocumentDetail: React.FC<DocumentDetailProps> = ({
  documentId,
}) => {
  if (!documentId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
        请选择一个文档查看详情
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="font-normal text-xs text-[#666] dark:text-[#999] mb-2">
        Details
      </div>

      <img
        src="https://images.unsplash.com/photo-1664575602276-acd073f104c1"
        alt="Document preview"
        className="w-full aspect-video object-cover rounded-xl shadow-md"
      />

      <div className="border-t border-t-[rgba(0,0,0,0.1)] dark:border-t-[rgba(255,255,255,0.1)] py-4 mt-4">
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Name</div>
          <div className="text-[#333] dark:text-[#D8D8D8]">
            极限科技 rust 大会展架
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Source</div>
          <div className="text-[#333] dark:text-[#D8D8D8] flex">
            <img className="w-4 h-4 mr-1" src={HugoImg} alt="icon" />
            Hugo
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Where</div>
          <div className="text-[#333] dark:text-[#D8D8D8]">
            googledrive/news/2024/06
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Updated at</div>
          <div className="text-[#333] dark:text-[#D8D8D8]">
            2024-09-14 12:07
          </div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Update by</div>
          <div className="text-[#333] dark:text-[#D8D8D8]">Huatai</div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Update by</div>
          <div className="text-[#333] dark:text-[#D8D8D8]">haochen li</div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Type</div>
          <div className="text-[#333] dark:text-[#D8D8D8]">PDF</div>
        </div>
        <div className="flex justify-between font-normal text-xs mb-2.5">
          <div className="text-[#666]">Size</div>
          <div className="text-[#333] dark:text-[#D8D8D8]">8.12Mb</div>
        </div>
      </div>
    </div>
  );
};
