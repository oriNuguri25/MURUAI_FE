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
import ColorPickerPopover from "../components/ColorPickerPopover";
import type {
  CanvasElement,
  LineElement,
  ShapeElement,
  TextElement,
} from "../model/canvasTypes";
import { useCopyPaste } from "../model/useCopyPaste";
import { useCanvasZoom } from "../model/useCanvasZoom";
import { useTemplateStore } from "../store/templateStore";
import { useOrientationStore } from "../store/orientationStore";
import { useElementStore } from "../store/elementStore";
import { useImageFillStore } from "../store/imageFillStore";
import { useAacBoardStore } from "../store/aacBoardStore";
import { useSideBarStore } from "../store/sideBarStore";
import { useStoryBoardStore } from "../store/storyBoardStore";
import { useUnifiedHistoryStore } from "../store/unifiedHistoryStore";
import { useToastStore } from "../store/toastStore";
import { instantiateTemplate } from "../templates/instantiateTemplate";
import {
  TEMPLATE_REGISTRY,
  type TemplateId,
} from "../templates/templateRegistry";
import {
  buildAacBoardElements,
  type AacBoardConfig,
  type AacBoardElement,
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
import { measureTextBoxSize } from "../utils/textMeasure";
import { supabase } from "@/shared/supabase/supabase";
import BaseModal from "@/shared/ui/BaseModal";

export interface OutletContext {
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
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

const isAacLabelElement = (
  element: CanvasElement
): element is Extract<CanvasElement, { type: "text" }> =>
  element.type === "text" &&
  (element.style.fontSize === 14 || element.style.fontSize === 18) &&
  element.style.fontWeight === "normal" &&
  element.style.color === "#6B7280" &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

const isEmotionLabelElement = (
  element: CanvasElement
): element is Extract<CanvasElement, { type: "text" }> =>
  element.type === "text" &&
  (element.style.fontSize === 14 || element.style.fontSize === 20) &&
  element.style.fontWeight === "normal" &&
  element.style.color === "#111827" &&
  element.style.alignX === "center" &&
  element.style.alignY === "middle";

const isAacCardElement = (
  elements: CanvasElement[],
  element: CanvasElement
): element is Extract<CanvasElement, { type: "rect" | "roundRect" | "ellipse" }> => {
  if (
    element.type !== "rect" &&
    element.type !== "roundRect" &&
    element.type !== "ellipse"
  ) {
    return false;
  }
  const labelId = findLabelElementId(
    elements,
    element,
    isAacLabelElement
  );
  if (labelId) return true;
  if (!element.imageBox) return false;
  const sizeTolerance = 2;
  const hasInsetImageBox =
    Math.abs(element.imageBox.w - element.w) > sizeTolerance ||
    Math.abs(element.imageBox.h - element.h) > sizeTolerance;
  const hasAacBorder =
    element.border?.enabled === true &&
    element.border.color === "#E5E7EB" &&
    element.border.width === 2;
  return hasAacBorder && hasInsetImageBox;
};

const getNextAacCardId = (
  elements: CanvasElement[],
  currentId: string
) => {
  const rowTolerance = mmToPx(2);
  const aacCards = elements.filter((element) =>
    isAacCardElement(elements, element)
  );
  if (aacCards.length === 0) return null;
  const orderedCards = [...aacCards].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > rowTolerance) {
      return yDiff;
    }
    return a.x - b.x;
  });
  const currentIndex = orderedCards.findIndex(
    (element) => element.id === currentId
  );
  if (currentIndex < 0) return null;
  return orderedCards[currentIndex + 1]?.id ?? null;
};

// 감정 추론 활동 카드인지 확인 (labelId가 있고 border 색상이 #A5B4FC인 경우)
const isEmotionInferenceCard = (
  element: CanvasElement
): element is Extract<CanvasElement, { type: "rect" | "roundRect" | "ellipse" }> => {
  if (
    element.type !== "rect" &&
    element.type !== "roundRect" &&
    element.type !== "ellipse"
  ) {
    return false;
  }
  // labelId가 있고 감정 추론 활동 스타일의 border를 가진 카드
  return (
    element.labelId !== undefined &&
    element.border?.enabled === true &&
    element.border.color === "#A5B4FC"
  );
};

