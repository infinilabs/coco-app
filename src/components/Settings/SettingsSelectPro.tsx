import { useBoolean, useClickAway, useDebounce } from "ahooks";
import clsx from "clsx";
import { FC, useEffect, useMemo, useRef, useState } from "react";
import SettingsInput from "./SettingsInput";
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
        className="flex items-center h-8 px-3 truncate rounded-md border dark:bg-[#1F2937] bg-white dark:border-[#374151]"
        onClick={toggle}
      >
        {option?.[labelField] ?? (
          <div className="opacity-50">{placeholder}</div>
        )}
      </div>

      <div
        className={clsx(
          "absolute z-100 top-10 left-0 right-0 rounded-md py-2 border dark:border-[#374151] bg-white dark:bg-[#1F2937] shadow-[0_5px_15px_rgba(0,0,0,0.2)] dark:shadow-[0_5px_10px_rgba(0,0,0,0.3)]",
          {
            hidden: !open,
          }
        )}
      >
        {searchable && (
          <div className="px-2 mb-2">
            <SettingsInput
              autoFocus
              value={searchValue}
              className="w-full"
              onChange={(value) => {
                setSearchValue(String(value));
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
                    "h-8 leading-8 px-2 rounded-md hover:bg-[#EDEDED] hover:dark:bg-[#374151] transition cursor-pointer",
                    {
                      "bg-[#EDEDED] dark:bg-[#374151]":
                        value === item?.[valueField],
                    }
                  )}
                  onClick={() => {
                    onChange?.(item?.[valueField]);
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
