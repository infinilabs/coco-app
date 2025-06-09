import { AssistantFetcher } from "@/components/Assistant/AssistantFetcher";
import FontIcon from "@/components/Common/Icons/FontIcon";
import SettingsSelectPro from "@/components/Settings/SettingsSelectPro";
import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { useAsyncEffect, useMount } from "ahooks";
import { FC, useMemo, useState } from "react";
import { ExtensionId } from "../../..";
import { useTranslation } from "react-i18next";

interface SharedAiProps {
  id: ExtensionId;
  server?: any;
  setServer: (server: any) => void;
  assistant?: any;
  setAssistant: (assistant: any) => void;
}

const SharedAi: FC<SharedAiProps> = (props) => {
  const { id, server, setServer, assistant, setAssistant } = props;

  const [serverList, setServerList] = useState<any[]>([server]);
  const [assistantList, setAssistantList] = useState<any[]>([assistant]);
  const addError = useAppStore((state) => state.addError);
  const { fetchAssistant } = AssistantFetcher({});
  const { t } = useTranslation();

  useMount(async () => {
    try {
      const data = await platformAdapter.invokeBackend<any[]>(
        "list_coco_servers"
      );

      setServerList(data);

      if (server) return;

      setServer(data[0]);
    } catch (error) {
      addError(String(error));
    }
  });

  useAsyncEffect(async () => {
    try {
      if (!server) return;

      const data = await fetchAssistant({
        current: 1,
        pageSize: 1000,
        serverId: server.id,
      });

      const list = data.list.map((item: any) => item._source);

      setAssistantList(list);

      if (assistant) {
        const matched = list.find((item: any) => {
          return item.id === assistant.id;
        });

        if (matched) {
          return setAssistant(matched);
        }
      }

      setAssistant(list[0]);
    } catch (error) {
      addError(String(error));
    }
  }, [server]);

  const selectList = useMemo(() => {
    return [
      {
        label: t(
          "settings.extensions.shardAi.details.linkedAssistant.label.cocoServer"
        ),
        value: server?.id,
        icon: server?.provider?.icon,
        data: serverList,
        onChange: (value: string) => {
          const matched = serverList.find((item) => item.id === value);

          setServer(matched);
        },
      },
      {
        label: t(
          "settings.extensions.shardAi.details.linkedAssistant.label.aiAssistant"
        ),
        value: assistant?.id,
        icon: assistant?.icon,
        data: assistantList,
        onChange: (value: string) => {
          const matched = assistantList.find((item) => item.id === value);

          setAssistant(matched);
        },
      },
    ];
  }, [serverList, assistantList, server, assistant]);

  const renderDescription = () => {
    if (id === "QuickAIAccess") {
      return t("settings.extensions.quickAiAccess.description");
    }

    if (id === "AIOverview") {
      return t("settings.extensions.aiOverview.description");
    }
  };

  return (
    <>
      <div className="text-[#999]">{renderDescription()}</div>

      <div className="mt-6 text-[#333] dark:text-white/90">
        {t("settings.extensions.shardAi.details.linkedAssistant.title")}
      </div>

      {selectList.map((item) => {
        const { label, value, icon, data, onChange } = item;

        return (
          <div key={label} className="mt-4">
            <div className="mb-2 text-[#666] dark:text-white/70">{label}</div>

            <div className="flex items-center gap-1 px-3 py-1 border dark:border-gray-700 rounded-md focus-within:!border-[#0087FF] hover:!border-[#0087FF] transition">
              {icon?.startsWith("font_") ? (
                <FontIcon name={icon} className="size-5" />
              ) : (
                <img src={icon} className="size-5" />
              )}

              <SettingsSelectPro
                data={data}
                value={value}
                rootClassName="flex-1 border-0"
                onChange={(event) => {
                  onChange(event.currentTarget.value);
                }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
};

export default SharedAi;
