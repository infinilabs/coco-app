import React from "react";
import { useTranslation } from "react-i18next";

import { formatter } from "@/utils/index";
import TypeIcon from "@/components/Common/Icons/TypeIcon";

interface DocumentDetailProps {
  document: any;
}

export const DocumentDetail: React.FC<DocumentDetailProps> = ({ document }) => {

  // {
  //   id: "383aac6500efe68d0fa8388550494128",
  //   created: "2023-10-09T08:00:00+08:00",
  //   source: {
  //   type: "connector",
  //   name: "INFINI Labs 中文官网",
  //   id: "cvlab8mhpceqa8fa2gqg",
  //   icon: "https://coco.infini.cloud/assets/connector/hugo_site/icon.png"
  //   },
  //   type: "web_page",
  //   category: "Blog",
  //   subcategory: "Technology",
  //   title: "Easysearch 压缩模式深度比较：ZSTD + source_reuse 的优势分析",
  //   summary: "本文探讨了Easysearch的zstd + source_reuse压缩模式，通过与default、best_compression和zstd对比，该模式在存储效率（仅1.6GB）和吞吐量（38942 docs/s）上表现最优，适合存储成本敏感场景。",
  //   lang: "cn",
  //   icon: "https://coco.infini.cloud/assets/connector/hugo_site/web.png",
  //   tags: [
  //   "Easysearch",
  //   "ZSTD",
  //   "source_reuse"
  //   ],
  //   url: "https://infinilabs.cn/blog/2023/deep-comparison-of-easysearch-compression-modes/"
  //   }
  const { t } = useTranslation();

  return (
    <div className="p-4">
      <div className="font-normal text-xs text-[#666] dark:text-[#999] mb-2">
        {t('search.document.details')}
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
          <div className="text-[#666]">{t('search.document.name')}</div>
          <div className="text-[#333] dark:text-[#D8D8D8] text-right w-60 break-words">
            {document?.title || "-"}
          </div>
        </div>

        <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
          <div className="text-[#666]">{t('search.document.source')}</div>
          <div className="text-[#333] dark:text-[#D8D8D8] flex justify-end text-right w-56 break-words">
            <TypeIcon item={document} className="w-4 h-4 mr-1" />
            {document?.source?.name || "-"}
          </div>
        </div>

        {document?.updated && (
          <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
            <div className="text-[#666]">{t('search.document.updatedAt')}</div>
            <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
              {document?.updated || "-"}
            </div>
          </div>
        )}

        {document?.last_updated_by?.user?.username && (
          <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
            <div className="text-[#666]">{t('search.document.updatedBy')}</div>
            <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
              {document?.last_updated_by?.user?.username || "-"}
            </div>
          </div>
        )}

        {document?.owner?.username && (
          <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
            <div className="text-[#666]">{t('search.document.createdBy')}</div>
            <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
              {document?.owner?.username || "-"}
            </div>
          </div>
        )}

        {document?.type && (
          <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
            <div className="text-[#666]">{t('search.document.type')}</div>
            <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
              {document?.type || "-"}
            </div>
          </div>
        )}

        {document?.size && (
          <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
            <div className="text-[#666]">{t('search.document.size')}</div>
            <div className="text-[#333] dark:text-[#D8D8D8] text-right w-56 break-words">
              {formatter.bytes(document?.size || 0)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
