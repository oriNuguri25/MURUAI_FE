import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useOutletContext } from "react-router-dom";
import BottomBar from "../components/BottomBar";
import type { CanvasDocument, Page } from "../model/pageTypes";
import DesignPaper from "../components/DesignPaper";
import SquareToolBar from "../components/template_component/round_box/SquareToolBar";
import ArrowToolBar from "../components/template_component/arrow/ArrowToolBar";
import LineToolBar from "../components/template_component/line/LineToolBar";
import type { ShapeElement, LineElement } from "../model/canvasTypes";
import { useCopyPaste } from "../model/useCopyPaste";
import { useCanvasZoom } from "../model/useCanvasZoom";
import { useTemplateStore } from "../store/templateStore";
import { useOrientationStore } from "../store/orientationStore";
import { useElementStore } from "../store/elementStore";
import { useImageFillStore } from "../store/imageFillStore";
import { useAacBoardStore } from "../store/aacBoardStore";
import { useSideBarStore } from "../store/sideBarStore";
import { useStoryBoardStore } from "../store/storyBoardStore";
import { useHistoryStore } from "../store/historyStore";
import type { CanvasElement } from "../model/canvasTypes";
import { instantiateTemplate } from "../templates/instantiateTemplate";
import {
  TEMPLATE_REGISTRY,
  type TemplateId,
} from "../templates/templateRegistry";
import {
  buildAacBoardElements,
  type AacBoardConfig,
} from "../utils/aacBoardUtils";
import {
  withLogoCanvasElements,
  withLogoTemplateElements,
} from "../utils/logoElement";
import {
  buildStorySequenceElements,
  type StorySequenceConfig,
} from "../utils/storySequenceUtils";
import { updateUserMadeVersion } from "../utils/userMadeExport";
import { supabase } from "@/shared/supabase/supabase";

export interface OutletContext {
  zoom: number;
  orientation: "horizontal" | "vertical";
  setOrientation: Dispatch<SetStateAction<"horizontal" | "vertical">>;
  registerCanvasGetter: (getter: () => CanvasDocument) => void;
  loadedDocument: CanvasDocument | null;
  clearLoadedDocument: () => void;
  loadedDocumentId: string | null;
  docId?: string;
  docName: string;
}

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

type PageHistory = {
  past: CanvasElement[][];
  present: CanvasElement[];
  future: CanvasElement[][];
};

const normalizeOrientationValue = (
  value: unknown,
  fallback: "horizontal" | "vertical"
) => (value === "horizontal" || value === "vertical" ? value : fallback);

const buildInitialPages = (
  document: CanvasDocument | null,
  fallbackOrientation: "horizontal" | "vertical"
) => {
  const nextPages = Array.isArray(document?.pages) ? document.pages : [];
  if (nextPages.length === 0) {
    return [
      {
        id: "1",
        pageNumber: 1,
        templateId: null,
        elements: withLogoCanvasElements([]),
        orientation: fallbackOrientation,
      },
    ];
  }
  return nextPages.map((page, index) => ({
    ...page,
    pageNumber: page.pageNumber ?? index + 1,
    orientation: normalizeOrientationValue(
      page.orientation,
      fallbackOrientation
    ),
    elements: Array.isArray(page.elements) ? page.elements : [],
  }));
};

const cloneElementsForHistory = (elements: CanvasElement[]) =>
  JSON.parse(JSON.stringify(elements)) as CanvasElement[];

const areElementsEqual = (a: CanvasElement[], b: CanvasElement[]) =>
  JSON.stringify(a) === JSON.stringify(b);

const isAacLabelElement = (
  element: CanvasElement
): element is Extract<CanvasElement, { type: "text" }> =>
  element.type === "text" &&
  element.style.fontSize === 14 &&
  element.style.fontWeight === "normal" &&
  element.style.color === "#6B7280" &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

const isEmotionLabelElement = (
  element: CanvasElement
): element is Extract<CanvasElement, { type: "text" }> =>
  element.type === "text" &&
  element.style.fontSize === 14 &&
  element.style.fontWeight === "normal" &&
  element.style.color === "#111827" &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

const isEmotionPlaceholderElement = (
  element: CanvasElement
): element is Extract<CanvasElement, { type: "text" }> =>
  element.type === "text" &&
  element.style.fontSize === 10 &&
  element.style.fontWeight === "normal" &&
  element.style.color === "#A5B4FC" &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

