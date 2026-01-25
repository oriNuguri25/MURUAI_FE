import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useImageFillStore } from "../store/imageFillStore";
import type { Page } from "../model/pageTypes";
import type { ShapeElement } from "../model/canvasTypes";
import type { ReadonlyRef } from "../types/refTypes";
import {
  findLabelElementId,
  getNextAacCardId,
  getNextEmotionCardId,
  isAacCardElement,
  isAacLabelElement,
  isEmotionInferenceCard,
  isEmotionLabelElement,
} from "../utils/imageFillUtils";
import { isEmotionSlotShape } from "../utils/designPaperUtils";

type ImageFillSubscriptionParams = {
  pagesRef: ReadonlyRef<Page[]>;
  selectedPageIdRef: ReadonlyRef<string>;
  selectedIdsRef: ReadonlyRef<string[]>;
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
};

export const useImageFillSubscription = ({
  pagesRef,
  selectedPageIdRef,
  selectedIdsRef,
  setPages,
  setSelectedIds,
  setEditingTextId,
}: ImageFillSubscriptionParams) => {
  useEffect(() => {
    const unsubscribe = useImageFillStore.subscribe((state, prevState) => {
      if (state.requestId === prevState.requestId) return;
      if (!state.imageUrl) return;
      const shouldForceInsert = state.forceInsert === true;
      const activePageId = selectedPageIdRef.current;
      const activePage = pagesRef.current.find(
        (page) => page.id === activePageId
      );
      const baseSelectedIds = selectedIdsRef.current;
      const hasFillableSelection =
        shouldForceInsert &&
        activePage &&
        baseSelectedIds.some((id) => {
          const element = activePage.elements.find((item) => item.id === id);
          if (!element) return false;
          return (
            isEmotionInferenceCard(element) ||
            isEmotionSlotShape(element) ||
            isAacCardElement(activePage.elements, element)
          );
        });
      const activeSelectedIds =
        shouldForceInsert && !hasFillableSelection ? [] : baseSelectedIds;
      const normalizedUrl =
        state.imageUrl.startsWith("url(") || state.imageUrl.startsWith("data:")
          ? state.imageUrl
          : `url(${state.imageUrl})`;
      const labelText = state.label?.trim();

      if (activeSelectedIds.length === 0) {
        const newElementId = `element-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 9)}`;
        const defaultWidth = state.width ?? 200;
        const defaultHeight =
          state.height ?? Math.round(defaultWidth * (240 / 200));
        const newImageElement: ShapeElement = {
          id: newElementId,
          type: "rect",
          x: 100,
          y: 100,
          w: defaultWidth,
          h: defaultHeight,
          fill: normalizedUrl,
          imageBox: {
            x: 0,
            y: 0,
            w: defaultWidth,
            h: defaultHeight,
          },
        };

        setPages((prevPages) =>
          prevPages.map((page) => {
            if (page.id !== activePageId) return page;
            return {
              ...page,
              elements: [...page.elements, newImageElement],
            };
          })
        );

        setSelectedIds([newElementId]);
        if (shouldForceInsert) {
          setEditingTextId(null);
        }
        return;
      }

      setPages((prevPages) =>
        prevPages.map((page) => {
          if (page.id !== activePageId) return page;
          let hasChanges = false;
          const labelUpdates = new Map<string, string>();
          if (labelText) {
            page.elements.forEach((element) => {
              if (
                (element.type === "rect" ||
                  element.type === "roundRect" ||
                  element.type === "ellipse") &&
                activeSelectedIds.includes(element.id)
              ) {
                if (element.labelId) {
                  labelUpdates.set(element.labelId, labelText);
                } else {
                  const aacLabelId = findLabelElementId(
                    page.elements,
                    element,
                    isAacLabelElement
                  );
                  if (aacLabelId) {
                    labelUpdates.set(aacLabelId, labelText);
                  }
                  const emotionLabelId = findLabelElementId(
                    page.elements,
                    element,
                    isEmotionLabelElement
                  );
                  if (emotionLabelId) {
                    labelUpdates.set(emotionLabelId, labelText);
                  }
                }
              }
            });
          }
          const nextElements = page.elements.map((element) => {
            if (!activeSelectedIds.includes(element.id)) return element;
            if (
              element.type !== "rect" &&
              element.type !== "roundRect" &&
              element.type !== "ellipse"
            ) {
              return element;
            }
            if (element.locked) return element;
            hasChanges = true;
            const baseImageBox = element.imageBox ?? {
              x: 0,
              y: 0,
              w: element.w,
              h: element.h,
            };
            const borderWidth =
              element.border?.enabled ? element.border.width : 0;
            const nextImageBox =
              borderWidth > 0 && isAacCardElement(page.elements, element)
                ? {
                    ...baseImageBox,
                    x: Math.round(
                      (Math.max(0, element.w - borderWidth * 2) -
                        baseImageBox.w) /
                        2
                    ),
                  }
                : baseImageBox;
            const shouldClearPlaceholder =
              isEmotionSlotShape(element) &&
              typeof element.text === "string" &&
              element.text.trim() === "감정을 선택해주세요";
            return {
              ...element,
              fill: normalizedUrl,
              imageBox: nextImageBox,
              text: shouldClearPlaceholder ? "" : element.text,
            };
          });
          if (labelUpdates.size === 0) {
            return hasChanges ? { ...page, elements: nextElements } : page;
          }
          const nextElementsWithLabels = nextElements.map((element) => {
            const nextLabel = labelUpdates.get(element.id);
            if (!nextLabel) return element;
            if (element.type !== "text") return element;
            hasChanges = true;
            return {
              ...element,
              text: nextLabel,
              richText: nextLabel,
            };
          });
          return hasChanges
            ? { ...page, elements: nextElementsWithLabels }
            : page;
        })
      );

      if (activeSelectedIds.length === 1) {
        const activePage = pagesRef.current.find(
          (page) => page.id === activePageId
        );
        const selectedId = activeSelectedIds[0];
        const selectedElement = activePage?.elements.find(
          (element) => element.id === selectedId
        );
        if (activePage && selectedElement) {
          if (isAacCardElement(activePage.elements, selectedElement)) {
            const nextAacId = getNextAacCardId(
              activePage.elements,
              selectedId
            );
            if (nextAacId) {
              setSelectedIds([nextAacId]);
              setEditingTextId(null);
            }
          } else if (isEmotionInferenceCard(selectedElement)) {
            const nextEmotionId = getNextEmotionCardId(
              activePage.elements,
              selectedId
            );
            if (nextEmotionId) {
              setSelectedIds([nextEmotionId]);
              setEditingTextId(null);
            }
          }
        }
      }
    });
    return unsubscribe;
  }, [
    pagesRef,
    selectedPageIdRef,
    selectedIdsRef,
    setPages,
    setSelectedIds,
    setEditingTextId,
  ]);
};
