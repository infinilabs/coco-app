import { useTranslation } from "react-i18next";
import Shortcuts from "./components/Shortcuts";
import SettingsItem from "../SettingsItem";
import { AppWindowMac, MessageSquareMore, Search, Unplug } from "lucide-react";
import { useStartupStore } from "@/stores/startupStore";
import { useEffect } from "react";
import { emit } from "@tauri-apps/api/event";
import { useConnectStore } from "@/stores/connectStore";

const Advanced = () => {
  const { t } = useTranslation();
  const defaultStartupWindow = useStartupStore((state) => {
    return state.defaultStartupWindow;
  });
  const setDefaultStartupWindow = useStartupStore((state) => {
    return state.setDefaultStartupWindow;
  });
  const defaultContentForSearchWindow = useStartupStore((state) => {
    return state.defaultContentForSearchWindow;
  });
  const setDefaultContentForSearchWindow = useStartupStore((state) => {
    return state.setDefaultContentForSearchWindow;
  });
  const defaultContentForChatWindow = useStartupStore((state) => {
    return state.defaultContentForChatWindow;
  });
  const setDefaultContentForChatWindow = useStartupStore((state) => {
    return state.setDefaultContentForChatWindow;
  });
  const connectionTimeout = useConnectStore((state) => {
    return state.connectionTimeout;
  });
  const setConnectionTimeout = useConnectStore((state) => {
    return state.setConnectionTimeout;
  });

  useEffect(() => {
    const unlisten = useStartupStore.subscribe((state) => {
      emit("change-startup-store", state);
    });

    return unlisten;
  }, []);

  const startupList = [
    {
      icon: AppWindowMac,
      title: "settings.advanced.startup.defaultStartupWindow.title",
      description: "settings.advanced.startup.defaultStartupWindow.description",
      value: defaultStartupWindow,
      items: [
        {
          label:
            "settings.advanced.startup.defaultStartupWindow.select.searchMode",
          value: "searchMode",
        },
        {
          label:
            "settings.advanced.startup.defaultStartupWindow.select.chatMode",
          value: "chatMode",
        },
      ],
      onChange: setDefaultStartupWindow,
    },
    {
      icon: Search,
      title: "settings.advanced.startup.defaultContentForSearchWindow.title",
      description:
        "settings.advanced.startup.defaultContentForSearchWindow.description",
      value: defaultContentForSearchWindow,
      items: [
        {
          label:
            "settings.advanced.startup.defaultContentForSearchWindow.select.systemDefault",
          value: "systemDefault",
        },
      ],
      onChange: setDefaultContentForSearchWindow,
    },
    {
      icon: MessageSquareMore,
      title: "settings.advanced.startup.defaultContentForChatWindow.title",
      description:
        "settings.advanced.startup.defaultContentForChatWindow.description",
      value: defaultContentForChatWindow,
      items: [
        {
          label:
            "settings.advanced.startup.defaultContentForChatWindow.select.newChat",
          value: "newChat",
        },
        {
          label:
            "settings.advanced.startup.defaultContentForChatWindow.select.oldChat",
          value: "oldChat",
        },
      ],
      onChange: setDefaultContentForChatWindow,
    },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t("settings.advanced.startup.title")}
      </h2>

      <div className="space-y-6">
        {startupList.map((item) => {
          const { icon, title, description, value, items, onChange } = item;

          return (
            <SettingsItem
              key={title}
              icon={icon}
              title={t(title)}
              description={t(description)}
            >
              <select
                value={value}
                onChange={(event) => {
                  onChange(event.target.value as never);
                }}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {items.map((item) => {
                  const { label, value } = item;

                  return (
                    <option key={value} value={value}>
                      {t(label)}
                    </option>
                  );
                })}
              </select>
            </SettingsItem>
          );
        })}
      </div>

      <Shortcuts />

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t("settings.advanced.connect.title")}
      </h2>

      <div className="space-y-6">
        <SettingsItem
          icon={Unplug}
          title={t("settings.advanced.connect.connectionTimeout.title")}
          description={t(
            "settings.advanced.connect.connectionTimeout.description"
          )}
        >
          <input
            type="number"
            min={10}
            value={connectionTimeout}
            className="w-20 h-8 px-2 rounded-md border bg-transparent border-black/5 dark:border-white/10"
            onChange={(event) => {
              setConnectionTimeout(Number(event.target.value) || 120);
            }}
          />
        </SettingsItem>
      </div>
    </div>
  );
};

export default Advanced;
