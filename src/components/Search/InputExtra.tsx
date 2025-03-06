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
import { open } from "@tauri-apps/plugin-dialog";
import { castArray, find, isNil } from "lodash-es";
import { useChatStore } from "@/stores/chatStore";
import { metadata, icon } from "tauri-plugin-fs-pro-api";
import { nanoid } from "nanoid";
import Tooltip from "../Common/Tooltip";
import { useAppStore } from "@/stores/appStore";
import { useCreation, useMount, useReactive } from "ahooks";
import {
  checkScreenRecordingPermission,
  requestScreenRecordingPermission,
} from "tauri-plugin-macos-permissions-api";
import {
  getScreenshotableMonitors,
  getScreenshotableWindows,
  ScreenshotableMonitor,
  ScreenshotableWindow,
  getMonitorScreenshot,
  getWindowScreenshot,
} from "tauri-plugin-screenshots-api";
import { Fragment, MouseEvent } from "react";

interface State {
  screenRecordingPermission?: boolean;
  screenshotableMonitors: ScreenshotableMonitor[];
  screenshotableWindows: ScreenshotableWindow[];
}

interface MenuItem {
  id?: number;
  label?: string;
  groupName?: string;
  groupItems?: MenuItem[];
  children?: MenuItem[];
  clickEvent?: (event: MouseEvent) => void;
}

const InputExtra = () => {
  const uploadFiles = useChatStore((state) => state.uploadFiles);
  const setUploadFiles = useChatStore((state) => state.setUploadFiles);
  const setIsPinned = useAppStore((state) => state.setIsPinned);

  const state = useReactive<State>({
    screenshotableMonitors: [],
    screenshotableWindows: [],
  });

  useMount(async () => {
    state.screenRecordingPermission = await checkScreenRecordingPermission();
  });

  const handleUploadFiles = async (paths: string | string[]) => {
    const files: typeof uploadFiles = [];

    for await (const path of castArray(paths)) {
      if (find(uploadFiles, { path })) continue;

      const stat = await metadata(path);

      if (stat.size / 1024 / 1024 > 100) {
        continue;
      }

      files.push({
        ...stat,
        id: nanoid(),
        path,
        icon: await icon(path, 256),
      });
    }

    setUploadFiles([...uploadFiles, ...files]);
  };

  const menuItems = useCreation<MenuItem[]>(() => {
    const menuItems: MenuItem[] = [
      {
        label: "上传文件",
        clickEvent: async () => {
          setIsPinned(true);

          const selectedFiles = await open({
            multiple: true,
          });

          setIsPinned(false);

          if (isNil(selectedFiles)) return;

          handleUploadFiles(selectedFiles);
        },
      },
      {
        label: "截取屏幕截图",
        clickEvent: async (event) => {
          if (state.screenRecordingPermission) {
            state.screenshotableMonitors = await getScreenshotableMonitors();
            state.screenshotableWindows = await getScreenshotableWindows();
          } else {
            event.preventDefault();

            requestScreenRecordingPermission();
          }
        },
        children: [
          {
            groupName: "屏幕",
            groupItems: state.screenshotableMonitors.map((item) => {
              const { id, name } = item;

              return {
                id,
                label: name,
                clickEvent: async () => {
                  const path = await getMonitorScreenshot(id);

                  handleUploadFiles(path);
                },
              };
            }),
          },
          {
            groupName: "窗口",
            groupItems: state.screenshotableWindows.map((item) => {
              const { id, name } = item;

              return {
                id,
                label: name,
                clickEvent: async () => {
                  const path = await getWindowScreenshot(id);

                  handleUploadFiles(path);
                },
              };
            }),
          },
        ],
      },
    ];

    return menuItems;
  }, [state.screenshotableMonitors, state.screenshotableWindows]);

  return (
    <Menu>
      <MenuButton>
        <Tooltip content="支持截图、上传文件，最多 50个，单个文件最大 100 MB。">
          <div className="size-6 flex justify-center items-center rounded-lg transition hover:bg-[#EDEDED] dark:hover:bg-[#202126]">
            <Plus className="size-5" />
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
