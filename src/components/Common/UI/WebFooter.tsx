import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import FontIcon from "../Icons/FontIcon";
import { useWebConfigStore } from "@/stores/webConfigStore";
import { LogOut } from "lucide-react";
import clsx from "clsx";
import Copyright from "../Copyright";
import WebLoginButton from "./WebLoginButton";
import WebRefreshButton from "./WebRefreshButton";
import WebUserAvatar from "./WebUserAvatar";
import { Post } from "@/api/axiosRequest";
import { useTranslation } from "react-i18next";

const WebFooter = () => {
  const { integration, loginInfo, setIntegration, setLoginInfo } =
    useWebConfigStore();
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Popover>
        <PopoverButton
          onMouseDown={() => {
            console.log("WebFooter PopoverButton click");
          }}
        >
          {loginInfo ? (
            <WebUserAvatar />
          ) : (
            <FontIcon
              name="font_coco-logo-line"
              className="size-5 text-[#999]"
            />
          )}
        </PopoverButton>

        <PopoverPanel className="absolute z-50 bottom-5 left-0 w-[300px] rounded-xl bg-white dark:bg-[#202126] text-sm/6 text-[#333] dark:text-[#D8D8D8] shadow-lg border dark:border-white/10 -translate-y-2">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span>{t("webLogin.title")}</span>

              <WebRefreshButton />
            </div>

            <div className="py-2">
              {loginInfo ? (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <WebUserAvatar
                      className="!size-12"
                      icon={{ className: "!size-6" }}
                    />

                    <div className="flex flex-col">
                      <span>{loginInfo.name}</span>
                      <span className="text-[#999]">{loginInfo.email}</span>
                    </div>
                  </div>

                  <button
                    className="flex items-center justify-center size-6 bg-white dark:bg-[#202126] rounded-[8px] border dark:border-white/10"
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

                  <WebLoginButton />
                </div>
              )}
            </div>
          </div>

          <div className="p-3 border-t dark:border-t-white/10">
            <Copyright />
          </div>
        </PopoverPanel>
      </Popover>
    </div>
  );
};

export default WebFooter;
