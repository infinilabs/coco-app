import { AssistantFetcher } from "@/components/Assistant/AssistantFetcher";
import FontIcon from "@/components/Common/Icons/FontIcon";
import SettingsSelectPro from "@/components/Settings/SettingsSelectPro";
import { useAppStore } from "@/stores/appStore";
import { useExtensionsStore } from "@/stores/extensionsStore";
import platformAdapter from "@/utils/platformAdapter";
import { useAsyncEffect, useMount } from "ahooks";
import { useEffect, useMemo, useState } from "react";

const QuickAiAccess = () => {
  const quickAiAccessServer = useExtensionsStore((state) => {
    return state.quickAiAccessServer;
  });
  const setQuickAiAccessServer = useExtensionsStore((state) => {
    return state.setQuickAiAccessServer;
  });
  const quickAiAccessAssistant = useExtensionsStore((state) => {
    return state.quickAiAccessAssistant;
  });
  const setQuickAiAccessAssistant = useExtensionsStore((state) => {
    return state.setQuickAiAccessAssistant;
  });
  const [serverList, setServerList] = useState<any[]>([]);
  const [assistantList, setAssistantList] = useState<any[]>([]);
  const addError = useAppStore((state) => state.addError);
  const { fetchAssistant } = AssistantFetcher({});

  useMount(async () => {
    try {
      const data = await platformAdapter.invokeBackend<any[]>(
        "list_coco_servers"
      );

      setServerList(data);

      if (quickAiAccessServer) return;

      setQuickAiAccessServer(data[0]);
    } catch (error) {
      addError(String(error));
    }
  });

  useAsyncEffect(async () => {
    try {
      if (!quickAiAccessServer) return;

      const data = await fetchAssistant({
        current: 1,
        pageSize: 1000,
        serverId: quickAiAccessServer.id,
      });

      const list = data.list.map((item: any) => item._source);

      setAssistantList(list);

      if (quickAiAccessAssistant) {
        const matched = list.find((item: any) => {
          return item.id === quickAiAccessAssistant.id;
        });

        if (matched) {
          return setQuickAiAccessAssistant(matched);
        }
      }

      setQuickAiAccessAssistant(list[0]);
    } catch (error) {
      addError(String(error));
    }
  }, [quickAiAccessServer]);

  useEffect(() => {
    const unsubscribe = useExtensionsStore.subscribe((state) => {
      platformAdapter.emitEvent("change-extensions-store", state);
    });

    return () => {
      unsubscribe();
    };
  });

  const selectList = useMemo(() => {
    return [
      {
        label: "Coco Server",
        value: quickAiAccessServer?.id,
        icon: quickAiAccessServer?.provider?.icon,
        data: serverList,
        onChange: (value: string) => {
          const matched = serverList.find((item) => item.id === value);

          setQuickAiAccessServer(matched);
        },
      },
      {
        label: "AI Assistant",
        value: quickAiAccessAssistant?.id,
        icon: quickAiAccessAssistant?.icon,
        data: assistantList,
        onChange: (value: string) => {
          const matched = assistantList.find((item) => item.id === value);

          setQuickAiAccessAssistant(matched);
        },
      },
    ];
  }, [serverList, assistantList, quickAiAccessServer, quickAiAccessAssistant]);

  return (
    <div className="text-sm">
      <div className="text-[#999]">
        Quick AI access allows you to start a conversation immediately from the
        search box using the tab key.
      </div>

      <div className="mt-6 text-[#333] dark:text-white/90">LinkedAssistant</div>

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
    </div>
  );
};

export default QuickAiAccess;
