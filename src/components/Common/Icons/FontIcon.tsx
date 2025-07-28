import { FC } from "react";

interface FontIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

const FontIcon: FC<FontIconProps> = ({ name, className, style, ...rest }) => {
  return (
    <svg className={`icon ${className || ""}`} style={style} {...rest}>
      <use xlinkHref={`#${name}`} />
    </svg>
  );
};

export default FontIcon;
