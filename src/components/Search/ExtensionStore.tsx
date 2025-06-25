import { useSearchStore } from "@/stores/searchStore";
import { parseSearchQuery } from "@/utils";
import platformAdapter from "@/utils/platformAdapter";
import { useAsyncEffect, useDebounce, useKeyPress, useUnmount } from "ahooks";
import SearchEmpty from "../Common/SearchEmpty";
import { useState } from "react";
import { CircleCheck, FolderDown, Loader } from "lucide-react";
import clsx from "clsx";
import ExtensionDetail from "./ExtensionDetail";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useAppStore } from "@/stores/appStore";
import { platform } from "@/utils/platform";
import { useTranslation } from "react-i18next";

export interface SearchExtensionItem {
  id: string;
  created: string;
  updated: string;
  name: string;
  description: string;
  icon: string;
  type: string;
  category: string;
  tags?: string[];
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
    download: string;
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
    installingExtensions,
    setInstallingExtensions,
    uninstallingExtensions,
    setUninstallingExtensions,
    visibleExtensionDetail,
    setVisibleExtensionDetail,
  } = useSearchStore();
  const debouncedSearchValue = useDebounce(searchValue);
  const [list, setList] = useState<SearchExtensionItem[]>([]);
  const { modifierKey } = useShortcutsStore();
  const { addError } = useAppStore();
  const { t } = useTranslation();

  useAsyncEffect(async () => {
    if (!debouncedSearchValue.trim()) {
      return setList([]);
    }

    const result = await platformAdapter.invokeBackend<SearchExtensionItem[]>(
      "search_extension",
      {
        queryParams: parseSearchQuery({
          query: debouncedSearchValue,
          filters: {
            platforms: [platform()],
          },
        }),
      }
    );

    console.log("search_extension", result);

    setList(result ?? []);

    setSelectedExtension(result?.[0]);
  }, [debouncedSearchValue]);

  useUnmount(() => {
    setSelectedExtension(void 0);
  });

  useKeyPress(
    "enter",
    () => {
      setVisibleExtensionDetail(true);
    },
    { exactMatch: true }
  );

  useKeyPress(
    `${modifierKey}.enter`,
    () => {
      if (selectedExtension?.installed) {
        return handleUnInstall();
      }

      handleInstall();
    },
    { exactMatch: true }
  );

  useKeyPress(["uparrow", "downarrow"], (_, key) => {
    const index = list.findIndex((item) => item.id === selectedExtension?.id);
    const length = list.length;

    if (length <= 1) return;

    let nextIndex = index;

    if (key === "uparrow") {
      nextIndex = nextIndex > 0 ? nextIndex - 1 : length - 1;
    } else {
      nextIndex = nextIndex < length - 1 ? nextIndex + 1 : 0;
    }

    setSelectedExtension(list[nextIndex]);
  });

  const toggleInstall = (installed = true) => {
    if (!selectedExtension) return;

    const { id } = selectedExtension;

    setList((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          return { ...item, installed };
        }

        return item;
      });
    });

    if (selectedExtension?.id === id) {
      setSelectedExtension({
        ...selectedExtension,
        installed,
      });
    }
  };

  const handleInstall = async () => {
    if (!selectedExtension) return;

    const { id, name, installed } = selectedExtension;

    try {
      if (installed || installingExtensions.includes(id)) return;

      setInstallingExtensions(installingExtensions.concat(id));

      await platformAdapter.invokeBackend("install_extension", { id });

      toggleInstall();

      addError(
        `${name} ${t("extensionStore.hints.installationCompleted")}`,
        "info"
      );
    } catch (error) {
      addError(String(error), "error");
    } finally {
      setInstallingExtensions(
        installingExtensions.filter((item) => item !== id)
      );
    }
  };

  const handleUnInstall = async () => {
    if (!selectedExtension) return;

    const { id, name, installed, developer } = selectedExtension;

    try {
      if (!installed || uninstallingExtensions.includes(id)) return;

      setUninstallingExtensions(uninstallingExtensions.concat(id));

      await platformAdapter.invokeBackend("uninstall_extension", {
        developer: developer.id,
        extensionId: id,
      });

      toggleInstall(false);

      addError(
        `${name} ${t("extensionStore.hints.uninstallationCompleted")}`,
        "info"
      );
    } catch (error) {
      addError(String(error), "error");
    } finally {
      setUninstallingExtensions(
        uninstallingExtensions.filter((item) => item !== id)
      );
    }
  };

  return (
    <div className="h-full text-sm p-2 overflow-auto custom-scrollbar">
      {visibleExtensionDetail ? (
        <ExtensionDetail
          onInstall={handleInstall}
          onUninstall={handleUnInstall}
        />
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
                      "bg-black/10 dark:bg-white/15":
                        selectedExtension?.id === id,
                    }
                  )}
                  onMouseOver={() => {
                    setSelectedExtension(item);
                  }}
                  onClick={() => {
                    setVisibleExtensionDetail(true);
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

                    {installingExtensions.includes(item.id) && (
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
