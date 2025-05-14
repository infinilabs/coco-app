import {
  cloneElement,
  FC,
  Fragment,
  MouseEvent,
  useContext,
  useState,
} from "react";
import { ExtensionsContext, Plugin } from "../..";
import { useMount } from "ahooks";
import { ChevronRight, LoaderCircle } from "lucide-react";
import clsx from "clsx";
import { isArray, isFunction } from "lodash-es";
import SettingsToggle from "@/components/Settings/SettingsToggle";
import platformAdapter from "@/utils/platformAdapter";
import Shortcut from "../Shortcut";
import SettingsInput from "@/components/Settings/SettingsInput";
import { useTranslation } from "react-i18next";

const Content = () => {
  const { plugins } = useContext(ExtensionsContext);

  return plugins.map((item) => {
    return <Item key={item.id} {...item} level={1} />;
  });
};

const Item: FC<Plugin & { level: number }> = (props) => {
  const {
    id,
    icon,
    name,
    children,
    type = "Extension",
    manualLoad,
    level = 1,
  } = props;
  const { activeId, setActiveId, setPlugins } = useContext(ExtensionsContext);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const hasChildren = isArray(children);

  const handleLoadChildren = async () => {
    setLoading(true);

    await props.loadChildren?.();

    setLoading(false);
  };

  useMount(async () => {
    if (!manualLoad) {
      handleLoadChildren();
    }
  });

  const handleExpand = async (event: MouseEvent) => {
    event?.stopPropagation();

    if (expanded) {
      setExpanded(false);
    } else {
      if (manualLoad) {
        await handleLoadChildren();
      }

      setExpanded(true);
    }
  };

  const renderAlias = () => {
    const { alias, onAliasChange } = props;

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
            onChange={(value) => {
              handleChange(String(value));
            }}
          />
        </div>
      );
    }

    return <>--</>;
  };

  const renderHotkey = () => {
    const { hotkey, onHotkeyChange } = props;

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

  const renderSwitch = () => {
    const { enabled = true, onEnabledChange } = props;

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
            <div className="min-w-4 h-4">
              {hasChildren && (
                <>
                  {loading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <ChevronRight
                      onClick={handleExpand}
                      className={clsx("size-4 transition cursor-pointer", {
                        "rotate-90": expanded,
                      })}
                    />
                  )}
                </>
              )}
            </div>

            {cloneElement(icon, {
              className: clsx("size-4", icon.props.className),
            })}

            <div className="truncate">{name}</div>
          </div>

          <div className="w-3/5 flex items-center text-[#999]">
            <div className="flex-1">{type}</div>
            <div className="flex-1">{renderAlias()}</div>
            <div className="flex-1">{renderHotkey()}</div>
            <div className="flex-1 flex items-center justify-end">
              {renderSwitch()}
            </div>
          </div>
        </div>
      </div>

      {hasChildren && (
        <div
          className={clsx({
            hidden: !expanded,
          })}
        >
          {children.map((item) => {
            return <Item key={item.id} {...item} level={level + 1} />;
          })}
        </div>
      )}
    </Fragment>
  );
};

export default Content;
