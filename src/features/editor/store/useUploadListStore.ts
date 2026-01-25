import { create } from "zustand";

interface UploadListStore {
  refetchTrigger: number;
  triggerRefetch: () => void;
}

export const useUploadListStore = create<UploadListStore>((set) => ({
  refetchTrigger: 0,
  triggerRefetch: () =>
    set((state) => ({ refetchTrigger: state.refetchTrigger + 1 })),
}));
