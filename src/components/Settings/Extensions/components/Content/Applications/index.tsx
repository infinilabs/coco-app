import SettingsToggle from "@/components/Settings/SettingsToggle";
import { Application, useApplicationsStore } from "@/stores/applicationsStore";
import platformAdapter from "@/utils/platformAdapter";
import { useContext } from "react";
import { ExtensionsContext } from "../../..";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { useDebounceFn } from "ahooks";
import SettingsInput from "@/components/Settings/SettingsInput";
import Shortcut from "../../Shortcut";

const Applications = () => {
  const { t } = useTranslation();
  const { activeId, setActiveId } = useContext(ExtensionsContext);

  const allApps = useApplicationsStore((state) => state.allApps);
  const setAllApps = useApplicationsStore((state) => state.setAllApps);

  const handleDisable = (app: Application) => {
    const { path, isDisabled } = app;

    const nextApps = allApps.map((item) => {
      if (item.path !== path) return item;

      return { ...item, isDisabled: !isDisabled };
    });
    setAllApps(nextApps);

    if (isDisabled) {
      platformAdapter.invokeBackend("enable_app_search", {
        appPath: path,
      });
    } else {
      platformAdapter.invokeBackend("disable_app_search", {
        appPath: path,
      });
    }
  };

  const { run: handleAlias } = useDebounceFn(
    (app: Application, alias: string) => {
      const { path } = app;

      platformAdapter.invokeBackend("set_app_alias", {
        appPath: path,
        alias,
      });

      const nextApps = allApps.map((item) => {
        if (item.path !== path) return item;

        return { ...item, alias };
      });

      setAllApps(nextApps);
    }
  );

  const handleHotkey = (app: Application, hotkey: string) => {
    const { path } = app;

    if (hotkey) {
      platformAdapter.invokeBackend("register_app_hotkey", {
        appPath: path,
        hotkey,
      });
    } else {
      platformAdapter.invokeBackend("unregister_app_hotkey", {
        appPath: path,
      });
    }

    const nextApps = allApps.map((item) => {
      if (item.path !== path) return item;

      return { ...item, hotkey };
    });

    setAllApps(nextApps);
  };

  return allApps.map((app) => {
    const { name, path, iconPath, isDisabled, alias, hotkey } = app;

    return (
      <div
        key={path}
        className={clsx("flex items-center h-8 -mx-2 pl-10 pr-2 rounded-md", {
          "bg-[#f0f6fe] dark:bg-gray-700": path === activeId,
        })}
        onClick={() => {
          setActiveId(path);
        }}
      >
        <div className="flex items-center gap-1 w-[180px] pr-2 overflow-hidden">
          <img
            src={platformAdapter.convertFileSrc(iconPath)}
            className="size-5"
          />

          <span className="text-sm truncate">{name}</span>
        </div>

        <div className="flex-1 flex items-center text-[#999] ">
          <div className="flex-1">
            {t("settings.extensions.application.title")}
          </div>
          <div
            className="flex-1"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <SettingsInput
              defaultValue={alias}
              placeholder={t("settings.extensions.application.hits.addAlias")}
              className="!w-[90%] !h-6 border-transparent rounded-[4px]"
              onChange={(event) => {
                handleAlias(app, event.target.value);
              }}
            />
          </div>
          <div
            className="flex-1"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <Shortcut
              value={hotkey}
              placeholder={t(
                "settings.extensions.application.hits.recordHotkey"
              )}
              onChange={(value) => {
                handleHotkey(app, value);
              }}
            />
          </div>
          <div className="flex-1 flex items-center justify-end">
            <SettingsToggle
              label=""
              checked={!isDisabled}
              className="scale-75"
              onChange={() => handleDisable(app)}
            />
          </div>
        </div>
      </div>
    );
  });
};

export default Applications;
