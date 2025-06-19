import { FC, MouseEvent, useContext, useMemo, useState } from "react";
import { Extension, ExtensionId, ExtensionsContext } from "../..";
import { useReactive } from "ahooks";
import { ChevronRight, LoaderCircle } from "lucide-react";
import clsx from "clsx";
import { isArray, startCase, sortBy } from "lodash-es";
import platformAdapter from "@/utils/platformAdapter";
import FontIcon from "@/components/Common/Icons/FontIcon";
import SettingsInput from "@/components/Settings/SettingsInput";
import { useTranslation } from "react-i18next";
import Shortcut from "../Shortcut";
import SettingsToggle from "@/components/Settings/SettingsToggle";
import { platform } from "@/utils/platform";
import { useExtensionsStore } from "@/stores/extensionsStore";

const Content = () => {
  const { rootState } = useContext(ExtensionsContext);

  return rootState.extensions.map((item) => {
    const { id } = item;

    return <Item key={id} {...item} level={1} />;
  });
};

interface ItemProps extends Extension {
  level: number;
  parentId?: ExtensionId;
  parentDeveloper?: string;
  parentDisabled?: boolean;
}

interface ItemState {
  loading: boolean;
  expanded: boolean;
  subExtensions?: Extension[];
}

const subExtensionCommand: Partial<Record<ExtensionId, string>> = {
  Applications: "get_app_list",
};

