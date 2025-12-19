import { FC, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Option {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  value: string[];
  options: Option[];
  placeholder?: string;
  onChange?: (value: string[]) => void;
}

const MultiSelect: FC<MultiSelectProps> = (props) => {
  const { value, options, placeholder, onChange } = props;
  const [open, setOpen] = useState(false);

  const renderTrigger = () => {
    if (value.length === 0) {
      return <div className="text-muted-foreground px-1">{placeholder}</div>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item) => (
          <div className="inline-flex items-center gap-1 h-5.5 px-2 bg-muted rounded-md text-muted-foreground">
            <span>{item}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <DropdownMenu onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center justify-between border border-border min-h-8 rounded-lg p-1">
          {renderTrigger()}

          <ChevronDown
            className={cn("size-4 min-w-4 text-muted-foreground transition", {
              "rotate-180": open,
            })}
          />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        {options.map((item) => {
          const { label, value: itemValue } = item;

          const included = value.includes(itemValue);

          return (
            <DropdownMenuItem
              key={itemValue}
              className={"flex items-center justify-between gap-2"}
              onSelect={(event) => {
                event.preventDefault();

                if (included) {
                  onChange?.(value.filter((item) => item !== itemValue));
                } else {
                  onChange?.([...value, itemValue]);
                }
              }}
            >
              <span>{label}</span>

              <Check
                className={cn("size-4 text-muted-foreground", {
                  "opacity-0": !value.includes(itemValue),
                })}
              />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MultiSelect;
