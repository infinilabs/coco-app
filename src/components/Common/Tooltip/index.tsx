import React, { useState } from "react";

import "./style.css";

interface TooltipProps {
  content: string | any[];
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = "top",
  children,
}) => {
  const [visible, setVisible] = useState(false);

  const handleMouseEnter = () => setVisible(true);
  const handleMouseLeave = () => setVisible(false);

  const renderContent = () => {
    if (Array.isArray(content)) {
      return (
        <ul className="list-none p-0 m-0">
          {content.map((item, index) => (
            <li key={index} className="py-1">
              {item?.error || item}
            </li>
          ))}
        </ul>
      );
    }
    return content;
  };

  return (
    <div
      className="tooltip-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <div className={`tooltip-box tooltip-${position}`}>
          {renderContent()}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
