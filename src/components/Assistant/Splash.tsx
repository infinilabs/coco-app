import { useMemo, useState, useEffect } from "react";
import { CircleX, MoveRight } from "lucide-react";

import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { useConnectStore } from "@/stores/connectStore";
import { useThemeStore } from "@/stores/themeStore";
import FontIcon from "@/components/Common/Icons/FontIcon";
import logoImg from "@/assets/icon.svg";
import { AssistantFetcher } from "./AssistantFetcher";
import type { StartPage } from "@/types/chat";
import { unrequitable } from "@/utils";

export interface Response {
  app_settings?: {
    chat?: {
      start_page?: StartPage;
    };
  };
}

interface SplashProps {
  assistantIDs?: string[];
  startPage?: StartPage;
}

const Splash = ({ assistantIDs = [], startPage }: SplashProps) => {
  const isTauri = useAppStore((state) => state.isTauri);
  const currentService = useConnectStore((state) => state.currentService);
  const visibleStartPage = useConnectStore((state) => state.visibleStartPage);
  const setVisibleStartPage = useConnectStore((state) => {
    return state.setVisibleStartPage;
  });
  const isDark = useThemeStore((state) => state.isDark);
  const assistantList = useConnectStore((state) => state.assistantList);
  const setAssistantList = useConnectStore((state) => state.setAssistantList);
  const setCurrentAssistant = useConnectStore((state) => {
    return state.setCurrentAssistant;
  });

  const [settings, setSettings] = useState<StartPage>();

  const { fetchAssistant } = AssistantFetcher({
    assistantIDs,
  });

  const fetchData = async () => {
    const data = await fetchAssistant({ current: 1, pageSize: 1000 });
    setAssistantList(data.list || []);
  };

  const getSettings = async () => {
    const serverId = currentService.id;

    let response: any;
    if (isTauri) {
      if (unrequitable()) {
        return setVisibleStartPage(false);
      }

      response = await platformAdapter.invokeBackend<Response>(
        "get_system_settings",
        {
          serverId,
        }
      );
      response = response?.app_settings?.chat?.start_page;
    } else {
      response = startPage;
    }
    setVisibleStartPage(Boolean(response?.enabled));
    setSettings(response);
  };

  useEffect(() => {
    getSettings();
    fetchData();
  }, [currentService?.id]);

  useEffect(() => {
    if (currentService?.enabled) return;

    isTauri && setVisibleStartPage(false);
  }, [currentService?.enabled]);

  const settingsAssistantList = useMemo(() => {
    return assistantList.filter((item) => {
      return settings?.display_assistants?.includes(item?._source?.id);
    });
  }, [settings, assistantList]);

  const logo = useMemo(() => {
    const { light, dark } = settings?.logo || {};

    if (isDark) {
      return dark || light;
    }

    return light || dark;
  }, [settings, isDark]);

  return (
    visibleStartPage && (
      <div className="absolute top-12 inset-0 flex flex-col items-center px-6 pt-6 text-[#333] dark:text-white select-none overflow-y-auto custom-scrollbar">
        <CircleX
          className="absolute top-3 right-3 size-4 text-[#999] cursor-pointer"
          onClick={() => {
            setVisibleStartPage(false);
          }}
        />

        <img src={logo} className="h-8" />

        <div className="mt-3 mb-6 text-lg font-medium">
          {settings?.introduction}
        </div>

        <ul className="flex flex-wrap -m-1 w-full p-0">
          {settingsAssistantList?.map((item) => {
            const { id, name, description, icon } = item._source;

            return (
              <li key={id} className="mobile:w-full w-1/2 p-1">
                <div
                  className="group h-[74px] px-3 py-2 text-sm rounded-xl border dark:border-[#262626] bg-white dark:bg-black cursor-pointer transition hover:!border-[#0087FF]"
                  onClick={() => {
                    setCurrentAssistant(item);

                    setVisibleStartPage(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {icon?.startsWith("font_") ? (
                        <div className="size-4 flex items-center justify-center rounded-full bg-white">
                          <FontIcon name={icon} className="w-5 h-5" />
                        </div>
                      ) : (
                        <img
                          src={logoImg}
                          className="size-4 rounded-full"
                          alt={name}
                        />
                      )}

                      <span>{name}</span>
                    </div>

                    <MoveRight className="size-4 transition group-hover:text-[#0087FF]" />
                  </div>

                  <div className="mt-1 text-xs text-[#999] line-clamp-2">
                    {description}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    )
  );
};

export default Splash;