const findLabelElementId = (
  elements: CanvasElement[],
  shape: Extract<CanvasElement, { type: "rect" | "roundRect" | "ellipse" }>,
  isLabelElement: (
    element: CanvasElement
  ) => element is Extract<CanvasElement, { type: "text" }>
) => {
  const centerX = shape.x + shape.w / 2;
  const centerY = shape.y + shape.h / 2;
  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const tolerance = mmToPx(2);

  elements.forEach((element) => {
    if (!isLabelElement(element)) return;
    const labelCenterX = element.x + element.w / 2;
    if (Math.abs(labelCenterX - centerX) > tolerance) return;
    if (Math.abs(element.w - shape.w) > tolerance) return;
    const labelCenterY = element.y + element.h / 2;
    const distance = Math.abs(labelCenterY - centerY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = element.id;
    }
  });

  return bestId;
};

const findOverlayTextElementId = (
  elements: CanvasElement[],
  shape: Extract<CanvasElement, { type: "rect" | "roundRect" | "ellipse" }>,
  isOverlayElement: (
    element: CanvasElement
  ) => element is Extract<CanvasElement, { type: "text" }>
) => {
  const tolerance = mmToPx(1);
  const matched = elements.find((element) => {
    if (!isOverlayElement(element)) return false;
    return (
      Math.abs(element.x - shape.x) <= tolerance &&
      Math.abs(element.y - shape.y) <= tolerance &&
      Math.abs(element.w - shape.w) <= tolerance &&
      Math.abs(element.h - shape.h) <= tolerance
    );
  });
  return matched?.id ?? null;
};

