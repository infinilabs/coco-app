import { Input, InputProps } from "@headlessui/react";
import clsx from "clsx";
import { FC } from "react";

const SettingsInput: FC<InputProps> = (props) => {
  const { className, ...rest } = props;

  return (
    <Input
      {...rest}
      className={clsx(
        "w-20 h-8 px-2 rounded-md border bg-transparent border-black/5 dark:border-white/10 hover:border-[#0072FF] focus:border-[#0072FF] transition",
        className
      )}
    />
  );
};

export default SettingsInput;
