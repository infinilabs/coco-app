import { createContext, useEffect } from "react";
import { useReactive } from "ahooks";
import { useTranslation } from "react-i18next";
import type { LiteralUnion } from "type-fest";
import { cloneDeep, sortBy } from "lodash-es";
import clsx from "clsx";
import { Plus } from "lucide-react";
import { Button } from "@headlessui/react";

import platformAdapter from "@/utils/platformAdapter";
import Content from "./components/Content";
import Details from "./components/Details";
import { useExtensionsStore } from "@/stores/extensionsStore";
import SettingsInput from "../SettingsInput";

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
  | "ai_extension";

export type ExtensionPlatform = "windows" | "macos" | "linux";

interface ExtensionAction {
  exec: string;
  args: string[];
}

interface ExtensionQuicklink {
  link: string;
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
  settings: Record<string, unknown>;
  developer?: string;
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
    const result = await platformAdapter.invokeBackend<[boolean, Extension[]]>(
      "list_extensions",
      {
        query: state.searchValue,
        extensionType: getExtensionType(),
        listEnabled: false,
      }
    );

    const extensions = result[1];

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

            <Button
              className="flex items-center justify-center size-6 border rounded-md dark:border-gray-700 hover:!border-[#0096FB] transition"
              onClick={() => {
                platformAdapter.emitEvent("open-extension-store");
              }}
            >
              <Plus className="size-4 text-[#0096FB]" />
            </Button>
          </div>

          <div className="flex justify-between gap-6 my-4">
            <div className="flex h-8 border dark:border-gray-700 rounded-md overflow-hidden">
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
