import { create } from "zustand";
import type { ElementType } from "../model/canvasTypes";

type TextPreset = {
  text: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  alignX?: "left" | "center" | "right";
  alignY?: "top" | "middle" | "bottom";
  widthMode?: "auto" | "fixed" | "element";
};

interface ElementStore {
  requestId: number;
  requestedType: ElementType | null;
  requestedText: TextPreset | null;
  requestElement: (type: ElementType) => void;
  requestText: (preset: TextPreset) => void;
}

export const useElementStore = create<ElementStore>((set) => ({
  requestId: 0,
  requestedType: null,
  requestedText: null,
  requestElement: (type) =>
    set((state) => ({
      requestId: state.requestId + 1,
      requestedType: type,
      requestedText: null,
    })),
  requestText: (preset) =>
    set((state) => ({
      requestId: state.requestId + 1,
      requestedType: "text",
      requestedText: preset,
    })),
}));
