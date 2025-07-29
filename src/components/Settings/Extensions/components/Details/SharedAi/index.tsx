import { FC, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { isArray } from "lodash-es";
import { useAsyncEffect, useMount } from "ahooks";

import { AssistantFetcher } from "@/components/Assistant/AssistantFetcher";
import SettingsSelectPro from "@/components/Settings/SettingsSelectPro";
import { useAppStore } from "@/stores/appStore";
import { ExtensionId } from "@/components/Settings/Extensions/index";
import { useConnectStore } from "@/stores/connectStore";
import type { Server } from "@/types/server";

interface Assistant {
  id: string;
  name?: string;
  icon?: string;
  description?: string;
}

interface SharedAiProps {
  id: ExtensionId;
  server?: Server;
  setServer: (server: Server | undefined) => void;
  assistant?: Assistant;
  setAssistant: (assistant: Assistant | undefined) => void;
}

const SharedAi: FC<SharedAiProps> = (props) => {
  const { id, server, setServer, assistant, setAssistant } = props;

  const serverList = useConnectStore((state) => state.serverList);

  const [list, setList] = useState<Server[]>([]);
  const [assistantList, setAssistantList] = useState<Assistant[]>([]);
  const addError = useAppStore((state) => state.addError);
  const { fetchAssistant } = AssistantFetcher({});
  const { t } = useTranslation();
  const [assistantSearchValue, setAssistantSearchValue] = useState("");
  const [isLoadingAssistants, setIsLoadingAssistants] = useState(false);

  const getEnabledServers = useCallback((servers: Server[]): Server[] => {
    if (!isArray(servers)) return [];
    return servers.filter(
      (s) => s.enabled && s.available && (s.public || s.profile)
    );
  }, []);

  useMount(async () => {
    try {
      const enabledServers = getEnabledServers(serverList);
      setList(enabledServers);

      if (enabledServers.length === 0) {
        setServer(undefined);
        return;
      }

      if (server) {
        const matchServer = enabledServers.find((item) => item.id === server.id);
        if (matchServer) {
          setServer(matchServer);
          return;
        }
      }

      setServer(enabledServers[0]);
    } catch (error) {
      console.error('Failed to load servers:', error);
      addError(`Failed to load servers: ${String(error)}`);
    }
  });

  useAsyncEffect(async () => {
    if (!server) {
      setAssistantList([]);
      setAssistant(undefined);
      return;
    }

    setIsLoadingAssistants(true);
    try {
      const data = await fetchAssistant({
        current: 1,
        pageSize: 100,
        serverId: server.id,
        query: assistantSearchValue,
      });

      const assistants: Assistant[] = data.list.map((item: any) => item._source);
      setAssistantList(assistants);

      if (assistants.length === 0) {
        setAssistant(undefined);
        return;
      }

      if (assistant) {
        const matched = assistants.find((item) => item.id === assistant.id);
        if (matched) {
          setAssistant(matched);
          return;
        }
      }

      setAssistant(assistants[0]);
    } catch (error) {
      console.error('Failed to fetch assistants:', error);
      addError(`Failed to fetch assistants: ${String(error)}`);
      setAssistantList([]);
      setAssistant(undefined);
    } finally {
      setIsLoadingAssistants(false);
    }
  }, [server?.id, assistantSearchValue]);

  const selectList = useMemo(() => {
    const serverSelectConfig = {
      label: t(
        "settings.extensions.shardAi.details.linkedAssistant.label.cocoServer"
      ),
      value: server?.id,
      icon: server?.provider?.icon,
      data: list,
      searchable: false,
      onChange: (value: string) => {
        const matched = list.find((item) => item.id === value);
        setServer(matched);
      },
      onSearch: undefined,
    };

    const assistantSelectConfig = {
      label: t(
        "settings.extensions.shardAi.details.linkedAssistant.label.aiAssistant"
      ),
      value: assistant?.id,
      icon: assistant?.icon,
      data: assistantList,
      searchable: true,
      onChange: (value: string) => {
        const matched = assistantList.find((item) => item.id === value);
        setAssistant(matched);
      },
      onSearch: (value: string) => {
        setAssistantSearchValue(value);
      },
    };

    return [serverSelectConfig, assistantSelectConfig];
  }, [list, assistantList, server?.id, assistant?.id, t]);

  const renderDescription = useCallback(() => {
    switch (id) {
      case "QuickAIAccess":
        return t("settings.extensions.quickAiAccess.description");
      case "AIOverview":
        return t("settings.extensions.aiOverview.description");
      default:
        return null;
    }
  }, [id, t]);

  return (
    <>
      <div className="text-[#999]">{renderDescription()}</div>

      <div className="mt-6 text-[#333] dark:text-white/90">
        {t("settings.extensions.shardAi.details.linkedAssistant.title")}
      </div>

      {selectList.map((item) => {
        const { label, value, data, searchable, onChange, onSearch } = item;

        return (
          <div key={label} className="mt-4">
            <div className="mb-2 text-[#666] dark:text-white/70">{label}</div>

            <SettingsSelectPro
              value={value}
              options={data}
              searchable={searchable}
              onChange={onChange}
              onSearch={onSearch}
              placeholder={isLoadingAssistants && searchable ? "Loading..." : undefined}
            />
          </div>
        );
      })}
    </>
  );
};

export default SharedAi;
