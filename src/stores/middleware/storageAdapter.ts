import { StateCreator, StoreApi, UseBoundStore, create as createZustand } from "zustand";
import { persist, PersistOptions, subscribeWithSelector } from "zustand/middleware";
import { createTauriStore, TauriPluginZustandStoreOptions } from "@tauri-store/zustand";
import { isWeb } from "@/utils/platform";

type StoreWithPersist<T> = UseBoundStore<StoreApi<T>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createPersistentStore = <T extends object>(
  name: string,
  initializer: StateCreator<T>,
  persistOptions?: Partial<PersistOptions<T>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tauriOptions?: any
) => {
  if (isWeb) {
    return createZustand<T>()(
      subscribeWithSelector(
        persist(initializer, {
          name,
          ...persistOptions,
        })
      )
    );
  } else {
    const store = createZustand<T>()(subscribeWithSelector(initializer));
    // Initialize Tauri store sync
    // The store id must be unique
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createTauriStore(name, store as unknown as StoreApi<any>, tauriOptions as unknown as TauriPluginZustandStoreOptions<any>);
    return store;
  }
};
