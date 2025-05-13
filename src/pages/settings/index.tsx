import { useState, useEffect } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { Settings, Puzzle, Settings2, Info, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";

import SettingsPanel from "@/components/Settings/SettingsPanel";
import GeneralSettings from "@/components/Settings/GeneralSettings";
import AboutView from "@/components/Settings/AboutView";
import Cloud from "@/components/Cloud/Cloud.tsx";
import Footer from "@/components/Common/UI/SettingsFooter";
import { useTray } from "@/hooks/useTray";
import Advanced from "@/components/Settings/Advanced";
import Extensions from "@/components/Settings/Extensions";
import { Application, useApplicationsStore } from "@/stores/applicationsStore";
import platformAdapter from "@/utils/platformAdapter";

const tabIndexMap: { [key: string]: number } = {
  general: 0,
  extensions: 1,
  connect: 2,
  advanced: 3,
  about: 4,
};

function SettingsPage() {
  const { t } = useTranslation();
  const setSearchPaths = useApplicationsStore((state) => state.setSearchPaths);
  const setAllApps = useApplicationsStore((state) => state.setAllApps);
  const allApps = useApplicationsStore((state) => state.allApps);

  useTray();

  const tabs = [
    { name: t("settings.tabs.general"), icon: Settings },
    { name: t("settings.tabs.extensions"), icon: Puzzle },
    { name: t("settings.tabs.connect"), icon: Server },
    { name: t("settings.tabs.advanced"), icon: Settings2 },
    { name: t("settings.tabs.about"), icon: Info },
  ];

  const [defaultIndex, setDefaultIndex] = useState<number>(0);

  useEffect(() => {
    const unlisten = listen("tab_index", (event) => {
      const tabName = event.payload as string;
      const index = tabIndexMap[tabName];
      if (index !== -1) {
        setDefaultIndex(index);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = defaultIndex !== 1 ? "auto" : "hidden";
  }, [defaultIndex]);

  useEffect(() => {
    const unlistenSearchSource = platformAdapter.listenEvent("search-source-loaded", async () => {
      const apps = await platformAdapter.invokeBackend<Application[]>(
        "get_app_list"
      );

      const sortedApps = apps.sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });

      setAllApps(sortedApps);

      const paths = await platformAdapter.invokeBackend<string[]>(
        "get_app_search_path"
      );

      setSearchPaths(paths);
    });

    const unlistenNewApps = platformAdapter.listenEvent("new-apps", ({ payload }) => {
      const nextApps = allApps.concat(payload).sort((a, b) => {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });

      setAllApps(nextApps);
    });

    return () => {
      unlistenSearchSource.then((fn) => fn());
      unlistenNewApps.then((fn) => fn());
    };
  }, [allApps]);

  return (
    <div>
      <div className="min-h-screen pb-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        <div className="max-w-6xl mx-auto p-4">
          {/* <div className="flex items-center justify-center mb-2">
              <h1 className="text-xl font-bold">Coco Settings</h1>
            </div> */}

          <TabGroup
            selectedIndex={defaultIndex}
            onChange={(index) => {
              setDefaultIndex(index);
            }}
          >
            <TabList className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
              {tabs.map((tab) => (
                <Tab
                  key={tab.name}
                  className={({ selected }) =>
                    `w-full rounded-lg py-2.5 text-sm font-medium leading-5
                      ${
                        selected
                          ? "bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white"
                          : "text-gray-700 dark:text-gray-400 hover:bg-white/[0.12] hover:text-gray-900 dark:hover:text-white"
                      }
                      flex items-center justify-center space-x-2 focus:outline-none`
                  }
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </Tab>
              ))}
            </TabList>

            <TabPanels className="mt-2">
              <TabPanel>
                <SettingsPanel title="">
                  <GeneralSettings />
                </SettingsPanel>
              </TabPanel>
              <TabPanel>
                <SettingsPanel title="">
                  <Extensions />
                </SettingsPanel>
              </TabPanel>
              <TabPanel>
                <Cloud />
              </TabPanel>
              <TabPanel>
                <SettingsPanel title="">
                  <Advanced />
                </SettingsPanel>
              </TabPanel>
              <TabPanel>
                <SettingsPanel title="">
                  <AboutView />
                </SettingsPanel>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default SettingsPage;
