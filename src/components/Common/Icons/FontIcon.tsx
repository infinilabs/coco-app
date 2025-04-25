import { useIconfontScript } from "@/hooks/useScript";
interface FontIconProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

const FontIcon = ({ name, className, style, ...rest }: FontIconProps) => {
  useIconfontScript();
  return (
    <svg className={`icon ${className || ""}`} style={style} {...rest}>
      <use xlinkHref={`#${name}`} />
    </svg>
  );
};

export default FontIcon;
