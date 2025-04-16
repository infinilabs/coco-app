import React from "react";
import { useTranslation } from "react-i18next";

import { formatter } from "@/utils/index";
import TypeIcon from "@/components/Common/Icons/TypeIcon";

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
  <div className="flex justify-between flex-wrap font-normal text-xs mb-2.5">
    <div className="text-[#666]">{label}</div>
    <div className="text-[#333] dark:text-[#D8D8D8] flex justify-end text-right w-56 break-words">
      {icon}
      {value}
    </div>
  </div>
);

// Main component implementation
export const DocumentDetail: React.FC<DocumentDetailProps> = ({ document }) => {
  const { t } = useTranslation();

  return (
    <div className="p-4">
      <div className="font-normal text-xs text-[#666] dark:text-[#999] mb-2">
        {t("search.document.details")}
      </div>

      <div className="py-4 mt-4">
        {/* Basic Information */}
        <DetailItem
          label={t("search.document.name")}
          value={document?.title || "-"}
        />

        <DetailItem
          label={t("search.document.source")}
          value={document?.source?.name || "-"}
          icon={<TypeIcon item={document} className="w-4 h-4 mr-1" />}
        />

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

        {/* Document Tags */}
        {document?.tags && document.tags.length > 0 && (
          <DetailItem
            label={t("search.document.tags")}
            value={
              <div className="text-right whitespace-pre-wrap break-words w-full">
                {document.tags.join(", ")}
              </div>
            }
          />
        )}

        {/* Document Summary */}
        {document?.summary && (
          <DetailItem
            label={t("search.document.summary")}
            value={
              <div className="text-right whitespace-pre-wrap break-words w-full">
                {document.summary}
              </div>
            }
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
