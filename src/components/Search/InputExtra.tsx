import { Fragment, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, Plus } from "lucide-react";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import { castArray, find, isNil } from "lodash-es";
import { nanoid } from "nanoid";
import { useCreation, useKeyPress, useMount, useReactive } from "ahooks";

import { useChatStore } from "@/stores/chatStore";
import { useAppStore } from "@/stores/appStore";
import Tooltip from "@/components/Common/Tooltip";
import { useShortcutsStore } from "@/stores/shortcutsStore";
import clsx from "clsx";

interface State {
  screenRecordingPermission?: boolean;
  screenshotableMonitors: any[];
  screenshotableWindows: any[];
}

interface MenuItem {
  id?: number;
  label?: string;
  groupName?: string;
  groupItems?: MenuItem[];
  children?: MenuItem[];
  clickEvent?: (event: MouseEvent) => void;
}

interface InputExtraProps {
  checkScreenPermission: () => Promise<boolean>;
  requestScreenPermission: () => void;
  getScreenMonitors: () => Promise<any[]>;
  getScreenWindows: () => Promise<any[]>;
  captureMonitorScreenshot: (id: number) => Promise<string>;
  captureWindowScreenshot: (id: number) => Promise<string>;
  openFileDialog: (options: {
    multiple: boolean;
  }) => Promise<string | string[] | null>;
  getFileMetadata: (path: string) => Promise<any>;
  getFileIcon: (path: string, size: number) => Promise<string>;
}

const InputExtra = ({
  checkScreenPermission,
  requestScreenPermission,
  getScreenMonitors,
  getScreenWindows,
  captureMonitorScreenshot,
  captureWindowScreenshot,
  openFileDialog,
  getFileMetadata,
  getFileIcon,
}: InputExtraProps) => {
  const { t, i18n } = useTranslation();
  const uploadFiles = useChatStore((state) => state.uploadFiles);
  const setUploadFiles = useChatStore((state) => state.setUploadFiles);
  const withVisibility = useAppStore((state) => state.withVisibility);
  const modifierKey = useShortcutsStore((state) => {
    return state.modifierKey;
  });
  const addFile = useShortcutsStore((state) => {
    return state.addFile;
  });
  const modifierKeyPressed = useShortcutsStore((state) => {
    return state.modifierKeyPressed;
  });
  const addError = useAppStore((state) => state.addError);

  const state = useReactive<State>({
    screenshotableMonitors: [],
    screenshotableWindows: [],
  });

  useMount(async () => {
    state.screenRecordingPermission = await checkScreenPermission();
  });

  const handleSelectFile = async () => {
    const selectedFiles = await withVisibility(() => {
      return openFileDialog({
        multiple: true,
      });
    });

    if (isNil(selectedFiles)) return;

    handleUploadFiles(selectedFiles);
  };

  const handleUploadFiles = async (paths: string | string[]) => {
    const files: typeof uploadFiles = [];

    for await (const path of castArray(paths)) {
      if (find(uploadFiles, { path })) continue;

      const stat = await getFileMetadata(path);

      if (stat.size / 1024 / 1024 > 100) {
        addError(t("search.input.uploadFileHints.maxSize"));

        continue;
      }

      files.push({
        ...stat,
        id: nanoid(),
        path,
        icon: await getFileIcon(path, 256),
      });
    }

    setUploadFiles([...uploadFiles, ...files]);
  };

  const menuItems = useCreation<MenuItem[]>(() => {
    const menuItems: MenuItem[] = [
      {
        label: t("search.input.uploadFile"),
        clickEvent: handleSelectFile,
      },
      {
        label: t("search.input.screenshot"),
        clickEvent: async (event) => {
          if (state.screenRecordingPermission) {
            state.screenshotableMonitors = await getScreenMonitors();
            state.screenshotableWindows = await getScreenWindows();
          } else {
            event.preventDefault();

            requestScreenPermission();
          }
        },
        children: [
          {
            groupName: t("search.input.screenshotType.screen"),
            groupItems: state.screenshotableMonitors.map((item) => {
              const { id, name } = item;

              return {
                id,
                label: name,
                clickEvent: async () => {
                  const path = await captureMonitorScreenshot(id);

                  handleUploadFiles(path);
                },
              };
            }),
          },
          {
            groupName: t("search.input.screenshotType.window"),
            groupItems: state.screenshotableWindows.map((item) => {
              const { id, name } = item;

              return {
                id,
                label: name,
                clickEvent: async () => {
                  const path = await captureWindowScreenshot(id);

                  handleUploadFiles(path);
                },
              };
            }),
          },
        ],
      },
    ];

    return menuItems;
  }, [
    state.screenshotableMonitors,
    state.screenshotableWindows,
    i18n.language,
  ]);

  useKeyPress(`${modifierKey}.${addFile}`, handleSelectFile);

  return (
    <Menu>
      <MenuButton as="div" className="size-6">
        <Tooltip content={t("search.input.uploadFileHints.tooltip")}>
          <div className="size-full flex justify-center items-center rounded-lg transition hover:bg-[#EDEDED] dark:hover:bg-[#202126]">
            <Plus
              className={clsx("size-5", {
                hidden: modifierKeyPressed,
              })}
            />

            <div
              className={clsx(
                "size-4 flex items-center justify-center font-normal text-xs text-[#333] leading-[14px] bg-[#ccc] dark:bg-[#6B6B6B] rounded-md shadow-[-6px_0px_6px_2px_#fff] dark:shadow-[-6px_0px_6px_2px_#000]",
                {
                  hidden: !modifierKeyPressed,
                }
              )}
            >
              {addFile}
            </div>
          </div>
        </Tooltip>
      </MenuButton>

      <MenuItems
        anchor="bottom start"
        className="p-1 text-sm bg-white dark:bg-[#202126] rounded-lg shadow-xs border border-gray-200 dark:border-gray-700"
      >
        {menuItems.map((item) => {
          const { label, children, clickEvent } = item;

          return (
            <MenuItem key={label}>
              {children ? (
                <Popover>
                  <PopoverButton
                    className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-black/5 hover:dark:bg-white/5 rounded-lg cursor-pointer"
                    onClick={clickEvent}
                  >
                    <span>{label}</span>

                    <ChevronRight className="size-4" />
                  </PopoverButton>

                  <PopoverPanel
                    transition
                    anchor="right"
                    className="p-1 text-sm bg-white dark:bg-[#202126] rounded-lg shadow-xs border border-gray-200 dark:border-gray-700"
                  >
                    {children.map((childItem) => {
                      const { groupName, groupItems } = childItem;

                      return (
                        <Fragment key={groupName}>
                          <div
                            className="px-3 py-1 text-xs text-[#999]"
                            onClick={(event) => {
                              event.preventDefault();
                            }}
                          >
                            {groupName}
                          </div>

                          {groupItems?.map((groupItem) => {
                            const { id, label, clickEvent } = groupItem;

                            return (
                              <div
                                key={id}
                                className="px-3 py-2 hover:bg-black/5 hover:dark:bg-white/5 rounded-lg cursor-pointer"
                                onClick={clickEvent}
                              >
                                {label}
                              </div>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </PopoverPanel>
                </Popover>
              ) : (
                <div
                  className="px-3 py-2 hover:bg-black/5 hover:dark:bg-white/5 rounded-lg cursor-pointer"
                  onClick={clickEvent}
                >
                  {label}
                </div>
              )}
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
};

export default InputExtra;
