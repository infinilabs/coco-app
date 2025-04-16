import SettingsToggle from "@/components/Settings/SettingsToggle";
import { useApplicationsStore } from "@/stores/applications";
import platformAdapter from "@/utils/platformAdapter";
import { useContext } from "react";
import { ExtensionsContext } from "../../..";
import clsx from "clsx";

const Applications = () => {
  const { activeId, setActiveId } = useContext(ExtensionsContext);

  const allApps = useApplicationsStore((state) => state.allApps);
  const disabledApps = useApplicationsStore((state) => state.disabledApps);
  const setDisabledApps = useApplicationsStore((state) => {
    return state.setDisabledApps;
  });

  return allApps.map((app) => {
    const { name, icon } = app;

    return (
      <div
        key={name}
        className={clsx("flex items-center h-8 -mx-2 pl-10 pr-2 rounded-md", {
          "bg-[#f0f6fe] dark:bg-gray-700": name === activeId,
        })}
        onClick={() => {
          setActiveId(name);
        }}
      >
        <div className="flex items-center gap-1 w-[180px] pr-2 overflow-hidden">
          <img src={platformAdapter.convertFileSrc(icon)} className="size-5" />

          <span className="text-sm truncate">{name}</span>
        </div>

        <div className="flex-1 flex items-center text-[#999] ">
          <div className="flex-1">Application</div>
          <div className="flex-1">Add Alias</div>
          <div className="flex-1">Record Hotkey</div>
          <div className="flex-1 flex items-center justify-end">
            <SettingsToggle
              label=""
              checked={!disabledApps.includes(name)}
              className="scale-75"
              onChange={() => {
                if (disabledApps.includes(name)) {
                  setDisabledApps(disabledApps.filter((app) => app !== name));
                } else {
                  setDisabledApps([...disabledApps, name]);
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  });
};

export default Applications;
