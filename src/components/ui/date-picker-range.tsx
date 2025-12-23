import { FC, memo } from "react";
import { PropsRange } from "react-day-picker";

import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./calendar";
import { CalendarIcon } from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

const DatePickerRange: FC<Partial<PropsRange>> = (props) => {
  const { selected } = props;
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="h-8 flex items-center justify-between px-2 border border-border rounded-lg">
          {selected ? (
            <div className="flex items-center gap-2">
              <span>{dayjs(selected.from).format("YYYY-MM-DD")}</span>
              <span className="text-muted-foreground">-</span>
              <span>{dayjs(selected.to).format("YYYY-MM-DD")}</span>
            </div>
          ) : (
            <div className="text-muted-foreground">
              {t("search.filters.selectDateRange")}
            </div>
          )}

          <CalendarIcon className="size-4 text-muted-foreground" />
        </div>
      </PopoverTrigger>

      <PopoverContent>
        <div>
          <Calendar mode="range" numberOfMonths={2} {...props} />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default memo(DatePickerRange);
