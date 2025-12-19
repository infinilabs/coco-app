import { useState, Fragment, useMemo } from "react";
import { ListFilter, ChevronRight, BrushCleaning } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { useSearchStore } from "@/stores/searchStore";
import MultiSelect from "../ui/multi-select";
import DatePickerRange from "../ui/date-picker-range";
import { camelCase, upperFirst } from "lodash-es";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

const TimeFilter = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const {
    filterDateRange,
    setFilterDateRange,
    aggregateFilter,
    setAggregateFilter,
    aggregations,
  } = useSearchStore();

  const dropdownMenuItems = [
    {
      key: "all-time",
      label: "All Time",
      value: void 0,
    },
    {
      key: "7-day",
      label: "7 Day",
      value: {
        from: dayjs().subtract(7, "day").toDate(),
        to: dayjs().toDate(),
      },
    },
    {
      key: "90-day",
      label: "90 Day",
      value: {
        from: dayjs().subtract(90, "day").toDate(),
        to: dayjs().toDate(),
      },
    },
    {
      key: "1-year",
      label: "1 Year",
      value: {
        from: dayjs().subtract(1, "year").toDate(),
        to: dayjs().toDate(),
      },
    },
    {
      key: "more",
      label: "More",
      onClick: () => {
        setPopoverOpen(true);
      },
    },
  ];

  const filterCount = useMemo(() => {
    let count = 0;

    if (filterDateRange) {
      count += 1;
    }

    for (const item of Object.values(aggregateFilter)) {
      if (item.length === 0) continue;

      count += 1;
    }

    return count;
  }, [filterDateRange, aggregateFilter]);

  return (
    <div>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1 h-5 px-1 text-xs rounded-full hover:text-[#881c94]! cursor-pointer transition",
              {
                "bg-[#881C94]/20 dark:bg-[#202126] text-[#881c94]":
                  filterCount > 0,
              }
            )}
          >
            <ListFilter className="size-3" />

            {filterCount > 0 && (
              <>
                <span>Filters</span>

                <div className="inline-flex items-center justify-center size-4 rounded-full text-white bg-[#881c94]">
                  {filterCount}
                </div>
              </>
            )}
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          {dropdownMenuItems.map((item) => {
            const { key, label, value, onClick } = item;

            return (
              <DropdownMenuItem
                key={key}
                className="flex justify-between"
                onClick={() => {
                  if (onClick) {
                    onClick();
                  } else {
                    setFilterDateRange(value);
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

        <PopoverContent className="w-100 p-4 text-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">Filters</span>

            <Button
              size="icon"
              variant="outline"
              className="size-6"
              onClick={() => {
                setFilterDateRange(void 0);

                setAggregateFilter({});
              }}
            >
              <BrushCleaning className="size-3 text-[#6000FF]" />
            </Button>
          </div>

          <div className="pt-4 pb-2 text-[#999]">Date range</div>
          <DatePickerRange
            selected={filterDateRange}
            onSelect={setFilterDateRange}
          />

          {aggregations &&
            Object.entries(aggregations).map(([key, value]) => {
              return (
                <Fragment key={key}>
                  <div className="pt-4 pb-2 text-[#999]">
                    {upperFirst(camelCase(key))}
                  </div>

                  <MultiSelect
                    value={aggregateFilter[key] ?? []}
                    placeholder={`Please select ${key}`}
                    options={value.buckets.map((bucket) => ({
                      label: bucket.label ?? bucket.key,
                      value: bucket.key,
                    }))}
                    onChange={(value) => {
                      setAggregateFilter({
                        ...aggregateFilter,
                        [key]: value,
                      });
                    }}
                  />
                </Fragment>
              );
            })}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TimeFilter;
