import { cloneElement, FC, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";
import SettingsToggle from "@/components/Settings/SettingsToggle";
import { Plugin } from "../..";

interface AccordionProps extends Plugin {
  activeId: string;
  setActiveId: (id: string) => void;
}

const Accordion: FC<AccordionProps> = (props) => {
  const {
    id,
    icon,
    title,
    type = "Extension",
    alias = "-",
    hotKey = "-",
    enabled = true,
    content,
    activeId,
    setActiveId,
  } = props;

  const [animationParent] = useAutoAnimate();

  const [expand, setExpand] = useState(false);

  return (
    <div ref={animationParent}>
      <div
        className={clsx("flex items-center h-8 -mx-2 px-2 text-sm rounded-md", {
          "bg-[#F0F6FE]": id === activeId,
        })}
        onClick={() => {
          setActiveId(id);
        }}
      >
        <div className="w-1/3 flex items-center gap-1">
          <div className="size-4">
            {content && (
              <ChevronRight
                onClick={(event) => {
                  event.stopPropagation();

                  setExpand((prev) => !prev);
                }}
                className={clsx("size-full transition cursor-pointer", {
                  "rotate-90": expand,
                })}
              />
            )}
          </div>

          {cloneElement(icon, { className: "size-4" })}

          <span>{title}</span>
        </div>

        <div className="flex-1 flex items-center justify-between text-[#666]">
          <div className="flex-1">{type}</div>
          <div className="flex-1">{alias}</div>
          <div className="flex-1">{hotKey}</div>
          <div className="flex-1 flex items-center">
            <SettingsToggle label="" checked={enabled} onChange={() => {}} />
          </div>
        </div>
      </div>

      {expand && <div className="pl-10 text-sm">{content}</div>}
    </div>
  );
};

export default Accordion;
