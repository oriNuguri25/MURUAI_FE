import { create } from "zustand";

interface ImageFillStore {
  requestId: number;
  imageUrl: string | null;
  label?: string;
  requestImageFill: (imageUrl: string, label?: string) => void;
}

export const useImageFillStore = create<ImageFillStore>((set) => ({
  requestId: 0,
  imageUrl: null,
  label: undefined,
  requestImageFill: (imageUrl, label) =>
    set((state) => ({
      requestId: state.requestId + 1,
      imageUrl,
      label,
    })),
}));
