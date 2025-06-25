import { createContext, useEffect } from "react";
import { useAsyncEffect, useReactive } from "ahooks";
import { useTranslation } from "react-i18next";
import type { LiteralUnion } from "type-fest";
import { cloneDeep, sortBy } from "lodash-es";

import platformAdapter from "@/utils/platformAdapter";
import Content from "./components/Content";
import Details from "./components/Details";
import { useExtensionsStore } from "@/stores/extensionsStore";
import { Button } from "@headlessui/react";
import { Plus } from "lucide-react";
import SettingsInput from "../SettingsInput";
import clsx from "clsx";

export type ExtensionId = LiteralUnion<
  "Applications" | "Calculator" | "QuickAIAccess" | "AIOverview",
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

interface ExtensionQuickLink {
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
  quicklink: ExtensionQuickLink;
  commands?: Extension[];
  scripts?: Extension[];
  quicklinks?: Extension[];
  settings: Record<string, unknown>;
  developer?: string;
}

type Category = LiteralUnion<
  "All" | "Commands" | "Scripts" | "Apps" | "QuickLinks",
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
  categories: ["All", "Commands", "Scripts", "Apps", "QuickLinks"],
  currentCategory: "All",
};

export const ExtensionsContext = createContext<{ rootState: State }>({
  rootState: INITIAL_STATE,
});

export const Extensions = () => {
  const { t } = useTranslation();
  const state = useReactive<State>(cloneDeep(INITIAL_STATE));

  useAsyncEffect(async () => {
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
  }, [state.searchValue, state.currentCategory]);

  useEffect(() => {
    const unsubscribe = useExtensionsStore.subscribe((state) => {
      platformAdapter.emitEvent("change-extensions-store", state);
    });

    return () => {
      unsubscribe();
    };
  });

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
      case "QuickLinks":
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

            <Button className="flex items-center justify-center size-6 border rounded-md hover:border-[#0096FB] transition">
              <Plus className="size-4 text-[#0096FB]" />
            </Button>
          </div>

          <div className="flex justify-between gap-6 my-4">
            <div className="flex h-8 border dark:border-gray-700">
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
