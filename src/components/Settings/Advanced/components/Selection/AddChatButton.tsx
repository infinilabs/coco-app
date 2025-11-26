import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonConfig } from "./config";
import AddChatDialog from "./AddChatDialog";

interface AddChatButtonProps {
  serverList: any[];
  onAdd: (btn: ButtonConfig) => void;
}

export function AddChatButton({ serverList, onAdd }: AddChatButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="pt-1">
      <Button
        variant="secondary"
        className="inline-flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4" />
        {t("selection.actions.addChat")}
      </Button>

      <AddChatDialog
        serverList={serverList}
        open={open}
        onOpenChange={setOpen}
        onAdd={onAdd}
      />
    </div>
  );
}
