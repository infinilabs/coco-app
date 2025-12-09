import { useBoolean, useClickAway, useDebounce } from "ahooks";
import clsx from "clsx";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import NoDataImage from "../Common/NoDataImage";

interface SettingsSelectProProps {
  value: any;
  placeholder?: string;
  options?: any[];
  labelField?: string;
  valueField?: string;
  searchable?: boolean;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
}

const SettingsSelectPro: FC<SettingsSelectProProps> = (props) => {
  const {
    value,
    placeholder = "Select",
    options,
    labelField = "name",
    valueField = "id",
    searchable,
    onChange,
    onSearch,
  } = props;

  const [open, { toggle, setFalse }] = useBoolean();
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const debouncedSearchValue = useDebounce(searchValue, { wait: 500 });

  useClickAway(setFalse, containerRef);

  useEffect(() => {
    onSearch?.(debouncedSearchValue);
  }, [debouncedSearchValue]);

  const option = useMemo(() => {
    return options?.find((item) => {
      return item?.[valueField] === value;
    });
  }, [options, value]);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center h-9 px-3 truncate rounded-md border border-input bg-background text-foreground shadow-sm"
        onClick={toggle}
      >
        {option?.[labelField] ?? (
          <div className="opacity-50">{placeholder}</div>
        )}
      </div>

      <div
        className={clsx(
          "absolute z-50 top-11 left-0 right-0 rounded-md p-2 border border-input bg-popover text-popover-foreground shadow-md",
          {
            hidden: !open,
          }
        )}
      >
        {searchable && (
          <div className="px-2 mb-2">
            <Input
              autoFocus
              value={searchValue}
              className="w-full h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              onChange={(e) => {
                setSearchValue(String(e.target.value));
              }}
            />
          </div>
        )}

        {options && options.length > 0 ? (
          <div className="flex flex-col gap-1 max-h-80 px-2 overflow-auto custom-scrollbar">
            {options?.map((item, index) => {
              return (
                <div
                  key={item?.[valueField] ?? index}
                  className={clsx(
                    "h-8 leading-8 px-2 rounded-md hover:bg-accent hover:text-accent-foreground transition cursor-pointer",
                    {
                      "bg-accent text-accent-foreground":
                        value === item?.[valueField],
                    }
                  )}
                  onClick={() => {
                    onChange?.(item?.[valueField]);
                    setFalse();
                  }}
                >
                  <span className="block truncate">{item?.[labelField]}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <NoDataImage />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsSelectPro;
