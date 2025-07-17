import { FC, Fragment, MouseEvent, useEffect, useRef } from "react";
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
import { useConnectStore } from "@/stores/connectStore";
import { filesize } from "@/utils";

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

interface InputUploadProps {
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

const InputUpload: FC<InputUploadProps> = (props) => {
  const {
    checkScreenPermission,
    requestScreenPermission,
    getScreenMonitors,
    getScreenWindows,
    captureMonitorScreenshot,
    captureWindowScreenshot,
    openFileDialog,
    getFileMetadata,
  } = props;
  const { t, i18n } = useTranslation();
  const { uploadAttachments, setUploadAttachments } = useChatStore();
  const { withVisibility, addError } = useAppStore();
  const { modifierKey, addFile, modifierKeyPressed } = useShortcutsStore();
  const { currentAssistant } = useConnectStore();
  const uploadMaxSizeRef = useRef(1024 * 1024);
  const uploadMaxCountRef = useRef(6);

  useEffect(() => {
    if (!currentAssistant?._source?.upload) return;

    const { max_file_size_in_bytes, max_file_count } =
      currentAssistant._source.upload;

    uploadMaxSizeRef.current = max_file_size_in_bytes;

    uploadMaxCountRef.current = max_file_count;
  }, [currentAssistant]);

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
    const files: typeof uploadAttachments = [];

    for await (const path of castArray(paths)) {
      if (find(uploadAttachments, { path })) continue;

      const stat = await getFileMetadata(path);

      if (stat.size > uploadMaxSizeRef.current) {
        addError(
          t("search.input.uploadFileHints.maxSize", {
            replace: [filesize(uploadMaxSizeRef.current)],
          })
        );

        continue;
      }

      files.push({
        ...stat,
        id: nanoid(),
        path,
      });
    }

    setUploadAttachments([...uploadAttachments, ...files]);
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
      <MenuButton className="flex items-center justify-center size-[20px] rounded-md transition hover:bg-[#EDEDED] dark:hover:bg-[#202126]">
        <Tooltip
          content={t("search.input.uploadFileHints.tooltip", {
            replace: [
              uploadMaxCountRef.current,
              filesize(uploadMaxSizeRef.current),
            ],
          })}
        >
          <Plus
            className={clsx("size-3 scale-[1.3]", {
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

export default InputUpload;
