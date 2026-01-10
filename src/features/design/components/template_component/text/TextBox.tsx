import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import type { Rect, ResizeHandle } from "../../../model/canvasTypes";
import { getScale } from "../../../utils/domUtils";
import TextToolBar from "./TextToolBar";

interface TextBoxProps {
  text: string;
  richText?: string;
  editable?: boolean;
  rect: Rect;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  showChrome?: boolean;
  textClassName?: string;
  textStyle?: CSSProperties;
  textAlign?: "left" | "center" | "right";
  textAlignY?: "top" | "middle" | "bottom";
  isSelected?: boolean;
  isEditing?: boolean;
  locked?: boolean;
  widthMode?: "auto" | "fixed";
  showToolbar?: boolean;
  toolbar?: {
    offset?: number;
    minFontSize: number;
    maxFontSize: number;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    color: string;
    isBold: boolean;
    isUnderline: boolean;
    align: "left" | "center" | "right";
    alignY: "top" | "middle" | "bottom";
    onFontSizeChange: (value: number) => void;
    onFontSizeStep: (delta: number) => void;
    onLineHeightChange: (value: number) => void;
    onLetterSpacingChange: (value: number) => void;
    onColorChange: (value: string) => void;
    onToggleBold: () => void;
    onToggleUnderline: () => void;
    onAlignChange: (value: "left" | "center" | "right") => void;
    onAlignYChange: (value: "top" | "middle" | "bottom") => void;
  };
  onTextChange?: (text: string, richText?: string) => void;
  onRectChange?: (rect: Rect) => void;
  onWidthModeChange?: (mode: "auto" | "fixed") => void;
  onDragStateChange?: (
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize"; handle?: ResizeHandle }
  ) => void;
  onSelectChange?: (isSelected: boolean, options?: { additive?: boolean }) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onStartEditing?: () => void;
  onFinishEditing?: () => void;
  onRequestDelete?: () => void;
  transformRect?: (
    rect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle }
  ) => Rect;
}

interface ActiveListeners {
  moveListener: (event: PointerEvent) => void;
  upListener: () => void;
}

const stripHtml = (value: string) => {
  if (!value) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return value.replace(/<[^>]*>/g, "");
  }
  const doc = new DOMParser().parseFromString(value, "text/html");
  return doc.body.textContent ?? "";
};

const normalizeTextValue = (value: string) =>
  value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

const isTextEmpty = (text?: string, richText?: string) =>
  normalizeTextValue(text ?? "") === "" &&
  normalizeTextValue(stripHtml(richText ?? "")) === "";

