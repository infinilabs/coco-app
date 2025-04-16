import { cloneElement, FC, useContext, useState } from "react";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";
import SettingsToggle from "@/components/Settings/SettingsToggle";
import { ExtensionsContext, Plugin } from "../..";

interface AccordionProps extends Plugin {}

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
  } = props;
  const { activeId, setActiveId } = useContext(ExtensionsContext);

  const [expand, setExpand] = useState(false);

  return (
    <div>
      <div
        className={clsx("flex items-center h-8 -mx-2 px-2 text-sm rounded-md", {
          "bg-[#f0f6fe] dark:bg-gray-700": id === activeId,
        })}
        onClick={() => {
          setActiveId(id);
        }}
      >
        <div className="w-[220px] flex items-center gap-1">
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

        <div className="flex-1 flex items-center text-[#999]">
          <div className="flex-1">{type}</div>
          <div className="flex-1">{alias}</div>
          <div className="flex-1">{hotKey}</div>
          <div className="flex-1 flex items-center justify-end">
            <SettingsToggle
              label=""
              checked={enabled}
              className="scale-75"
              onChange={() => {}}
            />
          </div>
        </div>
      </div>

      {expand && <div className="text-sm">{content}</div>}
    </div>
  );
};

export default Accordion;
