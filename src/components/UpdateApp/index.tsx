import { useCallback, useMemo } from "react";
import { Button, Dialog, DialogPanel } from "@headlessui/react";
import { useTranslation } from "react-i18next";
import { noop } from "lodash-es";
import { LoaderCircle, X } from "lucide-react";
import { useInterval, useReactive } from "ahooks";
import clsx from "clsx";

import lightIcon from "./imgs/light-icon.png";
import darkIcon from "./imgs/dark-icon.png";
import { useThemeStore } from "@/stores/themeStore";
import { useUpdateStore } from "@/stores/updateStore";
import { OpenURLWithBrowser } from "@/utils/index";

interface State {
  loading?: boolean;
  total?: number;
  download: number;
}

interface UpdateAppProps {
  checkUpdate: () => Promise<any>;
  relaunchApp: () => Promise<void>;
}

const UpdateApp = ({ checkUpdate, relaunchApp }: UpdateAppProps) => {
  const { t } = useTranslation();
  const isDark = useThemeStore((state) => state.isDark);
  const visible = useUpdateStore((state) => state.visible);
  const setVisible = useUpdateStore((state) => state.setVisible);
  const skipVersion = useUpdateStore((state) => state.skipVersion);
  const setSkipVersion = useUpdateStore((state) => state.setSkipVersion);
  const isOptional = useUpdateStore((state) => state.isOptional);
  const updateInfo = useUpdateStore((state) => state.updateInfo);
  const setUpdateInfo = useUpdateStore((state) => state.setUpdateInfo);

  const state = useReactive<State>({ download: 0 });

  useInterval(() => checkUpdateStatus(), 1000 * 60 * 60 * 24, {
    immediate: true,
  });

  const checkUpdateStatus = useCallback(async () => {
    const update = await checkUpdate();

    if (update?.available) {
      setUpdateInfo(update);

      if (skipVersion === update.version) return;

      setVisible(true);
    }
  }, [skipVersion]);

  const cursorClassName = useMemo(() => {
    return state.loading ? "cursor-not-allowed" : "cursor-pointer";
  }, [state.loading]);

  const percent = useMemo(() => {
    const { total, download } = state;

    if (!total) return 0;

    return ((download / total) * 100).toFixed(2);
  }, [state.total, state.download]);

  const handleDownload = async () => {
    if (state.loading) return;

    state.loading = true;

    await updateInfo?.downloadAndInstall((progress: any) => {
      switch (progress.event) {
        case "Started":
          state.total = progress.data.contentLength;
          break;
        case "Progress":
          state.download += progress.data.chunkLength;
          break;
      }
    });

    state.loading = false;

    relaunchApp();
  };

  const handleCancel = () => {
    if (state.loading) return;

    setVisible(false);
  };

  const handleSkip = () => {
    if (state.loading) return;

    setSkipVersion(updateInfo?.version);

    setVisible(false);
  };

  return (
    <Dialog
      open={visible}
      as="div"
      className="relative z-10 focus:outline-none"
      onClose={noop}
    >
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className="relative w-[340px] py-8 flex flex-col items-center bg-white shadow-md border border-[#EDEDED] rounded-lg dark:bg-[#333] dark:border-black/20"
          >
            <X
              className={clsx(
                "absolute size-5 text-[#999] top-3 right-3 dark:text-[#D8D8D8]",
                cursorClassName,
                {
                  hidden: !isOptional,
                }
              )}
              onClick={handleCancel}
            />

            <img src={isDark ? darkIcon : lightIcon} className="h-6" />

            <div className="text-[#333] text-sm leading-5 py-2 dark:text-[#D8D8D8]">
              {isOptional ? (
                t("update.optional_description")
              ) : (
                <div className="leading-5 text-center">
                  <p>{t("update.force_description1")}</p>
                  <p>{t("update.force_description2")}</p>
                </div>
              )}
            </div>

            <div
              className="text-xs text-[#0072FF] cursor-pointer"
              onClick={() => {
                OpenURLWithBrowser(
                  "https://docs.infinilabs.com/coco-app/main/docs/release-notes"
                );
              }}
            >
              v{updateInfo?.version} {t("update.releaseNotes")}
            </div>

            <Button
              className={clsx(
                "mb-3 mt-6 bg-[#0072FF] text-white text-sm px-[14px] py-[8px] rounded-lg",
                cursorClassName,
                {
                  "opacity-50": state.loading,
                }
              )}
              onClick={handleDownload}
            >
              {state.loading ? (
                <div className="flex justify-center items-center gap-2">
                  <LoaderCircle className="animate-spin size-5" />
                  {percent}%
                </div>
              ) : (
                t("update.button.download")
              )}
            </Button>

            <div
              className={clsx("text-xs text-[#999]", cursorClassName, {
                hidden: !isOptional,
              })}
              onClick={handleSkip}
            >
              {t("update.skip_version")}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default UpdateApp;
