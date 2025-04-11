import platformAdapter from "@/utils/platformAdapter";
import { Button } from "@headlessui/react";
import { open } from "@tauri-apps/plugin-shell";
import { Folder, SquareArrowOutUpRight, X } from "lucide-react";

const Applications = () => {
  const directories = ["/Applications", "/System/Applications"];

  const selectDirectory = async () => {
    await platformAdapter.openFileDialog({ directory: true });
  };

  return (
    <div className="text-sm">
      <div className="text-[#999]">
        <p>Application Hotkey Behavior</p>
        <p>Toggle Application Visibility On Hotkey</p>
        <p>Search Scope</p>
        <p>Directories added here will be searched</p>
        <p>for applications and preference panes</p>
      </div>

      <Button
        className="w-full h-8 my-4 text-[#0087FF] border border-[#EEF0F3] hover:border-[#0087FF] rounded-md transition"
        onClick={selectDirectory}
      >
        Add Directories
      </Button>

      <ul className="flex flex-col gap-2">
        {directories.map((item) => {
          return (
            <li key={item} className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Folder className="size-4" />

                <span>{item}</span>
              </div>

              <div className="flex items-center gap-1">
                <SquareArrowOutUpRight className="size-4 cursor-pointer" />

                <X className="size-4 cursor-pointer" />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Applications;
