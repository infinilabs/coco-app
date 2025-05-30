import { useExtensionsStore } from "@/stores/extensionsStore";
import SharedAi from "../SharedAi";
import SettingsInput from "@/components/Settings/SettingsInput";

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

  const inputList = [
    {
      label: "Minimum Input Length(characters)",
      value: aiOverviewCharLen,
      onChange: setAiOverviewCharLen,
    },
    {
      label: "Delay After Typing Stops(seconds)",
      value: aiOverviewDelay,
      onChange: setAiOverviewDelay,
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

      <div className="text-sm">
        <div className="mt-6 text-[#333] dark:text-white/90">
          AI Overview Trigger
        </div>

        <div className="pt-2 pb-4 text-[#999]">
          AI Overview will be triggered when both conditions are met.
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
      </div>
    </>
  );
};

export default AiOverview;
