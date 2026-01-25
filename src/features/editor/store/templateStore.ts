import { create } from "zustand";
import type { TemplateId } from "../templates/templateRegistry";

interface TemplateStore {
  selectedTemplate: TemplateId | null;
  templateRequestId: number;
  requestTemplate: (templateId: TemplateId) => void;
  setSelectedTemplate: (templateId: TemplateId | null) => void;
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  selectedTemplate: null,
  templateRequestId: 0,
  requestTemplate: (templateId) =>
    set((state) => ({
      selectedTemplate: templateId,
      templateRequestId: state.templateRequestId + 1,
    })),
  setSelectedTemplate: (templateId) => set({ selectedTemplate: templateId }),
}));
