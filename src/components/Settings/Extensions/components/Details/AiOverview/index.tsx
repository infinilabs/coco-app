import { useExtensionsStore } from "@/stores/extensionsStore";
import SharedAi from "../SharedAi";
import SettingsInput from "@/components/Settings/SettingsInput";
import { useTranslation } from "react-i18next";

const AiOverview = () => {
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
  const aiOverviewCharLen = useExtensionsStore((state) => {
    return state.aiOverviewCharLen;
  });
  const setAiOverviewCharLen = useExtensionsStore((state) => {
    return state.setAiOverviewCharLen;
  });
  const aiOverviewDelay = useExtensionsStore((state) => {
    return state.aiOverviewDelay;
  });
  const setAiOverviewDelay = useExtensionsStore((state) => {
    return state.setAiOverviewDelay;
  });
  const aiOverviewMinQuantity = useExtensionsStore((state) => {
    return state.aiOverviewMinQuantity;
  });
  const setAiOverviewMinQuantity = useExtensionsStore((state) => {
    return state.setAiOverviewMinQuantity;
  });
  const { t } = useTranslation();

  const inputList = [
    {
      label: t(
        "settings.extensions.aiOverview.details.aiOverviewTrigger.label.minCharLen"
      ),
      value: aiOverviewCharLen,
      onChange: setAiOverviewCharLen,
    },
    {
      label: t(
        "settings.extensions.aiOverview.details.aiOverviewTrigger.label.minDelay"
      ),
      value: aiOverviewDelay,
      onChange: setAiOverviewDelay,
    },
    {
      label: t(
        "settings.extensions.aiOverview.details.aiOverviewTrigger.label.minQuantity"
      ),
      value: aiOverviewMinQuantity,
      onChange: setAiOverviewMinQuantity,
    },
  ];

  return (
    <>
      <SharedAi
        key="AIOverview"
        id="AIOverview"
        server={aiOverviewServer}
        setServer={setAiOverviewServer}
        assistant={aiOverviewAssistant}
        setAssistant={setAiOverviewAssistant}
      />

      <>
        <div className="mt-6 text-[#333] dark:text-white/90">
          {t("settings.extensions.aiOverview.details.aiOverviewTrigger.title")}
        </div>

        <div className="pt-2 pb-4 text-[#999]">
          {t(
            "settings.extensions.aiOverview.details.aiOverviewTrigger.description"
          )}
        </div>

        <div className="flex flex-col gap-2">
          {inputList.map((item) => {
            const { label, value, onChange } = item;

            return (
              <div>
                <div className="mb-2 text-[#666] dark:text-white/70">
                  {label}
                </div>

                <SettingsInput
                  type="number"
                  value={value}
                  className="w-full"
                  onChange={(value) => {
                    onChange(Number(value));
                  }}
                />
              </div>
            );
          })}
        </div>
      </>
    </>
  );
};

export default AiOverview;
