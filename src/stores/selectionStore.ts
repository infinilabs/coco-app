import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import platformAdapter from "@/utils/platformAdapter";

export type ISelectionStore = {
  // whether selection is enabled
  selectionEnabled: boolean;
  setSelectionEnabled: (selectionEnabled: boolean) => void;
  // toolbar buttons configuration for selection window
  toolbarConfig: any[];
  setToolbarConfig: (toolbarConfig: any[]) => void;
  // whether to show icons only (hide labels) in selection window
  iconsOnly: boolean;
  setIconsOnly: (iconsOnly: boolean) => void;
  // initialize cross-window sync listeners once
  initSync: () => Promise<void>;
};

export const useSelectionStore = create<ISelectionStore>()(
  subscribeWithSelector(
    persist(
      (set) => ({
        selectionEnabled: false,
        setSelectionEnabled(selectionEnabled) {
          set({ selectionEnabled });
        },
        toolbarConfig: [],
        setToolbarConfig(toolbarConfig) {
          return set({ toolbarConfig });
        },
        iconsOnly: false,
        setIconsOnly(iconsOnly) {
          set({ iconsOnly });
          // broadcast to other windows
          try {
            platformAdapter.emitEvent("selection-icons-only", { value: iconsOnly });
          } catch {}
        },
        initSync: async () => {
          // ensure listener only initialized once per window context
          const hasInit = (window as any).__selectionIconsOnlyInit__;
          if (hasInit) return;
          (window as any).__selectionIconsOnlyInit__ = true;
          try {
            await platformAdapter.listenEvent(
              "selection-icons-only",
              ({ payload }: any) => {
                const next = Boolean(payload?.value);
                // apply without re-broadcast to avoid echo
                set({ iconsOnly: next });
              }
            );
          } catch {}
        },
      }),
      {
        name: "selection-store",
        partialize: (state) => ({
          toolbarConfig: state.toolbarConfig,
          iconsOnly: state.iconsOnly,
        }),
      }
    )
  )
);