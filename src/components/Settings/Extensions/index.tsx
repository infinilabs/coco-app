import {
  createContext,
  ReactElement,
  ReactNode,
  useMemo,
  useState,
} from "react";
import { Folder } from "lucide-react";
import { noop } from "lodash-es";

import Accordion from "./components/Accordion";
import ApplicationsContent from "./components/Content/Applications";
import ApplicationsDetail from "./components/Details/Applications";
import { useApplicationsStore } from "@/stores/applicationsStore";
import Application from "./components/Details/Application";
import { useTranslation } from "react-i18next";

export interface Plugin {
  id: string;
  icon: ReactElement;
  title: ReactNode;
  type?: "Group" | "Extension";
  alias?: string;
  hotKey?: string;
  enabled?: boolean;
  content?: ReactNode;
  detail?: ReactNode;
}

interface ExtensionsContextType {
  activeId?: string;
  setActiveId: (id: string) => void;
}

export const ExtensionsContext = createContext<ExtensionsContextType>({
  setActiveId: noop,
});

const Extensions = () => {
  const { t } = useTranslation();

  const allApps = useApplicationsStore((state) => {
    return state.allApps;
  });

  const presetPlugins: Plugin[] = [
    {
      id: "1",
      icon: <Folder />,
      title: t("settings.extensions.application.title"),
      type: "Group",
      content: <ApplicationsContent />,
      detail: <ApplicationsDetail />,
    },
    // {
    //   id: "2",
    //   icon: <File />,
    //   title: "File Search",
    // },
  ];

  const plugins: Plugin[] = [...presetPlugins];

  const [activeId, setActiveId] = useState(plugins[0].id);

  const currentPlugin = useMemo(() => {
    return plugins.find((plugin) => plugin.id === activeId);
  }, [activeId, plugins]);

  const currentApp = useMemo(() => {
    return allApps.find((app) => {
      return app.name === activeId;
    });
  }, [activeId, allApps]);

  return (
    <ExtensionsContext.Provider
      value={{
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
              <div className="w-[220px]">
                {t("settings.extensions.list.name")}
              </div>

              <div className="flex flex-1">
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

            {plugins.map((item) => {
              return <Accordion {...item} key={item.id} />;
            })}
          </div>
        </div>

        <div className="flex-1 h-full overflow-auto">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {currentPlugin?.title}

            {currentApp?.name}
          </h2>

          {currentPlugin?.detail}

          {currentApp && <Application current={currentApp} />}
        </div>
      </div>
    </ExtensionsContext.Provider>
  );
};

export default Extensions;
