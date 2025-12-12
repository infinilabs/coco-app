import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
      <DialogContent className="flex flex-col justify-between w-[360px] h-40 p-3 text-[#333] dark:text-white/90 border border-[#e6e6e6] bg-white dark:bg-[#202126] dark:border-white/10 shadow-xl rounded-lg">
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
            onKeyPress={() => {
              setIsOpen(false);
            }}
          >
            <Button
              variant="outline"
              autoFocus
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
              variant="destructive"
              className="text-white"
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
