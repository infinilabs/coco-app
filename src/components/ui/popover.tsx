import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverPortal = PopoverPrimitive.Portal;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    panelId?: string;
  }
>(
  (
    {
      className,
      panelId,
      side = "bottom",
      align = "start",
      sideOffset = 8,
      ...props
    },
    ref
  ) => (
    <PopoverPortal>
      <PopoverPrimitive.Content
        ref={ref}
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-lg border border-input bg-background p-1 text-foreground shadow-lg outline-none",
          className
        )}
        data-popover-panel
        id={panelId}
        asChild={true}
        {...props}
      />
    </PopoverPortal>
  )
);
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
