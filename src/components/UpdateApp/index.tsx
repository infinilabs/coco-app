import { useCallback, useMemo, useEffect } from "react";
import { Button, Dialog, DialogPanel } from "@headlessui/react";
import { useTranslation } from "react-i18next";
import { noop } from "lodash-es";
import { LoaderCircle, X } from "lucide-react";
import { useInterval, useReactive } from "ahooks";
import clsx from "clsx";

import lightIcon from "@/assets/images/UpdateApp/light-icon.png";
import darkIcon from "@/assets/images/UpdateApp/dark-icon.png";
import { useThemeStore } from "@/stores/themeStore";
import { useUpdateStore } from "@/stores/updateStore";
import { OpenURLWithBrowser } from "@/utils/index";
import { useAppStore } from "@/stores/appStore";
import platformAdapter from "@/utils/platformAdapter";
import { useAppearanceStore } from "@/stores/appearanceStore";
import { hide_check } from "@/commands";

interface State {
  loading?: boolean;
  total?: number;
  download: number;
}

interface UpdateAppProps {
  isCheckPage?: boolean;
}

const UpdateApp = ({ isCheckPage }: UpdateAppProps) => {
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const {
    visible,
    setVisible,
    skipVersions,
    setSkipVersions,
    isOptional,
    updateInfo,
    setUpdateInfo,
  } = useUpdateStore();
  const { addError } = useAppStore();
  const { snapshotUpdate } = useAppearanceStore();

  const checkUpdate = useCallback(() => {
    return platformAdapter.checkUpdate();
  }, []);

  const relaunchApp = useCallback(() => {
    return platformAdapter.relaunchApp();
  }, []);

  useEffect(() => {
    checkUpdateStatus();
  }, [snapshotUpdate]);

  useEffect(() => {
    const unlisten = platformAdapter.listenEvent("check-update", () => {
      if (!isCheckPage) return;

      checkUpdateStatus();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const state = useReactive<State>({ download: 0 });

  useInterval(() => checkUpdateStatus(), 1000 * 60 * 60 * 24, {
    immediate: true,
  });

  const checkUpdateStatus = useCallback(async () => {
    const update = await checkUpdate();

    if (update) {
      const { skipVersions } = useUpdateStore.getState();

      setVisible(!skipVersions.includes(update.version));

      setUpdateInfo(update);
    }
  }, [skipVersions]);

  const cursorClassName = useMemo(() => {
    return state.loading ? "cursor-not-allowed" : "cursor-pointer";
  }, [state.loading]);

  const percent = useMemo(() => {
    const { total, download } = state;

    if (!total) return 0;

    return ((download / total) * 100).toFixed(2);
  }, [state.total, state.download]);

  const handleDownload = async () => {
    try {
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

      relaunchApp();
    } catch (error) {
      addError(String(error));
    } finally {
      state.loading = false;
    }
  };

  const handleCancel = () => {
    if (state.loading) return;

    setVisible(false);
  };

  const handleSkip = () => {
    if (state.loading) return;

    const { skipVersions, updateInfo } = useUpdateStore.getState();

    setSkipVersions([...skipVersions, updateInfo.version]);

    isCheckPage ? hide_check() : setVisible(false);
  };

  return (
    <Dialog
      open={isCheckPage ? true : visible}
      as="div"
      className="relative z-10 focus:outline-none"
      onClose={noop}
    >
      <div
        className={`fixed inset-0 z-10 w-screen overflow-y-auto ${
          isCheckPage
            ? "rounded-lg bg-white dark:bg-[#333] border border-[#EDEDED]  dark:border-black/20 shadow-md"
            : ""
        }`}
      >
        <div
          className={clsx(
            "flex min-h-full items-center justify-center",
            !isCheckPage && "p-4"
          )}
        >
          <DialogPanel
            transition
            className={`relative w-[340px] py-8 flex flex-col items-center ${
              isCheckPage
                ? ""
                : "rounded-lg bg-white dark:bg-[#333] border border-[#EDEDED]  dark:border-black/20 shadow-md"
            }`}
          >
            {!isCheckPage && isOptional && (
              <X
                className={clsx(
                  "absolute size-5 top-3 right-3 text-[#999] dark:text-[#D8D8D8]",
                  cursorClassName
                )}
                onClick={handleCancel}
                role="button"
                aria-label="Close dialog"
                tabIndex={0}
              />
            )}

            <img src={isDark ? darkIcon : lightIcon} className="h-6" />

            <div className="text-[#333] text-sm leading-5 py-2 dark:text-[#D8D8D8] text-center">
              {updateInfo ? (
                isOptional ? (
                  t("update.optional_description")
                ) : (
                  <>
                    <p>{t("update.force_description1")}</p>
                    <p>{t("update.force_description2")}</p>
                  </>
                )
              ) : (
                t("update.date")
              )}
            </div>

            {updateInfo ? (
              <div
                className="text-xs text-[#0072FF] cursor-pointer"
                onClick={() =>
                  OpenURLWithBrowser(
                    "https://docs.infinilabs.com/coco-app/main/docs/release-notes"
                  )
                }
              >
                v{updateInfo.version} {t("update.releaseNotes")}
              </div>
            ) : (
              <div className={clsx("text-xs text-[#999]", cursorClassName)}>
                {t("update.latest", {
                  replace: [
                    updateInfo?.version || process.env.VERSION || "N/A",
                  ],
                })}
              </div>
            )}

            <Button
              className={clsx(
                "mb-3 mt-6 bg-[#0072FF] text-white text-sm px-[14px] py-[8px] rounded-lg",
                cursorClassName,
                state.loading && "opacity-50"
              )}
              onClick={updateInfo ? handleDownload : handleSkip}
            >
              {state.loading ? (
                <div className="flex justify-center items-center gap-2">
                  <LoaderCircle className="animate-spin size-5" />
                  {percent}%
                </div>
              ) : updateInfo ? (
                t("update.button.install")
              ) : (
                t("update.button.ok")
              )}
            </Button>

            {!isCheckPage && updateInfo && isOptional && (
              <div
                className={clsx("text-xs text-[#999]", cursorClassName)}
                onClick={handleSkip}
              >
                {t("update.skip_version")}
              </div>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default UpdateApp;
