import logoLight from "./imgs/logo-light.png";
import logoDark from "./imgs/logo-dark.png";
import { useThemeStore } from "@/stores/themeStore";

const Copyright = () => {
  const isDark = useThemeStore((state) => state.isDark);

  const renderLogo = () => {
    return (
      <a href="https://coco.rs/" target="_blank">
        <img src={isDark ? logoDark : logoLight} alt="Logo" className="h-4" />
      </a>
    );
  };

  return (
    <div className="flex items-center gap-[6px] text-xs text-[#666] dark:text-[#999]">
      Powered by
      {renderLogo()}
    </div>
  );
};

export default Copyright;
