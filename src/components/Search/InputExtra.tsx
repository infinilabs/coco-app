import { Plus } from "lucide-react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { open } from "@tauri-apps/plugin-dialog";
import { find, isNil } from "lodash-es";
import { useChatStore } from "@/stores/chatStore";
import { metadata, icon } from "tauri-plugin-fs-pro-api";
import { nanoid } from "nanoid";
import Tooltip from "../Common/Tooltip";
import { useAppStore } from "@/stores/appStore";

const InputExtra = () => {
  const uploadFiles = useChatStore((state) => state.uploadFiles);
  const setUploadFiles = useChatStore((state) => state.setUploadFiles);
  const setIsPinned = useAppStore((state) => state.setIsPinned);

  const uploadFile = async () => {
    setIsPinned(true);

    const selectedFiles = await open({
      multiple: true,
    });

    setIsPinned(false);

    if (isNil(selectedFiles)) return;

    const files: typeof uploadFiles = [];

    for await (const path of selectedFiles) {
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

  const menuItems = [
    {
      label: "上传文件",
      event: uploadFile,
    },
    // {
    //   label: "截取屏幕截图",
    //   event: () => {},
    // },
  ];

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
          const { label, event } = item;

          return (
            <MenuItem key={label}>
              <div
                className="px-3 py-2 hover:bg-black/5 hover:dark:bg-white/5 rounded-lg cursor-pointer"
                onClick={event}
              >
                {label}
              </div>
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
};

export default InputExtra;
