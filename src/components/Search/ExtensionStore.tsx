import { useSearchStore } from "@/stores/searchStore";
import { parseSearchQuery } from "@/utils";
import platformAdapter from "@/utils/platformAdapter";
import { useAsyncEffect, useDebounce, useKeyPress } from "ahooks";
import SearchEmpty from "../Common/SearchEmpty";
import { useEffect, useState } from "react";
import { CircleCheck, FolderDown, Loader } from "lucide-react";
import clsx from "clsx";
import ExtensionDetail from "./ExtensionDetail";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useAppStore } from "@/stores/appStore";

export interface SearchExtensionItem {
  id: string;
  created: string;
  updated: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  category: string;
  tags: string[];
  platforms: string[];
  developer: {
    id: string;
    name: string;
    avatar: string;
    twitter_handle?: string;
    github_handle?: string;
    location?: string;
    website?: string;
    bio?: string;
  };
  contributors: {
    id: string;
    name: string;
    avatar: string;
  }[];
  url: {
    code: string;
    home: string;
  };
  version: {
    number: string;
  };
  screenshots: {
    title?: string;
    url: string;
  }[];
  action: {
    exec: string;
    args: string[];
  };
  enabled: boolean;
  stats: {
    installs: number;
    views: number;
  };
  checksum: string;
  installed: boolean;
  commands?: Array<{
    type: string;
    name: string;
    icon: string;
    description: string;
    action: {
      exec: string;
      args: string[];
    };
  }>;
}

const ExtensionStore = () => {
  const {
    searchValue,
    selectedExtension,
    setSelectedExtension,
    downloadingExtensions,
    setDownloadingExtensions,
  } = useSearchStore();
  const debouncedSearchValue = useDebounce(searchValue);
  const [list, setList] = useState<SearchExtensionItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SearchExtensionItem>();
  const { modifierKey } = useShortcutsStore();
  const { addError } = useAppStore();

  useAsyncEffect(async () => {
    console.log("debouncedSearchValue", debouncedSearchValue);

    if (!debouncedSearchValue.trim()) {
      return setList([]);
    }

    const result = await platformAdapter.invokeBackend<SearchExtensionItem[]>(
      "search_extension",
      {
        queryParams: parseSearchQuery({
          // query: debouncedSearchValue,
          // filters: {
          //   platform: platform(),
          // },
        }),
      }
    );

    setList(result ?? []);

    console.log("result", result);
  }, [debouncedSearchValue]);

  useEffect(() => {
    setSelectedItem(list[0]);
  }, [list]);

  useKeyPress(
    "enter",
    () => {
      setSelectedExtension(selectedItem);
    },
    { exactMatch: true }
  );

  useKeyPress(
    `${modifierKey}.enter`,
    () => {
      if (!selectedItem) return;

      handleDownload(selectedItem);
    },
    { exactMatch: true }
  );

  useKeyPress([], () => {});

  const handleDownload = async (item: SearchExtensionItem) => {
    const { id, name, installed } = item;

    try {
      if (installed || downloadingExtensions.includes(id)) return;

      setDownloadingExtensions(downloadingExtensions.concat(id));

      await platformAdapter.invokeBackend("install_extension", { id });

      setList((prev) => {
        return prev.map((item) => {
          if (item.id === id) {
            return { ...item, installed: true };
          }

          return item;
        });
      });

      if (selectedItem?.id === id) {
        setSelectedItem((prev) => {
          if (!prev) return;

          return { ...prev, installed: true };
        });
      }

      if (selectedExtension?.id === id) {
        setSelectedExtension({
          ...selectedExtension,
          installed: true,
        });
      }

      addError(`${name} installation completed`);
    } catch (error) {
      addError(String(error), "error");
    } finally {
      setDownloadingExtensions(
        downloadingExtensions.filter((item) => item !== id)
      );
    }
  };

  return (
    <div className="h-full text-sm p-2 overflow-auto custom-scrollbar">
      {selectedExtension ? (
        <ExtensionDetail onDownload={handleDownload} />
      ) : (
        <>
          {list.length > 0 ? (
            list.map((item) => {
              const { id, icon, name, description, stats, installed } = item;

              return (
                <div
                  key={id}
                  className={clsx(
                    "flex justify-between h-[40px] px-2 rounded-lg cursor-pointer text-[#333] dark:text-[#d8d8d8] transition",
                    {
                      "bg-black/10 dark:bg-white/15": selectedItem?.id === id,
                    }
                  )}
                  onMouseOver={() => {
                    setSelectedItem(item);
                  }}
                  onClick={() => {
                    setSelectedExtension(item);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <img src={icon} className="size-[20px]" />
                    <span>{name}</span>
                    <span className="text-[#999]">{description}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {installed && (
                      <CircleCheck className="size-4 text-green-500" />
                    )}

                    {downloadingExtensions.includes(item.id) && (
                      <Loader className="size-4 text-blue-500 animate-spin" />
                    )}

                    <div className="flex items-center gap-1 text-[#999]">
                      <FolderDown className="size-4" />
                      <span>{stats.installs}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex justify-center items-center h-full">
              <SearchEmpty />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExtensionStore;
