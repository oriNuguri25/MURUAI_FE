import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import LineToolBar from "./LineToolBar";

type Point = { x: number; y: number };

interface LineShapeProps {
  id: string;
  start: Point;
  end: Point;
  stroke: { color: string; width: number };
  isSelected?: boolean;
  locked?: boolean;
  toolbar?: {
    offset?: number;
    minWidth?: number;
    maxWidth?: number;
    color: string;
    width: number;
    onColorChange: (value: string) => void;
    onWidthChange: (value: number) => void;
  };
  onLineChange?: (value: { start: Point; end: Point }) => void;
  onDragStateChange?: (
    isDragging: boolean,
    value?: { start: Point; end: Point }
  ) => void;
  onSelectChange?: (isSelected: boolean) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

const getScale = (element: HTMLElement | null) => {
  if (!element) return 1;
  const rect = element.getBoundingClientRect();
  return element.offsetWidth ? rect.width / element.offsetWidth : 1;
};

const Line = ({
  start,
  end,
  stroke,
  isSelected = false,
  locked = false,
  toolbar,
  onLineChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
}: LineShapeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const lineRef = useRef({ start, end });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lineRef.current = { start, end };
  }, [start, end]);

  const handleSize = 10;
  const halfHandle = handleSize / 2;
  const padding = Math.max(6, stroke.width, handleSize);
  const getBounds = (line: { start: Point; end: Point }) => {
    const minX = Math.min(line.start.x, line.end.x);
    const minY = Math.min(line.start.y, line.end.y);
    const width = Math.max(Math.abs(line.end.x - line.start.x), 1);
    const height = Math.max(Math.abs(line.end.y - line.start.y), 1);
    return {
      boxX: minX - padding,
      boxY: minY - padding,
      boxWidth: width + padding * 2,
      boxHeight: height + padding * 2,
    };
  };

  const { boxX, boxY, boxWidth, boxHeight } = getBounds({ start, end });
  const startRel = { x: start.x - boxX, y: start.y - boxY };
  const endRel = { x: end.x - boxX, y: end.y - boxY };

  const getPointerPosition = (event: PointerEvent, scale: number) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const bounds = getBounds(lineRef.current);
    return {
      x: (event.clientX - rect.left) / scale + bounds.boxX,
      y: (event.clientY - rect.top) / scale + bounds.boxY,
    };
  };

  const startDrag = (event: ReactPointerEvent<SVGLineElement>) => {
    if (locked) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectChange?.(true);

    const scale = getScale(wrapperRef.current);
    const dragStart = lineRef.current;
    const startX = event.clientX;
    const startY = event.clientY;
    let hasMoved = false;

    const moveListener = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const dx = (moveEvent.clientX - startX) / scale;
      const dy = (moveEvent.clientY - startY) / scale;
      const next = {
        start: { x: dragStart.start.x + dx, y: dragStart.start.y + dy },
        end: { x: dragStart.end.x + dx, y: dragStart.end.y + dy },
      };
      if (!hasMoved) {
        hasMoved = true;
        onDragStateChange?.(true, next);
      }
      lineRef.current = next;
      onLineChange?.(next);
    };

    const upListener = () => {
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
      if (hasMoved) {
        onDragStateChange?.(false, lineRef.current);
      }
    };

    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
  };

  const startResize = (
    event: ReactPointerEvent<HTMLDivElement>,
    handle: "start" | "end"
  ) => {
    if (locked) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectChange?.(true);

    const scale = getScale(wrapperRef.current);
    const dragStart = lineRef.current;
    let hasMoved = false;

    const moveListener = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const pointer = getPointerPosition(moveEvent, scale);
      const next =
        handle === "start"
          ? { start: pointer, end: dragStart.end }
          : { start: dragStart.start, end: pointer };
      if (!hasMoved) {
        hasMoved = true;
        onDragStateChange?.(true, next);
      }
      lineRef.current = next;
      onLineChange?.(next);
    };

    const upListener = () => {
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
      if (hasMoved) {
        onDragStateChange?.(false, lineRef.current);
      }
    };

    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
  };

  const showOutline = !locked && (isHovered || isSelected);

  return (
    <div
      ref={wrapperRef}
      className="absolute"
      style={{
        left: boxX,
        top: boxY,
        width: boxWidth,
        height: boxHeight,
      }}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showOutline && (
        <div className="absolute inset-0 rounded border border-primary/60 pointer-events-none" />
      )}
      <svg width={boxWidth} height={boxHeight} className="absolute inset-0">
        <line
          x1={startRel.x}
          y1={startRel.y}
          x2={endRel.x}
          y2={endRel.y}
          stroke="transparent"
          strokeWidth={Math.max(12, stroke.width + 6)}
          pointerEvents="stroke"
          onPointerDown={startDrag}
        />
        <line
          x1={startRel.x}
          y1={startRel.y}
          x2={endRel.x}
          y2={endRel.y}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          strokeLinecap="round"
          pointerEvents="none"
        />
      </svg>
      {!locked && (isHovered || isSelected) && (
        <>
          <div
            className="absolute rounded-full border border-primary bg-white-100"
            style={{
              width: handleSize,
              height: handleSize,
              left: startRel.x - halfHandle,
              top: startRel.y - halfHandle,
              cursor: "grab",
            }}
            onPointerDown={(event) => startResize(event, "start")}
          />
          <div
            className="absolute rounded-full border border-primary bg-white-100"
            style={{
              width: handleSize,
              height: handleSize,
              left: endRel.x - halfHandle,
              top: endRel.y - halfHandle,
              cursor: "grab",
            }}
            onPointerDown={(event) => startResize(event, "end")}
          />
        </>
      )}
      {toolbar && isSelected && !locked && (
        <LineToolBar
          isVisible
          style={{
            left: 0,
            top: 0,
            transform: `translateY(calc(-100% - ${toolbar.offset ?? 0}px))`,
          }}
          minWidth={toolbar.minWidth}
          maxWidth={toolbar.maxWidth}
          color={toolbar.color}
          width={toolbar.width}
          onColorChange={toolbar.onColorChange}
          onWidthChange={toolbar.onWidthChange}
          onPointerDown={(event) => event.stopPropagation()}
        />
      )}
    </div>
  );
};

export default Line;
