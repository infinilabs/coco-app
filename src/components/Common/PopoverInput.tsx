import type { InputProps } from "@/components/ui/input";
import { Input } from "@/components/ui/input";
import { useKeyPress } from "ahooks";
import { forwardRef, useImperativeHandle, useRef } from "react";

import { POPOVER_PANEL_SELECTOR } from "@/constants";

const PopoverInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => inputRef.current!);

  useKeyPress(
    "esc",
    (event) => {
      if (inputRef.current === document.activeElement) {
        event.preventDefault();
        event.stopPropagation();

        inputRef.current?.blur();

        const parentPanel = inputRef.current?.closest(POPOVER_PANEL_SELECTOR);
        if (parentPanel instanceof HTMLElement) {
          parentPanel.focus();
        }
      }
    },
    {
      target: inputRef,
    }
  );

  return <Input autoCorrect="off" ref={inputRef} {...(props as any)} />;
});

export default PopoverInput;
