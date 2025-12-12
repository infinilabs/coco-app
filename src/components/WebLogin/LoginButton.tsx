import { useAppStore } from "@/stores/appStore";
import { Button } from "@/components/ui/button";
import { SquareArrowOutUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const LoginButton = () => {
  const { endpoint } = useAppStore();
  const { t } = useTranslation();

  const handleClick = () => {
    window.open(endpoint);
  };

  return (
    <Button className="h-8" onClick={handleClick}>
      <span>{t("webLogin.buttons.login")}</span>

      <SquareArrowOutUpRight className="size-4" />
    </Button>
  );
};

export default LoginButton;
