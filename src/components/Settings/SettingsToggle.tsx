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
      aria-label={label}
      onCheckedChange={(v) => onChange?.(v)}
      className={clsx(
        "h-5 w-9",
        className
      )}
    />
  );
}