const Item: FC<ItemProps> = (props) => {
  const {
    id,
    icon,
    title,
    type,
    level,
    platforms,
    developer,
    enabled,
    parentId,
    parentDeveloper,
    parentDisabled,
  } = props;
  const { rootState } = useContext(ExtensionsContext);
  const state = useReactive<ItemState>({
    loading: false,
    expanded: false,
  });
  const { t } = useTranslation();
  const { disabledExtensions, setDisabledExtensions } = useExtensionsStore();
  const [selfDisabled, setSelfDisabled] = useState(!enabled);

  const bundleId = {
    developer: developer ?? parentDeveloper,
    extension_id: level === 1 ? id : parentId,
    sub_extension_id: level === 1 ? void 0 : id,
  };

  const hasSubExtensions = () => {
    const { commands, scripts, quicklinks } = props;

    if (subExtensionCommand[id]) {
      return true;
    }

    if (isArray(commands) || isArray(scripts) || isArray(quicklinks)) {
      return true;
    }

    return false;
  };

  const getSubExtensions = async () => {
    state.loading = true;

    const { commands, scripts, quicklinks } = props;

    let subExtensions: Extension[] = [];

    const command = subExtensionCommand[id];

    if (command) {
      subExtensions = await platformAdapter.invokeBackend<Extension[]>(command);
    } else {
      subExtensions = [commands, scripts, quicklinks].filter(isArray).flat();
    }

    state.loading = false;

    return sortBy(subExtensions, ["title"]);
  };

  const handleExpand = async (event: MouseEvent) => {
    event?.stopPropagation();

    if (state.expanded) {
      state.expanded = false;
    } else {
      state.subExtensions = await getSubExtensions();

      state.expanded = true;
    }
  };

  const isDisabled = useMemo(() => {
    if (level === 1) {
      return selfDisabled;
    }

    return parentDisabled || selfDisabled;
  }, [parentDisabled, selfDisabled]);

  const editable = useMemo(() => {
    return (
      type !== "group" &&
      type !== "calculator" &&
      type !== "extension" &&
      type !== "ai_extension"
    );
  }, [type]);

  const renderAlias = () => {
    const { alias } = props;

    const handleChange = (value: string) => {
      platformAdapter.invokeBackend("set_extension_alias", {
        bundleId,
        alias: value,
      });
    };

    return (
      <div
        className={clsx({
          "opacity-50 pointer-events-none": isDisabled,
        })}
      >
        {editable ? (
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
        ) : (
          <>--</>
        )}
      </div>
    );
  };

  const renderHotkey = () => {
    const { hotkey } = props;

    const handleChange = (value: string) => {
      if (value) {
        platformAdapter.invokeBackend("register_extension_hotkey", {
          bundleId,
          hotkey: value,
        });
      } else {
        platformAdapter.invokeBackend("unregister_extension_hotkey", {
          bundleId,
        });
      }
    };

    return (
      <div
        className={clsx({
          "opacity-50 pointer-events-none": isDisabled,
        })}
      >
        {editable ? (
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
        ) : (
          <>--</>
        )}
      </div>
    );
  };

  const renderSwitch = () => {
    const handleChange = (value: boolean) => {
      if (value) {
        setDisabledExtensions(disabledExtensions.filter((item) => item !== id));

        platformAdapter.invokeBackend("enable_extension", {
          bundleId,
        });
      } else {
        setDisabledExtensions([...disabledExtensions, id]);

        platformAdapter.invokeBackend("disable_extension", {
          bundleId,
        });
      }

      setSelfDisabled(!value);

      if (level === 1) {
        const matched = rootState.extensions.find((item) => {
          return item.id === id;
        });

        if (matched) {
          matched.enabled = value;
        }
      }
    };

    return (
      <div
        className={clsx("flex items-center justify-end", {
          "opacity-50 pointer-events-none": parentDisabled,
        })}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <SettingsToggle
          label={id}
          defaultChecked={enabled}
          className="scale-75"
          onChange={handleChange}
        />
      </div>
    );
  };

  const renderType = () => {
    return (
      <div
        className={clsx({
          "opacity-50 pointer-events-none": isDisabled,
        })}
      >
        {type === "ai_extension" ? "AI Extension" : startCase(type)}
      </div>
    );
  };

  const renderContent = () => {
    if (isArray(platforms)) {
      const currentPlatform = platform();

      if (currentPlatform && !platforms.includes(currentPlatform)) {
        return;
      }
    }

    return (
      <>
        <div
          className={clsx("-mx-2 px-2 text-sm rounded-md", {
            "bg-[#f0f6fe] dark:bg-gray-700":
              id === rootState.activeExtension?.id,
          })}
        >
          <div
            className="flex items-center justify-between gap-2 h-8"
            onClick={() => {
              rootState.activeExtension = props;
            }}
          >
            <div
              className="flex-1 flex items-center gap-1 overflow-hidden"
              style={{ paddingLeft: (level - 1) * 20 }}
            >
              <div className="min-w-4 h-4">
                {hasSubExtensions() && (
                  <>
                    {state.loading ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <ChevronRight
                        onClick={handleExpand}
                        className={clsx("size-4 transition cursor-pointer", {
                          "rotate-90": state.expanded,
                        })}
                      />
                    )}
                  </>
                )}
              </div>

              <div
                className={clsx("size-4", {
                  "opacity-50 pointer-events-none": isDisabled,
                })}
              >
                {icon.startsWith("font_") ? (
                  <FontIcon name={icon} className="size-full" />
                ) : (
                  <img
                    src={platformAdapter.convertFileSrc(icon)}
                    className="size-full"
                  />
                )}
              </div>

              <div
                className={clsx("truncate", {
                  "opacity-50 pointer-events-none": isDisabled,
                })}
              >
                {title}
              </div>
            </div>

            <div className="w-4/6 flex items-center text-[#999]">
              <div className="flex-1">{renderType()}</div>
              <div className="flex-1">{renderAlias()}</div>
              <div className="flex-1">{renderHotkey()}</div>
              <div className="w-16">{renderSwitch()}</div>
            </div>
          </div>
        </div>

        <div className={clsx({ hidden: !state.expanded })}>
          {state.subExtensions?.map((item) => {
            return (
              <Item
                key={item.id}
                {...item}
                level={level + 1}
                parentId={id}
                parentDeveloper={developer}
                parentDisabled={!enabled}
              />
            );
          })}
        </div>
      </>
    );
  };

  return renderContent();
};

export default Content;
