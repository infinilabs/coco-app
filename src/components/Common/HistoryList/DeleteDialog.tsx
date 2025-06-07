import {
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useTranslation } from "react-i18next";

import VisibleKey from "@/components/Common/VisibleKey";
import { Chat } from "@/types/chat";

interface DeleteDialogProps {
  isOpen: boolean;
  active?: Chat;
  setIsOpen: (isOpen: boolean) => void;
  handleRemove: () => void;
}

const DeleteDialog = ({
  isOpen,
  active,
  setIsOpen,
  handleRemove,
}: DeleteDialogProps) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-1000"
    >
      <div
        id="headlessui-popover-panel:delete-history"
        className="fixed inset-0 flex items-center justify-center w-screen"
      >
        <DialogPanel className="flex flex-col justify-between w-[360px] h-[160px] p-3 text-[#333] dark:text-white/90 border border-[#e6e6e6] bg-white dark:bg-[#202126] dark:border-white/10 shadow-xl rounded-lg">
          <div className="flex flex-col gap-3">
            <DialogTitle className="text-base font-bold">
              {t("history_list.delete_modal.title")}
            </DialogTitle>
            <Description className="text-sm">
              {t("history_list.delete_modal.description", {
                replace: [
                  active?._source?.title ||
                    active?._source?.message ||
                    active?._id,
                ],
              })}
            </Description>
          </div>

          <div className="flex gap-4 self-end">
            <VisibleKey
              shortcut="N"
              shortcutClassName="left-[unset] right-0"
              onKeyPress={() => setIsOpen(false)}
            >
              <button
                className="h-8 px-4 text-sm text-[#666666] bg-[#F8F9FA] dark:text-white dark:bg-[#202126] border border-[#E6E6E6] dark:border-white/10 rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                {t("history_list.delete_modal.button.cancel")}
              </button>
            </VisibleKey>

            <VisibleKey
              shortcut="Y"
              shortcutClassName="left-[unset] right-0"
              onKeyPress={handleRemove}
            >
              <button
                className="h-8 px-4 text-sm text-white bg-[#EF4444] rounded-lg"
                onClick={handleRemove}
              >
                {t("history_list.delete_modal.button.delete")}
              </button>
            </VisibleKey>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default DeleteDialog;
