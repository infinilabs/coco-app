import { useContext, useMemo, useState } from "react";
import { filesize } from "filesize";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useAsyncEffect } from "ahooks";
import platformAdapter from "@/utils/platformAdapter";
import { ExtensionsContext, Plugin, type ExtensionsContextType } from "../../../index";

interface Metadata {
  name: string;
  where: string;
  size: number;
  created: number;
  modified: number;
  lastOpened: number;
}

const App = () => {
  const { t } = useTranslation();
  const { activeId, plugins } = useContext(ExtensionsContext) as ExtensionsContextType;

  const [appMetadata, setAppMetadata] = useState<Metadata>();

  const findPlugin = (plugins: Plugin[], id: string) => {
    for (const plugin of plugins) {
      const { children = [] } = plugin;

      if (plugin.id === id) {
        return plugin;
      }

      if (children.length > 0) {
        const matched = findPlugin(children, id) as Plugin;

        if (!matched) continue;

        return matched;
      }
    }
  };

  const currentPlugin = useMemo(() => {
    if (!activeId) return;
    return findPlugin(plugins, activeId);
  }, [activeId, plugins]);

  useAsyncEffect(async () => {
    if (!activeId || !currentPlugin) return;

    const appMetadata = await platformAdapter.invokeBackend<Metadata>(
      "get_app_metadata",
      {
        appName: currentPlugin.name,
        appPath: activeId
      }
    );

    setAppMetadata(appMetadata);
  }, [activeId, currentPlugin]);

  const metadata = useMemo(() => {
    if (!appMetadata) return [];

    const { name, where, size, created, modified, lastOpened } = appMetadata;

    return [
      {
        label: t("settings.extensions.application.details.name"),
        value: name,
      },
      {
        label: t("settings.extensions.application.details.where"),
        value: where,
      },
      {
        label: t("settings.extensions.application.details.type"),
        value: t("settings.extensions.application.details.typeValue"),
      },
      {
        label: t("settings.extensions.application.details.size"),
        value: filesize(size, { standard: "jedec", spacer: "" }),
      },
      {
        label: t("settings.extensions.application.details.created"),
        value: dayjs(created).format("YYYY/MM/DD HH:mm:ss"),
      },
      {
        label: t("settings.extensions.application.details.modified"),
        value: dayjs(modified).format("YYYY/MM/DD HH:mm:ss"),
      },
      {
        label: t("settings.extensions.application.details.lastOpened"),
        value: dayjs(lastOpened).format("YYYY/MM/DD HH:mm:ss"),
      },
    ];
  }, [appMetadata]);

  return (
    <ul className="flex flex-col gap-2 p-0">
      {metadata.map((item) => {
        const { label, value } = item;

        return (
          <li
            key={label}
            className="flex items-center justify-between gap-2 text-[13px]"
          >
            <span className="opacity-70">{label}</span>
            <span className="truncate max-w-[240px]">{value}</span>
          </li>
        );
      })}
    </ul>
  );
};

export default App;
