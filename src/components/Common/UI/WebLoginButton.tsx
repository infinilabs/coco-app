import { useAppStore } from "@/stores/appStore";
import { Button } from "@headlessui/react";
import { SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const WebLoginButton = () => {
  const { endpoint } = useAppStore();
  const { t } = useTranslation();

  const handleClick = () => {
    window.open(endpoint);
  };

  return (
    <Button
      className="px-6 h-8 text-white bg-[#0287FF] flex rounded-[8px] items-center justify-center gap-1"
      onClick={handleClick}
    >
      <span>{t("webLogin.buttons.login")}</span>

      <SquareArrowOutUpRight className="size-4" />
    </Button>
  );
};

export default WebLoginButton;
