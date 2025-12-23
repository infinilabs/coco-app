import { useState, Fragment, useMemo } from "react";
import { ListFilter, ChevronRight, BrushCleaning, Check } from "lucide-react";

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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  const dropdownMenuItems = useMemo(() => {
    return [
      {
        key: "all-time",
        label: t("search.filters.allTime"),
        value: void 0,
      },
      {
        key: "7-day",
        label: t("search.filters.past7Days"),
        value: {
          from: dayjs().subtract(7, "day").toDate(),
          to: dayjs().toDate(),
        },
      },
      {
        key: "90-day",
        label: t("search.filters.past90Days"),
        value: {
          from: dayjs().subtract(90, "day").toDate(),
          to: dayjs().toDate(),
        },
      },
      {
        key: "1-year",
        label: t("search.filters.past1year"),
        value: {
          from: dayjs().subtract(1, "year").toDate(),
          to: dayjs().toDate(),
        },
      },
      {
        key: "more",
        label: t("search.filters.more"),
        onClick: () => {
          setPopoverOpen(true);
        },
      },
    ];
  }, [t]);

  const filterCount = useMemo(() => {
    let count = 0;

    if (filterDateRange) {
      count += 1;
    }

    if (aggregateFilter) {
      for (const item of Object.values(aggregateFilter)) {
        if (item.length === 0) continue;

        count += 1;
      }
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
                <div className="whitespace-nowrap">
                  {t("search.filters.filters")}
                </div>

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

            const isSame =
              dayjs(filterDateRange?.from).isSame(dayjs(value?.from), "day") &&
              dayjs(filterDateRange?.to).isSame(dayjs(value?.to), "day");

            return (
              <DropdownMenuItem
                key={key}
                className={cn("flex justify-between")}
                onClick={() => {
                  if (onClick) {
                    onClick();
                  } else {
                    setFilterDateRange(value);
                  }
                }}
              >
                <span>{label}</span>

                {key === "more" ? (
                  <ChevronRight className="size-4 text-muted-foreground" />
                ) : (
                  <Check
                    className={cn("size-4 text-muted-foreground opacity-0", {
                      "opacity-100": isSame,
                    })}
                  />
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

        <PopoverContent className="w-100 max-h-110 overflow-auto p-4 text-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">{t("search.filters.filters")}</span>

            <Button
              size="icon"
              variant="outline"
              className="size-6"
              onClick={() => {
                setFilterDateRange(void 0);

                setAggregateFilter(void 0);
              }}
            >
              <BrushCleaning className="size-3 text-[#6000FF]" />
            </Button>
          </div>

          <div className="pt-4 pb-2 text-[#999]">
            {t("search.filters.updateTime")}
          </div>
          <DatePickerRange
            selected={filterDateRange}
            onSelect={setFilterDateRange}
          />

          {aggregations &&
            Object.entries(aggregations).map(([key, value], index) => {
              let selectValue = aggregateFilter?.[key] ?? [];

              if (selectValue.length > 0) {
                for (const item of selectValue) {
                  const matched = value.buckets.find((bucket) => {
                    return bucket.key === item;
                  });

                  if (matched) continue;

                  selectValue = selectValue.filter((i) => i !== item);
                }
              }

              return (
                <Fragment key={key}>
                  <div className="pt-4 pb-2 text-[#999]">
                    {upperFirst(camelCase(key))}
                  </div>

                  <MultiSelect
                    value={selectValue}
                    placeholder={`Please select ${key}`}
                    options={value.buckets.map((bucket) => ({
                      label: bucket.label ?? bucket.key,
                      value: bucket.key,
                    }))}
                    dropdownMenuContent={{
                      className: "max-h-60 overflow-auto",
                      side: index > 2 ? "top" : void 0,
                    }}
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
