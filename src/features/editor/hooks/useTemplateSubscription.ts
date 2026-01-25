import {
  useEffect,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import { useTemplateStore } from "../store/templateStore";
import type { Page } from "../model/pageTypes";
import type { TemplateId } from "../templates/templateRegistry";
import type { ReadonlyRef } from "../types/refTypes";

type AddTemplatePage = (args: {
  templateId: TemplateId;
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical" };

type TemplateSubscriptionParams = {
  pages: Page[];
  selectedPageId: string;
  selectedTemplate: TemplateId | null;
  setSelectedTemplate: (templateId: TemplateId | null) => void;
  pagesRef: ReadonlyRef<Page[]>;
  selectedPageIdRef: ReadonlyRef<string>;
  orientationRef: ReadonlyRef<"horizontal" | "vertical">;
  setTemplateChoiceDialog: Dispatch<
    SetStateAction<{ templateId: TemplateId } | null>
  >;
  setPages: Dispatch<SetStateAction<Page[]>>;
  setActivePage: (
    pageId: string,
    nextOrientation?: "horizontal" | "vertical"
  ) => void;
  showEmotionInferenceToast: () => void;
  isApplyingTemplateRef: MutableRefObject<boolean>;
  recordHistory: (label?: string) => void;
  addTemplatePage: AddTemplatePage;
};

export const useTemplateSubscription = ({
  pages,
  selectedPageId,
  selectedTemplate,
  setSelectedTemplate,
  pagesRef,
  selectedPageIdRef,
  orientationRef,
  setTemplateChoiceDialog,
  setPages,
  setActivePage,
  showEmotionInferenceToast,
  isApplyingTemplateRef,
  recordHistory,
  addTemplatePage,
}: TemplateSubscriptionParams) => {
  useEffect(() => {
    const unsubscribe = useTemplateStore.subscribe((state, prevState) => {
      if (state.templateRequestId === prevState.templateRequestId) return;
      if (!state.selectedTemplate) return;

      const currentPageId = selectedPageIdRef.current;
      const currentPage = pagesRef.current.find(
        (page) => page.id === currentPageId
      );

      if (!currentPage) return;

      if (pagesRef.current.length === 1) {
        setTemplateChoiceDialog({ templateId: state.selectedTemplate });
        return;
      }

      setTemplateChoiceDialog(null);

      isApplyingTemplateRef.current = true;
      const result = addTemplatePage({
        templateId: state.selectedTemplate,
        fallbackOrientation: orientationRef.current,
        setPages,
      });
      setActivePage(result.id, result.orientation);
      if (state.selectedTemplate === "emotionInference") {
        showEmotionInferenceToast();
      }

      setTimeout(() => {
        recordHistory("Apply template");
        isApplyingTemplateRef.current = false;
      }, 100);
    });
    return unsubscribe;
  }, [
    addTemplatePage,
    orientationRef,
    pagesRef,
    recordHistory,
    selectedPageIdRef,
    setActivePage,
    setPages,
    setTemplateChoiceDialog,
    showEmotionInferenceToast,
    isApplyingTemplateRef,
  ]);

  useEffect(() => {
    const pageTemplateId =
      pages.find((page) => page.id === selectedPageId)?.templateId ?? null;
    if (pageTemplateId === selectedTemplate) return;
    setSelectedTemplate(pageTemplateId);
  }, [pages, selectedPageId, selectedTemplate, setSelectedTemplate]);
};
