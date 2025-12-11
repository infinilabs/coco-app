import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useWebConfigStore } from "@/stores/webConfigStore";
import { LogOut } from "lucide-react";
import clsx from "clsx";
import { Post } from "@/api/axiosRequest";
import { useTranslation } from "react-i18next";
import UserAvatar from "./UserAvatar";
import FontIcon from "../Common/Icons/FontIcon";
import RefreshButton from "./RefreshButton";
import LoginButton from "./LoginButton";
import { FC } from "react";
import Copyright from "../Common/Copyright";

interface WebLoginProps {
  panelClassName: string;
}

const WebLogin: FC<WebLoginProps> = (props) => {
  const { panelClassName } = props;
  const { integration, loginInfo, setIntegration, setLoginInfo } =
    useWebConfigStore();
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Popover>
        <PopoverTrigger>
          {loginInfo ? (
            <UserAvatar />
          ) : (
            <FontIcon
              name="font_coco-logo-line"
              className="size-5 text-[#999]"
            />
          )}
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
          className={clsx(
            "z-50 w-[300px] rounded-xl bg-white dark:bg-[#202126] text-sm/6 text-[#333] dark:text-[#D8D8D8] shadow-lg border dark:border-white/10",
            panelClassName
          )}
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span>{t("webLogin.title")}</span>

              <RefreshButton />
            </div>

            <div className="py-2">
              {loginInfo ? (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      className="h-12 w-12"
                      icon={{ className: "h-6 w-6" }}
                    />

                    <div className="flex flex-col">
                      <span>{loginInfo.name}</span>
                      <span className="text-[#999]">{loginInfo.email}</span>
                    </div>
                  </div>

                  <button
                    className="flex items-center justify-center size-6 bg-white dark:bg-[#202126] rounded-lg border dark:border-white/10"
                    onClick={async () => {
                      await Post("/account/logout", void 0);

                      setIntegration(void 0);
                      setLoginInfo(void 0);
                    }}
                  >
                    <LogOut
                      className={clsx(
                        "size-3 text-[#0287FF] transition-transform duration-1000"
                      )}
                    />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-[#999]">
                    {integration?.guest?.enabled
                      ? t("webLogin.hints.tourist")
                      : t("webLogin.hints.login")}
                  </span>

                  <LoginButton />
                </div>
              )}
            </div>
          </div>

          <div className="p-3 border-t dark:border-t-white/10">
            <Copyright />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default WebLogin;