const addTemplatePage = ({
  templateId,
  fallbackOrientation,
  setPages,
}: {
  templateId: TemplateId;
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const templateDefinition = TEMPLATE_REGISTRY[templateId];
  const nextOrientation =
    templateDefinition.orientation === "vertical-only"
      ? "vertical"
      : templateDefinition.orientation === "horizontal-only"
      ? "horizontal"
      : fallbackOrientation;
  const newPageId = Date.now().toString();
  setPages((prevPages) => {
    const newPageNumber = prevPages.length + 1;
    const newPage: Page = {
      id: newPageId,
      pageNumber: newPageNumber,
      templateId,
      orientation: nextOrientation,
      elements: withLogoCanvasElements(
        instantiateTemplate(templateDefinition.template)
      ),
    };
    return [...prevPages, newPage];
  });
  return { id: newPageId, orientation: nextOrientation };
};

const addAacBoardPage = ({
  config,
  setPages,
}: {
  config: AacBoardConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const newPageId = Date.now().toString();
  const elementsWithLogo = withLogoTemplateElements(
    buildAacBoardElements(config)
  ).map((element) => ({
    ...element,
    id: crypto.randomUUID(),
  }));
  setPages((prevPages) => {
    const newPageNumber = prevPages.length + 1;
    const newPage: Page = {
      id: newPageId,
      pageNumber: newPageNumber,
      templateId: null,
      orientation: config.orientation,
      elements: elementsWithLogo,
    };
    return [...prevPages, newPage];
  });
  return { id: newPageId, orientation: config.orientation };
};

const addStoryBoardPage = ({
  config,
  setPages,
}: {
  config: StorySequenceConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const newPageId = Date.now().toString();
  const elementsWithLogo = withLogoTemplateElements(
    buildStorySequenceElements(config)
  ).map((element) => ({
    ...element,
    id: crypto.randomUUID(),
  }));
  setPages((prevPages) => {
    const newPageNumber = prevPages.length + 1;
    const newPage: Page = {
      id: newPageId,
      pageNumber: newPageNumber,
      templateId: null,
      orientation: config.orientation,
      elements: elementsWithLogo,
    };
    return [...prevPages, newPage];
  });
  return { id: newPageId, orientation: config.orientation };
};

const addShapeElement = ({
  pageId,
  elementType,
  setPages,
  getOrientation,
}: {
  pageId: string;
  elementType: "rect" | "roundRect" | "ellipse";
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => {
  const pageOrientation = getOrientation();
  const pageWidth = mmToPx(pageOrientation === "horizontal" ? 297 : 210);
  const pageHeight = mmToPx(pageOrientation === "horizontal" ? 210 : 297);
  const size = mmToPx(78);
  const x = (pageWidth - size) / 2;
  const y = (pageHeight - size) / 2;
  const nextElement: CanvasElement = {
    id: crypto.randomUUID(),
    type: elementType,
    x,
    y,
    w: size,
    h: size,
    fill: "#b7c3ff",
    ...(elementType === "roundRect" ? { radius: mmToPx(8) } : {}),
    border: {
      enabled: false,
      color: "#000000",
      width: 2,
      style: "solid",
    },
  };
  setPages((prevPages) =>
    prevPages.map((page) =>
      page.id === pageId
        ? { ...page, elements: [...page.elements, nextElement] }
        : page
    )
  );
  return nextElement.id;
};

const addTextElement = ({
  pageId,
  preset,
  setPages,
  getOrientation,
}: {
  pageId: string;
  preset: {
    text: string;
    fontSize: number;
    fontWeight: "normal" | "bold";
    alignX?: "left" | "center" | "right";
    alignY?: "top" | "middle" | "bottom";
  };
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => {
  const pageOrientation = getOrientation();
  const pageWidth = mmToPx(pageOrientation === "horizontal" ? 297 : 210);
  const pageHeight = mmToPx(pageOrientation === "horizontal" ? 210 : 297);
  const textLength = Math.max(preset.text.length, 2);
  const textWidth = Math.max(preset.fontSize * textLength * 1.8, 320);
  const textHeight = Math.max(preset.fontSize * 2.2, 80);
  const x = (pageWidth - textWidth) / 2;
  const y = (pageHeight - textHeight) / 2;
  const nextElement: CanvasElement = {
    id: crypto.randomUUID(),
    type: "text",
    x,
    y,
    w: textWidth,
    h: textHeight,
    text: preset.text,
    style: {
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      color: "#000000",
      underline: false,
      alignX: preset.alignX ?? "center",
      alignY: preset.alignY ?? "middle",
    },
  };
  setPages((prevPages) =>
    prevPages.map((page) =>
      page.id === pageId
        ? { ...page, elements: [...page.elements, nextElement] }
        : page
    )
  );
  return nextElement.id;
};

const addLineElement = ({
  pageId,
  elementType,
  setPages,
  getOrientation,
}: {
  pageId: string;
  elementType: "line" | "arrow";
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => {
  const pageOrientation = getOrientation();
  const pageWidth = mmToPx(pageOrientation === "horizontal" ? 297 : 210);
  const pageHeight = mmToPx(pageOrientation === "horizontal" ? 210 : 297);
  const length = mmToPx(80);
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  const nextElement: CanvasElement = {
    id: crypto.randomUUID(),
    type: elementType,
    start: { x: centerX - length / 2, y: centerY },
    end: { x: centerX + length / 2, y: centerY },
    stroke: {
      color: "#000000",
      width: 2,
    },
  };
  setPages((prevPages) =>
    prevPages.map((page) =>
      page.id === pageId
        ? { ...page, elements: [...page.elements, nextElement] }
        : page
    )
  );
  return nextElement.id;
};

const MainSection = () => {
  const {
    zoom,
    orientation,
    setOrientation,
    registerCanvasGetter,
    loadedDocument,
    docId,
    docName,
  } = useOutletContext<OutletContext>();
  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const setSelectedTemplate = useTemplateStore(
    (state) => state.setSelectedTemplate
  );
  const setSideBarMenu = useSideBarStore((state) => state.setSelectedMenu);
  const initialPages = buildInitialPages(loadedDocument, orientation);
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [selectedPageId, setSelectedPageId] = useState<string>(
    initialPages[0].id
  );
  const selectedPageIdRef = useRef(selectedPageId);
  const pagesRef = useRef(pages);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const orientationRef = useRef(orientation);
  const isSyncingOrientationRef = useRef(false);
  const undoRequestId = useHistoryStore((state) => state.undoRequestId);
  const redoRequestId = useHistoryStore((state) => state.redoRequestId);
  const setAvailability = useHistoryStore((state) => state.setAvailability);
  const historyRef = useRef<Record<string, PageHistory>>({});
  const isApplyingHistoryRef = useRef(false);
  const cloneElementsWithNewIds = (elements: CanvasElement[]) =>
    elements.map((element) => ({
      ...element,
      id: crypto.randomUUID(),
    }));

  const normalizeOrientation = useCallback(
    (value: unknown): "horizontal" | "vertical" =>
      normalizeOrientationValue(value, orientation),
    [orientation]
  );

  useEffect(() => {
    orientationRef.current = orientation;
  }, [orientation]);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    selectedPageIdRef.current = selectedPageId;
  }, [selectedPageId]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    if (!docId) return;
    const autoSaveTimeout = setTimeout(async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) return;

        await updateUserMadeVersion({
          docId,
          name: docName || "제목 없음",
          canvasData: { pages },
        });
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 1000);

    return () => clearTimeout(autoSaveTimeout);
  }, [pages, docId, docName]);

  const getCanvasData = useCallback<() => CanvasDocument>(
    () => ({
      pages: pagesRef.current,
    }),
    []
  );

  useEffect(() => {
    registerCanvasGetter(getCanvasData);
  }, [getCanvasData, registerCanvasGetter]);

  const ensureHistory = useCallback(
    (pageId: string, elements: CanvasElement[]) => {
      if (historyRef.current[pageId]) return;
      historyRef.current[pageId] = {
        past: [],
        present: cloneElementsForHistory(elements),
        future: [],
      };
    },
    []
  );

  const updateAvailabilityForPage = useCallback(
    (pageId: string) => {
      const history = historyRef.current[pageId];
      if (!history) {
        setAvailability(false, false);
        return;
      }
      setAvailability(history.past.length > 0, history.future.length > 0);
    },
    [setAvailability]
  );

  const recordHistory = useCallback(
    (pageId: string, nextElements: CanvasElement[]) => {
      ensureHistory(pageId, nextElements);
      const history = historyRef.current[pageId];
      if (!history) return;
      if (isApplyingHistoryRef.current) {
        history.present = cloneElementsForHistory(nextElements);
        isApplyingHistoryRef.current = false;
        return;
      }
      if (areElementsEqual(history.present, nextElements)) return;
      history.past.push(history.present);
      history.present = cloneElementsForHistory(nextElements);
      history.future = [];
      if (pageId === selectedPageIdRef.current) {
        updateAvailabilityForPage(pageId);
      }
    },
    [ensureHistory, updateAvailabilityForPage]
  );

  const applyHistory = useCallback(
    (pageId: string, nextElements: CanvasElement[]) => {
      isApplyingHistoryRef.current = true;
      setPages((prevPages) =>
        prevPages.map((page) =>
          page.id === pageId ? { ...page, elements: nextElements } : page
        )
      );
    },
    []
  );

  const setActivePage = useCallback(
    (pageId: string, nextOrientation?: "horizontal" | "vertical") => {
      setSelectedPageId(pageId);
      setSelectedIds([]);
      setEditingTextId(null);
      const targetOrientation =
        nextOrientation ??
        pages.find((page) => page.id === pageId)?.orientation;
      if (targetOrientation && targetOrientation !== orientationRef.current) {
        isSyncingOrientationRef.current = true;
        setOrientation(targetOrientation);
      }
    },
    [pages, setOrientation]
  );

  useEffect(() => {
    pages.forEach((page) => ensureHistory(page.id, page.elements));
    const pageIds = new Set(pages.map((page) => page.id));
    Object.keys(historyRef.current).forEach((pageId) => {
      if (!pageIds.has(pageId)) {
        delete historyRef.current[pageId];
      }
    });
    const activePage = pages.find((page) => page.id === selectedPageId);
    if (activePage) {
      recordHistory(activePage.id, activePage.elements);
    }
    updateAvailabilityForPage(selectedPageId);
  }, [
    ensureHistory,
    pages,
    recordHistory,
    selectedPageId,
    updateAvailabilityForPage,
  ]);

  useEffect(() => {
    if (!undoRequestId) return;
    const pageId = selectedPageIdRef.current;
    const history = historyRef.current[pageId];
    if (!history || history.past.length === 0) return;
    history.future.unshift(history.present);
    const nextElements = history.past.pop() ?? history.present;
    history.present = nextElements;
    applyHistory(pageId, cloneElementsForHistory(nextElements));
    updateAvailabilityForPage(pageId);
  }, [applyHistory, undoRequestId, updateAvailabilityForPage]);

  useEffect(() => {
    if (!redoRequestId) return;
    const pageId = selectedPageIdRef.current;
    const history = historyRef.current[pageId];
    if (!history || history.future.length === 0) return;
    history.past.push(history.present);
    const nextElements = history.future.shift() ?? history.present;
    history.present = nextElements;
    applyHistory(pageId, cloneElementsForHistory(nextElements));
    updateAvailabilityForPage(pageId);
  }, [applyHistory, redoRequestId, updateAvailabilityForPage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      useHistoryStore.getState().requestUndo();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = useTemplateStore.subscribe((state, prevState) => {
      if (state.templateRequestId === prevState.templateRequestId) return;
      if (!state.selectedTemplate) return;
      const newPage = addTemplatePage({
        templateId: state.selectedTemplate,
        fallbackOrientation: orientationRef.current,
        setPages,
      });
      setActivePage(newPage.id, newPage.orientation);
    });
    return unsubscribe;
  }, [setActivePage]);
  useEffect(() => {
    const unsubscribe = useElementStore.subscribe((state, prevState) => {
      if (state.requestId === prevState.requestId) return;
      if (!state.requestedType) return;
      const activePageId = selectedPageIdRef.current;
      const getOrientation = () =>
        pagesRef.current.find((page) => page.id === activePageId)
          ?.orientation ?? null;
      const elementId =
        state.requestedType === "text"
          ? addTextElement({
              pageId: activePageId,
              preset: state.requestedText ?? {
                text: "텍스트",
                fontSize: 14,
                fontWeight: "normal",
                alignX: "left",
                alignY: "middle",
              },
              setPages,
              getOrientation,
            })
          : state.requestedType === "rect" ||
            state.requestedType === "roundRect" ||
            state.requestedType === "ellipse"
          ? addShapeElement({
              pageId: activePageId,
              elementType: state.requestedType,
              setPages,
              getOrientation,
            })
          : state.requestedType === "line" || state.requestedType === "arrow"
          ? addLineElement({
              pageId: activePageId,
              elementType: state.requestedType,
              setPages,
              getOrientation,
            })
          : null;
      if (!elementId) return;
      setSelectedIds([elementId]);
      setEditingTextId(null);
    });
    return unsubscribe;
  }, []);
  useEffect(() => {
    const pageTemplateId =
      pages.find((page) => page.id === selectedPageId)?.templateId ?? null;
    if (pageTemplateId === selectedTemplate) return;
    setSelectedTemplate(pageTemplateId);
  }, [pages, selectedPageId, selectedTemplate, setSelectedTemplate]);
  useEffect(() => {
    const unsubscribe = useOrientationStore.subscribe((state, prevState) => {
      if (state.orientation === prevState.orientation) return;
      if (isSyncingOrientationRef.current) {
        isSyncingOrientationRef.current = false;
        return;
      }
      const activePageId = selectedPageIdRef.current;
      setPages((prevPages) =>
        prevPages.map((page) =>
          page.id === activePageId
            ? { ...page, orientation: state.orientation }
            : page
        )
      );
    });
    return unsubscribe;
  }, []);
  useEffect(() => {
    const unsubscribe = useAacBoardStore.subscribe((state, prevState) => {
      if (state.requestId === prevState.requestId) return;
      if (!state.config) return;
      const newPage = addAacBoardPage({
        config: state.config,
        setPages,
      });
      setActivePage(newPage.id, newPage.orientation);
      setSideBarMenu("aac");
    });
    return unsubscribe;
  }, [setActivePage, setSideBarMenu]);
  useEffect(() => {
    const unsubscribe = useStoryBoardStore.subscribe((state, prevState) => {
      if (state.requestId === prevState.requestId) return;
      if (!state.config) return;
      const newPage = addStoryBoardPage({
        config: state.config,
        setPages,
      });
      setActivePage(newPage.id, newPage.orientation);
    });
    return unsubscribe;
  }, [setActivePage]);
  useEffect(() => {
    const unsubscribe = useImageFillStore.subscribe((state, prevState) => {
      if (state.requestId === prevState.requestId) return;
      if (!state.imageUrl) return;
      const activePageId = selectedPageIdRef.current;
      const activeSelectedIds = selectedIdsRef.current;
      if (activeSelectedIds.length === 0) return;
      const normalizedUrl =
        state.imageUrl.startsWith("url(") || state.imageUrl.startsWith("data:")
          ? state.imageUrl
          : `url(${state.imageUrl})`;
      const labelText = state.label?.trim();
      setPages((prevPages) =>
        prevPages.map((page) => {
          if (page.id !== activePageId) return page;
          let hasChanges = false;
          const labelUpdates = new Map<string, string>();
          const placeholderUpdates = new Map<string, string>();
          if (labelText) {
            page.elements.forEach((element) => {
              if (
                (element.type === "rect" ||
                  element.type === "roundRect" ||
                  element.type === "ellipse") &&
                activeSelectedIds.includes(element.id)
              ) {
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
            });
          }
          page.elements.forEach((element) => {
            if (
              (element.type === "rect" ||
                element.type === "roundRect" ||
                element.type === "ellipse") &&
              activeSelectedIds.includes(element.id)
            ) {
              const placeholderId = findOverlayTextElementId(
                page.elements,
                element,
                isEmotionPlaceholderElement
              );
              if (placeholderId) {
                placeholderUpdates.set(placeholderId, "");
              }
            }
          });
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
            return {
              ...element,
              fill: normalizedUrl,
              imageBox: {
                x: 0,
                y: 0,
                w: element.w,
                h: element.h,
              },
            };
          });
          if (labelUpdates.size === 0 && placeholderUpdates.size === 0) {
            return hasChanges ? { ...page, elements: nextElements } : page;
          }
          const nextElementsWithLabels = nextElements.map((element) => {
            const nextLabel = labelUpdates.get(element.id);
            const nextPlaceholder = placeholderUpdates.get(element.id);
            if (!nextLabel && nextPlaceholder === undefined) return element;
            if (element.type !== "text") return element;
            hasChanges = true;
            return {
              ...element,
              text: nextLabel ?? nextPlaceholder ?? element.text,
            };
          });
          return hasChanges
            ? { ...page, elements: nextElementsWithLabels }
            : page;
        })
      );
    });
    return unsubscribe;
  }, []);

  const handleAddPage = () => {
    const newPageNumber = pages.length + 1;
    const newPage: Page = {
      id: Date.now().toString(),
      pageNumber: newPageNumber,
      templateId: null,
      elements: withLogoCanvasElements([]),
      orientation,
    };
    setPages([...pages, newPage]);
    setActivePage(newPage.id, newPage.orientation);
  };

  const handleAddPageAtIndex = (index: number) => {
    const newPage: Page = {
      id: Date.now().toString(),
      pageNumber: index + 1, // 임시 번호
      templateId: null,
      elements: withLogoCanvasElements([]),
      orientation,
    };

    // 지정된 인덱스에 새 페이지 삽입
    const newPages = [...pages];
    newPages.splice(index, 0, newPage);

    // 페이지 번호 재정렬
    const reorderedPages = newPages.map((page, idx) => ({
      ...page,
      pageNumber: idx + 1,
    }));

    setPages(reorderedPages);
    setActivePage(newPage.id, newPage.orientation);
  };

  const handleSelectPage = (pageId: string) => {
    setActivePage(pageId);
    // 페이지 선택 시 요소 선택 해제 및 클립보드 초기화
    setSelectedIds([]);
    setEditingTextId(null);
    sessionStorage.removeItem("copiedElements");
  };

  const handleReorderPages = (reorderedPages: Page[]) => {
    setPages(reorderedPages);
  };

  const handleDuplicatePage = (pageId: string) => {
    const pageToDuplicate = pages.find((page) => page.id === pageId);
    if (!pageToDuplicate) return;

    const pageIndex = pages.findIndex((page) => page.id === pageId);
    const newPage: Page = {
      id: Date.now().toString(),
      pageNumber: pageIndex + 2, // 임시 번호
      templateId: pageToDuplicate.templateId,
      orientation: pageToDuplicate.orientation,
      elements: cloneElementsWithNewIds(pageToDuplicate.elements),
    };

    // 복사된 페이지를 원본 페이지 바로 다음에 삽입
    const newPages = [...pages];
    newPages.splice(pageIndex + 1, 0, newPage);

    // 페이지 번호 재정렬
    const reorderedPages = newPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));

    setPages(reorderedPages);
    setActivePage(newPage.id, newPage.orientation);
  };

  const handleDeletePage = (pageId: string) => {
    if (pages.length <= 1) return;

    const updatedPages = pages
      .filter((page) => page.id !== pageId)
      .map((page, index) => ({
        ...page,
        pageNumber: index + 1,
      }));

    setPages(updatedPages);

    // 삭제된 페이지가 선택되어 있었다면 첫 번째 페이지 선택
    if (selectedPageId === pageId) {
      setActivePage(updatedPages[0].id, updatedPages[0].orientation);
    }
  };

  const handleDeleteElements = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      setPages((prevPages) =>
        prevPages.map((page) =>
          page.id === selectedPageId
            ? {
                ...page,
                elements: page.elements.filter(
                  (element) => !ids.includes(element.id)
                ),
              }
            : page
        )
      );
      setSelectedIds([]);
      setEditingTextId(null);
    },
    [selectedPageId]
  );

  // 복사/붙여넣기/삭제 기능 활성화
  useCopyPaste({
    selectedPageId,
    pages,
    selectedIds,
    onDeleteElements: handleDeleteElements,
    onDuplicatePage: handleDuplicatePage,
    onDeletePage: handleDeletePage,
  });

  const selectedPage = pages.find((page) => page.id === selectedPageId);
  const activeOrientation = selectedPage?.orientation ?? orientation;
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas 확대/축소 훅 사용
  const { canvasRef, scale, padding, paperWidth, paperHeight } = useCanvasZoom({
    zoom,
    pageId: selectedPageId,
    containerRef,
    orientation: activeOrientation,
  });

  // 선택된 요소 정보 가져오기
  const activePage = pages.find((page) => page.id === selectedPageId);
  const selectedElement =
    selectedIds.length === 1
      ? activePage?.elements.find((el) => el.id === selectedIds[0])
      : null;

  // 선택된 line/arrow 요소의 툴바 정보
  const lineToolbarData = (() => {
    if (
      !selectedElement ||
      selectedElement.locked ||
      (selectedElement.type !== "line" && selectedElement.type !== "arrow")
    ) {
      return null;
    }

    const element = selectedElement as LineElement;
    const stroke = element.stroke ?? { color: "#000000", width: 2 };
    return {
      element,
      stroke,
    };
  })();

  // 선택된 shape 요소의 툴바 정보
  const shapeToolbarData = (() => {
    if (
      !selectedElement ||
      selectedElement.locked ||
      (selectedElement.type !== "rect" &&
        selectedElement.type !== "roundRect" &&
        selectedElement.type !== "ellipse")
    ) {
      return null;
    }

    const element = selectedElement as ShapeElement;
    const rect = {
      x: element.x,
      y: element.y,
      width: element.w,
      height: element.h,
    };
    const radius =
      element.type === "roundRect"
        ? element.radius ?? 0
        : element.type === "ellipse"
        ? Math.min(rect.width, rect.height) / 2
        : 0;
    const maxRadius = Math.min(rect.width, rect.height) / 2;
    const minRadius = 0;
    const clampRadius = (value: number) =>
      Math.min(maxRadius, Math.max(minRadius, value));
    const isImageFill =
      element.fill.startsWith("url(") || element.fill.startsWith("data:");
    const colorValue = isImageFill ? "#ffffff" : element.fill;
    const borderEnabled = element.border?.enabled ?? false;
    const borderColor = element.border?.color ?? "#000000";
    const borderWidth = element.border?.width ?? 2;
    const borderStyle = element.border?.style ?? "solid";

    return {
      element,
      rect,
      radius,
      minRadius,
      maxRadius,
      clampRadius,
      colorValue,
      borderEnabled,
      borderColor,
      borderWidth,
      borderStyle,
    };
  })();

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden bg-black-20">
      <div
        id="text-toolbar-root"
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none"
      />
      {/* 상단 툴바 영역 */}
      {shapeToolbarData && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <SquareToolBar
              isVisible
              showRadius={shapeToolbarData.element.type !== "ellipse"}
              borderRadius={shapeToolbarData.radius}
              minBorderRadius={shapeToolbarData.minRadius}
              maxBorderRadius={shapeToolbarData.maxRadius}
              color={shapeToolbarData.colorValue}
              borderEnabled={shapeToolbarData.borderEnabled}
              borderColor={shapeToolbarData.borderColor}
              borderWidth={shapeToolbarData.borderWidth}
              borderStyle={shapeToolbarData.borderStyle}
              width={shapeToolbarData.rect.width}
              height={shapeToolbarData.rect.height}
              minWidth={1}
              minHeight={1}
              onBorderRadiusChange={(value: number) => {
                if (!activePage) return;
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === shapeToolbarData.element.id
                              ? {
                                  ...el,
                                  radius: shapeToolbarData.clampRadius(value),
                                }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onBorderRadiusStep={(delta: number) => {
                if (!activePage) return;
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === shapeToolbarData.element.id
                              ? {
                                  ...el,
                                  radius: shapeToolbarData.clampRadius(
                                    shapeToolbarData.radius + delta
                                  ),
                                }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onColorChange={(color: string) => {
                if (!activePage) return;
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === shapeToolbarData.element.id
                              ? { ...el, fill: color }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onImageUpload={(imageUrl: string) => {
                if (!activePage) return;
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === shapeToolbarData.element.id
                              ? {
                                  ...el,
                                  fill: imageUrl,
                                  imageBox: {
                                    x: 0,
                                    y: 0,
                                    w: shapeToolbarData.rect.width,
                                    h: shapeToolbarData.rect.height,
                                  },
                                }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onBorderEnabledChange={(enabled: boolean) => {
                if (!activePage) return;
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === shapeToolbarData.element.id
                              ? {
                                  ...el,
                                  border: {
                                    enabled,
                                    color: shapeToolbarData.borderColor,
                                    width: shapeToolbarData.borderWidth,
                                    style: shapeToolbarData.borderStyle,
                                  },
                                }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onBorderStyleChange={(
                style: "solid" | "dashed" | "dotted" | "double"
              ) => {
                if (!activePage) return;
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === shapeToolbarData.element.id
                              ? {
                                  ...el,
                                  border: {
                                    enabled: true,
                                    color: shapeToolbarData.borderColor,
                                    width: shapeToolbarData.borderWidth,
                                    style,
                                  },
                                }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onBorderColorChange={(color: string) => {
                if (!activePage) return;
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === shapeToolbarData.element.id
                              ? ({
                                  ...el,
                                  border: {
                                    ...shapeToolbarData.element.border,
                                    color,
                                    enabled:
                                      shapeToolbarData.element.border
                                        ?.enabled ?? false,
                                  },
                                } as CanvasElement)
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onBorderWidthChange={(value: number) => {
                if (!activePage) return;
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === shapeToolbarData.element.id
                              ? ({
                                  ...el,
                                  border: {
                                    ...shapeToolbarData.element.border,
                                    width: value,
                                    enabled:
                                      shapeToolbarData.element.border
                                        ?.enabled ?? false,
                                  },
                                } as CanvasElement)
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onSizeChange={(width: number, height: number) => {
                if (!activePage) return;
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === shapeToolbarData.element.id
                              ? {
                                  ...el,
                                  w: width,
                                  h: height,
                                }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Line 툴바 */}
      {lineToolbarData && lineToolbarData.element.type === "line" && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <LineToolBar
              isVisible
              color={lineToolbarData.stroke.color}
              width={lineToolbarData.stroke.width}
              onColorChange={(color: string) => {
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === lineToolbarData.element.id
                              ? {
                                  ...el,
                                  stroke: {
                                    ...lineToolbarData.stroke,
                                    color,
                                  },
                                }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onWidthChange={(width: number) => {
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === lineToolbarData.element.id
                              ? {
                                  ...el,
                                  stroke: {
                                    ...lineToolbarData.stroke,
                                    width,
                                  },
                                }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Arrow 툴바 */}
      {lineToolbarData && lineToolbarData.element.type === "arrow" && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <ArrowToolBar
              isVisible
              color={lineToolbarData.stroke.color}
              width={lineToolbarData.stroke.width}
              onColorChange={(color: string) => {
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === lineToolbarData.element.id
                              ? {
                                  ...el,
                                  stroke: {
                                    ...lineToolbarData.stroke,
                                    color,
                                  },
                                }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onWidthChange={(width: number) => {
                setPages((prevPages) =>
                  prevPages.map((page) =>
                    page.id === selectedPageId
                      ? {
                          ...page,
                          elements: page.elements.map((el) =>
                            el.id === lineToolbarData.element.id
                              ? {
                                  ...el,
                                  stroke: {
                                    ...lineToolbarData.stroke,
                                    width,
                                  },
                                }
                              : el
                          ),
                        }
                      : page
                  )
                );
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="flex-1 w-full min-h-0 overflow-auto"
        style={{ padding: "10px" }}
        onClick={(e) => {
          // 컨테이너 배경 클릭 시 선택 해제
          if (
            e.target === e.currentTarget ||
            (e.target as HTMLElement).style.display === "inline-flex"
          ) {
            setSelectedIds([]);
            setEditingTextId(null);
            sessionStorage.removeItem("copiedElements");
          }
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "100%",
            minHeight: "100%",
          }}
          onClick={(e) => {
            // 내부 wrapper 클릭 시에도 선택 해제
            if (e.target === e.currentTarget) {
              setSelectedIds([]);
              setEditingTextId(null);
              sessionStorage.removeItem("copiedElements");
            }
          }}
        >
          <div style={{ position: "relative" }}>
            <canvas
              ref={canvasRef}
              style={{
                display: "block",
                imageRendering: "crisp-edges",
              }}
            />
            {/* DesignPaper를 Canvas 위에 오버레이로 배치 */}
            <div
              style={{
                position: "absolute",
                top: `${padding}px`,
                left: `${padding}px`,
                width: `${paperWidth}px`,
                height: `${paperHeight}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                pointerEvents: "all",
              }}
            >
              {selectedPage && (
                <DesignPaper
                  key={selectedPage.id}
                  pageId={selectedPage.id}
                  orientation={activeOrientation}
                  elements={selectedPage.elements}
                  selectedIds={selectedIds}
                  editingTextId={editingTextId}
                  onSelectedIdsChange={setSelectedIds}
                  onEditingTextIdChange={setEditingTextId}
                  onElementsChange={(nextElements) =>
                    setPages((prevPages) =>
                      prevPages.map((page) =>
                        page.id === selectedPageId
                          ? { ...page, elements: nextElements }
                          : page
                      )
                    )
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>
      <BottomBar
        pages={pages}
        selectedPageId={selectedPageId}
        onAddPage={handleAddPage}
        onSelectPage={handleSelectPage}
        onReorderPages={handleReorderPages}
        onDeletePage={handleDeletePage}
        onAddPageAtIndex={handleAddPageAtIndex}
      />
      <div
        className="fixed pointer-events-none"
        style={{
          top: "-999999px",
          left: "-999999px",
          zIndex: -9999,
          position: "fixed",
        }}
        aria-hidden="true"
      >
        {pages.map((page) => {
          const normalizedOrientation = normalizeOrientation(page.orientation);
          return (
            <div
              key={`pdf-${page.id}`}
              className="pdf-page"
              data-orientation={normalizedOrientation}
              style={{ display: "inline-block" }}
            >
              <DesignPaper
                pageId={`pdf-${page.id}`}
                orientation={normalizedOrientation}
                elements={page.elements}
                selectedIds={[]}
                editingTextId={null}
                readOnly
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MainSection;
