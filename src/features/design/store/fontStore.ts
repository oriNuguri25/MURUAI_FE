import { create } from "zustand";

type FontPayload = {
  fontFamily?: string;
  fontWeight?: number;
};

interface FontStore {
  requestId: number;
  request: FontPayload | null;
  panelFontFamily: string;
  panelFontWeight: number;
  setPanelFont: (payload: Required<FontPayload>) => void;
  applyFont: (payload: FontPayload) => void;
}

export const useFontStore = create<FontStore>((set) => ({
  requestId: 0,
  request: null,
  panelFontFamily: "Pretendard",
  panelFontWeight: 400,
  setPanelFont: (payload) =>
    set({
      panelFontFamily: payload.fontFamily,
      panelFontWeight: payload.fontWeight,
    }),
  applyFont: (payload) =>
    set((state) => ({
      requestId: state.requestId + 1,
      request: payload,
      panelFontFamily: payload.fontFamily ?? state.panelFontFamily,
      panelFontWeight: payload.fontWeight ?? state.panelFontWeight,
    })),
}));
