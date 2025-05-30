import { createContext, useEffect } from "react";
import { useMount, useReactive } from "ahooks";
import { useTranslation } from "react-i18next";
import type { LiteralUnion } from "type-fest";

import platformAdapter from "@/utils/platformAdapter";
import Content from "./components/Content";
import Details from "./components/Details";
import { cloneDeep, sortBy } from "lodash-es";
import { useExtensionsStore } from "@/stores/extensionsStore";

export type ExtensionId = LiteralUnion<
  "Applications" | "Calculator" | "QuickAIAccess" | "AIOverview",
  string
>;

type ExtensionType =
  | "group"
  | "extension"
  | "application"
  | "script"
  | "quick_link"
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
  title: string;
  description: string;
  alias?: string;
  hotkey?: string;
  enabled: boolean;
  platforms?: ExtensionPlatform[];
  action: ExtensionAction;
  quick_link: ExtensionQuickLink;
  commands?: Extension[];
  scripts?: Extension[];
  quick_links?: Extension[];
  settings: Record<string, unknown>;
}

interface State {
  extensions: Extension[];
  activeExtension?: Extension;
}

const INITIAL_STATE: State = {
  extensions: [],
};

export const ExtensionsContext = createContext<{ rootState: State }>({
  rootState: INITIAL_STATE,
});

export const Extensions = () => {
  const { t } = useTranslation();
  const state = useReactive<State>(cloneDeep(INITIAL_STATE));
  const setDisabledExtensions = useExtensionsStore((state) => {
    return state.setDisabledExtensions;
  });

  useMount(async () => {
    const result = await platformAdapter.invokeBackend<[boolean, Extension[]]>(
      "list_extensions"
    );

    const extensions = result[1];

    const disabledExtensions = extensions.filter((item) => !item.enabled);

    setDisabledExtensions(disabledExtensions.map((item) => item.id));

    state.extensions = sortBy(extensions, ["title"]);
  });

  useEffect(() => {
    const unsubscribe = useExtensionsStore.subscribe((state) => {
      platformAdapter.emitEvent("change-extensions-store", state);
    });

    return () => {
      unsubscribe();
    };
  });

  return (
    <ExtensionsContext.Provider
      value={{
        rootState: state,
      }}
    >
      <div className="flex h-[calc(100vh-128px)] -mx-6 gap-4">
        <div className="w-2/3 h-full px-4 border-r dark:border-gray-700 overflow-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("settings.extensions.title")}
          </h2>

          <div>
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
          </div>
        </div>

        <Details />
      </div>
    </ExtensionsContext.Provider>
  );
};

export default Extensions;
