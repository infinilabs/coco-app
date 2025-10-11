import { useEventListener } from "ahooks";
import clsx from "clsx";
import {
  forwardRef,
  HTMLAttributes,
  useImperativeHandle,
  useRef,
} from "react";

const Scrollbar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  (props, ref) => {
    const { children, className, ...rest } = props;
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

    useEventListener("keydown", (event) => {
      const { key } = event;

      if (key !== "PageDown" && key !== "PageUp") return;

      if (!containerRef.current) return;

      event.preventDefault();

      const delta = key === "PageDown" ? 1 : -1;
      const el = containerRef.current;

      el.scrollBy({
        top: delta * el.clientHeight * 0.9,
        behavior: "smooth",
      });
    });

    return (
      <div
        {...rest}
        ref={containerRef}
        className={clsx("custom-scrollbar", className)}
      >
        {children}
      </div>
    );
  }
);

export default Scrollbar;
