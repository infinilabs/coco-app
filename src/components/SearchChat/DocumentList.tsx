import React, { useState } from "react";

import WebImg from "@/assets/hugo_site/web.png";
import { useAppStore } from "@/stores/appStore";
import { res_search } from "@/mock/index";

const documents: any[] = [...res_search?.hits?.hits, ...res_search?.hits?.hits];

interface DocumentListProps {
  onSelectDocument: (id: string) => void;
  selectedId?: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({}) => {
  const connector_data = useAppStore((state) => state.connector_data);

  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  function getIcon(_source: any) {
    const name = _source?.source?.name || "";
    const result = connector_data.find(
      (item: any) => item._source.category === name
    );
    const icons = result?._source?.assets?.icons || {};
    console.log(11111, icons, name, _source.icon, icons[_source.icon]);
    return icons[_source.icon] || WebImg;
  }

  return (
    <div className="">
      {documents.map((item: any, index: number) => {
        const isSelected = selectedItem === index;
        return (
          <div
            key={item._id}
            onMouseEnter={() => setSelectedItem(index)}
            onClick={() => {}}
            className={`w-full px-2 py-2.5 text-sm flex items-center justify-between rounded-lg transition-colors ${
              isSelected
                ? "text-white bg-[#6000FF] hover:bg-[#6000FF]"
                : "text-[#333] dark:text-[#d8d8d8]"
            }`}
          >
            <div className="flex gap-2 items-center">
              <img
                className="w-5 h-5"
                src={getIcon(item?._source)}
                alt="icon"
              />
              <span className="text-sm font-medium truncate w-72 text-left">
                {item?._source?.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