const getNextEmotionCardId = (
  elements: CanvasElement[],
  currentId: string
) => {
  const rowTolerance = mmToPx(2);
  const emotionCards = elements.filter((element) =>
    isEmotionInferenceCard(element)
  );
  if (emotionCards.length === 0) return null;
  // 좌→우, 상→하 순서로 정렬
  const orderedCards = [...emotionCards].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > rowTolerance) {
      return yDiff;
    }
    return a.x - b.x;
  });
  const currentIndex = orderedCards.findIndex(
    (element) => element.id === currentId
  );
  if (currentIndex < 0) return null;
  return orderedCards[currentIndex + 1]?.id ?? null;
};

const findLabelElementId = (
  elements: CanvasElement[],
  shape: Extract<CanvasElement, { type: "rect" | "roundRect" | "ellipse" }>,
  isLabelElement: (
    element: CanvasElement
  ) => element is Extract<CanvasElement, { type: "text" }>
) => {
  const shapeLeft = shape.x;
  const shapeRight = shape.x + shape.w;
  const shapeTop = shape.y;
  const shapeBottom = shape.y + shape.h;
  let bestId: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const tolerance = mmToPx(5); // tolerance 확대 (2mm -> 5mm)

  elements.forEach((element) => {
    if (element.type !== "text") return;
    const isLabel = isLabelElement(element);
    if (!isLabel) return;

    const labelLeft = element.x;
    const labelRight = element.x + element.w;
    // 라벨이 shape의 가로 범위 안에 있는지 확인
    const horizontalOverlap =
      Math.abs(labelLeft - shapeLeft) < tolerance &&
      Math.abs(labelRight - shapeRight) < tolerance;
    if (!horizontalOverlap) return;
    // 라벨이 shape의 세로 범위 안이나 근처에 있는지 확인
    const labelCenterY = element.y + element.h / 2;
    const isInsideOrNearShape =
      labelCenterY >= shapeTop - tolerance &&
      labelCenterY <= shapeBottom + tolerance;
    if (!isInsideOrNearShape) return;
    const shapeCenterY = shapeTop + shape.h / 2;
    const distance = Math.abs(labelCenterY - shapeCenterY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestId = element.id;
    }
  });

  return bestId;
};

const applyTemplateToCurrentPage = ({
  templateId,
  currentPageId,
  fallbackOrientation,
  setPages,
}: {
  templateId: TemplateId;
  currentPageId: string;
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const templateDefinition = TEMPLATE_REGISTRY[templateId];
  const templates =
    "pages" in templateDefinition && templateDefinition.pages?.length
      ? templateDefinition.pages
      : [templateDefinition.template];
  const nextOrientation =
    templateDefinition.orientation === "vertical-only"
      ? "vertical"
      : templateDefinition.orientation === "horizontal-only"
      ? "horizontal"
      : fallbackOrientation;

  setPages((prevPages) => {
    const currentIndex = prevPages.findIndex(
      (page) => page.id === currentPageId
    );
    if (currentIndex < 0) return prevPages;

    const nextPages = [...prevPages];
    const basePage = nextPages[currentIndex];
    nextPages[currentIndex] = {
      ...basePage,
      templateId,
      orientation: nextOrientation,
      elements: withLogoCanvasElements(
        instantiateTemplate(templates[0])
      ),
    };

    if (templates.length > 1) {
      const insertedPages = templates.slice(1).map((template) => ({
        id: crypto.randomUUID(),
        pageNumber: 0,
        templateId,
        orientation: nextOrientation,
        elements: withLogoCanvasElements(
          instantiateTemplate(template)
        ),
      }));
      nextPages.splice(currentIndex + 1, 0, ...insertedPages);
    }

    return nextPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));
  });
  return { id: currentPageId, orientation: nextOrientation };
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
  const templates =
    "pages" in templateDefinition && templateDefinition.pages?.length
      ? templateDefinition.pages
      : [templateDefinition.template];
  const nextOrientation =
    templateDefinition.orientation === "vertical-only"
      ? "vertical"
      : templateDefinition.orientation === "horizontal-only"
      ? "horizontal"
      : fallbackOrientation;
  const firstPageId = crypto.randomUUID();
  setPages((prevPages) => {
    const nextPages = [...prevPages];
    templates.forEach((template, index) => {
      const pageId = index === 0 ? firstPageId : crypto.randomUUID();
      nextPages.push({
        id: pageId,
        pageNumber: nextPages.length + 1,
        templateId,
        orientation: nextOrientation,
        elements: withLogoCanvasElements(
          instantiateTemplate(template)
        ),
      });
    });
    return nextPages;
  });
  return { id: firstPageId, orientation: nextOrientation };
};

