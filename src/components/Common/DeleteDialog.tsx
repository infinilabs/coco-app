import {
  Button,
  ButtonProps,
  Description,
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { FC, KeyboardEvent } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

import VisibleKey from "./VisibleKey";
import { useTranslation } from "react-i18next";

interface DeleteDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  deleteButtonProps?: ButtonProps;
  cancelButtonProps?: ButtonProps;
  reverseButtonPosition?: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onCancel: () => void;
  onDelete: () => void;
}

const DeleteDialog: FC<DeleteDialogProps> = (props) => {
  const {
    isOpen,
    setIsOpen,
    title,
    description,
    deleteButtonProps,
    cancelButtonProps,
    reverseButtonPosition,
    onCancel,
    onDelete,
  } = props;
  const { t } = useTranslation();

  const handleEnter = (event: KeyboardEvent, fn: () => void) => {
    if (event.code !== "Enter") return;

    event.stopPropagation();
    event.preventDefault();

    fn();
  };

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
        <DialogPanel className="flex flex-col justify-between w-[360px] h-[160px] p-3 text-[#333] dark:text-white/90 border border-[#e6e6e6] bg-white dark:bg-[#202126] dark:border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.2)] rounded-lg dark:shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
          <div className="flex flex-col gap-3">
            <DialogTitle className="text-base font-bold">{title}</DialogTitle>
            <Description className="text-sm">{description}</Description>
          </div>

          <div
            className={clsx("flex gap-4 self-end", {
              "flex-row-reverse": reverseButtonPosition,
            })}
          >
            <VisibleKey
              shortcut="N"
              shortcutClassName="left-[unset] right-0"
              onKeyPress={onCancel}
            >
              <Button
                {...cancelButtonProps}
                autoFocus
                className={twMerge(
                  "h-8 px-4 text-sm text-[#666666] bg-[#F8F9FA] dark:text-white dark:bg-[#202126] border border-[#E6E6E6] dark:border-white/10 rounded-lg focus:border-black/30 dark:focus:border-white/50 transition",
                  cancelButtonProps?.className as string
                )}
                onClick={onCancel}
                onKeyDown={(event) => {
                  handleEnter(event, onCancel);
                }}
              >
                {t("deleteDialog.button.cancel")}
              </Button>
            </VisibleKey>

            <VisibleKey
              shortcut="Y"
              shortcutClassName="left-[unset] right-0"
              onKeyPress={onDelete}
            >
              <Button
                {...deleteButtonProps}
                className={twMerge(
                  "h-8 px-4 text-sm text-white bg-[#EF4444] rounded-lg border border-[#EF4444] focus:border-black/30 dark:focus:border-white/50 transition",
                  deleteButtonProps?.className as string
                )}
                onClick={onDelete}
                onKeyDown={(event) => {
                  handleEnter(event, onDelete);
                }}
              >
                {t("deleteDialog.button.delete")}
              </Button>
            </VisibleKey>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export default DeleteDialog;
