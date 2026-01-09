import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import TextToolBar from "./TextToolBar";

type ResizeHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  toolbar?: {
    offset?: number;
    minFontSize: number;
    maxFontSize: number;
    fontSize: number;
    color: string;
    isBold: boolean;
    isUnderline: boolean;
    align: "left" | "center" | "right";
    alignY: "top" | "middle" | "bottom";
    onFontSizeChange: (value: number) => void;
    onFontSizeStep: (delta: number) => void;
    onColorChange: (value: string) => void;
    onToggleBold: () => void;
    onToggleUnderline: () => void;
    onAlignChange: (value: "left" | "center" | "right") => void;
    onAlignYChange: (value: "top" | "middle" | "bottom") => void;
  };
  onTextChange?: (text: string, richText?: string) => void;
  onRectChange?: (rect: Rect) => void;
  onDragStateChange?: (
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize" }
  ) => void;
  onSelectChange?: (isSelected: boolean) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onStartEditing?: () => void;
  onFinishEditing?: () => void;
  transformRect?: (
    rect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle }
  ) => Rect;
}

interface ActiveListeners {
  moveListener: (event: PointerEvent) => void;
  upListener: () => void;
}

const getScale = (element: HTMLElement | null) => {
  if (!element) return 1;
  const rect = element.getBoundingClientRect();
  return element.offsetWidth ? rect.width / element.offsetWidth : 1;
};

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
  toolbar,
  onTextChange,
  onRectChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
  onStartEditing,
  onFinishEditing,
  transformRect,
}: TextBoxProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const rectRef = useRef(rect);
  const selectAllRef = useRef(false);
  const actionRef = useRef<ActiveListeners | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);

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

  const startAction = (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "drag" | "resize",
    handle?: ResizeHandle
  ) => {
    if (locked) return;
    event.preventDefault();
    event.stopPropagation();
    if (editable && isEditing && type === "drag") return;
    if (editable && isEditing && type === "resize") {
      onFinishEditing?.();
    }
    onSelectChange?.(true);

    const scale = getScale(boxRef.current);
    const startRect = rectRef.current;
    const startX = event.clientX;
    const startY = event.clientY;

    onDragStateChange?.(true, rectRef.current, { type });

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

      if (handle.includes("e")) {
        nextWidth = startRect.width + dx;
      }
      if (handle.includes("s")) {
        nextHeight = startRect.height + dy;
      }
      if (handle.includes("w")) {
        nextWidth = startRect.width - dx;
        nextX = startRect.x + dx;
      }
      if (handle.includes("n")) {
        nextHeight = startRect.height - dy;
        nextY = startRect.y + dy;
      }

      if (nextWidth < minWidth) {
        nextWidth = minWidth;
        if (handle.includes("w")) {
          nextX = startRect.x + (startRect.width - minWidth);
        }
      }

      if (nextHeight < minHeight) {
        nextHeight = minHeight;
        if (handle.includes("n")) {
          nextY = startRect.y + (startRect.height - minHeight);
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
      onDragStateChange?.(false, rectRef.current, { type });
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
  const showOutline = showChrome && !locked && (isHovered || isSelected);

  const beginEditing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editable || locked) return;
    event.preventDefault();
    event.stopPropagation();
    if (!isSelected) {
      onSelectChange?.(true);
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

  return (
    <div
      ref={boxRef}
      onPointerDown={(event) => startAction(event, "drag")}
      onDoubleClick={beginEditing}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute flex select-none px-2 ${justifyClass} ${alignYClass} border-2 ${
        showOutline ? "border-primary" : "border-transparent"
      } ${className}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        touchAction: "none",
        pointerEvents: locked ? "none" : "auto",
      }}
    >
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
          onBlur={onFinishEditing}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            editableRef.current?.blur();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className={`w-full bg-transparent outline-none ${textClassName}`}
          style={{ ...textStyle, textAlign }}
          dangerouslySetInnerHTML={{ __html: richText || text }}
        />
      ) : (
        <div
          className={`block w-full ${textClassName}`}
          style={{ ...textStyle, textAlign }}
          dangerouslySetInnerHTML={{ __html: richText || text }}
        />
      )}
      {showOutline && (
        <>
          {renderHandle("n", "ns-resize")}
          {renderHandle("s", "ns-resize")}
          {renderHandle("e", "ew-resize")}
          {renderHandle("w", "ew-resize")}
          {renderHandle("nw", "nwse-resize")}
          {renderHandle("ne", "nesw-resize")}
          {renderHandle("sw", "nesw-resize")}
          {renderHandle("se", "nwse-resize")}
        </>
      )}
      {showOutline && (
        <div
          className="absolute left-1/2 top-full mt-1 w-32 -translate-x-1/2 rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap"
          style={{ pointerEvents: "none" }}
        >
          가로: {Math.round(rect.width)} 세로: {Math.round(rect.height)}
        </div>
      )}
      {editable && toolbar && isSelected && !locked && (
        <TextToolBar
          isVisible
          minFontSize={toolbar.minFontSize}
          maxFontSize={toolbar.maxFontSize}
          fontSize={toolbar.fontSize}
          color={toolbar.color}
          isBold={toolbar.isBold}
          isUnderline={toolbar.isUnderline}
          align={toolbar.align}
          alignY={toolbar.alignY}
          onFontSizeChange={handleFontSizeChange}
          onFontSizeStep={(delta) => handleFontSizeChange(toolbar.fontSize + delta)}
          onColorChange={handleColorChange}
          onToggleBold={handleToggleBold}
          onToggleUnderline={handleToggleUnderline}
          onAlignChange={toolbar.onAlignChange}
          onAlignYChange={toolbar.onAlignYChange}
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
};

export default TextBox;
