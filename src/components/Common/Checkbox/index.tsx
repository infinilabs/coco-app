import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import type { ComponentProps } from "react";
import clsx from "clsx";
import { CheckIcon } from "lucide-react";

interface CheckboxProps
  extends Omit<ComponentProps<typeof CheckboxPrimitive.Root>, "onCheckedChange" | "onChange"> {
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
}

const Checkbox = (props: CheckboxProps) => {
  const { indeterminate, className, onChange, checked, ...rest } = props;

  return (
    <CheckboxPrimitive.Root
      {...rest}
      checked={checked}
      onCheckedChange={(v) => onChange?.(v === true)}
      className={clsx(
        "group h-4 w-4 rounded-sm border border-black/30 dark:border-white/30 data-[state=checked]:bg-[#2F54EB] data-[state=checked]:border-[#2F54EB] transition cursor-pointer inline-flex items-center justify-center",
        className
      )}
    >
      {indeterminate && (
        <div className="h-full w-full flex items-center justify-center group-data-[state=checked]:hidden">
          <div className="h-2 w-2 bg-[#2F54EB]"></div>
        </div>
      )}

      <CheckIcon className="hidden h-[14px] w-[14px] text-white group-data-[state=checked]:block" />
    </CheckboxPrimitive.Root>
  );
};

export default Checkbox;
