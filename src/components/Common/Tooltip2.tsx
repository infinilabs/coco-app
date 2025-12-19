import { FC, ReactNode } from "react";
import { useBoolean } from "ahooks";
import clsx from "clsx";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
interface Tooltip2Props {
  content: string;
  children: ReactNode;
  className?: string;
}

const Tooltip2: FC<Tooltip2Props> = (props) => {
  const { content, children, className } = props;
  const [visible, { setTrue, setFalse }] = useBoolean(false);

  return (
    <Popover>
      <PopoverTrigger onMouseOver={setTrue} onMouseOut={setFalse}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className={clsx(
          "z-1000 p-2 rounded-md text-xs text-white bg-black/75 hidden",
          {
            block: visible,
          },
          className
        )}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
};

export default Tooltip2;
