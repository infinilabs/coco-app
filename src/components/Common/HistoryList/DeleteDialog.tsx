import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

import VisibleKey from "@/components/Common/VisibleKey";
import { Chat } from "@/types/chat";
import { KeyboardEvent } from "react";

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

  const handleEnter = (event: KeyboardEvent, cb: () => void) => {
    if (event.code !== "Enter") return;

    event.stopPropagation();
    event.preventDefault();

    cb();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="flex flex-col justify-between w-[360px] h-[160px] p-3 text-[#333] dark:text-white/90 border border-[#e6e6e6] bg-white dark:bg-[#202126] dark:border-white/10 shadow-xl rounded-lg">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-base font-bold">
            {t("history_list.delete_modal.title")}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t("history_list.delete_modal.description", {
              replace: [
                active?._source?.title ||
                  active?._source?.message ||
                  active?._id,
              ],
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 self-end">
          <VisibleKey
            shortcut="N"
            shortcutClassName="left-[unset] right-0"
            onKeyPress={() => setIsOpen(false)}
          >
            <Button
              autoFocus
              className="h-8 px-4 text-sm text-[#666666] bg-[#F8F9FA] dark:text-white dark:bg-[#202126] border border-[#E6E6E6] dark:border-white/10 rounded-lg focus:border-black/30 dark:focus:border-white/50 transition"
              onClick={() => setIsOpen(false)}
              onKeyDown={(event) => {
                handleEnter(event, () => {
                  setIsOpen(false);
                });
              }}
            >
              {t("history_list.delete_modal.button.cancel")}
            </Button>
          </VisibleKey>

          <VisibleKey
            shortcut="Y"
            shortcutClassName="left-[unset] right-0"
            onKeyPress={handleRemove}
          >
            <Button
              className="h-8 px-4 text-sm text-white bg-[#EF4444] rounded-lg border border-[#EF4444] focus:border-black/30 dark:focus:border-white/50 transition"
              onClick={handleRemove}
              onKeyDown={(event) => {
                handleEnter(event, handleRemove);
              }}
            >
              {t("history_list.delete_modal.button.delete")}
            </Button>
          </VisibleKey>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteDialog;
