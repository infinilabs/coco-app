import React, { useEffect, useState } from "react";

interface ThemedIconProps {
  component: React.ElementType;
  className?: string;
}

function ThemedIcon({ component: Component, className = "" }: ThemedIconProps) {
  const [color, setColor] = useState("#000");

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.body.classList.contains("dark");
      setColor(isDark ? "#DCDCDC" : "#999");
    };

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Component
      className={`rounded-full dark:drop-shadow-[0_0_6px_rgb(255,255,255)] ${className}`}
      color={color}
    />
  );
}

export default ThemedIcon;
