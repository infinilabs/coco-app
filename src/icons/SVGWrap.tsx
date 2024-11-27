import React from "react";
import clsx from "clsx";

export default function SVGWrap({
  size = 18,
  children,
  type,
  className,
  title,
  onClick,
  action = false,
  ...props
}: I.SVG) {
  const handleClick = (e: React.MouseEvent) => {
    onClick && onClick(e);
  };

  return (
    <i
      style={{
        width: size,
        height: size,
      }}
      title={title}
      onClick={handleClick}
      className={clsx(
        "inline-flex items-center justify-center rounded-sm p-[2px] transition-all",
        {
          "cursor-pointer": action,
        },
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%" }}
        {...props}
      >
        {children}
      </svg>
    </i>
  );
}
