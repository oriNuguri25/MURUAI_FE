import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
  type DragEvent as ReactDragEvent,
} from "react";
import SquareToolBar from "./SquareToolBar";

type ResizeHandle = "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RoundBoxProps {
  rect: Rect;
  minWidth?: number;
  minHeight?: number;
  className?: string;
  fill?: string;
  borderRadius?: number;
  border?: {
    enabled: boolean;
    color: string;
    width: number;
    style?: "solid" | "dashed" | "dotted" | "double";
  };
  children?: React.ReactNode;
  isSelected?: boolean;
  locked?: boolean;
  transformRect?: (
    rect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle }
  ) => Rect;
  toolbar?: {
    offset?: number;
    minBorderRadius?: number;
    maxBorderRadius?: number;
    showRadius?: boolean;
    borderRadius: number;
    color: string;
    borderEnabled?: boolean;
    borderColor?: string;
    borderWidth?: number;
    borderStyle?: "solid" | "dashed" | "dotted" | "double";
    onBorderRadiusChange: (value: number) => void;
    onBorderRadiusStep: (delta: number) => void;
    onColorChange: (value: string) => void;
    onImageUpload: (imageUrl: string) => void;
    onBorderEnabledChange?: (value: boolean) => void;
    onBorderStyleChange?: (
      value: "solid" | "dashed" | "dotted" | "double"
    ) => void;
    onBorderColorChange?: (value: string) => void;
    onBorderWidthChange?: (value: number) => void;
  };
  onRectChange?: (rect: Rect) => void;
  onDragStateChange?: (
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize" }
  ) => void;
  onSelectChange?: (isSelected: boolean) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onImageDrop?: (imageUrl: string) => void;
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

const RoundBox = ({
  rect,
  minWidth = 80,
  minHeight = 80,
  className = "",
  fill = "#ffffff",
  borderRadius = 16,
  border,
  children,
  isSelected = false,
  locked = false,
  transformRect,
  toolbar,
  onRectChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
  onImageDrop,
}: RoundBoxProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const rectRef = useRef(rect);
  const actionRef = useRef<ActiveListeners | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

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

  const startAction = (
    event: ReactPointerEvent<HTMLDivElement>,
    type: "drag" | "resize",
    handle?: ResizeHandle
  ) => {
    if (locked) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectChange?.(true);

    const scale = getScale(boxRef.current);
    const startRect = rectRef.current;
    const startX = event.clientX;
    const startY = event.clientY;

    let hasMoved = false;
    const moveListener = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();

      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;

      if (!hasMoved) {
        hasMoved = true;
        onDragStateChange?.(true, rectRef.current, { type });
      }

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
      if (hasMoved) {
        onDragStateChange?.(false, rectRef.current, { type });
      }
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
        className="absolute rounded-sm border bg-white-100"
        style={{
          width: handleSize,
          height: handleSize,
          cursor,
          borderColor: selectionColor,
          ...position,
        }}
      />
    );
  };

  const isActive = isSelected;
  const showOutline = !locked && (isHovered || isActive);
  const selectionColor = "var(--primary)";
  const borderStyle = border?.style ?? "solid";
  const isImageFill = fill.startsWith("url(") || fill.startsWith("data:");
  const backgroundStyle: CSSProperties = isImageFill
    ? {
        backgroundImage: fill.startsWith("url(") ? fill : `url(${fill})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: fill };

  return (
    <div
      ref={boxRef}
      onPointerDown={(event) => startAction(event, "drag")}
      onContextMenu={onContextMenu}
      onDragOver={(event: ReactDragEvent<HTMLDivElement>) => {
        if (locked || !onImageDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event: ReactDragEvent<HTMLDivElement>) => {
        if (locked || !onImageDrop) return;
        event.preventDefault();
        event.stopPropagation();
        const imageUrl =
          event.dataTransfer.getData("application/x-muru-image") ||
          event.dataTransfer.getData("text/plain");
        if (!imageUrl) return;
        onImageDrop(imageUrl);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute select-none outline-2 ${className}`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        borderRadius,
        touchAction: "none",
        outlineColor: showOutline ? selectionColor : "transparent",
        border: border?.enabled
          ? `${border.width}px ${borderStyle} ${border.color}`
          : "none",
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ borderRadius, ...backgroundStyle }}
      >
        {children}
      </div>
      {!locked && (isHovered || isActive) && (
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
      {!locked && (isHovered || isActive) && (
        <div
          className="absolute left-1/2 top-full mt-1 w-32 -translate-x-1/2 rounded bg-white-100 px-2 py-0.5 text-center text-12-medium text-black-70 shadow-sm whitespace-nowrap"
          style={{ pointerEvents: "none" }}
        >
          가로: {Math.round(rect.width)} 세로: {Math.round(rect.height)}
        </div>
      )}
      {toolbar && isActive && !locked && (
        <SquareToolBar
          isVisible
          style={{
            left: 0,
            top: 0,
            transform: `translateY(calc(-100% - ${toolbar.offset ?? 0}px))`,
          }}
          showRadius={toolbar.showRadius}
          borderRadius={toolbar.borderRadius}
          minBorderRadius={toolbar.minBorderRadius}
          maxBorderRadius={toolbar.maxBorderRadius}
          color={toolbar.color}
          borderEnabled={toolbar.borderEnabled}
          borderColor={toolbar.borderColor}
          borderWidth={toolbar.borderWidth}
          borderStyle={toolbar.borderStyle}
          onBorderRadiusChange={toolbar.onBorderRadiusChange}
          onBorderRadiusStep={toolbar.onBorderRadiusStep}
          onColorChange={toolbar.onColorChange}
          onImageUpload={toolbar.onImageUpload}
          onBorderEnabledChange={toolbar.onBorderEnabledChange}
          onBorderStyleChange={toolbar.onBorderStyleChange}
          onBorderColorChange={toolbar.onBorderColorChange}
          onBorderWidthChange={toolbar.onBorderWidthChange}
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
};

export default RoundBox;
