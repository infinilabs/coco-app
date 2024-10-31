import { createContext, useContext, useState } from "react";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { Settings, Puzzle, User, Users, Settings2, Info } from "lucide-react";

import SettingsPanel from "./SettingsPanel";
import GeneralSettings from "./GeneralSettings";
import Footer from "../Footer";

export type Theme = "light" | "dark" | "system";

export const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: "system",
  setTheme: () => {},
});

function SettingsPage() {
  const [theme, setTheme] = useState<Theme>("system");

  const tabs = [
    { name: "General", icon: Settings },
    { name: "Extensions", icon: Puzzle },
    { name: "Account", icon: User },
    { name: "Organizations", icon: Users },
    { name: "Advanced", icon: Settings2 },
    { name: "About", icon: Info },
  ];

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={theme}>
        <div className="min-h-screen pb-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
          <div className="max-w-6xl mx-auto p-4">
            {/* <div className="flex items-center justify-center mb-2">
              <h1 className="text-xl font-bold">Coco Settings</h1>
            </div> */}

            <TabGroup>
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

              <TabPanels className="mt-6">
                <TabPanel>
                  <SettingsPanel title="">
                    <GeneralSettings theme={theme} setTheme={setTheme} />
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
                  <SettingsPanel title="">
                    <div className="text-gray-600 dark:text-gray-400">
                      Account settings content
                    </div>
                  </SettingsPanel>
                </TabPanel>
                <TabPanel>
                  <SettingsPanel title="">
                    <div className="text-gray-600 dark:text-gray-400">
                      Organizations settings content
                    </div>
                  </SettingsPanel>
                </TabPanel>
                <TabPanel>
                  <SettingsPanel title="">
                    <div className="text-gray-600 dark:text-gray-400">
                      Advanced settings content
                    </div>
                  </SettingsPanel>
                </TabPanel>
                <TabPanel>
                  <SettingsPanel title="">
                    <div className="text-gray-600 dark:text-gray-400">
                      About settings content
                    </div>
                  </SettingsPanel>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </div>
        </div>
      </div>
      <Footer />
    </ThemeContext.Provider>
  );
}

export function ThemeOption({
  icon: Icon,
  title,
  theme,
}: {
  icon: any;
  title: string;
  theme: Theme;
}) {
  const { theme: currentTheme, setTheme } = useContext(ThemeContext);
  const isSelected = currentTheme === theme;

  return (
    <button
      onClick={() => setTheme(theme)}
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
