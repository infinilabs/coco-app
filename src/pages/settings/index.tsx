import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Puzzle, Settings2, Info, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";

import SettingsPanel from "@/components/Settings/SettingsPanel";
import GeneralSettings from "@/components/Settings/GeneralSettings";
import AboutView from "@/components/Settings/AboutView";
import Cloud from "@/components/Cloud/Cloud";
import Footer from "@/components/Common/UI/SettingsFooter";
import { useTray } from "@/hooks/useTray";
import Advanced from "@/components/Settings/Advanced";
import Extensions from "@/components/Settings/Extensions";
import { useConnectStore } from "@/stores/connectStore";
import platformAdapter from "@/utils/platformAdapter";
import { useAppStore } from "@/stores/appStore";
import { useExtensionsStore } from "@/stores/extensionsStore";
import { useAppearanceStore } from "@/stores/appearanceStore";
import { Calendar } from "@/components/ui/calendar";

const tabValues = [
  "general",
  "extensions",
  "connect",
  "advanced",
  "about",
] as const;
type TabValue = (typeof tabValues)[number];

function SettingsPage() {
  const { t } = useTranslation();
  const { setConfigId } = useExtensionsStore();

  useTray();

  const tabs: { name: string; icon: any; value: TabValue }[] = [
    { name: t("settings.tabs.general"), icon: Settings, value: "general" },
    { name: t("settings.tabs.extensions"), icon: Puzzle, value: "extensions" },
    { name: t("settings.tabs.connect"), icon: Server, value: "connect" },
    { name: t("settings.tabs.advanced"), icon: Settings2, value: "advanced" },
    { name: t("settings.tabs.about"), icon: Info, value: "about" },
  ];

  const [selectedTab, setSelectedTab] = useState<TabValue>("general");

  useEffect(() => {
    const unlisten = listen("tab_index", (event) => {
      const tabName = event.payload as TabValue;
      if (tabValues.includes(tabName)) {
        setSelectedTab(tabName);
      }
    });

    const unsubscribeConnect = useConnectStore.subscribe((state) => {
      platformAdapter.emitEvent("change-connect-store", state);
    });

    const unsubscribeAppStore = useAppStore.subscribe((state) => {
      platformAdapter.emitEvent("change-app-store", state);
    });

    const unsubscribeAppearanceStore = useAppearanceStore.subscribe((state) => {
      platformAdapter.emitEvent("change-appearance-store", state);
    });

    const unlisten2 = platformAdapter.listenEvent(
      "config-extension",
      ({ payload }) => {
        platformAdapter.showWindow();
        setSelectedTab("extensions");
        setConfigId(payload);
      }
    );

    return () => {
      unsubscribeConnect();
      unsubscribeAppStore();
      unsubscribeAppearanceStore();
      unlisten.then((fn) => fn());
      unlisten2.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow =
      selectedTab === "extensions" ? "hidden" : "auto";
  }, [selectedTab]);

  return (
    <>
      <Calendar mode="range" numberOfMonths={2} />

      <div className="min-h-screen pb-8 bg-background text-foreground">
        <div className="max-w-6xl mx-auto p-4">
          <Tabs
            value={selectedTab}
            onValueChange={(v) => setSelectedTab(v as TabValue)}
          >
            <TabsList className="flex h-10 rounded-xl">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 gap-2 h-full"
                >
                  <tab.icon className="size-4" />

                  <span>{tab.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="general">
              <SettingsPanel title="">
                <GeneralSettings />
              </SettingsPanel>
            </TabsContent>
            <TabsContent value="extensions">
              <SettingsPanel title="">
                <Extensions />
              </SettingsPanel>
            </TabsContent>
            <TabsContent value="connect">
              <Cloud />
            </TabsContent>
            <TabsContent value="advanced">
              <SettingsPanel title="">
                <Advanced />
              </SettingsPanel>
            </TabsContent>
            <TabsContent value="about">
              <SettingsPanel title="">
                <AboutView />
              </SettingsPanel>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default SettingsPage;
