import { useContext } from "react";

import { ExtensionsContext } from "../..";
import Applications from "./Applications";
import Application from "./Application";
import { useExtensionsStore } from "@/stores/extensionsStore";
import SharedAi from "./SharedAi";

const Details = () => {
  const { rootState } = useContext(ExtensionsContext);
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
  const aiOverviewServer = useExtensionsStore((state) => {
    return state.aiOverviewServer;
  });
  const setAiOverviewServer = useExtensionsStore((state) => {
    return state.setAiOverviewServer;
  });
  const aiOverviewAssistant = useExtensionsStore((state) => {
    return state.aiOverviewAssistant;
  });
  const setAiOverviewAssistant = useExtensionsStore((state) => {
    return state.setAiOverviewAssistant;
  });

  const renderContent = () => {
    if (!rootState.activeExtension) return;

    const { id, type } = rootState.activeExtension;

    if (id === "Applications") {
      return <Applications />;
    }

    if (type === "application") {
      return <Application />;
    }

    if (id === "QuickAIAccess") {
      return (
        <SharedAi
          key="QuickAIAccess"
          id="QuickAIAccess"
          server={quickAiAccessServer}
          setServer={setQuickAiAccessServer}
          assistant={quickAiAccessAssistant}
          setAssistant={setQuickAiAccessAssistant}
        />
      );
    }

    if (id === "AIOverview") {
      return (
        <SharedAi
          key="AIOverview"
          id="AIOverview"
          server={aiOverviewServer}
          setServer={setAiOverviewServer}
          assistant={aiOverviewAssistant}
          setAssistant={setAiOverviewAssistant}
        />
      );
    }
  };

  return (
    <div className="flex-1 h-full overflow-auto">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {rootState.activeExtension?.title}
      </h2>

      <div className="pr-4">{renderContent()}</div>
    </div>
  );
};

export default Details;
