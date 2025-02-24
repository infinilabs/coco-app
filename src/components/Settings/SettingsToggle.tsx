import { Switch } from "@headlessui/react";
import clsx from "clsx";

interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

export default function SettingsToggle({
  checked,
  onChange,
  label,
  className,
}: SettingsToggleProps) {
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      className={clsx(
        `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`,
        [checked ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"],
        className
      )}
    >
      <span className="sr-only">{label}</span>
      <span
        className={`${checked ? "translate-x-5" : "translate-x-0"}
          pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow 
          ring-0 transition duration-200 ease-in-out`}
      />
    </Switch>
  );
}
