import { useEffect, useState } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { Settings, Puzzle, Settings2, Info, Server } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import SettingsPanel from "./SettingsPanel";
import GeneralSettings from "./GeneralSettings";
import AboutView from "./AboutView";
import CocoCloud from "@/components/Auth/CocoCloud"
import Footer from "../Footer";
import { useTheme } from "../../contexts/ThemeContext";
import { AppTheme } from "../../utils/tauri";
import ApiDetails from "@/components/AppAI/ApiDetails";

function SettingsPage() {
  const [defaultIndex, setDefaultIndex] = useState<number>(0);

  const [searchParams] = useSearchParams();
  const name = searchParams.get("tab");

  useEffect(() => {
    setDefaultIndex(name === "about" ? 5 : 0);
  }, [name]);

  const tabs = [
    { name: "General", icon: Settings },
    { name: "Extensions", icon: Puzzle },
    { name: "Connect", icon: Server },
    { name: "Advanced", icon: Settings2 },
    { name: "About", icon: Info },
  ];

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
                  <div className="text-gray-600 dark:text-gray-400">
                    Extensions settings content
                  </div>
                </SettingsPanel>
              </TabPanel>
              <TabPanel>
                <CocoCloud />
              </TabPanel>
              <TabPanel>
                <SettingsPanel title="">
                  <div className="text-gray-600 dark:text-gray-400">
                    Advanced Settings content
                  </div>
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

      <ApiDetails />
    </div>
  );
}

export function ThemeOption({
  icon: Icon,
  title,
  theme,
}: {
  icon: any;
  title: string;
  theme: AppTheme;
}) {
  const { theme: currentTheme, changeTheme } = useTheme();

  const isSelected = currentTheme === theme;

  return (
    <button
      onClick={() => changeTheme(theme)}
      className={`p-4 rounded-lg border-2 ${
        isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      } flex flex-col items-center justify-center space-y-2 transition-all`}
    >
      <Icon className={`w-6 h-6 ${isSelected ? "text-blue-500" : ""}`} />
      <span
        className={`text-sm font-medium ${isSelected ? "text-blue-500" : ""}`}
      >
        {title}
      </span>
    </button>
  );
}

export default SettingsPage;
