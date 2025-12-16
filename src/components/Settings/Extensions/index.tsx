import { createContext, useEffect } from "react";
import { useReactive } from "ahooks";
import { useTranslation } from "react-i18next";
import type { LiteralUnion } from "type-fest";
import { cloneDeep, sortBy } from "lodash-es";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

import platformAdapter from "@/utils/platformAdapter";
import Content from "./components/Content";
import Details from "./components/Details";
import { useExtensionsStore } from "@/stores/extensionsStore";
import SettingsInput from "../SettingsInput";
import { useAppStore } from "@/stores/appStore";
import { installExtensionError } from "@/utils";

export type ExtensionId = LiteralUnion<
  | "Applications"
  | "Calculator"
  | "QuickAIAccess"
  | "AIOverview"
  | "File Search",
  string
>;

type ExtensionType =
  | "group"
  | "extension"
  | "application"
  | "script"
  | "quicklink"
  | "setting"
  | "calculator"
  | "command"
  | "ai_extension"
  | "view"
  | "unknown";

export type ExtensionPlatform = "windows" | "macos" | "linux";

interface ExtensionAction {
  exec: string;
  args: string[];
}

interface ExtensionQuicklink {
  link: string;
}

export type FileSystemAccess = ("read" | "write")[];

export interface ExtensionFileSystemPermission {
  path: string;
  access: FileSystemAccess;
}

export interface ExtensionHttpPermission {
  host: string;
}

export interface ExtensionPermission {
  fs: ExtensionFileSystemPermission[] | null;
  http: ExtensionHttpPermission[] | null;
  api: string[] | null;
}

export interface ViewExtensionUISettings {
  search_bar: boolean;
  filter_bar: boolean;
  footer: boolean;
  width: number | null;
  height: number | null;
  resizable: boolean;
  detachable: boolean;
}

export interface Extension {
  id: ExtensionId;
  type: ExtensionType;
  icon: string;
  name: string;
  description: string;
  alias?: string;
  hotkey?: string;
  enabled: boolean;
  platforms?: ExtensionPlatform[];
  action: ExtensionAction;
  quicklink: ExtensionQuicklink;
  commands?: Extension[];
  scripts?: Extension[];
  quicklinks?: Extension[];
  views?: Extension[];
  settings: Record<string, unknown>;
  developer?: string;
  page?: string;
  permission?: ExtensionPermission;
}

type Category = LiteralUnion<
  "All" | "Commands" | "Scripts" | "Apps" | "Quicklinks",
  string
>;

interface State {
  extensions: Extension[];
  activeExtension?: Extension;
  categories: Category[];
  currentCategory: Category;
  searchValue?: string;
}

const INITIAL_STATE: State = {
  extensions: [],
  categories: ["All", "Commands", "Scripts", "Apps", "Quicklinks"],
  currentCategory: "All",
};

export const ExtensionsContext = createContext<{ rootState: State }>({
  rootState: INITIAL_STATE,
});

export const Extensions = () => {
  const { t } = useTranslation();
  const state = useReactive<State>(cloneDeep(INITIAL_STATE));
  const { configId, setConfigId } = useExtensionsStore();
  const { addError } = useAppStore();

  useEffect(() => {
    getExtensions();
  }, [state.searchValue, state.currentCategory, configId]);

  useEffect(() => {
    const unsubscribe = useExtensionsStore.subscribe((state) => {
      platformAdapter.emitEvent("change-extensions-store", state);
    });

    return () => {
      unsubscribe();
    };
  });

  const getExtensions = async () => {
    const extensions = await platformAdapter.invokeBackend<Extension[]>(
      "list_extensions",
      {
        query: state.searchValue,
        extensionType: getExtensionType(),
        listEnabled: false,
      }
    );

    console.log("extensions", cloneDeep(extensions));

    state.extensions = sortBy(extensions, ["name"]);

    if (configId) {
      const matched = extensions.find((item) => item.id === configId);

      if (!matched) return;

      state.activeExtension = matched;

      setConfigId(void 0);
    }
  };

  const getExtensionType = (): ExtensionType | undefined => {
    switch (state.currentCategory) {
      case "All":
        return void 0;
      case "Commands":
        return "command";
      case "Scripts":
        return "script";
      case "Apps":
        return "application";
      case "Quicklinks":
        return "quicklink";
      default:
        return void 0;
    }
  };

  return (
    <ExtensionsContext.Provider
      value={{
        rootState: state,
      }}
    >
      <div className="flex h-[calc(100vh-128px)] -mx-6 gap-4 text-sm">
        <div className="w-2/3 h-full px-4 border-r dark:border-gray-700 overflow-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("settings.extensions.title")}
            </h2>

            <Menu>
              <MenuButton className="flex items-center justify-center size-6 border rounded-[6px] dark:border-gray-700 hover:!border-[#0096FB] transition">
                <Plus className="size-4 text-[#0096FB]" />
              </MenuButton>

              <MenuItems
                anchor={{ gap: 4 }}
                className="p-1 text-sm bg-white dark:bg-[#202126] rounded-lg shadow-xs border border-gray-200 dark:border-gray-700"
              >
                <MenuItem>
                  <div
                    className="px-3 py-2 hover:bg-black/5 hover:dark:bg-white/5 rounded-lg cursor-pointer"
                    onClick={() => {
                      platformAdapter.emitEvent("open-extension-store");
                    }}
                  >
                    {t("settings.extensions.menuItem.extensionStore")}
                  </div>
                </MenuItem>
                <MenuItem>
                  <div
                    className="px-3 py-2 hover:bg-black/5 hover:dark:bg-white/5 rounded-lg cursor-pointer"
                    onClick={async () => {
                      try {
                        const path = await platformAdapter.openFileDialog({
                          directory: true,
                        });

                        if (!path) return;

                        await platformAdapter.invokeBackend(
                          "install_local_extension",
                          { path }
                        );

                        await getExtensions();

                        addError(
                          t("settings.extensions.hints.importSuccess"),
                          "info"
                        );
                      } catch (error) {
                        installExtensionError(error);
                      }
                    }}
                  >
                    {t("settings.extensions.menuItem.localExtensionImport")}
                  </div>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>

          <div className="flex justify-between gap-6 my-4">
            <div className="flex h-8 border dark:border-gray-700 rounded-[6px] overflow-hidden">
              {state.categories.map((item) => {
                return (
                  <div
                    key={item}
                    className={clsx(
                      "flex items-center h-full px-4 cursor-pointer",
                      {
                        "bg-[#F0F6FE] dark:bg-gray-700":
                          item === state.currentCategory,
                      }
                    )}
                    onClick={() => {
                      state.currentCategory = item;
                    }}
                  >
                    {item}
                  </div>
                );
              })}
            </div>

            <SettingsInput
              className="flex-1"
              placeholder="Search"
              value={state.searchValue}
              onChange={(value) => {
                state.searchValue = String(value);
              }}
            />
          </div>

          <>
            <div className="flex">
              <div className="flex-1">{t("settings.extensions.list.name")}</div>

              <div className="w-4/6 flex">
                <div className="flex-1">
                  {t("settings.extensions.list.type")}
                </div>
                <div className="flex-1">
                  {t("settings.extensions.list.alias")}
                </div>
                <div className="flex-1">
                  {t("settings.extensions.list.hotkey")}
                </div>
                <div className="w-16 text-right whitespace-nowrap">
                  {t("settings.extensions.list.enabled")}
                </div>
              </div>
            </div>

            <Content />
          </>
        </div>

        <Details />
      </div>
    </ExtensionsContext.Provider>
  );
};

export default Extensions;