const addAacBoardPage = ({
  config,
  setPages,
}: {
  config: AacBoardConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => {
  const newPageId = Date.now().toString();
  const aacElements = buildAacBoardElements(config);

  // tempId -> 실제 id 매핑 생성
  const idMap = new Map<string, string>();
  aacElements.forEach((element) => {
    if (element.tempId) {
      idMap.set(element.tempId, crypto.randomUUID());
    }
  });

  const elementsWithLogo = (
    withLogoTemplateElements(aacElements) as AacBoardElement[]
  ).map((element) => {
    const newId = element.tempId
      ? idMap.get(element.tempId)
      : crypto.randomUUID();
    const newLabelId = element.labelId
      ? idMap.get(element.labelId)
      : undefined;
    return {
      ...element,
      id: newId ?? crypto.randomUUID(),
      tempId: undefined,
      labelId: newLabelId,
    };
  });

  const firstSelectableElementId =
    elementsWithLogo.find((element) => !element.locked)?.id ?? null;
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
  return {
    id: newPageId,
    orientation: config.orientation,
    firstElementId: firstSelectableElementId,
  };
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
  // 캔버스 양옆 패딩 10px씩 = 20px
  const canvasPadding = 20;
  const maxAllowedWidth = pageWidth - canvasPadding;
  const { width: measuredWidth, height: measuredHeight } =
    measureTextBoxSize(preset.text, preset.fontSize, preset.fontWeight, {
      lineHeight: 1.2,
      maxWidth: maxAllowedWidth,
    });
  const textWidth = Math.max(measuredWidth, 1);
  const textHeight = Math.max(measuredHeight, 1);
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
    widthMode: "auto",
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
    setZoom,
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
  const showToast = useToastStore((state) => state.showToast);
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
  // Unified History Store
  const historyStore = useUnifiedHistoryStore();
  const undoRequestId = useUnifiedHistoryStore((state) => state.undoRequestId);
  const redoRequestId = useUnifiedHistoryStore((state) => state.redoRequestId);
  const isApplyingHistoryRef = useRef(false);
  const isTransactionActiveRef = useRef(false);
  const isApplyingTemplateRef = useRef(false);
  const [templateChoiceDialog, setTemplateChoiceDialog] = useState<{
    templateId: TemplateId;
  } | null>(null);
  const cloneElementsWithNewIds = (elements: CanvasElement[]) =>
    elements.map((element) => ({
      ...element,
      id: crypto.randomUUID(),
    }));

  const showEmotionInferenceToast = useCallback(() => {
    showToast("자료 제작을 위한 기본세트 페이지 3장이 적용되었습니다.");
  }, [showToast]);

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

  // Initialize history when pages are first loaded
  const isInitializedRef = useRef(false);
  useEffect(() => {
    if (!isInitializedRef.current && pages.length > 0) {
      historyStore.init(pages, selectedPageId, selectedIds);
      isInitializedRef.current = true;
    }
  }, [pages, selectedPageId, selectedIds, historyStore]);

  // Record history when pages change (but not during transaction or history application)
  const lastUndoRequestIdRef = useRef(0);
  const lastRedoRequestIdRef = useRef(0);
  const blockRecordUntilRef = useRef(0);
  const applyHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (isApplyingHistoryRef.current) return;
    if (isApplyingTemplateRef.current) return;

    // Block recording for 100ms after undo/redo
    if (undoRequestId !== lastUndoRequestIdRef.current || redoRequestId !== lastRedoRequestIdRef.current) {
      lastUndoRequestIdRef.current = undoRequestId;
      lastRedoRequestIdRef.current = redoRequestId;
      blockRecordUntilRef.current = Date.now() + 100;
      return;
    }

    if (Date.now() < blockRecordUntilRef.current) return;
    if (historyStore.transactionActive) return;

    historyStore.record(pages, selectedPageId, selectedIds);
  }, [pages, selectedPageId, selectedIds, historyStore, undoRequestId, redoRequestId]);

  // Helper to begin transaction
  const beginTransaction = useCallback(() => {
    if (isTransactionActiveRef.current) return;
    isTransactionActiveRef.current = true;
    historyStore.beginTransaction(
      pagesRef.current,
      selectedPageIdRef.current,
      selectedIdsRef.current
    );
  }, [historyStore]);

  // Helper to commit transaction
  const commitTransaction = useCallback((label?: string) => {
    if (!isTransactionActiveRef.current) return;
    isTransactionActiveRef.current = false;
    historyStore.commitTransaction(
      pagesRef.current,
      selectedPageIdRef.current,
      selectedIdsRef.current,
      label
    );
  }, [historyStore]);

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

  // Handle text editing transaction
  useEffect(() => {
    if (editingTextId) {
      // Start transaction when text editing begins
      if (!isTransactionActiveRef.current) {
        beginTransaction();
      }
    } else {
      // Commit transaction when text editing ends
      if (isTransactionActiveRef.current) {
        commitTransaction("Text edit");
      }
    }
  }, [editingTextId, beginTransaction, commitTransaction]);

  // Handle undo/redo requests
  useEffect(() => {
    const unsubscribe = useUnifiedHistoryStore.subscribe(
      (state, prevState) => {
        const undoChanged = state.undoRequestId !== prevState.undoRequestId;
        const redoChanged = state.redoRequestId !== prevState.redoRequestId;
        if (!undoChanged && !redoChanged) return;
        if (!state.present) return;

        isApplyingHistoryRef.current = true;
        setPages(state.present.pages);
        setSelectedPageId(state.present.selectedPageId);
        setSelectedIds(state.present.selectedIds);

        if (applyHistoryTimeoutRef.current) {
          clearTimeout(applyHistoryTimeoutRef.current);
        }
        applyHistoryTimeoutRef.current = setTimeout(() => {
          isApplyingHistoryRef.current = false;
        }, 150);
      }
    );

    return () => {
      unsubscribe();
      if (applyHistoryTimeoutRef.current) {
        clearTimeout(applyHistoryTimeoutRef.current);
      }
    };
  }, [setPages, setSelectedPageId, setSelectedIds]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) {
          historyStore.requestRedo();
        } else {
          historyStore.requestUndo();
        }
      } else if (event.key.toLowerCase() === "y" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        historyStore.requestRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [historyStore]);

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
        historyStore.record(
          pagesRef.current,
          selectedPageIdRef.current,
          selectedIdsRef.current,
          "Apply template"
        );
        isApplyingTemplateRef.current = false;
      }, 100);
    });
    return unsubscribe;
  }, [setActivePage, historyStore, showEmotionInferenceToast]);
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
      if (newPage.firstElementId) {
        setSelectedIds([newPage.firstElementId]);
        setEditingTextId(null);
      }
    });
    return unsubscribe;
  }, [setActivePage, setEditingTextId, setSelectedIds, setSideBarMenu]);
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
      const normalizedUrl =
        state.imageUrl.startsWith("url(") || state.imageUrl.startsWith("data:")
          ? state.imageUrl
          : `url(${state.imageUrl})`;
      const labelText = state.label?.trim();

      // 선택된 요소가 없으면 독립적인 이미지 요소 생성
      if (activeSelectedIds.length === 0) {
        const newElementId = `element-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

        // 새로 생성된 요소를 선택
        setSelectedIds([newElementId]);
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
                // labelId가 있으면 직접 사용
                if (element.labelId) {
                  labelUpdates.set(element.labelId, labelText);
                } else {
                  // fallback: 기존 방식으로 라벨 찾기
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
            return {
              ...element,
              fill: normalizedUrl,
              imageBox: nextImageBox,
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
          // AAC 카드인 경우
          if (isAacCardElement(activePage.elements, selectedElement)) {
            const nextAacId = getNextAacCardId(
              activePage.elements,
              selectedId
            );
            if (nextAacId) {
              setSelectedIds([nextAacId]);
              setEditingTextId(null);
            }
          }
          // 감정 추론 활동 카드인 경우
          else if (isEmotionInferenceCard(selectedElement)) {
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
    // 페이지 선택 시 요소 선택 해제 (클립보드는 유지하여 페이지 간 복사/붙여넣기 허용)
    setSelectedIds([]);
    setEditingTextId(null);
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

  const handleCopyPage = useCallback((pageId: string) => {
    try {
      sessionStorage.setItem("copiedPageId", pageId);
    } catch {
      // ignore clipboard failures
    }
  }, []);

  const handlePastePage = useCallback(
    (targetPageId: string) => {
      let copiedPageId: string | null = null;
      try {
        copiedPageId = sessionStorage.getItem("copiedPageId");
      } catch {
        copiedPageId = null;
      }
      if (!copiedPageId) return;
      const sourcePage = pages.find((page) => page.id === copiedPageId);
      if (!sourcePage) return;
      const targetIndex = pages.findIndex((page) => page.id === targetPageId);
      if (targetIndex === -1) return;
      const newPage: Page = {
        id: Date.now().toString(),
        pageNumber: targetIndex + 2,
        templateId: sourcePage.templateId,
        orientation: sourcePage.orientation,
        elements: cloneElementsWithNewIds(sourcePage.elements),
      };
      const newPages = [...pages];
      newPages.splice(targetIndex + 1, 0, newPage);
      const reorderedPages = newPages.map((page, index) => ({
        ...page,
        pageNumber: index + 1,
      }));
      setPages(reorderedPages);
      setActivePage(newPage.id, newPage.orientation);
    },
    [pages, setActivePage, setPages]
  );

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
        prevPages.map((page) => {
          if (page.id !== selectedPageId) return page;

          // 삭제할 요소들의 연결된 labelId 수집
          const linkedIds = new Set<string>();
          page.elements.forEach((element) => {
            if (ids.includes(element.id)) {
              if (
                (element.type === "rect" ||
                  element.type === "roundRect" ||
                  element.type === "ellipse") &&
                element.labelId
              ) {
                linkedIds.add(element.labelId);
              }
            }
          });

          // 원래 삭제할 ID + 연결된 ID 모두 삭제
          const allIdsToDelete = new Set([...ids, ...linkedIds]);

          return {
            ...page,
            elements: page.elements.filter(
              (element) => !allIdsToDelete.has(element.id)
            ),
          };
        })
      );
      setSelectedIds([]);
      setEditingTextId(null);
    },
    [selectedPageId]
  );

  const handleClearPage = useCallback((pageId: string) => {
    setPages((prevPages) =>
      prevPages.map((page) =>
        page.id === pageId
          ? { ...page, elements: page.elements.filter((element) => element.locked) }
          : page
      )
    );
    setSelectedIds([]);
    setEditingTextId(null);
    sessionStorage.removeItem("copiedElements");
    sessionStorage.removeItem("copiedElementsMeta");
  }, []);

  // 복사/붙여넣기/삭제 기능 활성화
  useCopyPaste({
    selectedPageId,
    pages,
    selectedIds,
    onDeleteElements: handleDeleteElements,
    onDuplicatePage: handleDuplicatePage,
    onDeletePage: handleDeletePage,
    onClearPage: handleClearPage,
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

  // Ctrl + 마우스 휠로 줌 조절
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom((prev) => Math.min(200, Math.max(10, prev + delta)));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [setZoom]);

  // 선택된 요소 정보 가져오기
  const activePage = pages.find((page) => page.id === selectedPageId);
  const selectedElements = activePage
    ? activePage.elements.filter((element) =>
        selectedIds.includes(element.id)
      )
    : [];
  const activeToolbarElementId =
    selectedIds.length === 1 ? selectedIds[0] : null;
  const isColorTarget = (
    element: CanvasElement
  ): element is TextElement | ShapeElement =>
    element.type === "text" ||
    element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse";
  const isMultiColorSelection =
    selectedElements.length > 1 &&
    selectedElements.every(isColorTarget);
  const multiColorSource =
    isMultiColorSelection
      ? selectedElements.find((element) => !element.locked) ??
        selectedElements[0] ??
        null
      : null;
  const multiColorValue = (() => {
    if (!multiColorSource) return "#000000";
    if (multiColorSource.type === "text") {
      return multiColorSource.style.color ?? "#000000";
    }
    const fill = multiColorSource.fill ?? "#ffffff";
    const isImageFill =
      fill.startsWith("url(") || fill.startsWith("data:");
    return isImageFill ? "#ffffff" : fill;
  })();
  const selectedElement = activeToolbarElementId
    ? activePage?.elements.find((el) => el.id === activeToolbarElementId)
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
      {isMultiColorSelection && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <div
              className="flex items-center gap-2 whitespace-nowrap"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <span className="text-14-regular text-black-60">색상</span>
              <ColorPickerPopover
                value={multiColorValue}
                onChange={(nextColor) => {
                  if (!activePage) return;
                  setPages((prevPages) =>
                    prevPages.map((page) =>
                      page.id === selectedPageId
                        ? {
                            ...page,
                            elements: page.elements.map((el) => {
                              if (
                                !selectedIds.includes(el.id) ||
                                el.locked
                              ) {
                                return el;
                              }
                              if (el.type === "text") {
                                const textElement = el as TextElement;
                                return {
                                  ...textElement,
                                  style: {
                                    ...textElement.style,
                                    color: nextColor,
                                  },
                                };
                              }
                              if (
                                el.type === "rect" ||
                                el.type === "roundRect" ||
                                el.type === "ellipse"
                              ) {
                                return {
                                  ...el,
                                  fill: nextColor,
                                };
                              }
                              return el;
                            }),
                          }
                        : page
                    )
                  );
                }}
              />
              <span className="text-12-regular text-black-70 uppercase">
                {multiColorValue}
              </span>
            </div>
          </div>
        </div>
      )}
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
        // 텍스트 편집 중 레이아웃 변화로 인한 스크롤 점프를 차단한다.
        style={{ padding: "10px", overflowAnchor: "none" }}
        onClick={(e) => {
          // 컨테이너 배경 클릭 시 선택 해제
          if (
            e.target === e.currentTarget ||
            (e.target as HTMLElement).style.display === "inline-flex"
          ) {
            setSelectedIds([]);
            setEditingTextId(null);
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
                  onInteractionChange={(isActive) => {
                    if (isActive) {
                      beginTransaction();
                    } else {
                      commitTransaction("Element interaction");
                    }
                  }}
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
        onCopyPage={handleCopyPage}
        onPastePage={handlePastePage}
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

      {/* Template choice dialog */}
      <BaseModal
        isOpen={!!templateChoiceDialog}
        onClose={() => setTemplateChoiceDialog(null)}
        title="템플릿 적용"
      >
        <div className="flex flex-col gap-4">
          <p className="text-14-regular text-black-70">
            템플릿을 현재 페이지에 적용할까요, 새 페이지로 추가할까요?
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                if (!templateChoiceDialog) return;

                isApplyingTemplateRef.current = true;

                const currentPageId = selectedPageIdRef.current;
                const result = applyTemplateToCurrentPage({
                  templateId: templateChoiceDialog.templateId,
                  currentPageId,
                  fallbackOrientation: orientationRef.current,
                  setPages,
                });
                setActivePage(result.id, result.orientation);
                setTemplateChoiceDialog(null);
                if (templateChoiceDialog.templateId === "emotionInference") {
                  showEmotionInferenceToast();
                }

                setTimeout(() => {
                  historyStore.record(
                    pagesRef.current,
                    selectedPageIdRef.current,
                    selectedIdsRef.current,
                    "Apply template to current page"
                  );
                  isApplyingTemplateRef.current = false;
                }, 100);
              }}
              className="w-full px-4 py-3 text-14-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition"
            >
              현재 페이지에 적용하기
            </button>
            <button
              type="button"
              onClick={() => {
                if (!templateChoiceDialog) return;

                isApplyingTemplateRef.current = true;

                const newPage = addTemplatePage({
                  templateId: templateChoiceDialog.templateId,
                  fallbackOrientation: orientationRef.current,
                  setPages,
                });
                setActivePage(newPage.id, newPage.orientation);
                setTemplateChoiceDialog(null);
                if (templateChoiceDialog.templateId === "emotionInference") {
                  showEmotionInferenceToast();
                }

                setTimeout(() => {
                  historyStore.record(
                    pagesRef.current,
                    selectedPageIdRef.current,
                    selectedIdsRef.current,
                    "Apply template to new page"
                  );
                  isApplyingTemplateRef.current = false;
                }, 100);
              }}
              className="w-full px-4 py-3 text-14-medium text-black-90 bg-white border border-black-25 rounded-lg hover:bg-black-5 transition"
            >
              새로운 페이지에 적용하기
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default MainSection;
