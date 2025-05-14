import {
  createContext,
  Dispatch,
  ReactElement,
  ReactNode,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Calculator, Folder } from "lucide-react";
import { noop } from "lodash-es";
import { useMount } from "ahooks";
import { useTranslation } from "react-i18next";

import ApplicationsDetail from "./components/Details/Applications";
import Application from "./components/Details/Application";
import platformAdapter from "@/utils/platformAdapter";
import Content from "./components/Content";
import Details from "./components/Details";

export interface IApplication {
  path: string;
  name: string;
  iconPath: string;
  alias: string;
  hotkey: string;
  isDisabled: boolean;
}

export interface Plugin {
  id: string;
  icon: ReactElement;
  name: ReactNode;
  type?: "Group" | "Extension" | "Application";
  alias?: string;
  hotkey?: string;
  enabled?: boolean;
  detail?: ReactNode;
  children?: Plugin[];
  manualLoad?: boolean;
  loadChildren?: () => Promise<void>;
  onAliasChange?: (alias: string) => void;
  onHotkeyChange?: (hotkey: string) => void;
  onEnabledChange?: (enabled: boolean) => void;
}

interface ExtensionsContextType {
  plugins: Plugin[];
  setPlugins: Dispatch<SetStateAction<Plugin[]>>;
  activeId?: string;
  setActiveId: (id: string) => void;
}

export const ExtensionsContext = createContext<ExtensionsContextType>({
  plugins: [],
  setPlugins: noop,
  setActiveId: noop,
});

const Extensions = () => {
  const { t } = useTranslation();
  const [apps, setApps] = useState<IApplication[]>([]);
  const [disabled, setDisabled] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string>();

  useMount(async () => {
    const disabled = await platformAdapter.invokeBackend<string[]>(
      "get_disabled_local_query_sources"
    );

    setDisabled(disabled);
  });

  const loadApps = async () => {
    const apps = await platformAdapter.invokeBackend<IApplication[]>(
      "get_app_list"
    );

    const sortedApps = apps.sort((a, b) => {
      return a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      });
    });

    setApps(sortedApps);
  };

  const presetPlugins = useMemo<Plugin[]>(() => {
    const plugins: Plugin[] = [
      {
        id: "Applications",
        icon: <Folder />,
        name: t("settings.extensions.application.title"),
        type: "Group",
        detail: <ApplicationsDetail />,
        children: [],
        manualLoad: true,
        loadChildren: loadApps,
      },
      {
        id: "Calculator",
        icon: <Calculator />,
        name: t("settings.extensions.calculator.title"),
      },
    ];

    if (apps.length > 0) {
      for (const app of apps) {
        const { path, iconPath, isDisabled } = app;

        plugins[0].children?.push({
          ...app,
          id: path,
          type: "Application",
          icon: (
            <img
              src={platformAdapter.convertFileSrc(iconPath)}
              className="size-5"
            />
          ),
          enabled: !isDisabled,
          detail: <Application />,
          onAliasChange(alias) {
            platformAdapter.invokeBackend("set_app_alias", {
              appPath: path,
              alias,
            });

            const nextApps = apps.map((item) => {
              if (item.path !== path) return item;

              return { ...item, alias };
            });

            setApps(nextApps);
          },
          onHotkeyChange(hotkey) {
            const command = `${hotkey ? "register" : "unregister"}_app_hotkey`;

            platformAdapter.invokeBackend(command, {
              appPath: path,
              hotkey,
            });

            const nextApps = apps.map((item) => {
              if (item.path !== path) return item;

              return { ...item, hotkey };
            });

            setApps(nextApps);
          },
          onEnabledChange(enabled) {
            const command = `${enabled ? "enable" : "disable"}_app_search`;

            platformAdapter.invokeBackend(command, {
              appPath: path,
            });

            const nextApps = apps.map((item) => {
              if (item.path !== path) return item;

              return { ...item, isDisabled: !enabled };
            });

            setApps(nextApps);
          },
        });
      }
    }

    return plugins;
  }, [apps]);

  const [plugins, setPlugins] = useState<Plugin[]>(presetPlugins);

  useEffect(() => {
    setPlugins(presetPlugins);
  }, [presetPlugins]);

  useEffect(() => {
    setPlugins((prevPlugins) => {
      return prevPlugins.map((item) => {
        if (disabled.includes(item.id)) {
          return { ...item, enabled: false };
        }

        return item;
      });
    });
  }, [disabled]);

  return (
    <ExtensionsContext.Provider
      value={{
        plugins,
        setPlugins,
        activeId,
        setActiveId,
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

              <div className="w-3/5 flex">
                <div className="flex-1">
                  {t("settings.extensions.list.type")}
                </div>
                <div className="flex-1">
                  {t("settings.extensions.list.alias")}
                </div>
                <div className="flex-1">
                  {t("settings.extensions.list.hotkey")}
                </div>
                <div className="flex-1 text-right">
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
