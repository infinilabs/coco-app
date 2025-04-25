import { useIconfontScript } from "@/hooks/useScript";
import { useAppStore } from "@/stores/appStore";
import logoImg from "@/assets/icon.svg";

interface FontIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

const FontIcon = ({ name, className, style, ...rest }: FontIconProps) => {
  useIconfontScript();

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
