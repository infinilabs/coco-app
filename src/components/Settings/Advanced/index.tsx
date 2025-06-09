import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  AppWindowMac,
  MessageSquareMore,
  Search,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { useMount } from "ahooks";

import Shortcuts from "./components/Shortcuts";
import SettingsItem from "../SettingsItem";
import { useStartupStore } from "@/stores/startupStore";
import { useConnectStore } from "@/stores/connectStore";
import Appearance from "./components/Appearance";
import SettingsInput from "../SettingsInput";
import platformAdapter from "@/utils/platformAdapter";
import UpdateSettings from "./components/UpdateSettings";
import SettingsToggle from "../SettingsToggle";

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
  const queryTimeout = useConnectStore((state) => {
    return state.querySourceTimeout;
  });
  const setQueryTimeout = useConnectStore((state) => {
    return state.setQuerySourceTimeout;
  });
  const allowSelfSignature = useConnectStore((state) => {
    return state.allowSelfSignature;
  });
  const setAllowSelfSignature = useConnectStore((state) => {
    return state.setAllowSelfSignature;
  });

  useMount(async () => {
    const allowSelfSignature = await platformAdapter.invokeBackend<boolean>(
      "get_allow_self_signature"
    );

    setAllowSelfSignature(allowSelfSignature);
  });

  useEffect(() => {
    const unsubscribeStartup = useStartupStore.subscribe((state) => {
      platformAdapter.emitEvent("change-startup-store", state);
    });

    return () => {
      unsubscribeStartup();
    };
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
          <SettingsInput
            type="number"
            min={10}
            value={connectionTimeout}
            onChange={(value) => {
              setConnectionTimeout(!value ? void 0 : Number(value));
            }}
          />
        </SettingsItem>

        <SettingsItem
          icon={Unplug}
          title={t("settings.advanced.connect.queryTimeout.title")}
          description={t("settings.advanced.connect.queryTimeout.description")}
        >
          <SettingsInput
            type="number"
            min={1}
            value={queryTimeout}
            onChange={(value) => {
              setQueryTimeout(!value ? void 0 : Number(value));
            }}
          />
        </SettingsItem>

        <SettingsItem
          icon={ShieldCheck}
          title={t("settings.advanced.connect.allowSelfSignature.title")}
          description={t(
            "settings.advanced.connect.allowSelfSignature.description"
          )}
        >
          <SettingsToggle
            label={t("settings.advanced.connect.allowSelfSignature.title")}
            checked={allowSelfSignature}
            onChange={(value) => {
              setAllowSelfSignature(value);

              platformAdapter.invokeBackend("set_allow_self_signature", {
                value,
              });
            }}
          />
        </SettingsItem>
      </div>

      <Appearance />

      <UpdateSettings />
    </div>
  );
};

export default Advanced;
