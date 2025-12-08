import { Input } from "@/components/ui/input";
import { isNumber } from "lodash-es";
import { FC, FocusEvent, InputHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface SettingsInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "className"> {
  className?: string;
  onChange?: (value?: string | number) => void;
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
      autoCorrect="off"
      className={twMerge(
        "w-20 h-8 px-2 rounded-[6px] border bg-transparent border-black/5 dark:border-white/10 hover:border-[#0072FF] focus:border-[#0072FF] transition",
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
