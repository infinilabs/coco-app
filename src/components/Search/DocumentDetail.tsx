import React from "react";
import { useTranslation } from "react-i18next";
import { File } from "lucide-react";

import { formatter } from "@/utils/index";
import CommonIcon from "@/components/Common/Icons/CommonIcon";
import defaultThumbnail from "@/assets/coconut-tree.png";
import { RichCategories } from "./ListRight";

interface DocumentDetailProps {
  document: any;
}

// Add a reusable DetailItem component
interface DetailItemProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

const DetailItem: React.FC<DetailItemProps> = ({ label, value, icon }) => (
  <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5 border-t border-[rgba(238,240,243,1)] dark:border-[#272626] pt-2.5">
    <div className="text-[rgba(153,153,153,1)] dark:text-[#666] min-w-[80px]">
      {label}
    </div>
    <div
      className="text-[rgba(51,51,51,1);] dark:text-[#D8D8D8] flex justify-end text-right flex-1 truncate group relative"
      title={typeof value === "string" ? value : undefined}
    >
      {icon}
      <div className="truncate">{value}</div>
    </div>
  </div>
);

// Main component implementation
export const DocumentDetail: React.FC<DocumentDetailProps> = ({ document }) => {
  const { t } = useTranslation();

  const truncateUrl = (url: string) => {
    if (url.length <= 40) return url;
    return `${url.slice(0, 20)}...${url.slice(-20)}`;
  };

  return (
    <div className="p-3 user-select-text">
      {/* <div className="font-normal text-xs text-[#666] dark:text-[#999] mb-2">
        {t("search.document.details")}
      </div> */}
      <div className="text-xs font-normal text-[rgba(51,51,51,1)] dark:text-[#D8D8D8]">
        {document?.title || "-"}
      </div>

      <div className="py-4">
        {/* Document Thumbnail */}
        <div className="mb-4 h-[140px] rounded-lg bg-[rgba(243,244,246,1)] dark:bg-[#202126] flex justify-center items-center">
          {document.thumbnail ? (
            <img
              src={document.thumbnail}
              alt="thumbnail"
              className="max-w-[200px] max-h-[120px] object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = defaultThumbnail;
              }}
            />
          ) : (
            <CommonIcon
              renderOrder={["special_icon", "item_icon", "connector_icon", "default_icon"]}
              item={document}
              itemIcon={document?.icon}
              defaultIcon={File}
              className="w-16 h-16"
            />
          )}
        </div>

        {/* Document Summary */}
        {document?.summary && (
          <div className="mb-4 text-xs text-[rgba(153,153,153,1)] dark:text-[#D8D8D8] whitespace-pre-wrap break-words">
            {document.summary}
          </div>
        )}

        {/* Document Tags */}
        {document?.tags && document.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {document.tags.map((tag: string, index: number) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <DetailItem
          label={t("search.document.source")}
          value={document?.source?.name || "-"}
          icon={
            <CommonIcon
              item={document}
              renderOrder={["connector_icon", "default_icon"]}
              itemIcon={document?.source?.icon}
              className="w-4 h-4 mr-1"
            />
          }
        />

        {/* Rich Categories */}
        {document?.rich_categories && (
          <DetailItem
            label={t("search.document.richCategories")}
            value={
              <div className="min-w-[160px] flex items-center justify-end w-full text-[12px] relative">
                <RichCategories item={document} isSelected={false} />
              </div>
            }
          />
        )}

        {/* Document URL */}
        {document?.url && (
          <DetailItem
            label={t("search.document.url")}
            value={
              <a
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 whitespace-nowrap"
                title={document.url}
              >
                {truncateUrl(document.url)}
              </a>
            }
          />
        )}

        {/* Document Identifier */}
        {document?.id && (
          <DetailItem label={t("search.document.id")} value={document.id} />
        )}

        {/* Creation Time */}
        {document?.created && (
          <DetailItem
            label={t("search.document.createdAt")}
            value={document.created}
          />
        )}

        {/* Document Classification */}
        {document?.category && (
          <DetailItem
            label={t("search.document.category")}
            value={document.category}
          />
        )}

        {/* Document Subcategory */}
        {document?.subcategory && (
          <DetailItem
            label={t("search.document.subcategory")}
            value={document.subcategory}
          />
        )}

        {/* Document Language */}
        {document?.lang && (
          <DetailItem
            label={t("search.document.language")}
            value={document.lang.toUpperCase()}
          />
        )}

        {/* Last Update Time */}
        {document?.updated && (
          <DetailItem
            label={t("search.document.updatedAt")}
            value={document?.updated || "-"}
          />
        )}

        {/* Last Modified By */}
        {document?.last_updated_by?.user?.username && (
          <DetailItem
            label={t("search.document.updatedBy")}
            value={document?.last_updated_by?.user?.username || "-"}
          />
        )}

        {/* Document Owner */}
        {document?.owner?.username && (
          <DetailItem
            label={t("search.document.createdBy")}
            value={document?.owner?.username || "-"}
          />
        )}

        {/* Document Type */}
        {document?.type && (
          <DetailItem
            label={t("search.document.type")}
            value={document?.type || "-"}
          />
        )}

        {/* Document Size */}
        {document?.size && (
          <DetailItem
            label={t("search.document.size")}
            value={formatter.bytes(document?.size || 0)}
          />
        )}
      </div>
    </div>
  );
};
