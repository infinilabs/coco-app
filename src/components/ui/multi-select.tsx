import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

type Option = { value: string; label: string };

export interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange?: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "",
  className,
  disabled,
}) => {
  const [open, setOpen] = React.useState(false);
  const values = React.useMemo(() => new Set(value), [value]);

  const toggle = (v: string) => {
    const next = new Set(values);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange?.(Array.from(next));
  };

  const display = React.useMemo(() => {
    if (values.size === 0) return placeholder;
    const labels = options
      .filter((o) => values.has(o.value))
      .map((o) => o.label);
    return labels.join(", ");
  }, [options, values, placeholder]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn(values.size === 0 && "text-muted-foreground")}>{display}</span>
          <svg
            className="h-4 w-4 opacity-70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content
        sideOffset={4}
        className={cn(
          "z-50 w-(--radix-popover-trigger-width) min-w-[220px] rounded-md border border-input bg-popover p-2 text-popover-foreground shadow-md outline-none",
          "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <div className="max-h-48 overflow-y-auto space-y-1">
          {options.map((opt) => {
            const checked = values.has(opt.value) ? "checked" : "unchecked";
            return (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  toggle(opt.value);
                }}
              >
                <Checkbox checked={checked === "checked"} className="h-4 w-4" />
                <span className="text-sm">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  );
};

