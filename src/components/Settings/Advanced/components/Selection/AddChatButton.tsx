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
        variant="ghost"
        className="inline-flex items-center gap-2 border border-dashed border-border hover:border-primary/50 hover:bg-secondary/50 text-muted-foreground transition-all duration-200"
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
