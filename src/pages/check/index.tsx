 import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, DialogPanel } from "@headlessui/react";
import { noop } from "lodash-es";
import { LoaderCircle } from "lucide-react";
import { useReactive } from "ahooks";
import clsx from "clsx";

import { useThemeStore } from "@/stores/themeStore";
import { useUpdateStore } from "@/stores/updateStore";
import { useAppStore } from "@/stores/appStore";
import { OpenURLWithBrowser } from "@/utils/index";
import appIcon from "@/assets/app-icon.png";

interface State {
  loading?: boolean;
  total?: number;
  download: number;
}

interface CheckAppProps {
  checkUpdate: () => Promise<any>;
  relaunchApp: () => Promise<void>;
}

const CheckApp = ({ checkUpdate, relaunchApp }: CheckAppProps) => {
  const { t } = useTranslation();
  const visible = useUpdateStore((state) => state.visible);
  const setVisible = useUpdateStore((state) => state.setVisible);
  const skipVersion = useUpdateStore((state) => state.skipVersion);
  const setSkipVersion = useUpdateStore((state) => state.setSkipVersion);
  const isOptional = useUpdateStore((state) => state.isOptional);
  const updateInfo = useUpdateStore((state) => state.updateInfo);
  const addError = useAppStore((state) => state.addError);

  const state = useReactive<State>({ download: 0 });

  const cursorClassName = state.loading ? "cursor-not-allowed" : "cursor-pointer";

  const percent = (() => {
    const { total, download } = state;
    if (!total) return 0;
    return ((download / total) * 100).toFixed(2);
  })();

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
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto bg-[#2A2A2A]">
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel className="relative w-[600px] py-8 flex flex-col items-center">
            <div className="text-2xl text-white mb-4">Software Update</div>
            <div className="flex items-start gap-4 mb-6">
              <img src={appIcon} className="w-16 h-16" />
              <div className="text-white">
                <div className="text-xl mb-2">
                  A new version of Coco is available!
                </div>
                <div>
                  Coco {updateInfo?.version} is now available—you have{" "}
                  {process.env.VERSION}. Would you like to download it now?
                </div>
              </div>
            </div>

            <div className="w-full bg-[#1C1C1C] rounded-lg p-6 mb-6">
              <div className="text-2xl text-white mb-4">
                New in Version {updateInfo?.version}
              </div>
              <div className="text-white whitespace-pre-line">
                {updateInfo?.releaseNotes}
              </div>
            </div>

            <div className="flex justify-end gap-4 w-full">
              <Button
                className={clsx(
                  "bg-[#4A4A4A] text-white px-4 py-2 rounded-lg",
                  cursorClassName,
                  {
                    hidden: !isOptional,
                  }
                )}
                onClick={handleSkip}
              >
                Skip This Version
              </Button>

              <Button
                className={clsx(
                  "bg-[#E8A44D] text-white px-4 py-2 rounded-lg",
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
                  "Install Update"
                )}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default CheckApp;