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
import { useApplicationsStore } from "@/stores/applications";
import Application from "./components/Details/Application";

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
  const allApps = useApplicationsStore((state) => {
    return state.allApps;
  });

  const presetPlugins: Plugin[] = [
    {
      id: "1",
      icon: <Folder />,
      title: "Applications",
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

  console.log("currentPlugin", currentPlugin);

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
            Extensions
          </h2>

          <div>
            <div className="flex">
              <div className="w-[220px]">Name</div>

              <div className="flex flex-1">
                <div className="flex-1">Type</div>
                <div className="flex-1">Alias</div>
                <div className="flex-1">Hotkey</div>
                <div className="flex-1 text-right">Enabled</div>
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
