import {
  CheckboxProps as HeadlessCheckboxProps,
  Checkbox as HeadlessCheckbox,
} from "@headlessui/react";
import clsx from "clsx";
import { CheckIcon } from "lucide-react";

interface CheckboxProps extends HeadlessCheckboxProps {
  indeterminate?: boolean;
}

const Checkbox = (props: CheckboxProps) => {
  const { indeterminate, className, ...rest } = props;

  return (
    <HeadlessCheckbox
      {...rest}
      className={clsx(
        "group size-4 rounded-sm border border-black/30 dark:border-white/30 data-[checked]:bg-[#2F54EB] data-[checked]:!border-[#2F54EB] transition cursor-pointer",
        className
      )}
    >
      {indeterminate && (
        <div className="size-full flex items-center justify-center group-data-[checked]:hidden">
          <div className="size-2 bg-[#2F54EB]"></div>
        </div>
      )}

      <CheckIcon className="hidden size-[14px] text-white group-data-[checked]:block" />
    </HeadlessCheckbox>
  );
};

export default Checkbox;
