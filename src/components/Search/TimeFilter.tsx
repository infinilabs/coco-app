import { useRef, useState } from "react";
import { ListFilter, ChevronRight, BrushCleaning } from "lucide-react";
import { DatePicker, Select } from "antd";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTrigger,
} from "../ui/popover";

const TimeFilter = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const dropdownMenuItems = [
    {
      key: "all-time",
      label: "All Time",
      value: null,
    },
    {
      key: "7-day",
      label: "7 Day",
      value: 7,
    },
    {
      key: "90-day",
      label: "90 Day",
      value: 90,
    },
    {
      key: "1-year",
      label: "1 Year",
      value: 365,
    },
    {
      key: "more",
      label: "More",
      onClick: () => {
        setPopoverOpen(true);
      },
    },
  ];

  const typeOptions = [
    {
      label: "Web Page",
      value: "web_page",
    },
    {
      label: "PDF",
      value: "pdf",
    },
    {
      label: "Images",
      value: "images",
    },
  ];

  const sourceOptions = [
    {
      label: "INFINI Gateway",
      value: "INFINI Gateway",
    },
    {
      label: "INFINI Labs Blog",
      value: "INFINI Labs Blog",
    },
    {
      label: "Coco 官网",
      value: "Coco 官网",
    },
    {
      label: "INFINI Labs 中文官网",
      value: "INFINI Labs 中文官网",
    },
    {
      label: "INFINI Labs blog",
      value: "INFINI Labs blog",
    },
  ];

  console.log("triggerRef", triggerRef.current);

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <div ref={triggerRef} className="relative">
            <ListFilter className="size-3" />
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          {dropdownMenuItems.map((item) => {
            const { key, label, onClick } = item;

            return (
              <DropdownMenuItem
                key={key}
                className="flex justify-between"
                onClick={() => {
                  if (onClick) {
                    onClick();
                  } else {
                    console.log("key", key);
                  }
                }}
              >
                <span>{label}</span>

                {key === "more" && (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div />
        </PopoverTrigger>

        <PopoverPortal container={triggerRef.current}>
          <PopoverContent className="w-100 p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-bold">Filters</span>

              <BrushCleaning className="size-4 text-[#6000FF]" />
            </div>

            <div className="pt-4 pb-2 text-[#999]">Date range</div>
            <DatePicker.RangePicker />

            <div className="pt-4 pb-2 text-[#999]">Type</div>
            <Select
              mode="multiple"
              allowClear
              className="w-full"
              placeholder="Please select type"
              options={typeOptions}
            />

            <div className="pt-4 pb-2 text-[#999]">Source</div>
            <Select
              mode="multiple"
              allowClear
              className="w-full"
              placeholder="Please select source"
              options={sourceOptions}
            />
          </PopoverContent>
        </PopoverPortal>
      </Popover>
    </>
  );
};

export default TimeFilter;
