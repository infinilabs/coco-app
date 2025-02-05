import React, { useEffect, useState } from "react";

interface ThemedIconProps {
    component: React.ElementType;
    className?: string;
}

function ThemedIcon({ component: Component, className }: ThemedIconProps) {
    const [color, setColor] = useState("#000");

    useEffect(() => {
        const updateTheme = () => {
            const isDark = document.body.classList.contains("dark");
            setColor(isDark ? "#DCDCDC" : "#999");
        };

        updateTheme();
        const observer = new MutationObserver(updateTheme);
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

        return () => observer.disconnect();
    }, []);

    return <Component className={className} color={color} />;
}

export default ThemedIcon;