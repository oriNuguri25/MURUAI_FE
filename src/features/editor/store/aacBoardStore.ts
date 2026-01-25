import { create } from "zustand";
import type { AacBoardConfig } from "../utils/aacBoardUtils";

interface AacBoardStore {
  requestId: number;
  config: AacBoardConfig | null;
  requestBoard: (config: AacBoardConfig) => void;
}

export const useAacBoardStore = create<AacBoardStore>((set) => ({
  requestId: 0,
  config: null,
  requestBoard: (config) =>
    set((state) => ({
      requestId: state.requestId + 1,
      config,
    })),
}));
