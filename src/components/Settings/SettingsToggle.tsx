import { Switch } from "@/components/ui/switch";
import clsx from "clsx";

type BaseSwitchProps = React.ComponentProps<typeof Switch>;
interface SettingsToggleProps
  extends Omit<BaseSwitchProps, "onChange" | "onCheckedChange"> {
  label: string;
  className?: string;
  onChange?: (checked: boolean) => void;
}

export default function SettingsToggle(props: SettingsToggleProps) {
  const { label, className, onChange, ...rest } = props;

  return (
    <Switch
      {...rest}
      onCheckedChange={(v) => onChange?.(v)}
      className={clsx(
        `group relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-gray-200 data-[state=checked]:bg-blue-600`,
        className
      )}
    >
      <span className="sr-only">{label}</span>
      <span
        className="pointer-events-none relative inline-block h-5 w-5 transform rounded-full bg-white shadow 
          ring-0 transition duration-200 ease-in-out translate-x-0 group-data-[state=checked]:translate-x-5"
      />
    </Switch>
  );
}
