import {
  useDebounce,
  useInfiniteScroll,
  useKeyPress,
  useUnmount,
} from "ahooks";
import { useCallback, useEffect, useRef } from "react";
import { CircleCheck, FolderDown, Loader } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

import { useSearchStore } from "@/stores/searchStore";
import { installExtensionError, parseSearchQuery } from "@/utils";
import platformAdapter from "@/utils/platformAdapter";
import SearchEmpty from "../Common/SearchEmpty";
import ExtensionDetail from "./ExtensionDetail";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import { useAppStore } from "@/stores/appStore";
import { platform } from "@/utils/platform";

const PAGE_SIZE = 20;

const filterNewExtensions = (
  currentItems: SearchExtensionItem[],
  nextItems: SearchExtensionItem[],
) => {
  const seen = new Set(currentItems.map((item) => item.id));

  return nextItems.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
};

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
  installed?: boolean;
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

const ExtensionStore = ({
  extensionId,
  changeInput,
}: {
  extensionId?: string;
  changeInput: (value: string) => void;
}) => {
  const {
    searchValue,
    selectedExtension,
    setSelectedExtension,
    installingExtensions,
    setInstallingExtensions,
    setUninstallingExtensions,
    visibleExtensionDetail,
    setVisibleExtensionDetail,
    visibleContextMenu,
    setVisibleContextMenu,
  } = useSearchStore();
  const debouncedSearchValue = useDebounce(searchValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRequestKey = `${extensionId ?? ""}:${debouncedSearchValue.trim()}`;
  const currentSearchRequestKeyRef = useRef(searchRequestKey);
  const { modifierKey } = useShortcutsStore();
  const { addError } = useAppStore();
  const { t } = useTranslation();

  currentSearchRequestKeyRef.current = searchRequestKey;

  useEffect(() => {
    const unlisten1 = platformAdapter.listenEvent("install-extension", () => {
      handleInstall();
    });

    const unlisten2 = platformAdapter.listenEvent("uninstall-extension", () => {
      handleUnInstall();
    });

    return () => {
      unlisten1.then((fn) => fn());
      unlisten2.then((fn) => fn());
    };
  }, [selectedExtension]);

  const handleExtensionDetail = useCallback(async () => {
    try {
      const detail = await platformAdapter.invokeBackend<SearchExtensionItem>(
        "extension_detail",
        {
          id: extensionId,
        },
      );
      setSelectedExtension(detail);
      setVisibleExtensionDetail(true);
    } catch (error) {
      addError(String(error));
    }
  }, [addError, extensionId, setSelectedExtension, setVisibleExtensionDetail]);

  const { data, loading, loadingMore, noMore, mutate } = useInfiniteScroll(
    async (d) => {
      if (extensionId) {
        return {
          list: [],
          hasMore: false,
        };
      }

      const requestKey = searchRequestKey;

      const from = d?.list?.length ?? 0;

      const result = await platformAdapter.invokeBackend<SearchExtensionItem[]>(
        "search_extension",
        {
          queryParams: parseSearchQuery({
            query: debouncedSearchValue.trim(),
            from,
            size: PAGE_SIZE,
            filters: {
              platforms: [platform()],
            },
          }),
        },
      );

      if (requestKey !== currentSearchRequestKeyRef.current) {
        throw new Error("stale extension search request");
      }

      const currentList = d?.list ?? [];
      const nextList = filterNewExtensions(currentList, result ?? []);

      console.log("ExtensionStore nextList", nextList);

      return {
        list: nextList,
        hasMore: nextList.length === PAGE_SIZE,
      };
    },
    {
      target: containerRef,
      isNoMore: (d) => !d?.hasMore,
      reloadDeps: [debouncedSearchValue, extensionId],
      onError: (error) => {
        if (String(error) === "Error: stale extension search request") {
          return;
        }

        addError(String(error));
      },
    },
  );

  const list = data?.list ?? [];
  const showLoadingState = !visibleExtensionDetail && (loading || loadingMore);
  const showInitialLoadingState = showLoadingState && list.length === 0;
  const showLoadMoreState = showLoadingState && list.length > 0;
  const showNoMoreState =
    !visibleExtensionDetail && !showLoadingState && noMore && list.length > 0;

  useEffect(() => {
    mutate(void 0);

    if (!extensionId) {
      setSelectedExtension(void 0);
    }
  }, [extensionId, mutate, searchRequestKey, setSelectedExtension]);

  useEffect(() => {
    if (extensionId) {
      handleExtensionDetail();
    }
  }, [extensionId, handleExtensionDetail]);

  useEffect(() => {
    if (extensionId) return;

    if (list.length === 0) {
      if (selectedExtension) {
        setSelectedExtension(void 0);
      }
      return;
    }

    const selectedId = selectedExtension?.id;
    const hasSelected = selectedId
      ? list.some((item) => item.id === selectedId)
      : false;

    if (!hasSelected) {
      setSelectedExtension(list[0]);
    }
  }, [extensionId, list, selectedExtension, setSelectedExtension]);

  useUnmount(() => {
    setSelectedExtension(void 0);
  });

  useKeyPress(
    "enter",
    () => {
      if (visibleContextMenu) return;

      if (visibleExtensionDetail) {
        return handleInstall();
      }

      setVisibleExtensionDetail(true);
    },
    { exactMatch: true },
  );

  useKeyPress(
    `${modifierKey}.enter`,
    () => {
      if (visibleContextMenu || visibleExtensionDetail) {
        return;
      }

      handleInstall();
    },
    { exactMatch: true },
  );

  useKeyPress(["uparrow", "downarrow"], (_, key) => {
    if (visibleContextMenu || visibleExtensionDetail) return;

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

  const toggleInstall = (extension: SearchExtensionItem) => {
    if (!extension) return;

    const { id, installed } = extension;

    mutate((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        list: prev.list.map((item) => {
          if (item.id === id) {
            return { ...item, installed: !installed };
          }

          return item;
        }),
      };
    });

    const { selectedExtension } = useSearchStore.getState();

    if (selectedExtension?.id === id) {
      setSelectedExtension({
        ...selectedExtension,
        installed: !installed,
      });
    }
  };

  const handleInstall = async () => {
    const { selectedExtension, installingExtensions } =
      useSearchStore.getState();

    if (!selectedExtension) return;

    const { id, name, installed } = selectedExtension;

    if (installed || installingExtensions.includes(id)) return;

    try {
      setInstallingExtensions(installingExtensions.concat(id));

      await platformAdapter.invokeBackend("install_extension_from_store", {
        id,
      });

      toggleInstall(selectedExtension);

      addError(
        `${name} ${t("extensionStore.hints.installationCompleted")}`,
        "info",
      );
    } catch (error) {
      installExtensionError(error);
    } finally {
      const { installingExtensions } = useSearchStore.getState();

      setInstallingExtensions(
        installingExtensions.filter((item) => item !== id),
      );
    }
  };

  const handleUnInstall = async () => {
    const { selectedExtension, uninstallingExtensions } =
      useSearchStore.getState();

    if (!selectedExtension) return;

    const { id, name, installed, developer } = selectedExtension;

    if (!installed || uninstallingExtensions.includes(id)) return;

    try {
      setUninstallingExtensions(uninstallingExtensions.concat(id));

      await platformAdapter.invokeBackend("uninstall_extension", {
        developer: developer.id,
        extensionId: id,
      });

      toggleInstall(selectedExtension);

      addError(
        `${name} ${t("extensionStore.hints.uninstallationCompleted")}`,
        "info",
      );
    } catch (error) {
      addError(String(error), "error");
    } finally {
      const { uninstallingExtensions } = useSearchStore.getState();

      setUninstallingExtensions(
        uninstallingExtensions.filter((item) => item !== id),
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full text-sm p-4 overflow-auto custom-scrollbar"
    >
      {visibleExtensionDetail ? (
        <ExtensionDetail
          onInstall={handleInstall}
          onUninstall={handleUnInstall}
          changeInput={changeInput}
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
                    "flex justify-between gap-4 h-10 px-2 rounded-lg cursor-pointer text-[#333] dark:text-[#d8d8d8] transition",
                    {
                      "bg-black/10 dark:bg-white/15":
                        selectedExtension?.id === id,
                    },
                  )}
                  onMouseOver={() => {
                    setSelectedExtension(item);
                  }}
                  onClick={() => {
                    setVisibleExtensionDetail(true);
                  }}
                  onContextMenu={(event) => {
                    event.preventDefault();

                    setVisibleContextMenu(true);
                  }}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img src={icon} className="size-5" />
                    <span className="whitespace-nowrap">{name}</span>
                    <span className="truncate text-[#999]">{description}</span>
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
                      <span>{stats?.installs ?? 0}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : showInitialLoadingState ? (
            <div className="flex flex-col justify-center items-center h-full min-h-[50vh] gap-3 text-[#666] dark:text-[#a8a8a8]">
              <Loader className="size-5 text-blue-500 animate-spin" />
              <span className="text-sm">{t("common.loading")}</span>
            </div>
          ) : !showLoadingState ? (
            <div className="flex justify-center items-center h-full">
              <SearchEmpty />
            </div>
          ) : null}

          {showLoadMoreState && (
            <div className="flex justify-center items-center py-4">
              <Loader className="size-4 text-blue-500 animate-spin" />
            </div>
          )}

          {showNoMoreState && (
            <div className="text-center text-xs text-[#999] py-3">
              {t("extensionStore.hints.noMore")}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ExtensionStore;
