import React from "react";
import { AlignLeft, Columns2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useAppStore } from "@/stores/appStore";

interface SearchHeaderProps {
  total: number;
  viewMode: "detail" | "list";
  setViewMode: (mode: "detail" | "list") => void;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  total,
  viewMode,
  setViewMode,
}) => {
  const { t } = useTranslation();

  const isTauri = useAppStore((state) => state.isTauri);

  return (
    <div className="flex items-center justify-between py-1">
      <div className="text-xs text-gray-600 dark:text-gray-400">
        {t('search.header.found')}
        <span className="px-1 font-medium text-gray-900 dark:text-gray-100">
          {total}
        </span>
        {t('search.header.results')}
      </div>
      <div className={`${isTauri ? 'flex' : 'hidden md:flex'} gap-2`}>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("list")}
            className={`p-1 rounded ${
              viewMode === "list"
                ? "bg-white dark:bg-gray-700 shadow-sm text-[var(--coco-primary-color)]"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("detail")}
            className={`p-1 rounded ${
              viewMode === "detail"
                ? "bg-white dark:bg-gray-700 shadow-sm text-[var(--coco-primary-color)]"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Columns2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
