import {
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { Point } from "../../../model/canvasTypes";
import { getScale, normalizePoint } from "../../../utils/domUtils";

interface LineShapeProps {
  id: string;
  start: Point;
  end: Point;
  stroke: { color: string; width: number };
  isSelected?: boolean;
  locked?: boolean;
  onLineChange?: (value: { start: Point; end: Point }) => void;
  onDragStateChange?: (
    isDragging: boolean,
    value?: { start: Point; end: Point },
    context?: { type: "drag" | "resize" }
  ) => void;
  onSelectChange?: (isSelected: boolean, options?: { additive?: boolean }) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

const Line = ({
  start,
  end,
  stroke,
  isSelected = false,
  locked = false,
  onLineChange,
  onDragStateChange,
  onSelectChange,
  onContextMenu,
}: LineShapeProps) => {
  const safeStart = normalizePoint(start);
  const safeEnd = normalizePoint(end);
  const lineRef = useRef({ start: safeStart, end: safeEnd });
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lineRef.current = { start: safeStart, end: safeEnd };
  }, [safeStart, safeEnd]);

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

  const { boxX, boxY, boxWidth, boxHeight } = getBounds({
    start: safeStart,
    end: safeEnd,
  });
  const startRel = { x: safeStart.x - boxX, y: safeStart.y - boxY };
  const endRel = { x: safeEnd.x - boxX, y: safeEnd.y - boxY };

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
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (!isSelected || event.shiftKey) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }

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
        onDragStateChange?.(true, next, { type: "drag" });
      }
      lineRef.current = next;
      onLineChange?.(next);
    };

    const upListener = () => {
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
      if (hasMoved) {
        onDragStateChange?.(false, lineRef.current, { type: "drag" });
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
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (!isSelected || event.shiftKey) {
      onSelectChange?.(true, { additive: event.shiftKey });
    }

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
        onDragStateChange?.(true, next, { type: "resize" });
      }
      lineRef.current = next;
      onLineChange?.(next);
    };

    const upListener = () => {
      window.removeEventListener("pointermove", moveListener);
      window.removeEventListener("pointerup", upListener);
      if (hasMoved) {
        onDragStateChange?.(false, lineRef.current, { type: "resize" });
      }
    };

    window.addEventListener("pointermove", moveListener);
    window.addEventListener("pointerup", upListener);
  };

  const showOutline = !locked && isSelected;

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
      {!locked && isSelected && (
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
    </div>
  );
};

export default Line;
