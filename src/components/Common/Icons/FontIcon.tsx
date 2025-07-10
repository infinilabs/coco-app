import { useAppStore } from "@/stores/appStore";
import logoImg from "@/assets/icon.svg";
import { FC } from "react";

interface FontIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

const FontIcon: FC<FontIconProps> = ({ name, className, style, ...rest }) => {
  const isTauri = useAppStore((state) => state.isTauri);

  if (isTauri) {
    return (
      <svg className={`icon ${className || ""}`} style={style} {...rest}>
        <use xlinkHref={`#${name}`} />
      </svg>
    );
  } else {
    return <img src={logoImg} className={className} alt={"coco"} />;
  }
};

export default FontIcon;
