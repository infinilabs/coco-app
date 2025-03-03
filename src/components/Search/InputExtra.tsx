import { Plus } from "lucide-react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { open } from "@tauri-apps/plugin-dialog";
import { find, isNil } from "lodash-es";
import { useChatStore } from "@/stores/chatStore";
import { size, name, icon, extname } from "tauri-plugin-fs-pro-api";
import { nanoid } from "nanoid";
import Tooltip from "../Common/Tooltip";

const InputExtra = () => {
  const uploadFiles = useChatStore((state) => state.uploadFiles);
  const setUploadFiles = useChatStore((state) => state.setUploadFiles);

  const uploadFile = async () => {
    const selectedFiles = await open({
      multiple: true,
    });

    if (isNil(selectedFiles)) return;

    const files: typeof uploadFiles = [];

    for await (const path of selectedFiles) {
      if (find(uploadFiles, { path })) continue;

      const fileSize = await size(path);

      console.log(fileSize / 1024 / 1024);

      if (fileSize / 1024 / 1024 > 100) {
        continue;
      }

      files.push({
        id: nanoid(),
        path,
        name: await name(path),
        icon: await icon(path, 256),
        extname: await extname(path),
        size: fileSize,
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
          <div className="group h-5 px-2 flex justify-center items-center border rounded-[10px] transition-colors relative border-[#262727] hover:bg-[rgba(0,114,255,0.3)] hover:border-[rgba(0,114,255,0.3)]">
            <Plus className="size-3 text-[#333] dark:text-white group-hover:text-[#0072FF] hover:dark:text-[#0072FF]" />
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
