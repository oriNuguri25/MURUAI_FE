import { create } from "zustand";

interface HistoryStore {
  undoRequestId: number;
  redoRequestId: number;
  canUndo: boolean;
  canRedo: boolean;
  requestUndo: () => void;
  requestRedo: () => void;
  setAvailability: (canUndo: boolean, canRedo: boolean) => void;
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  undoRequestId: 0,
  redoRequestId: 0,
  canUndo: false,
  canRedo: false,
  requestUndo: () =>
    set((state) => ({ undoRequestId: state.undoRequestId + 1 })),
  requestRedo: () =>
    set((state) => ({ redoRequestId: state.redoRequestId + 1 })),
  setAvailability: (canUndo, canRedo) => set({ canUndo, canRedo }),
}));
