import { cloneElement, Fragment, MouseEvent, useContext } from "react";
import { ExtensionsContext, Plugin } from "../..";
import { useReactive } from "ahooks";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";
import { isFunction } from "lodash-es";
import SettingsToggle from "@/components/Settings/SettingsToggle";
import platformAdapter from "@/utils/platformAdapter";
import Shortcut from "../Shortcut";
import SettingsInput from "@/components/Settings/SettingsInput";
import { useTranslation } from "react-i18next";

interface State {
  expands: string[];
}

const Content = () => {
  const { plugins, activeId, setPlugins, setActiveId } =
    useContext(ExtensionsContext);
  const state = useReactive<State>({
    expands: [],
  });
  const { t } = useTranslation();

  const handleExpand = (event: MouseEvent, id: string) => {
    event.stopPropagation();

    if (state.expands.includes(id)) {
      state.expands = state.expands.filter((item) => item !== id);
    } else {
      state.expands.push(id);
    }
  };

  const renderAlias = (plugin: Plugin) => {
    const { alias, onAliasChange } = plugin;

    const handleChange = (value: string) => {
      if (isFunction(onAliasChange)) {
        return onAliasChange(value);
      }
    };

    if (isFunction(onAliasChange)) {
      return (
        <div
          className="-translate-x-2"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <SettingsInput
            defaultValue={alias}
            placeholder={t("settings.extensions.hits.addAlias")}
            className="!w-[90%] !h-6 !border-transparent rounded-[4px]"
            onChange={(event) => {
              handleChange(event.target.value);
            }}
          />
        </div>
      );
    }

    return <>--</>;
  };

  const renderHotkey = (plugin: Plugin) => {
    const { hotkey, onHotkeyChange } = plugin;

    const handleChange = (value: string) => {
      if (isFunction(onHotkeyChange)) {
        return onHotkeyChange(value);
      }
    };

    if (isFunction(onHotkeyChange)) {
      return (
        <div
          className="-translate-x-2"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Shortcut
            value={hotkey}
            placeholder={t("settings.extensions.hits.recordHotkey")}
            onChange={handleChange}
          />
        </div>
      );
    }

    return <>--</>;
  };

  const renderSwitch = (plugin: Plugin) => {
    const { id, enabled = true, onEnabledChange } = plugin;

    const handleChange = (value: boolean) => {
      if (isFunction(onEnabledChange)) {
        return onEnabledChange(value);
      }

      const command = `${value ? "enable" : "disable"}_local_query_source`;

      platformAdapter.invokeBackend(command, {
        querySourceId: id,
      });

      setPlugins((prevPlugins) => {
        return prevPlugins.map((item) => {
          if (item.id === id) {
            return { ...item, enabled: value };
          }

          return item;
        });
      });
    };

    return (
      <div
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <SettingsToggle
          label={id}
          checked={Boolean(enabled)}
          className="scale-75"
          onChange={handleChange}
        />
      </div>
    );
  };

  const renderContent = (data = plugins, level = 1) => {
    return data.map((plugin) => {
      const { id, icon, name, children = [], type = "Extension" } = plugin;

      const hasChildren = children.length > 0;
      const expanded = state.expands.includes(id);

      return (
        <Fragment key={id}>
          <div
            className={clsx("-mx-2 px-2 text-sm rounded-md", {
              "bg-[#f0f6fe] dark:bg-gray-700": id === activeId,
            })}
          >
            <div
              className="flex items-center justify-between gap-2 h-8"
              onClick={() => {
                setActiveId(id);
              }}
            >
              <div
                className="flex-1 flex items-center gap-1 overflow-hidden"
                style={{ paddingLeft: (level - 1) * 20 }}
              >
                <div className="size-4">
                  <ChevronRight
                    onClick={(event) => {
                      handleExpand(event, id);
                    }}
                    className={clsx("size-full transition cursor-pointer", {
                      hidden: !hasChildren,
                      "rotate-90": expanded,
                    })}
                  />
                </div>

                {cloneElement(icon, {
                  className: clsx("size-4", icon.props.className),
                })}

                <div className="truncate">{name}</div>
              </div>

              <div className="w-3/5 flex items-center text-[#999]">
                <div className="flex-1">{type}</div>
                <div className="flex-1">{renderAlias(plugin)}</div>
                <div className="flex-1">{renderHotkey(plugin)}</div>
                <div className="flex-1 flex items-center justify-end">
                  {renderSwitch(plugin)}
                </div>
              </div>
            </div>
          </div>

          <div
            className={clsx({
              hidden: !expanded,
            })}
          >
            {renderContent(children, level + 1)}
          </div>
        </Fragment>
      );
    });
  };

  return renderContent();
};

export default Content;
