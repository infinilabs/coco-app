import React from "react";

interface IconWrapperProps {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

function IconWrapper({ children, className = "", onClick }: IconWrapperProps) {
  return (
    <div
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(e);
      }}
    >
      {children}
    </div>
  );
}

export default IconWrapper;
