import { create } from "zustand";

interface ImageFillStore {
  requestId: number;
  imageUrl: string | null;
  label?: string;
  width?: number;
  height?: number;
  requestImageFill: (
    imageUrl: string,
    label?: string,
    size?: { width: number; height: number }
  ) => void;
}

export const useImageFillStore = create<ImageFillStore>((set) => ({
  requestId: 0,
  imageUrl: null,
  label: undefined,
  width: undefined,
  height: undefined,
  requestImageFill: (imageUrl, label, size) =>
    set((state) => ({
      requestId: state.requestId + 1,
      imageUrl,
      label,
      width: size?.width,
      height: size?.height,
    })),
}));
