import { Input, InputProps } from "@headlessui/react";
import clsx from "clsx";
import { isNumber } from "lodash-es";
import { FC, FocusEvent } from "react";

interface SettingsInputProps extends Omit<InputProps, "onChange"> {
  onChange: (value?: string | number) => void;
}

const SettingsInput: FC<SettingsInputProps> = (props) => {
  const { className, onBlur, onChange, ...rest } = props;
  const { type, min, max } = rest;

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    onBlur?.(event);

    if (type !== "number") return;

    if (event.target instanceof HTMLInputElement) {
      const value = Number(event.target.value);

      if (isNumber(min) && value < min) {
        onChange?.(min);
      }

      if (isNumber(max) && value > max) {
        onChange?.(max);
      }
    }
  };

  return (
    <Input
      {...rest}
      className={clsx(
        "w-20 h-8 px-2 rounded-md border bg-transparent border-black/5 dark:border-white/10 hover:!border-[#0072FF] focus:!border-[#0072FF] transition",
        className
      )}
      onBlur={handleBlur}
      onChange={(event) => {
        onChange?.(event.target.value);
      }}
    />
  );
};

export default SettingsInput;
