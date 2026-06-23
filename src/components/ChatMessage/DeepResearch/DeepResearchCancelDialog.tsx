import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type TFunction } from "i18next";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeepResearchCancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm?: () => void;
  t?: TFunction;
}

export function DeepResearchCancelDialog({
  open,
  onOpenChange,
  onConfirm,
  t: tProp,
}: DeepResearchCancelDialogProps) {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
    null
  );
  const { t: tOriginal } = useTranslation();
  const t = tProp || tOriginal;

  const confirmCancelResearch = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  return (
    <div ref={setPortalContainer}>
      {portalContainer && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            portalContainer={portalContainer}
            overlayClassName="bg-black/40 backdrop-blur-0"
            className="w-[500px] max-w-[calc(100vw-48px)] rounded-[10px] border border-[#D8D8D8] bg-white p-0 text-[#333] shadow-none dark:border-[#3A3A3A] dark:bg-[#202126] dark:text-white"
          >
            <button
              type="button"
              aria-label={t("common.close", { defaultValue: "Close" })}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md text-[#666] hover:bg-[#F3F4F6] hover:text-[#111827] dark:text-[#A6A6A6] dark:hover:bg-[#2A2B31] dark:hover:text-white"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex min-h-[168px] flex-col justify-between px-5 pb-5 pt-5">
              <DialogHeader className="space-y-4 pr-8 text-left">
                <DialogTitle className="text-[15px] font-medium leading-6 text-[#333] dark:text-white">
                  {t("deepResearch.cancelDialog.title")}
                </DialogTitle>
                <DialogDescription className="text-[14px] leading-6 text-[#666] dark:text-[#CFCFCF]">
                  {t("deepResearch.cancelDialog.description")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 min-w-[82px] rounded-full border-[#E5E5E5] bg-white px-5 text-[13px] font-medium text-[#333] hover:bg-[#F8F8F8] dark:border-[#3A3A3A] dark:bg-[#202126] dark:text-white dark:hover:bg-[#2A2B31]"
                  onClick={() => onOpenChange(false)}
                >
                  {t("deepResearch.cancelDialog.cancel")}
                </Button>
                <Button
                  type="button"
                  className="h-9 min-w-[82px] rounded-full bg-[#2F6FF6] px-5 text-[13px] font-medium text-white hover:bg-[#2763DE]"
                  onClick={confirmCancelResearch}
                >
                  {t("deepResearch.cancelDialog.confirm")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