const TextBox = ({
  text,
  richText,
  editable = false,
  rect,
  minWidth = 120,
  minHeight = 40,
  className = "",
  showChrome = true,
  textClassName = "",
  textStyle,
  textAlign = "center",
  textAlignY = "middle",
  isSelected = false,
  isEditing = false,
  locked = false,
  widthMode = "auto",
  showToolbar = true,
  toolbar,
  onTextChange,
  onRectChange,
  onWidthModeChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
  onStartEditing,
  onFinishEditing,
  onRequestDelete,
  transformRect,
}: TextBoxProps) => {
  const rectRef = useRef(rect);
  const selectAllRef = useRef(false);
  const actionRef = useRef<ActiveListeners | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const wasEditingRef = useRef(false);
  const isComposingRef = useRef(false);
  const isResizingRef = useRef(false);
  const toolbarPortal =
    typeof document !== "undefined"
      ? document.getElementById("text-toolbar-root")
      : null;
  const styleSignature = [
    textStyle?.fontSize,
    textStyle?.fontWeight,
    textStyle?.lineHeight,
    textStyle?.letterSpacing,
    textStyle?.fontFamily,
    textStyle?.fontStyle,
  ].join("|");

  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  useEffect(() => {
    return () => {
      const action = actionRef.current;
      if (!action) return;
      window.removeEventListener("pointermove", action.moveListener);
      window.removeEventListener("pointerup", action.upListener);
      actionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const wasEditing = wasEditingRef.current;
    if (!isEditing && wasEditing && isTextEmpty(text, richText)) {
      onRequestDelete?.();
    }
    if (isEditing && !wasEditing) {
      const editable = editableRef.current;
      if (editable) {
        editable.innerHTML = richText || text;
      }
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, richText, text, onRequestDelete]);

  useEffect(() => {
    if (!isEditing) return;
    requestAnimationFrame(() => {
      const editable = editableRef.current;
      if (!editable) return;
      editable.focus();

      if (selectAllRef.current) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editable);
        selection?.removeAllRanges();
        selection?.addRange(range);
        selectAllRef.current = false;
        return;
      }

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }, [isEditing]);

  useEffect(() => {
    if (!onRectChange) return;
    if (isResizingRef.current) return;
    const measure = measureRef.current;
    if (!measure) return;
    const editableNode = editableRef.current;
    const htmlContent = isEditing ? editableNode?.innerHTML : richText;
    if (htmlContent != null && htmlContent !== "") {
      measure.innerHTML = htmlContent;
    } else {
      measure.textContent = text ?? "";
    }
    const currentRect = rectRef.current ?? rect;
    const rectWidth = currentRect.width;
    const rectHeight = currentRect.height;
    const maxWidth =
      boxRef.current?.parentElement?.clientWidth ?? rectWidth;
    const widthBuffer = 12;
    const isAutoWidth = widthMode !== "fixed";
    let targetWidth = Math.max(rectWidth, minWidth);

    if (isAutoWidth) {
      measure.style.width = "auto";
      measure.style.whiteSpace = "pre";
      const intrinsicWidth = Math.ceil(measure.scrollWidth) + widthBuffer;
      targetWidth = Math.min(
        Math.max(intrinsicWidth, minWidth),
        maxWidth
      );
    } else {
      measure.style.width = `${rectWidth}px`;
      measure.style.whiteSpace = "pre-wrap";
      targetWidth = rectWidth;
    }

    const targetHeight = Math.max(
      Math.ceil(measure.scrollHeight),
      minHeight
    );

    const widthChanged =
      isAutoWidth && Math.abs(targetWidth - rectWidth) > 1;
    const heightChanged = Math.abs(targetHeight - rectHeight) > 1;
    if (widthChanged || heightChanged) {
      onRectChange({
        ...currentRect,
        width: isAutoWidth ? targetWidth : rectWidth,
        height: targetHeight,
      });
    }
  }, [
    isEditing,
    widthMode,
    minHeight,
    minWidth,
    onRectChange,
    rect,
    richText,
    styleSignature,
    text,
  ]);

  const startAction = (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "drag" | "resize",
    handle?: ResizeHandle
  ) => {
    if (locked) return;
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (editable && isEditing && type === "drag") return;
    if (editable && isEditing && type === "resize") {
      const editableNode = editableRef.current;
      const nextText = editableNode?.innerText ?? text;
      const nextRichText = editableNode?.innerHTML ?? richText;
      if (isTextEmpty(nextText, nextRichText)) {
        onRequestDelete?.();
      } else {
        onFinishEditing?.();
      }
    }
    if (type === "resize") {
      isResizingRef.current = true;
    }
    if (!isSelected || event.shiftKey) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }

    const scale = getScale(boxRef.current);
    const startRect = rectRef.current;
    const startX = event.clientX;
    const startY = event.clientY;

    // 모서리 핸들인지 확인 (nw, ne, sw, se)
    const isCornerHandle = handle && (handle === "nw" || handle === "ne" || handle === "sw" || handle === "se");
    // 초기 폰트 크기 저장
    const startFontSize = toolbar?.fontSize ?? (textStyle?.fontSize as number) ?? 16;
    const startHeight = startRect.height;
    const startWidth = startRect.width;
    const aspectRatio = startWidth / startHeight;

    // 모서리 핸들로 리사이즈 시작 시 widthMode를 fixed로 변경
    if (isCornerHandle && widthMode === "auto") {
      onWidthModeChange?.("fixed");
    }

    onDragStateChange?.(true, rectRef.current, { type, handle });

    const moveListener = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();

      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      if (type === "drag") {
        const nextRect = transformRect
          ? transformRect(
              {
                x: startRect.x + dx,
                y: startRect.y + dy,
                width: startRect.width,
                height: startRect.height,
              },
              { type, handle }
            )
          : {
              x: startRect.x + dx,
              y: startRect.y + dy,
              width: startRect.width,
              height: startRect.height,
            };
        rectRef.current = nextRect;
        onRectChange?.(nextRect);
        return;
      }

      if (!handle) return;

      let nextX = startRect.x;
      let nextY = startRect.y;
      let nextWidth = startRect.width;
      let nextHeight = startRect.height;

      // 모서리 핸들: 비율 유지하며 리사이즈
      if (isCornerHandle) {
        // 드래그 거리 계산 (대각선 방향)
        let delta = 0;
        if (handle === "se") {
          delta = Math.max(dx / aspectRatio, dy);
        } else if (handle === "sw") {
          delta = Math.max(-dx / aspectRatio, dy);
        } else if (handle === "ne") {
          delta = Math.max(dx / aspectRatio, -dy);
        } else if (handle === "nw") {
          delta = Math.max(-dx / aspectRatio, -dy);
        }

        nextHeight = startHeight + delta;
        nextWidth = nextHeight * aspectRatio;

        if (handle.includes("w")) {
          nextX = startRect.x + (startRect.width - nextWidth);
        }
        if (handle.includes("n")) {
          nextY = startRect.y + (startRect.height - nextHeight);
        }
      } else {
        // 좌우 핸들: 폭 변경하고 높이는 텍스트에 맞춰 자동 조절
        if (handle.includes("e")) {
          nextWidth = startRect.width + dx;
        }
        if (handle.includes("w")) {
          nextWidth = startRect.width - dx;
          nextX = startRect.x + dx;
        }

        // 폭 변경 시 텍스트가 넘치지 않도록 높이 재계산
        const measure = measureRef.current;
        if (measure) {
          const editableNode = editableRef.current;
          const htmlContent = isEditing ? editableNode?.innerHTML : richText;
          if (htmlContent != null && htmlContent !== "") {
            measure.innerHTML = htmlContent;
          } else {
            measure.textContent = text ?? "";
          }
          measure.style.width = `${Math.max(nextWidth, minWidth)}px`;
          measure.style.whiteSpace = "pre-wrap";
          nextHeight = Math.max(
            Math.ceil(measure.scrollHeight),
            minHeight
          );
        }
      }

      if (nextWidth < minWidth) {
        nextWidth = minWidth;
        if (isCornerHandle) {
          nextHeight = nextWidth / aspectRatio;
        }
        if (handle.includes("w")) {
          nextX = startRect.x + (startRect.width - minWidth);
        }
        if (isCornerHandle && handle.includes("n")) {
          nextY = startRect.y + (startRect.height - nextHeight);
        }
      }

      if (nextHeight < minHeight) {
        nextHeight = minHeight;
        if (isCornerHandle) {
          nextWidth = nextHeight * aspectRatio;
        }
        if (handle.includes("n")) {
          nextY = startRect.y + (startRect.height - minHeight);
        }
        if (isCornerHandle && handle.includes("w")) {
          nextX = startRect.x + (startRect.width - nextWidth);
        }
      }

      // 모서리 핸들로 리사이즈 중이면 높이 변화에 따라 폰트 크기 조정
      if (isCornerHandle && toolbar) {
        const heightRatio = nextHeight / startHeight;
        const newFontSize = Math.round(startFontSize * heightRatio);
        const clampedFontSize = Math.max(
          toolbar.minFontSize,
          Math.min(newFontSize, toolbar.maxFontSize)
        );

        if (clampedFontSize !== toolbar.fontSize) {
          toolbar.onFontSizeChange(clampedFontSize);
        }
      }

      const nextRect = transformRect
        ? transformRect(
            {
              x: nextX,
              y: nextY,
              width: nextWidth,
              height: nextHeight,
            },
            { type, handle }
          )
        : {
            x: nextX,
            y: nextY,
            width: nextWidth,
            height: nextHeight,
          };
      rectRef.current = nextRect;
      onRectChange?.(nextRect);
    };

    const upListener = () => {
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
      actionRef.current = null;
      if (type === "resize") {
        isResizingRef.current = false;
      }
      onDragStateChange?.(false, rectRef.current, { type, handle });
    };

    actionRef.current = { moveListener, upListener };
    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
  };

  const handleSize = 10;
  const halfHandle = handleSize / 2;

  const renderHandle = (handle: ResizeHandle, cursor: string) => {
    const position =
      handle === "nw"
        ? { left: -halfHandle, top: -halfHandle }
        : handle === "ne"
        ? { right: -halfHandle, top: -halfHandle }
        : handle === "sw"
        ? { left: -halfHandle, bottom: -halfHandle }
        : handle === "se"
        ? { right: -halfHandle, bottom: -halfHandle }
        : handle === "n"
        ? { left: "50%", top: -halfHandle, transform: "translateX(-50%)" }
        : handle === "s"
        ? { left: "50%", bottom: -halfHandle, transform: "translateX(-50%)" }
        : handle === "e"
        ? { right: -halfHandle, top: "50%", transform: "translateY(-50%)" }
        : { left: -halfHandle, top: "50%", transform: "translateY(-50%)" };

    return (
      <div
        key={handle}
        onPointerDown={(event) => startAction(event, "resize", handle)}
        data-capture-handle="true"
        className="absolute rounded-sm border border-primary bg-white-100"
        style={{
          width: handleSize,
          height: handleSize,
          cursor,
          ...position,
        }}
      />
    );
  };

  const justifyClass =
    textAlign === "left"
      ? "justify-start"
      : textAlign === "right"
      ? "justify-end"
      : "justify-center";
  const alignYClass =
    textAlignY === "top"
      ? "items-start"
      : textAlignY === "bottom"
      ? "items-end"
      : "items-center";
  const showOutline = showChrome && !locked && isSelected;
  const showHandles = showChrome && !locked && isSelected;
  const contentWhiteSpace = widthMode === "fixed" ? "pre-wrap" : "pre";

  const beginEditing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || locked) return;
    event.preventDefault();
    event.stopPropagation();
    if (!isSelected) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }
    selectAllRef.current = true;
    onStartEditing?.();
  };

  const applyStyleToSelection = (command: string, value?: string) => {
    if (!isEditing) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    document.execCommand(command, false, value);

    const editable = editableRef.current;
    if (!editable) return;

    const plainText = editable.innerText;
    const html = editable.innerHTML;
    onTextChange?.(plainText, html);
  };

  const handleToggleBold = () => {
    if (isEditing) {
      applyStyleToSelection("bold");
    } else {
      toolbar?.onToggleBold();
    }
  };

  const handleToggleUnderline = () => {
    if (isEditing) {
      applyStyleToSelection("underline");
    } else {
      toolbar?.onToggleUnderline();
    }
  };

  const handleColorChange = (color: string) => {
    if (isEditing) {
      applyStyleToSelection("foreColor", color);
    } else {
      toolbar?.onColorChange(color);
    }
  };

  const handleFontSizeChange = (size: number) => {
    if (isEditing) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        toolbar?.onFontSizeChange(size);
        return;
      }

      const range = selection.getRangeAt(0);
      if (range.collapsed) {
        toolbar?.onFontSizeChange(size);
        return;
      }

      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;
      range.surroundContents(span);

      const editable = editableRef.current;
      if (!editable) return;

      const plainText = editable.innerText;
      const html = editable.innerHTML;
      onTextChange?.(plainText, html);
    } else {
      toolbar?.onFontSizeChange(size);
    }
  };

  const insertPlainText = (value: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    if (document.queryCommandSupported?.("insertText")) {
      document.execCommand("insertText", false, value);
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    const lines = value.split(/\r?\n/);
    let lastNode: ChildNode | null = null;
    lines.forEach((line, index) => {
      if (index > 0) {
        const br = document.createElement("br");
        fragment.appendChild(br);
        lastNode = br;
      }
      if (line.length > 0) {
        const textNode = document.createTextNode(line);
        fragment.appendChild(textNode);
        lastNode = textNode;
      }
    });
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const handleEditingBlur = () => {
    if (isComposingRef.current) return;
    const editableNode = editableRef.current;
    const nextText = editableNode?.innerText ?? text;
    const nextRichText = editableNode?.innerHTML ?? richText;
    if (isTextEmpty(nextText, nextRichText)) {
      if (onRequestDelete) {
        onRequestDelete();
      } else {
        onFinishEditing?.();
      }
      return;
    }
    onFinishEditing?.();
  };

  return (
    <div
      ref={boxRef}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        if (editable && !isEditing && !isSelected) {
          onSelectChange?.(true, { additive: event.shiftKey });
        }
        startAction(event, "drag");
      }}
      onDoubleClick={beginEditing}
      onContextMenu={onContextMenu}
      className={`absolute flex select-none ${justifyClass} ${alignYClass} ${className}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        touchAction: "none",
        pointerEvents: locked ? "none" : "auto",
        cursor: editable && !isEditing ? "text" : "move",
      }}
    >
      {showOutline && (
        <div className="absolute inset-0 border-2 border-primary pointer-events-none" />
      )}
      {editable && isEditing ? (
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(event) => {
            const target = event.currentTarget;
            const plainText = target.innerText;
            const html = target.innerHTML;
            onTextChange?.(plainText, html);
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pastedText =
              event.clipboardData?.getData("text/plain") ?? "";
            if (!pastedText) return;
            insertPlainText(pastedText);
            const editableNode = editableRef.current;
            if (!editableNode) return;
            onTextChange?.(editableNode.innerText, editableNode.innerHTML);
          }}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          onBlur={handleEditingBlur}
          onPointerDown={(event) => event.stopPropagation()}
          className={`w-full bg-transparent outline-none border-0 p-0 ${textClassName}`}
          style={{ ...textStyle, textAlign, whiteSpace: contentWhiteSpace }}
        />
      ) : (
        <div
          className={`block w-full pointer-events-none bg-transparent border-0 p-0 ${textClassName}`}
          style={{ ...textStyle, textAlign, whiteSpace: contentWhiteSpace }}
          dangerouslySetInnerHTML={{ __html: richText || text }}
        />
      )}
      {showHandles && (
        <>
          {renderHandle("nw", "nwse-resize")}
          {renderHandle("ne", "nesw-resize")}
          {renderHandle("sw", "nesw-resize")}
          {renderHandle("se", "nwse-resize")}
          {renderHandle("e", "ew-resize")}
          {renderHandle("w", "ew-resize")}
        </>
      )}
      {showHandles && (
        <div
          className="absolute left-1/2 top-full mt-1 w-32 -translate-x-1/2 rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap"
          style={{ pointerEvents: "none" }}
        >
          가로: {Math.round(rect.width)} 세로: {Math.round(rect.height)}
        </div>
      )}
      {editable &&
        toolbar &&
        isSelected &&
        !locked &&
        showToolbar &&
        (toolbarPortal
          ? createPortal(
              <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
                <TextToolBar
                  isVisible
                  minFontSize={toolbar.minFontSize}
                  maxFontSize={toolbar.maxFontSize}
                  fontSize={toolbar.fontSize}
                  lineHeight={toolbar.lineHeight}
                  letterSpacing={toolbar.letterSpacing}
                  color={toolbar.color}
                  isBold={toolbar.isBold}
                  isUnderline={toolbar.isUnderline}
                  align={toolbar.align}
                  alignY={toolbar.alignY}
                  onFontSizeChange={handleFontSizeChange}
                  onFontSizeStep={(delta) =>
                    handleFontSizeChange(toolbar.fontSize + delta)
                  }
                  onLineHeightChange={toolbar.onLineHeightChange}
                  onLetterSpacingChange={toolbar.onLetterSpacingChange}
                  onColorChange={handleColorChange}
                  onToggleBold={handleToggleBold}
                  onToggleUnderline={handleToggleUnderline}
                  onAlignChange={toolbar.onAlignChange}
                  onAlignYChange={toolbar.onAlignYChange}
                  onPointerDown={(event) => event.stopPropagation()}
                />
              </div>,
              toolbarPortal
            )
          : (
              <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
                <TextToolBar
                  isVisible
                  minFontSize={toolbar.minFontSize}
                  maxFontSize={toolbar.maxFontSize}
                  fontSize={toolbar.fontSize}
                  lineHeight={toolbar.lineHeight}
                  letterSpacing={toolbar.letterSpacing}
                  color={toolbar.color}
                  isBold={toolbar.isBold}
                  isUnderline={toolbar.isUnderline}
                  align={toolbar.align}
                  alignY={toolbar.alignY}
                  onFontSizeChange={handleFontSizeChange}
                  onFontSizeStep={(delta) =>
                    handleFontSizeChange(toolbar.fontSize + delta)
                  }
                  onLineHeightChange={toolbar.onLineHeightChange}
                  onLetterSpacingChange={toolbar.onLetterSpacingChange}
                  onColorChange={handleColorChange}
                  onToggleBold={handleToggleBold}
                  onToggleUnderline={handleToggleUnderline}
                  onAlignChange={toolbar.onAlignChange}
                  onAlignYChange={toolbar.onAlignYChange}
                  onPointerDown={(event) => event.stopPropagation()}
                />
              </div>
            ))}
      <div
        ref={measureRef}
        aria-hidden
        className={`absolute left-0 top-0 pointer-events-none opacity-0 ${textClassName}`}
        style={{
          ...textStyle,
          display: "inline-block",
          visibility: "hidden",
          whiteSpace: contentWhiteSpace,
        }}
      />
    </div>
  );
};

export default TextBox;
