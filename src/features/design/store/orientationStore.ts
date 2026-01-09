import { create } from "zustand";

export type Orientation = "horizontal" | "vertical";

interface OrientationStore {
  orientation: Orientation;
  setOrientation: (orientation: Orientation) => void;
}

export const useOrientationStore = create<OrientationStore>((set) => ({
  orientation: "vertical",
  setOrientation: (orientation) => set({ orientation }),
}));
