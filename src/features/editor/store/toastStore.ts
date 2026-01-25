import { create } from "zustand";

interface ToastStore {
  message: string | null;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  message: null,
  showToast: (message) => { set({ message }); },
  clearToast: () => { set({ message: null }); },
}));
