import {
  Popover,
  PopoverButton,
  PopoverPanel,
  PopoverPanelProps,
} from "@headlessui/react";
import { useBoolean } from "ahooks";
import clsx from "clsx";
import { FC, ReactNode } from "react";

interface Tooltip2Props extends PopoverPanelProps {
  content: string;
  children: ReactNode;
}

const Tooltip2: FC<Tooltip2Props> = (props) => {
  const { content, children, anchor = "top", ...rest } = props;
  const [visible, { setTrue, setFalse }] = useBoolean(false);

  return (
    <Popover>
      <PopoverButton onMouseOver={setTrue} onMouseOut={setFalse}>
        {children}
      </PopoverButton>
      <PopoverPanel
        {...rest}
        static
        anchor={anchor}
        className={clsx(
          "fixed z-1000 p-2 rounded-md text-xs text-white bg-black/75 hidden",
          {
            "!block": visible,
          }
        )}
      >
        {content}
      </PopoverPanel>
    </Popover>
  );
};

export default Tooltip2;
