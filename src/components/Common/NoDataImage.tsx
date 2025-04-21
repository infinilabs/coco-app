import { useThemeStore } from "@/stores/themeStore";
import clsx from "clsx";
import { FC, HTMLAttributes } from "react";

const NoDataImage: FC<HTMLAttributes<HTMLImageElement>> = (props) => {
  const { className } = props;
  const isDark = useThemeStore((state) => state.isDark);

  return (
    <img
      {...props}
      src={isDark ? "/assets/no_data_dark.png" : "/assets/no_data_light.png"}
      className={clsx("size-16", className)}
    />
  );
};

export default NoDataImage;
