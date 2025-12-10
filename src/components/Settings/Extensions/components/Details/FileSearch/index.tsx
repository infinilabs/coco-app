import SettingsSelectPro from "@/components/Settings/SettingsSelectPro";
import platformAdapter from "@/utils/platformAdapter";
import { useMount } from "ahooks";
import { useMemo, useState } from "react";
import DirectoryScope from "../DirectoryScope";
import SettingsInput from "@/components/Settings/SettingsInput";
import { X } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import { useTranslation } from "react-i18next";

interface Config {
  search_by: "Name" | "NameAndContents";
  search_paths: string[];
  exclude_paths: string[];
  file_types: string[];
}

const FileSearch = () => {
  const [config, setConfig] = useState<Config>({
    search_by: "Name",
    search_paths: [],
    exclude_paths: [],
    file_types: [],
  });
  const { addError } = useAppStore();
  const { t } = useTranslation();

  useMount(async () => {
    const config = await platformAdapter.invokeBackend<Config>(
      "get_file_system_config"
    );

    setConfig(config);
  });

  const changeConfig = (partialConfig: Partial<Config>) => {
    const nextConfig = {
      ...config,
      ...partialConfig,
    };

    setConfig(nextConfig);

    platformAdapter.invokeBackend("set_file_system_config", {
      config: nextConfig,
    });
  };

  const searchByOptions = [
    {
      id: "Name",
      name: t("settings.extensions.fileSearch.label.name"),
    },
    {
      id: "NameAndContents",
      name: t("settings.extensions.fileSearch.label.nameAndContents"),
    },
  ];

  const scopeOptions = useMemo(() => {
    return [
      {
        label: t("settings.extensions.fileSearch.label.searchScope"),
        paths: config.search_paths,
        onChange(paths: string[]) {
          changeConfig({ search_paths: paths });
        },
      },
      {
        label: t("settings.extensions.fileSearch.label.excludeScope"),
        paths: config.exclude_paths,
        onChange(paths: string[]) {
          changeConfig({ exclude_paths: paths });
        },
      },
    ];
  }, [config]);

  return (
    <>
      <div className="text-[#999]">
        {t("settings.extensions.fileSearch.description")}
      </div>

      <div className="mt-4 mb-2">
        {t("settings.extensions.fileSearch.label.searchBy")}
      </div>

      <SettingsSelectPro
        value={config.search_by}
        options={searchByOptions}
        onChange={(value) => {
          changeConfig({ search_by: value as Config["search_by"] });
        }}
      />

      {scopeOptions.map((item) => {
        const { label, paths, onChange } = item;

        return (
          <>
            <div key={label} className="mt-4 mb-2">
              {label}
            </div>

            <DirectoryScope paths={paths} onChange={onChange} />
          </>
        );
      })}

      <div className="mt-4 mb-2">
        {t("settings.extensions.fileSearch.label.searchFileTypes")}
      </div>

      <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-input bg-background hover:border-[#0072FF] focus-within:border-[#0072FF] transition">
        {config.file_types.map((item) => {
          return (
            <div
              key={item}
              className="flex items-center gap-1 h-6 px-2 rounded-full text-xs border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/10"
            >
              <span>{item}</span>

              <X
                className="size-3 cursor-pointer text-[#999] hover:text-red-500 transition"
                onClick={() => {
                  const nextFileTypes = config.file_types.filter((type) => {
                    return type !== item;
                  });

                  changeConfig({ file_types: nextFileTypes });
                }}
              />
            </div>
          );
        })}

        <SettingsInput
          placeholder=".*"
          className="h-6 w-24 px-2 border-0 outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
          onKeyDown={(event) => {
            if (event.code !== "Enter") return;

            event.preventDefault();

            const type = event.currentTarget.value.trim();

            if (type === "") return;

            if (config.file_types.includes(type)) {
              return addError(
                t("settings.extensions.fileSearch.hints.typeExists"),
                "error"
              );
            }

            const nextFileTypes = [
              ...config.file_types,
              event.currentTarget.value.trim(),
            ];

            changeConfig({ file_types: nextFileTypes });

            event.currentTarget.value = "";
          }}
        />
      </div>
    </>
  );
};

export default FileSearch;
